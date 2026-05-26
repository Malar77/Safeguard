import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { sosAPI, familyAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { saveSosHistory, getSosHistory } from "../../services/db";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const OBSERVER_ROLES = new Set(["admin", "parent", "counselor"]);
const STREAM_INTERVAL_MS = 2500;
const ALARM_WAV_PATH = FileSystem.cacheDirectory + "safeguard_sos_alarm.wav";
const CAMERA_READY_TIMEOUT_MS = 5000;
const CAMERA_READY_POLL_MS = 120;

const buildBeepWav = () => {
  const sampleRate = 8000;
  const frequency = 880;
  const duration = 0.35;
  const sampleCount = Math.floor(sampleRate * duration);
  const buffer = new Uint8Array(44 + sampleCount);

  const write4 = (offset, value) => {
    buffer[offset] = value & 0xff;
    buffer[offset + 1] = (value >> 8) & 0xff;
    buffer[offset + 2] = (value >> 16) & 0xff;
    buffer[offset + 3] = (value >> 24) & 0xff;
  };
  const write2 = (offset, value) => {
    buffer[offset] = value & 0xff;
    buffer[offset + 1] = (value >> 8) & 0xff;
  };
  const writeText = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) buffer[offset + i] = text.charCodeAt(i);
  };

  writeText(0, "RIFF");
  write4(4, 36 + sampleCount);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  write4(16, 16);
  write2(20, 1);
  write2(22, 1);
  write4(24, sampleRate);
  write4(28, sampleRate);
  write2(32, 1);
  write2(34, 8);
  writeText(36, "data");
  write4(40, sampleCount);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const value = 0.75 * Math.sin(2 * Math.PI * frequency * t) + 0.25 * Math.sin(2 * Math.PI * frequency * 2 * t);
    buffer[44 + i] = 128 + Math.round(110 * Math.max(-1, Math.min(1, value)));
  }

  let binary = "";
  for (let i = 0; i < buffer.length; i += 1) binary += String.fromCharCode(buffer[i]);
  return btoa(binary);
};

const ensureAlarmWav = async () => {
  const info = await FileSystem.getInfoAsync(ALARM_WAV_PATH);
  if (!info.exists) {
    const wavBase64 = buildBeepWav();
    await FileSystem.writeAsStringAsync(ALARM_WAV_PATH, wavBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
};

let _sound = null;

const alarmController = {
  async start() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
      });
      await ensureAlarmWav();
      if (_sound) {
        await _sound.unloadAsync();
        _sound = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: ALARM_WAV_PATH },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      _sound = sound;
    } catch {
      // If audio fails, keep the flow alive with vibration only.
    }
  },
  async stop() {
    try {
      if (_sound) {
        await _sound.stopAsync();
        await _sound.unloadAsync();
        _sound = null;
      }
    } catch {
      // ignore
    }
  },
};

export default function SOSScreen() {
  const { user } = useAuth();
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [sending, setSending] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [message, setMessage] = useState("I need immediate help! Please send assistance.");
  const [locationStatus, setLocationStatus] = useState("idle");
  const [currentLocationLabel, setCurrentLocationLabel] = useState("");

  const [showCamera, setShowCamera] = useState(false);
  const [selfieUri, setSelfieUri] = useState(null);
  const [selfieBase64, setSelfieBase64] = useState(null);
  const [sosAlertId, setSosAlertId] = useState(null);
  const [liveStreaming, setLiveStreaming] = useState(false);
  const [frameNumber, setFrameNumber] = useState(0);
  const streamTimerRef = useRef(null);

  const sleep = useCallback((ms) => new Promise((resolve) => setTimeout(resolve, ms)), []);

  const waitForCameraReady = useCallback(async () => {
    const start = Date.now();
    while (Date.now() - start < CAMERA_READY_TIMEOUT_MS) {
      if (cameraRef.current) return true;
      await sleep(CAMERA_READY_POLL_MS);
    }
    return false;
  }, [sleep]);

  const stopLiveStream = useCallback(async () => {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setLiveStreaming(false);
    setSosAlertId(null);
    setFrameNumber(0);
    await alarmController.stop();
  }, []);

  useEffect(() => {
    if (!user || !OBSERVER_ROLES.has(user.role)) {
      loadAlerts();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      stopLiveStream();
    };
  }, [stopLiveStream]);

  const loadAlerts = async () => {
    try {
      const { data } = await sosAPI.myAlerts();
      setAlerts(data || []);
      await saveSosHistory(data || []);
    } catch {
      const cached = await getSosHistory();
      setAlerts(cached);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const getLocationLabel = useCallback(async (coords) => {
    try {
      const placemarks = await Location.reverseGeocodeAsync(coords);
      const place = placemarks?.[0];
      const parts = [
        place?.name,
        place?.street,
        place?.district || place?.subregion,
        place?.city || place?.region,
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    } catch {
      // Fall back to coordinates below.
    }

    return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
  }, []);

  const getLocation = useCallback(async () => {
    setLocationStatus("fetching");
    try {
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        setLocationStatus("denied");
        return null;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        return null;
      }

      let loc = null;
      try {
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
      } catch {
        loc = await Location.getLastKnownPositionAsync({
          maxAge: 2 * 60 * 1000,
          requiredAccuracy: 200,
        });
      }

      if (!loc?.coords) {
        setLocationStatus("denied");
        return null;
      }

      setCurrentLocationLabel(await getLocationLabel(loc.coords));
      setLocationStatus("ok");
      return loc.coords;
    } catch {
      setLocationStatus("denied");
      return null;
    }
  }, []);

  const openCamera = async () => {
    if (!camPermission?.granted) {
      const result = await requestCamPermission();
      if (!result.granted) {
        Alert.alert("Camera denied", "Allow camera access to attach a photo to your emergency alert.");
        return;
      }
    }
    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current) {
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      setSelfieUri(photo.uri);
      setSelfieBase64(photo.base64);
      setShowCamera(false);
    } catch {
      Alert.alert("Error", "Could not capture photo.");
    }
  };

  const sendFrame = useCallback(async (alertId, photo, currentFrameNumber) => {
    if (!alertId || !photo?.uri) return;

    const formData = new FormData();
    formData.append("frame", {
      uri: photo.uri,
      name: `sos-frame-${currentFrameNumber}.jpg`,
      type: photo.mimeType || "image/jpeg",
    });
    formData.append("frame_number", String(currentFrameNumber));

    try {
      await sosAPI.streamFrame(alertId, formData);
    } catch {
      // Keep streaming even if one frame fails.
    }
  }, []);

  const startLiveStream = useCallback((alertId) => {
    if (!cameraRef.current || !alertId) return;
    if (streamTimerRef.current) clearInterval(streamTimerRef.current);

    setSosAlertId(alertId);
    setLiveStreaming(true);
    setFrameNumber(0);

    streamTimerRef.current = setInterval(async () => {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 0.35 });
        setFrameNumber((prev) => {
          const nextFrame = prev + 1;
          void sendFrame(alertId, photo, nextFrame);
          return nextFrame;
        });
      } catch {
        // keep going; one failed capture should not stop the stream
      }
    }, STREAM_INTERVAL_MS);
  }, [sendFrame]);

  const ensureSelfieData = useCallback(async () => {
    if (selfieBase64) return `data:image/jpeg;base64,${selfieBase64}`;
    if (!cameraRef.current) return null;

    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
    setSelfieUri(photo.uri);
    setSelfieBase64(photo.base64);
    return photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : null;
  }, [selfieBase64]);

  const triggerSOS = async () => {
    if (sending) return;

    setSending(true);
    try {
      if (!camPermission?.granted) {
        const result = await requestCamPermission();
        if (!result.granted) {
          throw new Error("Camera permission is required for automatic SOS recording.");
        }
      }

      if (!showCamera) {
        setShowCamera(true);
      }

      const cameraReady = await waitForCameraReady();
      if (!cameraReady) {
        throw new Error("Camera is taking too long to initialize. Please try again.");
      }

      const selfie_data = await ensureSelfieData();
      if (!selfie_data) {
        throw new Error("Camera capture failed. Please try again.");
      }

      const coords = await getLocation();
      const address = currentLocationLabel || (coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : undefined);
      const payload = {
        message: message.trim() || "Emergency! I need help!",
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        address,
        selfie_data,
      };

      const { data: sosData } = await sosAPI.trigger(payload);

      setSosAlertId(sosData?.id || null);
      await alarmController.start();

      if (cameraRef.current && sosData?.id) {
        startLiveStream(sosData.id);
      }

      try {
        await familyAPI.sendAlert({
          sos_alert_id: sosData?.id,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          address,
          message: payload.message,
          selfie_data,
        });
      } catch {
        // Guardian push failure should not block SOS creation.
      }

      Alert.alert("SOS Activated", "Emergency alert sent and live recording started.");
      await loadAlerts();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to send SOS. Please call emergency services directly.";
      Alert.alert("Error", msg);
    } finally {
      setSending(false);
    }
  };

  const activeAlerts = alerts.filter((a) => a.is_active);

  if (user && OBSERVER_ROLES.has(user.role)) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerWrap]}>
        <Text style={styles.restrictIcon}>Guard</Text>
        <Text style={styles.restrictTitle}>SOS Access Restricted</Text>
        <Text style={styles.restrictText}>
          {user.role === "parent"
            ? "Guardian accounts monitor alerts and cannot send SOS."
            : "This account type cannot send SOS alerts."}
        </Text>
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={cameraRef} facing="front" style={{ flex: 1 }} />
        <View style={styles.cameraBar}>
          <TouchableOpacity style={styles.camCancelBtn} onPress={() => setShowCamera(false)}>
            <Text style={styles.camCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.camCaptureBtn} onPress={capturePhoto}>
            <Text style={{ fontSize: 28 }}>Snap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.camSendBtn} onPress={triggerSOS}>
            <Text style={styles.camSendText}>{liveStreaming ? "Live" : "Send SOS"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Emergency SOS</Text>
        <Text style={styles.sub}>Tap SOS to alert your guardians with your message and location.</Text>

        <View style={styles.selfieCard}>
          {selfieUri ? (
            <>
              <Image source={{ uri: selfieUri }} style={styles.selfiePreview} />
              <TouchableOpacity style={styles.retakeBtn} onPress={openCamera}>
                <Text style={styles.retakeBtnText}>Retake Photo</Text>
              </TouchableOpacity>
              {liveStreaming && (
                <TouchableOpacity style={styles.stopLiveBtn} onPress={stopLiveStream}>
                  <Text style={styles.stopLiveText}>Stop Live Stream</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity style={styles.cameraBtn} onPress={openCamera}>
              <Text style={styles.cameraBtnText}>Open Camera</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sosBtnWrapper}>
          <TouchableOpacity style={styles.sosBtn} onPress={triggerSOS} disabled={sending}>
            {sending ? <ActivityIndicator color={COLORS.white} size="large" /> : <Text style={styles.sosBtnText}>SOS</Text>}
          </TouchableOpacity>
          <Text style={styles.sosBtnHint}>Hold firmly and tap to send</Text>
        </View>

        <View style={styles.messageCard}>
          <Text style={styles.label}>Emergency Message</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            placeholder="Describe your emergency..."
            placeholderTextColor={COLORS.gray400}
          />
        </View>

        {liveStreaming && (
          <View style={styles.liveStatusBox}>
            <Text style={styles.liveStatusTitle}>Live SOS Stream Active</Text>
            <Text style={styles.liveStatusText}>Frames sent: {frameNumber}</Text>
          </View>
        )}

        {locationStatus !== "idle" && (
          <View style={[styles.locStatus, locationStatus === "denied" && styles.locDenied]}>
            <Text style={styles.locText}>
              {locationStatus === "fetching"
                ? "Fetching GPS location..."
                : locationStatus === "ok"
                ? "GPS location attached"
                : "Location denied. Alert sent without GPS."}
            </Text>
            {currentLocationLabel ? <Text style={styles.locSubText}>Current location: {currentLocationLabel}</Text> : null}
          </View>
        )}

        {activeAlerts.length > 0 && (
          <View style={styles.activeBox}>
            <Text style={styles.activeTitle}>Active SOS Alerts</Text>
            {activeAlerts.map((a) => (
              <View key={a.id} style={styles.activeRow}>
                <Text style={styles.activeMsg}>{a.message}</Text>
                <Text style={styles.activeMeta}>{new Date(a.created_at).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {!loadingAlerts && alerts.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>SOS History ({alerts.length})</Text>
            {alerts.map((a) => (
              <View key={a.id} style={[styles.histRow, a.is_active && styles.histRowActive]}>
                <View style={[styles.histBadge, { backgroundColor: a.is_active ? COLORS.danger : COLORS.success }]}>
                  <Text style={styles.histBadgeText}>{a.is_active ? "ACTIVE" : "RESOLVED"}</Text>
                </View>
                <Text style={styles.histMsg} numberOfLines={2}>{a.message}</Text>
                <Text style={styles.histDate}>{new Date(a.created_at).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  centerWrap: { justifyContent: "center", alignItems: "center", padding: 32 },
  restrictIcon: { fontSize: 36, marginBottom: 12 },
  restrictTitle: { fontSize: 20, fontWeight: "800", color: COLORS.gray800, textAlign: "center" },
  restrictText: { fontSize: 14, color: COLORS.gray500, textAlign: "center", marginTop: 8 },

  scroll: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "800", color: COLORS.danger, textAlign: "center" },
  sub: { fontSize: 13, color: COLORS.gray500, textAlign: "center", marginTop: 6, marginBottom: 24, lineHeight: 20 },

  sosBtnWrapper: { alignItems: "center", marginBottom: 20 },
  sosBtn: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  sosBtnText: { fontSize: 30, color: COLORS.white, fontWeight: "900", textAlign: "center" },
  sosBtnHint: { marginTop: 12, fontSize: 12, color: COLORS.gray400, textAlign: "center" },

  selfieCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, ...SHADOW.sm, alignItems: "center" },
  selfiePreview: { width: 100, height: 100, borderRadius: 50, marginBottom: 8, borderWidth: 2, borderColor: COLORS.primary },
  retakeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.primary },
  retakeBtnText: { color: COLORS.primary, fontWeight: "600", fontSize: 13 },
  cameraBtn: { backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 16, alignItems: "center", borderWidth: 1.5, borderColor: COLORS.primaryLight },
  cameraBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },
  stopLiveBtn: { marginTop: 10, backgroundColor: COLORS.dangerBg, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1.5, borderColor: COLORS.danger },
  stopLiveText: { color: COLORS.danger, fontWeight: "700", fontSize: 13 },

  messageCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, ...SHADOW.sm },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.gray700, marginBottom: 8 },
  messageInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    textAlignVertical: "top",
  },

  locStatus: {
    backgroundColor: COLORS.successBg,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  locDenied: { backgroundColor: COLORS.dangerBg },
  locText: { fontWeight: "600", fontSize: 13, color: COLORS.gray700 },
  locSubText: { marginTop: 4, fontSize: 11, color: COLORS.gray500, textAlign: "center", lineHeight: 16 },

  activeBox: {
    backgroundColor: "#fff1f2",
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#fecdd3",
    marginBottom: 16,
  },
  activeTitle: { fontWeight: "800", color: COLORS.danger, marginBottom: 8 },
  activeRow: { marginBottom: 10 },
  activeMsg: { fontSize: 14, color: COLORS.text },
  activeMeta: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },

  historyCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, ...SHADOW.sm },
  historyTitle: { fontSize: 14, fontWeight: "700", color: COLORS.gray700, marginBottom: 12 },
  histRow: { marginBottom: 10, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: COLORS.success },
  histRowActive: { borderLeftColor: COLORS.danger, backgroundColor: "#fff5f5" },
  histBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  histBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: "700" },
  histMsg: { fontSize: 13, color: COLORS.text },
  histDate: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },

  liveStatusBox: { backgroundColor: "#eff6ff", borderRadius: RADIUS.lg, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#bfdbfe" },
  liveStatusTitle: { fontSize: 14, fontWeight: "800", color: "#1d4ed8" },
  liveStatusText: { fontSize: 12, color: "#2563eb", marginTop: 4 },

  cameraBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  camCancelBtn: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.md },
  camCancelText: { color: COLORS.white, fontWeight: "600" },
  camCaptureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  camSendBtn: { backgroundColor: COLORS.danger, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.md },
  camSendText: { color: COLORS.white, fontWeight: "800", fontSize: 13 },
});

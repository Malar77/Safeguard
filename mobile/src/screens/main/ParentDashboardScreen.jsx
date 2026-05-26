/**
 * ParentDashboardScreen
 * ─────────────────────
 * Guardian-only screen with:
 *  • Real-time polling (15 s) for new family alerts
 *  • Repeating alarm — WAV generated on-device written to cache, played via expo-av
 *    (falls back to Vibration if audio fails)
 *  • React-native-maps MapView per alert showing child's location
 *  • Inline selfie photo viewer
 *  • Accept / reject pending link requests
 *  • Full offline support — all alerts cached in SQLite
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, Alert, ActivityIndicator, Vibration, RefreshControl,
  Animated, Easing, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { familyAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import {
  saveFamilyAlerts, getFamilyAlerts,
  saveFamilyLinks, getFamilyLinks,
} from "../../services/db";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const SOS_ACTIVE_WINDOW_MS = 30 * 60 * 1000;

// ─── WAV generator ────────────────────────────────────────────────────────────
// Generates a short 880 Hz beep as in-memory unsigned 8-bit PCM WAV.
// Written once to the cache directory so expo-av can play it as a looping alarm.
const ALARM_WAV_PATH = FileSystem.cacheDirectory + "safeguard_alarm.wav";

const toBase64 = (binary) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(binary);
  }

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let result = "";
  let i = 0;
  while (i < binary.length) {
    const c1 = binary.charCodeAt(i++) & 0xff;
    const c2 = i < binary.length ? binary.charCodeAt(i++) & 0xff : NaN;
    const c3 = i < binary.length ? binary.charCodeAt(i++) & 0xff : NaN;

    const e1 = c1 >> 2;
    const e2 = ((c1 & 0x03) << 4) | ((isNaN(c2) ? 0 : c2) >> 4);
    const e3 = isNaN(c2) ? 64 : (((c2 & 0x0f) << 2) | ((isNaN(c3) ? 0 : c3) >> 6));
    const e4 = isNaN(c3) ? 64 : (c3 & 0x3f);

    result += chars.charAt(e1) + chars.charAt(e2) + chars.charAt(e3) + chars.charAt(e4);
  }
  return result;
};

const buildBeepWav = () => {
  const SR = 8000;          // sample rate
  const FREQ = 880;         // Hz
  const DUR = 0.35;         // seconds
  const N = Math.floor(SR * DUR);
  const buf = new Uint8Array(44 + N);

  const w4 = (o, v) => {
    buf[o]   =  v        & 0xff; buf[o+1] = (v >>  8) & 0xff;
    buf[o+2] = (v >> 16) & 0xff; buf[o+3] = (v >> 24) & 0xff;
  };
  const w2 = (o, v) => { buf[o] = v & 0xff; buf[o+1] = (v >> 8) & 0xff; };
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) buf[o+i] = s.charCodeAt(i); };

  ws(0,  "RIFF"); w4(4, 36 + N); ws(8, "WAVE");
  ws(12, "fmt "); w4(16, 16);    w2(20, 1);  // PCM
  w2(22, 1);   w4(24, SR); w4(28, SR); w2(32, 1); w2(34, 8);
  ws(36, "data"); w4(40, N);

  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const s = 0.75 * Math.sin(2 * Math.PI * FREQ * t)
            + 0.25 * Math.sin(2 * Math.PI * FREQ * 2 * t);
    buf[44 + i] = 128 + Math.round(110 * Math.max(-1, Math.min(1, s)));
  }

  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return toBase64(bin);
};

const ensureAlarmWav = async () => {
  const info = await FileSystem.getInfoAsync(ALARM_WAV_PATH);
  if (!info.exists) {
    const b64 = buildBeepWav();
    await FileSystem.writeAsStringAsync(ALARM_WAV_PATH, b64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
};

// ─── AlarmController (singleton) ─────────────────────────────────────────────
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
      if (_sound) { await _sound.unloadAsync(); _sound = null; }
      const { sound } = await Audio.Sound.createAsync(
        { uri: ALARM_WAV_PATH },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      _sound = sound;
    } catch (e) {
      // Fallback: strong haptics + vibration pattern
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Vibration.vibrate([0, 600, 300, 600, 300, 600, 300, 600], true);
    }
  },
  async stop() {
    try {
      if (_sound) { await _sound.stopAsync(); await _sound.unloadAsync(); _sound = null; }
    } catch { /* ignore */ }
    Vibration.cancel();
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
};

const normalizeCoord = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const isRecentActiveSos = (alert) => {
  if (!alert?.sos_alert_id || !alert?.sos_is_active) return false;

  const refTs = alert.live_frame_updated_at || alert.created_at;
  const parsed = refTs ? Date.parse(refTs) : NaN;
  if (Number.isNaN(parsed)) return true;

  return Date.now() - parsed <= SOS_ACTIVE_WINDOW_MS;
};

// ─── Alert card ───────────────────────────────────────────────────────────────
function AlertCard({ alert, onMarkRead, onDelete }) {
  const [showPhoto, setShowPhoto] = useState(!alert.is_read);
  const [showMap, setShowMap] = useState(!alert.is_read);
  const isNew = !alert.is_read;
  const lat = normalizeCoord(alert.latitude);
  const lon = normalizeCoord(alert.longitude);
  const hasLocation = lat !== null && lon !== null;

  const openLocationInMaps = async () => {
    if (!hasLocation) return;
    try {
      await Linking.openURL(`https://maps.google.com/?q=${lat},${lon}`);
    } catch {
      Alert.alert("Unable to open maps", "Please install a maps app and try again.");
    }
  };

  return (
    <View style={[styles.alertCard, isNew && styles.alertCardNew]}>
      {/* Header */}
      <View style={styles.alertHeader}>
        <View style={styles.alertLeft}>
          <Text style={styles.alertName}>{alert.child_name || "Child"}</Text>
          {alert.child_phone && (
            <Text style={styles.alertPhone}>📞 {alert.child_phone}</Text>
          )}
          <Text style={styles.alertTime}>{fmtTime(alert.created_at)}</Text>
        </View>
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
      </View>

      {/* Message */}
      <Text style={styles.alertMsg}>{alert.message}</Text>

      {/* Location map */}
      {hasLocation ? (
        <View style={styles.mapSection}>
          <TouchableOpacity
            style={styles.mapToggle}
            onPress={() => setShowMap((v) => !v)}
          >
            <Text style={styles.mapToggleText}>
              {showMap ? "▲ Hide map" : "🗺️ Show location"}
            </Text>
          </TouchableOpacity>
          {showMap && (
            <TouchableOpacity
              style={styles.openMapBtn}
              onPress={openLocationInMaps}
            >
              <Text style={styles.openMapBtnText}>
                📍 {lat.toFixed(5)}, {lon.toFixed(5)}
              </Text>
              <Text style={styles.openMapBtnSub}>Tap to open in Google Maps →</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={styles.noLocation}>📍 No GPS data</Text>
      )}

      {/* Selfie */}
      {alert.selfie_data && (
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.mapToggle}
            onPress={() => setShowPhoto((v) => !v)}
          >
            <Text style={styles.mapToggleText}>
              {showPhoto ? "▲ Hide photo" : "📸 Show selfie"}
            </Text>
          </TouchableOpacity>
          {showPhoto && (
            <Image
              source={{ uri: alert.selfie_data }}
              style={styles.selfieImg}
              resizeMode="cover"
            />
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.alertActions}>
        {isNew && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.successBg, borderColor: COLORS.success }]}
            onPress={() => onMarkRead(alert.id)}
          >
            <Text style={[styles.actionBtnText, { color: COLORS.success }]}>✅ Mark Read</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: COLORS.dangerBg, borderColor: COLORS.danger }]}
          onPress={() => onDelete(alert.id)}
        >
          <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>🗑 Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ParentDashboardScreen() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("alerts");
  const [alerts, setAlerts]       = useState([]);
  const [requests, setRequests]   = useState([]);
  const [children, setChildren]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Flashing animation for the alarm banner
  const flashAnim = useRef(new Animated.Value(1)).current;
  const pollRef   = useRef(null);
  const prevUnreadRef = useRef(0);
  const alarmActiveRef = useRef(false);
  const initialAlertsHydratedRef = useRef(false);

  useEffect(() => {
    alarmActiveRef.current = alarmActive;
  }, [alarmActive]);

  useEffect(() => {
    loadAll();
    pollRef.current = setInterval(pollAlerts, 15_000);
    return () => {
      clearInterval(pollRef.current);
      alarmController.stop();
    };
  }, []);

  const startFlash = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 0.3, duration: 400, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 1,   duration: 400, easing: Easing.linear, useNativeDriver: true }),
      ])
    ).start();
  }, [flashAnim]);

  const stopFlash = useCallback(() => {
    flashAnim.stopAnimation();
    flashAnim.setValue(1);
  }, [flashAnim]);

  const triggerAlarm = useCallback(async () => {
    if (alarmActiveRef.current) return;
    alarmActiveRef.current = true;
    setAlarmActive(true);
    setActiveTab("alerts");
    startFlash();
    await alarmController.start();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [startFlash]);

  const stopAlarm = useCallback(async () => {
    alarmActiveRef.current = false;
    setAlarmActive(false);
    stopFlash();
    await alarmController.stop();
  }, [stopFlash]);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAlerts(false), loadRequests(), loadChildren()]);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async (silent = true) => {
    try {
      const { data } = await familyAPI.getAlerts();
      const alertList = data || [];
      setAlerts(alertList);
      await saveFamilyAlerts(alertList);

      const newUnread = alertList.filter((a) => !a.is_read).length;
      const hasActiveSos = alertList.some((a) => isRecentActiveSos(a));
      setUnreadCount(newUnread);

      const isInitialHydration = !initialAlertsHydratedRef.current;
      if (isInitialHydration) {
        initialAlertsHydratedRef.current = true;
        prevUnreadRef.current = newUnread;

        // On first login, only ring when there is an actually active SOS.
        if (hasActiveSos && !alarmActiveRef.current) {
          await triggerAlarm();
        }
        return;
      }

      if (hasActiveSos && !alarmActiveRef.current) {
        await triggerAlarm();
      }

      if (newUnread > prevUnreadRef.current) {
        await triggerAlarm();
      }

      // Auto-stop guardian alarm once SOS has been cancelled/resolved by the child.
      if (!hasActiveSos && alarmActiveRef.current) {
        await stopAlarm();
      }

      prevUnreadRef.current = newUnread;
    } catch {
      if (!silent) {
        const cached = await getFamilyAlerts();
        setAlerts(cached);
        const n = cached.filter((a) => !a.is_read).length;
        setUnreadCount(n);
        prevUnreadRef.current = n;
      }
    }
  };

  const pollAlerts = () => loadAlerts(true);

  const loadRequests = async () => {
    try {
      const { data } = await familyAPI.pendingRequests();
      setRequests(data || []);
    } catch {
      setRequests([]);
    }
  };

  const loadChildren = async () => {
    try {
      const { data } = await familyAPI.myChildren();
      const links = data || [];
      setChildren(links);
      await saveFamilyLinks(links);
    } catch {
      const cached = await getFamilyLinks();
      setChildren(cached);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleMarkRead = async (id) => {
    try {
      await familyAPI.markRead(id);
      await loadAlerts(false);
      if (unreadCount <= 1) await stopAlarm();
    } catch { Alert.alert("Error", "Could not mark as read."); }
  };

  const handleMarkAllRead = async () => {
    try {
      await familyAPI.markAllRead();
      await loadAlerts(false);
      await stopAlarm();
    } catch { Alert.alert("Error", "Could not mark all as read."); }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Alert", "Remove this alert permanently?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await familyAPI.deleteAlert(id);
          await loadAlerts(false);
        } catch { Alert.alert("Error", "Could not delete."); }
      }},
    ]);
  };

  const handleAccept = async (linkId) => {
    try {
      await familyAPI.accept(linkId);
      await Promise.all([loadRequests(), loadChildren()]);
      Alert.alert("✅ Accepted", "You are now linked as a guardian.");
    } catch { Alert.alert("Error", "Could not accept."); }
  };

  const handleReject = async (linkId) => {
    try {
      await familyAPI.reject(linkId);
      await loadRequests();
    } catch { Alert.alert("Error", "Could not reject."); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const unreadAlerts  = alerts.filter((a) => !a.is_read);
  const readAlerts    = alerts.filter((a) => a.is_read);

  return (
    <SafeAreaView style={styles.safe}>

      {/* Alarm banner */}
      {alarmActive && (
        <Animated.View style={[styles.alarmBanner, { opacity: flashAnim }]}>
          <Text style={styles.alarmBannerText}>🚨  EMERGENCY ALERT — CHILD NEEDS HELP  🚨</Text>
          <TouchableOpacity style={styles.stopAlarmBtn} onPress={stopAlarm}>
            <Text style={styles.stopAlarmBtnText}>STOP ALARM</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Guardian Dashboard</Text>
        <Text style={styles.headerSub}>Welcome, {user?.full_name?.split(" ")[0] || "Guardian"}</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {[
          { id: "alerts",   label: `Alerts${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
          { id: "requests", label: `Requests${requests.length > 0 ? ` (${requests.length})` : ""}` },
          { id: "children", label: `Children (${children.length})` },
        ].map(({ id, label }) => (
          <TouchableOpacity
            key={id}
            style={[styles.tab, activeTab === id && styles.tabActive]}
            onPress={() => setActiveTab(id)}
          >
            <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        >
          {/* ── Alerts tab ─────────────────────────────────────────────────── */}
          {activeTab === "alerts" && (
            <>
              {alerts.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>🛡️</Text>
                  <Text style={styles.emptyTitle}>No alerts yet</Text>
                  <Text style={styles.emptyDesc}>When a linked child sends an SOS, it will appear here.</Text>
                </View>
              ) : (
                <>
                  {unreadCount > 0 && (
                    <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
                      <Text style={styles.markAllBtnText}>✅ Mark all {unreadCount} read</Text>
                    </TouchableOpacity>
                  )}

                  {unreadAlerts.length > 0 && (
                    <>
                      <Text style={styles.sectionLabel}>UNREAD ({unreadAlerts.length})</Text>
                      {unreadAlerts.map((a) => (
                        <AlertCard
                          key={a.id}
                          alert={a}
                          onMarkRead={handleMarkRead}
                          onDelete={handleDelete}
                        />
                      ))}
                    </>
                  )}

                  {readAlerts.length > 0 && (
                    <>
                      <Text style={styles.sectionLabel}>READ</Text>
                      {readAlerts.map((a) => (
                        <AlertCard
                          key={a.id}
                          alert={a}
                          onMarkRead={handleMarkRead}
                          onDelete={handleDelete}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Requests tab ───────────────────────────────────────────────── */}
          {activeTab === "requests" && (
            <>
              {requests.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>🔗</Text>
                  <Text style={styles.emptyTitle}>No pending requests</Text>
                  <Text style={styles.emptyDesc}>Ask your child to send a link request to your email.</Text>
                </View>
              ) : (
                requests.map((req) => (
                  <View key={req.id} style={styles.requestCard}>
                    <Text style={styles.requestName}>{req.child_name || "Unknown"}</Text>
                    <Text style={styles.requestEmail}>{req.child_email}</Text>
                    <Text style={styles.requestDate}>Requested {fmtTime(req.created_at)}</Text>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: COLORS.successBg, borderColor: COLORS.success, flex: 1 }]}
                        onPress={() => handleAccept(req.id)}
                      >
                        <Text style={[styles.actionBtnText, { color: COLORS.success }]}>✅ Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: COLORS.dangerBg, borderColor: COLORS.danger, flex: 1 }]}
                        onPress={() => handleReject(req.id)}
                      >
                        <Text style={[styles.actionBtnText, { color: COLORS.danger }]}>✗ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {/* ── Children tab ────────────────────────────────────────────────── */}
          {activeTab === "children" && (
            <>
              {children.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>👦</Text>
                  <Text style={styles.emptyTitle}>No linked children</Text>
                  <Text style={styles.emptyDesc}>Accept link requests from children to start monitoring.</Text>
                </View>
              ) : (
                children.map((link) => (
                  <View key={link.id} style={styles.childCard}>
                    <Text style={styles.childIcon}>👦</Text>
                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>{link.child_name || "Child"}</Text>
                      <Text style={styles.childEmail}>{link.child_email}</Text>
                      {link.child_phone && <Text style={styles.childPhone}>📞 {link.child_phone}</Text>}
                      <View style={[styles.statusBadge, { backgroundColor: COLORS.successBg }]}>
                        <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>● Active</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 40 },

  alarmBanner: {
    backgroundColor: COLORS.danger,
    paddingVertical: 10, paddingHorizontal: 16,
    alignItems: "center",
  },
  alarmBannerText: { color: COLORS.white, fontWeight: "800", fontSize: 13, textAlign: "center", marginBottom: 8 },
  stopAlarmBtn: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    paddingHorizontal: 24, paddingVertical: 7,
  },
  stopAlarmBtnText: { color: COLORS.danger, fontWeight: "800", fontSize: 13 },

  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: COLORS.white, ...SHADOW.sm },
  headerTitle: { fontSize: 20, fontWeight: "800", color: COLORS.primary },
  headerSub: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },

  tabBar: { flexDirection: "row", backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: "600", color: COLORS.gray400 },
  tabTextActive: { color: COLORS.primary },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: COLORS.gray400, letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  markAllBtn: {
    backgroundColor: COLORS.successBg, borderRadius: RADIUS.md, borderWidth: 1.5,
    borderColor: COLORS.success, padding: 12, alignItems: "center", marginBottom: 12,
  },
  markAllBtnText: { color: COLORS.success, fontWeight: "700" },

  // Alert card
  alertCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 14, marginBottom: 14, ...SHADOW.sm,
    borderLeftWidth: 3, borderLeftColor: COLORS.border,
  },
  alertCardNew: { borderLeftColor: COLORS.danger },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  alertLeft: { flex: 1 },
  alertName: { fontSize: 16, fontWeight: "800", color: COLORS.gray800 },
  alertPhone: { fontSize: 13, color: COLORS.primary, marginTop: 2 },
  alertTime: { fontSize: 11, color: COLORS.gray400, marginTop: 3 },
  newBadge: { backgroundColor: COLORS.danger, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  newBadgeText: { color: COLORS.white, fontWeight: "800", fontSize: 11 },
  alertMsg: { fontSize: 14, color: COLORS.text, marginBottom: 10, lineHeight: 20 },

  // Map
  mapSection: { marginBottom: 10 },
  mapToggle: { paddingVertical: 6 },
  mapToggleText: { fontSize: 13, color: COLORS.primary, fontWeight: "600" },
  openMapBtn: { backgroundColor: "#f0f9ff", borderRadius: RADIUS.md, padding: 12, marginTop: 6, borderWidth: 1, borderColor: "#bae6fd" },
  openMapBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: "700" },
  openMapBtnSub: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },
  noLocation: { fontSize: 12, color: COLORS.gray400, marginBottom: 6 },

  // Photo
  photoSection: { marginBottom: 10 },
  selfieImg: { width: "100%", height: 240, borderRadius: RADIUS.md, marginTop: 6 },

  // Actions
  alertActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { borderWidth: 1.5, borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 14, alignItems: "center" },
  actionBtnText: { fontWeight: "700", fontSize: 13 },

  // Requests
  requestCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, ...SHADOW.sm,
    borderLeftWidth: 3, borderLeftColor: "#a78bfa",
  },
  requestName: { fontSize: 16, fontWeight: "800", color: COLORS.gray800 },
  requestEmail: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  requestDate: { fontSize: 12, color: COLORS.gray400, marginTop: 4, marginBottom: 12 },
  requestActions: { flexDirection: "row", gap: 10 },

  // Children
  childCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, ...SHADOW.sm,
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  childIcon: { fontSize: 36 },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: "800", color: COLORS.gray800 },
  childEmail: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  childPhone: { fontSize: 13, color: COLORS.primary, marginTop: 2 },
  statusBadge: { alignSelf: "flex-start", borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },

  // Empty state
  emptyBox: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.gray700 },
  emptyDesc: { fontSize: 14, color: COLORS.gray400, textAlign: "center", marginTop: 8, lineHeight: 20 },
});

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { sessionsAPI } from "../../services/api";
import { WEB_BASE_URL } from "../../config";
import { COLORS, RADIUS, SHADOW } from "../../theme";

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function CounselorAppointmentsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState([]);

  const loadAppointments = useCallback(async () => {
    try {
      const { data } = await sessionsAPI.pendingAppointments();
      setAppointments(data || []);
    } catch {
      Alert.alert("Error", "Unable to load appointments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const respond = async (roomId, action) => {
    try {
      await sessionsAPI.respondToAppointment(roomId, { action, response_notes: null });
      await loadAppointments();
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.detail || `Could not ${action} appointment.`);
    }
  };

  const openCall = async (appointment) => {
    const url = `${WEB_BASE_URL}/counseling/call/${appointment.room_id}?type=${appointment.call_type || "video"}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open call", `Open this URL in a browser: ${url}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.room_id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadAppointments(); }} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Pending Appointment Requests</Text>
            <Text style={styles.headerSub}>Review, accept, reject, or open the call room from here.</Text>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No pending appointments right now.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.user_name}</Text>
            <Text style={styles.meta}>{item.topic || "Counseling session"}</Text>
            <Text style={styles.meta}>{item.call_type || "video"} call · {fmtTime(item.scheduled_for)}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(item.room_id, "accept")}>
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.declineBtn} onPress={() => respond(item.room_id, "reject")}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.joinBtn} onPress={() => openCall(item)}>
              <Text style={styles.joinText}>Open Call Room</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 36 },
  header: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: 18, marginBottom: 14, ...SHADOW.md },
  headerTitle: { color: COLORS.white, fontSize: 22, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 6 },
  backBtn: { alignSelf: "flex-start", marginTop: 12, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  backText: { color: COLORS.white, fontWeight: "700", fontSize: 12 },
  empty: { color: COLORS.gray400, fontSize: 13, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 10, ...SHADOW.sm },
  name: { fontSize: 15, fontWeight: "800", color: COLORS.gray800 },
  meta: { fontSize: 12, color: COLORS.gray500, marginTop: 4 },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  acceptBtn: { flex: 1, backgroundColor: "#dcfce7", borderRadius: RADIUS.md, paddingVertical: 10, alignItems: "center" },
  declineBtn: { flex: 1, backgroundColor: "#fee2e2", borderRadius: RADIUS.md, paddingVertical: 10, alignItems: "center" },
  acceptText: { color: "#15803d", fontWeight: "800" },
  declineText: { color: "#b91c1c", fontWeight: "800" },
  joinBtn: { marginTop: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: "center" },
  joinText: { color: COLORS.white, fontWeight: "800" },
});
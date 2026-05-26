import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { sessionsAPI } from "../../services/api";
import { WEB_BASE_URL } from "../../config";
import { COLORS, RADIUS, SHADOW } from "../../theme";

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function Card({ title, value, color, hint }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

export default function CounselorDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [waiting, setWaiting] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [history, setHistory] = useState([]);

  const loadAll = useCallback(async () => {
    try {
      const [dashRes, waitingRes, pendingRes, historyRes] = await Promise.all([
        sessionsAPI.counselorDashboard(),
        sessionsAPI.waiting(),
        sessionsAPI.pendingAppointments(),
        sessionsAPI.counselorSessions(),
      ]);
      setStats(dashRes.data || {});
      setWaiting(waitingRes.data || []);
      setPendingAppointments(pendingRes.data || []);
      setHistory(historyRes.data || []);
    } catch {
      Alert.alert("Error", "Failed to load counselor dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
  };

  const openCall = async (roomId, callType) => {
    const url = `${WEB_BASE_URL}/counseling/call/${roomId}?type=${callType || "video"}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open call", `Open this URL in a browser: ${url}`);
    }
  };

  const respond = async (appointment, action) => {
    try {
      await sessionsAPI.respondToAppointment(appointment.room_id, {
        action,
        response_notes: null,
      });
      await loadAll();
    } catch (err) {
      Alert.alert("Error", err?.response?.data?.detail || `Could not ${action} appointment.`);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const upcomingCount = stats?.upcoming_appointments || 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>Counselor Dashboard</Text>
          <Text style={styles.heroTitle}>Welcome, {user?.full_name?.split(" ")[0] || "Counselor"}</Text>
          <Text style={styles.heroSub}>{user?.email}</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <Card title="Upcoming" value={upcomingCount} color={COLORS.primary} hint="Pending + accepted appointments" />
          <Card title="Waiting" value={waiting.length} color={COLORS.warning} hint="Live queue" />
          <Card title="Active" value={stats?.active_sessions || 0} color={COLORS.success} hint="Ongoing sessions" />
        </View>

        <TouchableOpacity style={styles.appointmentsBanner} onPress={() => navigation.navigate("CounselorAppointments") }>
          <Text style={styles.appointmentsBannerTitle}>Appointment Requests</Text>
          <Text style={styles.appointmentsBannerSub}>{pendingAppointments.length} request(s) waiting for response</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Appointments</Text>
          {pendingAppointments.length === 0 ? (
            <Text style={styles.empty}>No pending appointments right now.</Text>
          ) : pendingAppointments.map((appt) => (
            <View key={appt.room_id} style={styles.card}>
              <Text style={styles.name}>{appt.user_name}</Text>
              <Text style={styles.meta}>{fmtTime(appt.scheduled_for)} · {appt.topic || "Counseling"}</Text>
              <Text style={styles.meta}>{appt.call_type || "video"} call</Text>
              <View style={styles.row}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => respond(appt, "accept")}>
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => respond(appt, "reject")}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Queue</Text>
          {waiting.length === 0 ? (
            <Text style={styles.empty}>No one waiting right now.</Text>
          ) : waiting.map((item) => (
            <View key={item.room_id} style={styles.card}>
              <Text style={styles.name}>{item.user_name}</Text>
              <Text style={styles.meta}>{item.topic || "General counseling"}</Text>
              <TouchableOpacity style={styles.joinBtn} onPress={() => openCall(item.room_id, item.call_type)}>
                <Text style={styles.joinText}>Open Call</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {history.length === 0 ? (
            <Text style={styles.empty}>No session history yet.</Text>
          ) : history.slice(0, 6).map((item) => (
            <View key={item.room_id} style={styles.card}>
              <Text style={styles.name}>{item.user_name}</Text>
              <Text style={styles.meta}>{item.call_type} · {item.status.replace(/_/g, " ")}</Text>
              <Text style={styles.meta}>{fmtTime(item.created_at)}</Text>
              {(item.status === "active" || item.status === "appointment_accepted") && (
                <TouchableOpacity style={styles.joinBtn} onPress={() => openCall(item.room_id, item.call_type)}>
                  <Text style={styles.joinText}>Join Call</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 16, paddingBottom: 36 },
  hero: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: 18, marginBottom: 14, ...SHADOW.md },
  heroKicker: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  heroTitle: { color: COLORS.white, fontSize: 24, fontWeight: "800", marginTop: 4 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4 },
  refreshBtn: { alignSelf: "flex-start", marginTop: 12, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  refreshBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 14, borderLeftWidth: 4, ...SHADOW.sm },
  statValue: { fontSize: 26, fontWeight: "800" },
  statTitle: { fontSize: 13, fontWeight: "700", color: COLORS.gray700, marginTop: 2 },
  statHint: { fontSize: 11, color: COLORS.gray400, marginTop: 4 },
  appointmentsBanner: { backgroundColor: "#f5f3ff", borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: "#ddd6fe", marginBottom: 14 },
  appointmentsBannerTitle: { color: "#6d28d9", fontSize: 15, fontWeight: "800" },
  appointmentsBannerSub: { color: "#7c3aed", fontSize: 12, marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: COLORS.gray800, marginBottom: 10 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, ...SHADOW.sm },
  name: { fontSize: 15, fontWeight: "800", color: COLORS.gray800 },
  meta: { fontSize: 12, color: COLORS.gray500, marginTop: 4 },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  acceptBtn: { flex: 1, backgroundColor: "#dcfce7", borderRadius: RADIUS.md, paddingVertical: 10, alignItems: "center" },
  declineBtn: { flex: 1, backgroundColor: "#fee2e2", borderRadius: RADIUS.md, paddingVertical: 10, alignItems: "center" },
  acceptText: { color: "#15803d", fontWeight: "800" },
  declineText: { color: "#b91c1c", fontWeight: "800" },
  joinBtn: { marginTop: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 11, alignItems: "center" },
  joinText: { color: COLORS.white, fontWeight: "800" },
  empty: { color: COLORS.gray400, fontSize: 13, textAlign: "center", paddingVertical: 16 },
  signOutBtn: { backgroundColor: "#111827", borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  signOutText: { color: COLORS.white, fontWeight: "800" },
});
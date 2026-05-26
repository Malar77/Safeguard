import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { incidentAPI, sosAPI } from "../../services/api";
import Logo from "../../components/Logo";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const STATUS_COLORS = {
  pending: { bg: "#fef3c7", text: "#b45309" },
  under_review: { bg: "#ede9fe", text: "#6d28d9" },
  resolved: { bg: "#dcfce7", text: "#15803d" },
  closed: { bg: "#f1f5f9", text: "#475569" },
};

function QuickAction({ icon, label, onPress, color = COLORS.primary }) {
  return (
    <TouchableOpacity style={[styles.quickAction, { borderColor: color + "33" }]} onPress={onPress}>
      <Text style={styles.quickIcon}>{icon}</Text>
      <Text style={[styles.quickLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [activeSOS, setActiveSOS] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [inc, sos] = await Promise.all([incidentAPI.my(), sosAPI.myAlerts()]);
      setIncidents(inc.data || []);
      setActiveSOS((sos.data || []).filter((a) => a.is_active));
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const stats = {
    total: incidents.length,
    resolved: incidents.filter((i) => i.status === "resolved").length,
    pending: incidents.filter((i) => i.status === "pending").length,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Logo size={34} icon />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.greeting}>Hello, {user?.full_name?.split(" ")[0] || "there"} 👋</Text>
            <Text style={styles.date}>{new Date().toDateString()}</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert("Sign Out", "Are you sure?", [
            { text: "Cancel" }, { text: "Sign Out", onPress: logout, style: "destructive" },
          ])}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* Active SOS Banner */}
        {activeSOS.length > 0 && (
          <TouchableOpacity style={styles.sosBanner} onPress={() => navigation.navigate("SOS")}>
            <Text style={styles.sosBannerText}>⚠️  {activeSOS.length} active SOS alert — Tap to manage</Text>
          </TouchableOpacity>
        )}

        {/* Admin quick link */}
        {user?.role === "admin" && (
          <TouchableOpacity style={styles.adminBanner} onPress={() => navigation.navigate("AdminDashboard")}>
            <Text style={styles.adminBannerText}>🔑  Admin Dashboard</Text>
            <Text style={{ color: COLORS.white, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: "Total Reports", value: stats.total, color: COLORS.primary },
            { label: "Resolved", value: stats.resolved, color: COLORS.success },
            { label: "Pending", value: stats.pending, color: COLORS.warning },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.statCard}>
              <Text style={[styles.statNum, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="🆘" label="Send SOS" onPress={() => navigation.navigate("SOS")} color={COLORS.danger} />
          <QuickAction icon="📝" label="Report" onPress={() => navigation.navigate("Report")} />
          <QuickAction icon="☎️" label="Helplines" onPress={() => navigation.navigate("Helplines")} color={COLORS.secondary} />
          <QuickAction icon="📍" label="Safe Places" onPress={() => navigation.navigate("SafeRoutes")} color="#0891b2" />
          <QuickAction icon="⚖️" label="Legal Aid" onPress={() => navigation.navigate("LegalResources")} color="#7c3aed" />
          <QuickAction icon="💬" label="Counseling" onPress={() => navigation.navigate("Counseling")} color="#059669" />
          <QuickAction icon="🧒" label="Child Safety" onPress={() => navigation.navigate("ChildSafety")} color="#d97706" />
          <QuickAction icon="📋" label="My Reports" onPress={() => navigation.navigate("MyIncidents")} color={COLORS.gray600} />
        </View>

        {/* Recent Incidents */}
        {incidents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            {incidents.slice(0, 3).map((inc) => {
              const sc = STATUS_COLORS[inc.status] || STATUS_COLORS.closed;
              return (
                <View key={inc.id} style={styles.incidentCard}>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{inc.status.replace(/_/g, " ")}</Text>
                  </View>
                  <Text style={styles.incidentTitle} numberOfLines={1}>{inc.title}</Text>
                  <Text style={styles.incidentMeta}>
                    {inc.incident_type.replace(/_/g, " ")} · {new Date(inc.created_at).toLocaleDateString()}
                  </Text>
                </View>
              );
            })}
            <TouchableOpacity onPress={() => navigation.navigate("MyIncidents")} style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>See all reports →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Emergency numbers */}
        <View style={styles.emergencyBox}>
          <Text style={styles.emergencyTitle}>🚨 Emergency Numbers</Text>
          {[
            ["Police", "100"],
            ["Ambulance", "102"],
            ["Women Helpline", "1091"],
            ["Child Helpline", "1098"],
            ["National Emergency", "112"],
          ].map(([name, num]) => (
            <View key={num} style={styles.emergencyRow}>
              <Text style={styles.emergencyName}>{name}</Text>
              <Text style={styles.emergencyNum}>{num}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  scroll: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  greeting: { fontSize: 20, fontWeight: "700", color: COLORS.gray800 },
  date: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  logoutText: { color: COLORS.gray400, fontSize: 13 },
  sosBanner: {
    backgroundColor: COLORS.danger, borderRadius: RADIUS.md, padding: 12,
    marginBottom: 12, alignItems: "center",
  },
  sosBannerText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  adminBanner: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: 12,
    marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  adminBannerText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: 14, alignItems: "center", ...SHADOW.sm,
  },
  statNum: { fontSize: 26, fontWeight: "800" },
  statLabel: { fontSize: 11, color: COLORS.gray500, marginTop: 2, textAlign: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray700, marginBottom: 10 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  quickAction: {
    width: "22%", aspectRatio: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, ...SHADOW.sm,
  },
  quickIcon: { fontSize: 22 },
  quickLabel: { fontSize: 10, fontWeight: "600", marginTop: 4, textAlign: "center" },
  incidentCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 14, marginBottom: 8, ...SHADOW.sm },
  statusBadge: { alignSelf: "flex-start", borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  incidentTitle: { fontSize: 15, fontWeight: "600", color: COLORS.gray800 },
  incidentMeta: { fontSize: 12, color: COLORS.gray400, marginTop: 2, textTransform: "capitalize" },
  seeAllBtn: { alignItems: "flex-end", marginBottom: 20, marginTop: 4 },
  seeAllText: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },
  emergencyBox: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, ...SHADOW.sm },
  emergencyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.danger, marginBottom: 12 },
  emergencyRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  emergencyName: { fontSize: 14, color: COLORS.gray700 },
  emergencyNum: { fontSize: 14, fontWeight: "700", color: COLORS.danger },
});

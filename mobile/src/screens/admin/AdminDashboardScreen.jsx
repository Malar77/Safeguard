import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { adminAPI, incidentAPI } from "../../services/api";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const TABS = ["Overview", "Incidents", "SOS Alerts", "Users"];
const STATUS_COLORS = {
  pending: { bg: "#fef3c7", text: "#b45309" },
  under_review: { bg: "#ede9fe", text: "#6d28d9" },
  resolved: { bg: "#dcfce7", text: "#15803d" },
  closed: { bg: "#f1f5f9", text: "#475569" },
};

export default function AdminDashboardScreen() {
  const [tab, setTab] = useState(0);
  const [incidents, setIncidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      const [inc, usr, sos] = await Promise.all([incidentAPI.all(), adminAPI.users(), adminAPI.sosAlerts()]);
      setIncidents(inc.data || []);
      setUsers(usr.data || []);
      setSosAlerts(sos.data || []);
    } catch (err) {
      Alert.alert("Error", "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  const updateStatus = async (id, status) => {
    try {
      await incidentAPI.update(id, { status });
      setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
    } catch { Alert.alert("Error", "Failed to update status."); }
  };

  const toggleUser = async (id) => {
    try {
      await adminAPI.toggleUser(id);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, is_active: !u.is_active } : u));
    } catch { Alert.alert("Error", "Failed to update user."); }
  };

  const resolveSOS = async (id) => {
    try {
      await adminAPI.resolveSOS(id);
      setSosAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_active: false, resolved_at: new Date().toISOString() } : a));
    } catch { Alert.alert("Error", "Failed to resolve alert."); }
  };

  const activeSOS = sosAlerts.filter((a) => a.is_active).length;
  const statusCounts = ["pending", "under_review", "resolved", "closed"].map((s) => ({
    status: s, count: incidents.filter((i) => i.status === s).length,
  }));

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Stats header */}
      <View style={styles.statsBar}>
        {[
          { label: "Incidents", value: incidents.length, color: COLORS.primary },
          { label: "Users", value: users.length, color: COLORS.secondary },
          { label: "Active SOS", value: activeSOS, color: COLORS.danger },
        ].map(({ label, value, color }) => (
          <View key={label} style={styles.stat}>
            <Text style={[styles.statNum, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            {label === "Active SOS" && value > 0 && <View style={styles.pulse} />}
          </View>
        ))}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === i && styles.tabBtnActive]} onPress={() => setTab(i)}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Overview ─────────────────────────── */}
        {tab === 0 && (
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>Incident Status</Text>
            {statusCounts.map(({ status, count }) => {
              const sc = STATUS_COLORS[status] || STATUS_COLORS.closed;
              const pct = incidents.length ? Math.round((count / incidents.length) * 100) : 0;
              return (
                <View key={status} style={styles.overviewRow}>
                  <View style={[styles.dot, { backgroundColor: sc.text }]} />
                  <Text style={styles.overviewLabel}>{status.replace(/_/g, " ")}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.bar, { width: `${pct}%`, backgroundColor: sc.text }]} />
                  </View>
                  <Text style={styles.overviewCount}>{count}</Text>
                </View>
              );
            })}
            {activeSOS > 0 && (
              <View style={styles.sosCard}>
                <Text style={styles.sosCardTitle}>⚠️ {activeSOS} Active SOS Alert{activeSOS > 1 ? "s" : ""}</Text>
                <TouchableOpacity onPress={() => setTab(2)}>
                  <Text style={styles.sosCardLink}>View & Resolve →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Incidents ────────────────────────── */}
        {tab === 1 && (
          <View style={{ gap: 8 }}>
            {incidents.length === 0 && <Text style={styles.empty}>No incidents yet.</Text>}
            {incidents.map((inc) => {
              const sc = STATUS_COLORS[inc.status] || STATUS_COLORS.closed;
              return (
                <View key={inc.id} style={styles.card}>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.text }]}>{inc.status.replace(/_/g, " ")}</Text>
                  </View>
                  <Text style={styles.incTitle}>{inc.title}</Text>
                  <Text style={styles.incMeta}>{inc.incident_type.replace(/_/g, " ")} · {new Date(inc.created_at).toLocaleDateString()}</Text>
                  {/* Status picker */}
                  <View style={styles.statusPicker}>
                    {["pending", "under_review", "resolved", "closed"].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.pickerChip, inc.status === s && styles.pickerChipActive]}
                        onPress={() => updateStatus(inc.id, s)}
                      >
                        <Text style={[styles.pickerText, inc.status === s && styles.pickerTextActive]}>
                          {s.replace(/_/g, " ")}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── SOS Alerts ───────────────────────── */}
        {tab === 2 && (
          <View style={{ gap: 8 }}>
            {sosAlerts.length === 0 && <Text style={styles.empty}>No SOS alerts yet.</Text>}
            {sosAlerts.map((a) => (
              <View key={a.id} style={[styles.card, a.is_active && { borderLeftWidth: 4, borderLeftColor: COLORS.danger, backgroundColor: "#fff5f5" }]}>
                <View style={styles.sosHeader}>
                  <View style={[styles.badge, { backgroundColor: a.is_active ? COLORS.danger : COLORS.successBg }]}>
                    <Text style={[styles.badgeText, { color: a.is_active ? COLORS.white : COLORS.success }]}>
                      {a.is_active ? "ACTIVE" : "RESOLVED"}
                    </Text>
                  </View>
                  <Text style={styles.alertId}>Alert #{a.id} · User #{a.user_id}</Text>
                </View>
                <Text style={styles.incTitle}>{a.message}</Text>
                {a.latitude && (
                  <Text style={styles.incMeta}>📍 {a.latitude.toFixed(5)}, {a.longitude.toFixed(5)}</Text>
                )}
                <Text style={styles.incMeta}>Triggered: {new Date(a.created_at).toLocaleString()}</Text>
                {a.resolved_at && <Text style={styles.incMeta}>Resolved: {new Date(a.resolved_at).toLocaleString()}</Text>}
                {a.is_active && (
                  <TouchableOpacity style={styles.resolveBtn} onPress={() => resolveSOS(a.id)}>
                    <Text style={styles.resolveBtnText}>✓ Mark Resolved</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Users ────────────────────────────── */}
        {tab === 3 && (
          <View style={{ gap: 8 }}>
            {users.map((u) => (
              <View key={u.id} style={styles.card}>
                <View style={styles.userRow}>
                  <View style={styles.userAvatar}>
                    <Text style={{ color: COLORS.white, fontWeight: "700" }}>{u.full_name?.[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.incTitle}>{u.full_name}</Text>
                    <Text style={styles.incMeta}>{u.email}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: u.role === "admin" ? "#fee2e2" : COLORS.gray100 }]}>
                    <Text style={[styles.badgeText, { color: u.role === "admin" ? COLORS.danger : COLORS.gray600 }]}>{u.role}</Text>
                  </View>
                </View>
                <View style={styles.userFooter}>
                  <Text style={styles.incMeta}>Joined: {new Date(u.created_at).toLocaleDateString()}</Text>
                  <TouchableOpacity
                    style={[styles.toggleBtn, { backgroundColor: u.is_active ? "#fff1f2" : "#f0fdf4" }]}
                    onPress={() => toggleUser(u.id)}
                  >
                    <Text style={{ color: u.is_active ? COLORS.danger : COLORS.success, fontSize: 12, fontWeight: "700" }}>
                      {u.is_active ? "Deactivate" : "Activate"}
                    </Text>
                  </TouchableOpacity>
                </View>
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
  statsBar: { flexDirection: "row", backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 20 },
  stat: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 24, fontWeight: "800", color: COLORS.white },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger, marginTop: 4 },
  tabBar: { flexDirection: "row", backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.gray500, fontWeight: "600" },
  tabTextActive: { color: COLORS.primary },
  scroll: { padding: 14, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.gray700 },
  overviewRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 12, ...SHADOW.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  overviewLabel: { fontSize: 13, color: COLORS.gray700, textTransform: "capitalize", width: 80 },
  barBg: { flex: 1, height: 6, backgroundColor: COLORS.gray100, borderRadius: 3, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 3 },
  overviewCount: { fontSize: 14, fontWeight: "700", color: COLORS.gray800, width: 28, textAlign: "right" },
  sosCard: { backgroundColor: "#fff1f2", borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: "#fecdd3" },
  sosCardTitle: { color: COLORS.danger, fontWeight: "700", fontSize: 14 },
  sosCardLink: { color: COLORS.danger, fontWeight: "600", fontSize: 13, marginTop: 8 },
  empty: { textAlign: "center", color: COLORS.gray400, marginTop: 40, fontSize: 14 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 14, ...SHADOW.sm },
  badge: { alignSelf: "flex-start", borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  incTitle: { fontSize: 14, fontWeight: "600", color: COLORS.gray800 },
  incMeta: { fontSize: 12, color: COLORS.gray400, marginTop: 2, textTransform: "capitalize" },
  statusPicker: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  pickerChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.gray100, borderWidth: 1, borderColor: COLORS.border },
  pickerChipActive: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  pickerText: { fontSize: 11, color: COLORS.gray600, fontWeight: "600", textTransform: "capitalize" },
  pickerTextActive: { color: COLORS.primary },
  sosHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  alertId: { fontSize: 12, color: COLORS.gray400 },
  resolveBtn: { marginTop: 10, backgroundColor: COLORS.successBg, borderRadius: RADIUS.md, paddingVertical: 9, alignItems: "center" },
  resolveBtnText: { color: COLORS.success, fontWeight: "700", fontSize: 13 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  userAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  userFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.gray100 },
  toggleBtn: { borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6 },
});

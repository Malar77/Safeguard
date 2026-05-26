import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { incidentAPI, sosAPI, authAPI } from "../../services/api";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const TABS = ["Account", "My Reports", "SOS History"];

const STATUS_COLORS = {
  pending: { bg: "#fef3c7", text: "#b45309" },
  under_review: { bg: "#ede9fe", text: "#6d28d9" },
  resolved: { bg: "#dcfce7", text: "#15803d" },
  closed: { bg: "#f1f5f9", text: "#475569" },
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState(0);
  const [incidents, setIncidents] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [inc, sos] = await Promise.all([incidentAPI.my(), sosAPI.myAlerts()]);
        setIncidents(inc.data || []);
        setSosAlerts(sos.data || []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.full_name?.[0]?.toUpperCase() || "?"}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || "user"}</Text>
        </View>
        <View style={styles.statsRow}>
          {[
            { label: "Reports", value: incidents.length },
            { label: "Resolved", value: incidents.filter((i) => i.status === "resolved").length },
            { label: "SOS Sent", value: sosAlerts.length },
          ].map(({ label, value }) => (
            <View key={label} style={styles.stat}>
              <Text style={styles.statNum}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === i && styles.tabBtnActive]} onPress={() => setTab(i)}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />}

        {/* Account Tab */}
        {!loading && tab === 0 && (
          <View style={styles.card}>
            {[
              { label: "Full Name", value: user?.full_name },
              { label: "Email", value: user?.email },
              { label: "Phone", value: user?.phone || "Not provided" },
              { label: "Account Role", value: user?.role },
              { label: "Member Since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—" },
              { label: "Account Status", value: user?.is_active ? "Active ✅" : "Inactive" },
            ].map(({ label, value }) => (
              <View key={label} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* My Reports Tab */}
        {!loading && tab === 1 && (
          <View style={{ gap: 10 }}>
            {incidents.length === 0 && (
              <Text style={styles.empty}>No incidents reported yet.</Text>
            )}
            {incidents.map((inc) => {
              const sc = STATUS_COLORS[inc.status] || STATUS_COLORS.closed;
              return (
                <View key={inc.id} style={styles.incCard}>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.text }]}>{inc.status.replace(/_/g, " ")}</Text>
                  </View>
                  <Text style={styles.incTitle}>{inc.title}</Text>
                  <Text style={styles.incMeta}>{inc.incident_type.replace(/_/g, " ")} · {new Date(inc.created_at).toLocaleDateString()}</Text>
                  {inc.description && <Text style={styles.incDesc} numberOfLines={2}>{inc.description}</Text>}
                  {inc.admin_note && (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteLabel}>Admin Note:</Text>
                      <Text style={styles.noteText}>{inc.admin_note}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* SOS History Tab */}
        {!loading && tab === 2 && (
          <View style={{ gap: 10 }}>
            {sosAlerts.length === 0 && <Text style={styles.empty}>No SOS alerts sent yet.</Text>}
            {sosAlerts.map((a) => (
              <View key={a.id} style={[styles.incCard, a.is_active && { borderLeftWidth: 3, borderLeftColor: COLORS.danger }]}>
                <View style={[styles.badge, { backgroundColor: a.is_active ? COLORS.danger : COLORS.successBg }]}>
                  <Text style={[styles.badgeText, { color: a.is_active ? COLORS.white : COLORS.success }]}>{a.is_active ? "ACTIVE" : "Resolved"}</Text>
                </View>
                <Text style={styles.incTitle}>{a.message}</Text>
                <Text style={styles.incMeta}>Sent: {new Date(a.created_at).toLocaleString()}</Text>
                {a.latitude && <Text style={styles.incDesc}>📍 {a.latitude.toFixed(5)}, {a.longitude.toFixed(5)}</Text>}
                {a.resolved_at && <Text style={styles.incDesc}>Resolved: {new Date(a.resolved_at).toLocaleString()}</Text>}
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
  header: { backgroundColor: COLORS.primary, padding: 20, alignItems: "center", paddingBottom: 28 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: COLORS.white },
  name: { fontSize: 20, fontWeight: "700", color: COLORS.white },
  email: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  roleBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4, marginTop: 8 },
  roleText: { color: COLORS.white, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  statsRow: { flexDirection: "row", marginTop: 16, gap: 24 },
  stat: { alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800", color: COLORS.white },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  tabBar: { flexDirection: "row", backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.gray500, fontWeight: "600" },
  tabTextActive: { color: COLORS.primary },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: 16, ...SHADOW.sm },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  infoLabel: { fontSize: 13, color: COLORS.gray500, fontWeight: "500" },
  infoValue: { fontSize: 13, color: COLORS.gray800, fontWeight: "600", flex: 1, textAlign: "right" },
  logoutBtn: { marginTop: 20, backgroundColor: "#fff1f2", borderRadius: RADIUS.md, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: "#fecdd3" },
  logoutText: { color: COLORS.danger, fontWeight: "700" },
  empty: { textAlign: "center", color: COLORS.gray400, marginTop: 40, fontSize: 14 },
  incCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 14, ...SHADOW.sm },
  badge: { alignSelf: "flex-start", borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  incTitle: { fontSize: 15, fontWeight: "600", color: COLORS.gray800 },
  incMeta: { fontSize: 12, color: COLORS.gray400, marginTop: 2, textTransform: "capitalize" },
  incDesc: { fontSize: 13, color: COLORS.gray600, marginTop: 6, lineHeight: 18 },
  noteBox: { marginTop: 8, backgroundColor: "#eff6ff", borderRadius: RADIUS.sm, padding: 10 },
  noteLabel: { fontSize: 11, fontWeight: "700", color: "#2563eb", marginBottom: 2 },
  noteText: { fontSize: 13, color: "#1e40af" },
});

import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { incidentAPI } from "../../services/api";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const STATUS_COLORS = {
  pending: { bg: "#fef3c7", text: "#b45309" },
  under_review: { bg: "#ede9fe", text: "#6d28d9" },
  resolved: { bg: "#dcfce7", text: "#15803d" },
  closed: { bg: "#f1f5f9", text: "#475569" },
};

export default function MyIncidentsScreen({ navigation }) {
  const [incidents, setIncidents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    try {
      const { data } = await incidentAPI.my();
      setIncidents(data || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        <View style={styles.topRow}>
          <Text style={styles.heading}>My Incidents</Text>
          <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate("Report")}>
            <Text style={styles.reportBtnText}>+ Report New</Text>
          </TouchableOpacity>
        </View>

        {incidents.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 48 }}>📋</Text>
            <Text style={styles.emptyText}>No incidents yet</Text>
            <Text style={styles.emptySub}>Tap "Report New" to submit your first report</Text>
          </View>
        )}

        {incidents.map((inc) => {
          const sc = STATUS_COLORS[inc.status] || STATUS_COLORS.closed;
          const isOpen = expanded === inc.id;
          return (
            <TouchableOpacity key={inc.id} style={styles.card} onPress={() => setExpanded(isOpen ? null : inc.id)} activeOpacity={0.85}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{inc.status.replace(/_/g, " ")}</Text>
                </View>
                <Text style={{ color: COLORS.gray400, fontSize: 18 }}>{isOpen ? "▲" : "▼"}</Text>
              </View>
              <Text style={styles.title}>{inc.title}</Text>
              <Text style={styles.meta}>
                {inc.incident_type.replace(/_/g, " ")} · {new Date(inc.created_at).toLocaleDateString()}
                {inc.is_anonymous ? " · Anonymous" : ""}
              </Text>
              {inc.location ? <Text style={styles.location}>📍 {inc.location}</Text> : null}

              {isOpen && (
                <View style={styles.expanded}>
                  <Text style={styles.desc}>{inc.description}</Text>
                  {inc.admin_note && (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteLabel}>📌 Admin Note</Text>
                      <Text style={styles.noteText}>{inc.admin_note}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  scroll: { padding: 16, paddingBottom: 40 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  heading: { fontSize: 22, fontWeight: "800", color: COLORS.gray800 },
  reportBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  reportBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 13 },
  empty: { alignItems: "center", marginTop: 60, gap: 8 },
  emptyText: { fontSize: 18, fontWeight: "700", color: COLORS.gray600 },
  emptySub: { fontSize: 13, color: COLORS.gray400, textAlign: "center" },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 14, marginBottom: 10, ...SHADOW.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  badge: { alignSelf: "flex-start", borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  title: { fontSize: 15, fontWeight: "600", color: COLORS.gray800 },
  meta: { fontSize: 12, color: COLORS.gray400, marginTop: 2, textTransform: "capitalize" },
  location: { fontSize: 12, color: COLORS.gray500, marginTop: 4 },
  expanded: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.gray100, paddingTop: 12 },
  desc: { fontSize: 14, color: COLORS.gray700, lineHeight: 20 },
  noteBox: { marginTop: 10, backgroundColor: "#eff6ff", borderRadius: RADIUS.sm, padding: 10 },
  noteLabel: { fontSize: 12, fontWeight: "700", color: "#2563eb", marginBottom: 4 },
  noteText: { fontSize: 13, color: "#1e40af", lineHeight: 18 },
});

import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { helplineAPI } from "../../services/api";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const CATEGORIES = ["All", "Emergency", "Women", "Child", "Legal", "Medical"];

export default function HelplinesScreen() {
  const [helplines, setHelplines] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    helplineAPI.list().then(({ data }) => setHelplines(data || [])).catch(() => {});
  }, []);

  const filtered = filter === "All" ? helplines : helplines.filter((h) =>
    h.category?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Filter chips */}
      <View style={styles.filterRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, filter === c && styles.chipActive]}
            onPress={() => setFilter(c)}
          >
            <Text style={[styles.chipText, filter === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No helplines found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.category && <Text style={styles.category}>{item.category}</Text>}
              </View>
              <View style={styles.numBox}>
                <Text style={styles.num}>{item.number}</Text>
              </View>
            </View>
            {item.description && <Text style={styles.desc}>{item.description}</Text>}
            {item.available_hours && (
              <Text style={styles.hours}>🕐 {item.available_hours}</Text>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexWrap: "wrap", backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.gray100, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.gray600, fontWeight: "600" },
  chipTextActive: { color: COLORS.primary },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  empty: { textAlign: "center", color: COLORS.gray400, marginTop: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, ...SHADOW.sm },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  name: { fontSize: 15, fontWeight: "700", color: COLORS.gray800 },
  category: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  numBox: { backgroundColor: COLORS.dangerBg, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6 },
  num: { fontSize: 16, fontWeight: "900", color: COLORS.danger },
  desc: { fontSize: 13, color: COLORS.gray600, marginTop: 8, lineHeight: 18 },
  hours: { fontSize: 12, color: COLORS.gray400, marginTop: 6 },
});

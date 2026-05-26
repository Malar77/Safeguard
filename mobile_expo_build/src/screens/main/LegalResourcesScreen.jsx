import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { legalAPI } from "../../services/api";
import { COLORS, RADIUS, SHADOW } from "../../theme";

export default function LegalResourcesScreen() {
  const [resources, setResources] = useState([]);

  useEffect(() => {
    legalAPI.list().then(({ data }) => setResources(data || [])).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={resources}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <View style={styles.banner}>
            <Text style={styles.bannerIcon}>⚖️</Text>
            <Text style={styles.bannerTitle}>Legal Resources</Text>
            <Text style={styles.bannerSub}>Know your rights and access free legal aid services</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No legal resources available.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            {item.organization && <Text style={styles.org}>{item.organization}</Text>}
            {item.description && <Text style={styles.desc}>{item.description}</Text>}
            <View style={styles.row}>
              {item.phone && <Text style={styles.phone}>📞 {item.phone}</Text>}
              {item.is_free && (
                <View style={styles.freeBadge}>
                  <Text style={styles.freeText}>FREE</Text>
                </View>
              )}
            </View>
            {item.address && <Text style={styles.address}>📍 {item.address}</Text>}
            {item.website && <Text style={styles.website}>🌐 {item.website}</Text>}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  banner: { backgroundColor: COLORS.secondary, padding: 20, alignItems: "center", marginBottom: 16 },
  bannerIcon: { fontSize: 40 },
  bannerTitle: { fontSize: 20, fontWeight: "800", color: COLORS.white, marginTop: 8 },
  bannerSub: { fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { textAlign: "center", color: COLORS.gray400, marginTop: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 10, ...SHADOW.sm },
  name: { fontSize: 15, fontWeight: "700", color: COLORS.gray800 },
  org: { fontSize: 12, color: COLORS.secondary, marginTop: 2, fontWeight: "600" },
  desc: { fontSize: 13, color: COLORS.gray600, marginTop: 8, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  phone: { fontSize: 13, color: COLORS.danger, fontWeight: "600" },
  freeBadge: { backgroundColor: "#dcfce7", borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  freeText: { fontSize: 11, fontWeight: "700", color: COLORS.success },
  address: { fontSize: 12, color: COLORS.gray500, marginTop: 4 },
  website: { fontSize: 12, color: "#2563eb", marginTop: 4 },
});

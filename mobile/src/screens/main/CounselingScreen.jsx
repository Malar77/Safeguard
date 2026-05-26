import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { counselingAPI } from "../../services/api";
import { COLORS, RADIUS, SHADOW } from "../../theme";

export default function CounselingScreen() {
  const [resources, setResources] = useState([]);

  useEffect(() => {
    counselingAPI.list().then(({ data }) => setResources(data || [])).catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={resources}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <View style={styles.banner}>
            <Text style={styles.bannerIcon}>💬</Text>
            <Text style={styles.bannerTitle}>Counseling Support</Text>
            <Text style={styles.bannerSub}>Talk to a certified professional — you are not alone</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No resources available at this time.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            {item.organization && <Text style={styles.org}>{item.organization}</Text>}
            {item.description && <Text style={styles.desc}>{item.description}</Text>}
            <View style={styles.row}>
              {item.phone && <Text style={styles.phone}>📞 {item.phone}</Text>}
              {item.is_online && (
                <View style={styles.onlineBadge}>
                  <Text style={styles.onlineText}>🌐 Online</Text>
                </View>
              )}
            </View>
            {item.language && <Text style={styles.lang}>Languages: {item.language}</Text>}
            {item.is_free && <Text style={styles.free}>✔ Free of charge</Text>}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  banner: { backgroundColor: "#059669", padding: 20, alignItems: "center", marginBottom: 16 },
  bannerIcon: { fontSize: 40 },
  bannerTitle: { fontSize: 20, fontWeight: "800", color: COLORS.white, marginTop: 8 },
  bannerSub: { fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { textAlign: "center", color: COLORS.gray400, marginTop: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginBottom: 10, ...SHADOW.sm },
  name: { fontSize: 15, fontWeight: "700", color: COLORS.gray800 },
  org: { fontSize: 12, color: "#059669", marginTop: 2, fontWeight: "600" },
  desc: { fontSize: 13, color: COLORS.gray600, marginTop: 8, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  phone: { fontSize: 13, color: COLORS.danger, fontWeight: "600" },
  onlineBadge: { backgroundColor: "#dcfce7", borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  onlineText: { fontSize: 12, color: "#059669", fontWeight: "600" },
  lang: { fontSize: 12, color: COLORS.gray500, marginTop: 4 },
  free: { fontSize: 12, color: "#059669", fontWeight: "600", marginTop: 4 },
});

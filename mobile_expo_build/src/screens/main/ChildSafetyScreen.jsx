import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { childSafetyAPI } from "../../services/api";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const CAUTION_SIGNS = [
  "Unexplained changes in behaviour or mood",
  "Fear of a particular person or place",
  "Withdrawal from family and friends",
  "Unexplained injuries or marks",
  "Age-inappropriate sexual knowledge",
  "Sudden decline in academic performance",
  "Nightmares or bedwetting (regression)",
  "Running away from home",
];

const SAFETY_TIPS = [
  { icon: "🗣️", title: "Teach Body Autonomy", desc: "Educate children that their body belongs to them and no one can touch without permission." },
  { icon: "🔒", title: "Safe vs Unsafe Touch", desc: "Help children understand the difference between safe and unsafe physical contact." },
  { icon: "📢", title: "Encourage Reporting", desc: "Create an environment where children feel safe to report uncomfortable situations." },
  { icon: "💻", title: "Online Safety", desc: "Monitor online activity, set parental controls, and discuss internet safety regularly." },
  { icon: "🏫", title: "School Safety Plans", desc: "Know your school's safety protocols and emergency contact procedures." },
  { icon: "🤝", title: "Trusted Adults Network", desc: "Help your child identify 3-5 trusted adults they can approach for help." },
];

const HELPLINES = [
  { name: "Childline India", number: "1098", desc: "24/7 free child helpline" },
  { name: "National Emergency", number: "112", desc: "Police, fire, ambulance" },
  { name: "POCSO Helpline", number: "1800-419-0188", desc: "Protection of Children" },
];

export default function ChildSafetyScreen() {
  const [dbTips, setDbTips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    childSafetyAPI.list()
      .then(({ data }) => setDbTips(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Banner */}
        <View style={styles.banner}>
          <Text style={{ fontSize: 48 }}>🧒</Text>
          <Text style={styles.bannerTitle}>Child Safety Guide</Text>
          <Text style={styles.bannerSub}>Protect every child — recognize, respond, report</Text>
        </View>

        {/* Emergency helplines */}
        <Text style={styles.sectionTitle}>🆘 Emergency Helplines</Text>
        {HELPLINES.map((h) => (
          <View key={h.number} style={[styles.card, styles.emergCard]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.emName}>{h.name}</Text>
              <Text style={styles.emDesc}>{h.desc}</Text>
            </View>
            <View style={styles.numBox}>
              <Text style={styles.num}>{h.number}</Text>
            </View>
          </View>
        ))}

        {/* Database tips */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ margin: 20 }} />
        ) : dbTips.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>📚 Child Safety Resources</Text>
            {dbTips.map((tip) => (
              <View key={tip.id} style={[styles.card, { marginBottom: 8 }]}>
                <View style={styles.catBadge}>
                  <Text style={styles.catText}>{(tip.category || "general").replace(/_/g, " ")}</Text>
                </View>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDesc}>{tip.content}</Text>
                {tip.source ? <Text style={styles.tipSource}>Source: {tip.source}</Text> : null}
              </View>
            ))}
          </>
        ) : null}

        {/* Warning signs */}
        <Text style={styles.sectionTitle}>⚠️ Warning Signs of Abuse</Text>
        <View style={styles.card}>
          {CAUTION_SIGNS.map((sign, i) => (
            <View key={i} style={styles.signRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.signText}>{sign}</Text>
            </View>
          ))}
        </View>

        {/* Safety tips */}
        <Text style={styles.sectionTitle}>🛡️ Child Safety Tips</Text>
        {SAFETY_TIPS.map((tip) => (
          <View key={tip.title} style={styles.tipCard}>
            <Text style={styles.tipIcon}>{tip.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDesc}>{tip.desc}</Text>
            </View>
          </View>
        ))}

        {/* POCSO act note */}
        <View style={styles.lawCard}>
          <Text style={styles.lawTitle}>📜 POCSO Act 2012</Text>
          <Text style={styles.lawText}>
            The Protection of Children from Sexual Offences (POCSO) Act 2012 is a comprehensive law designed to protect children from sexual abuse and exploitation. Under this act, any sexual offence against a person below 18 years is a serious criminal offence. Reporting is mandatory for anyone who has knowledge of such an offence.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  scroll: { paddingBottom: 40 },
  banner: { backgroundColor: "#d97706", padding: 24, alignItems: "center" },
  bannerTitle: { fontSize: 22, fontWeight: "800", color: COLORS.white, marginTop: 8 },
  bannerSub: { fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray700, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 16, marginHorizontal: 16, ...SHADOW.sm },
  emergCard: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 10 },
  emName: { fontSize: 14, fontWeight: "700", color: COLORS.gray800 },
  emDesc: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  numBox: { backgroundColor: COLORS.dangerBg, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 6 },
  num: { fontSize: 16, fontWeight: "900", color: COLORS.danger },
  signRow: { flexDirection: "row", paddingVertical: 6, gap: 8 },
  bullet: { color: COLORS.danger, fontWeight: "700", fontSize: 16, lineHeight: 22 },
  signText: { fontSize: 13, color: COLORS.gray700, flex: 1, lineHeight: 20 },
  tipCard: { flexDirection: "row", backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 14, marginHorizontal: 16, marginBottom: 8, gap: 12, ...SHADOW.sm },
  tipIcon: { fontSize: 28 },
  tipTitle: { fontSize: 14, fontWeight: "700", color: COLORS.gray800 },
  tipDesc: { fontSize: 13, color: COLORS.gray600, marginTop: 4, lineHeight: 18 },
  tipSource: { fontSize: 11, color: COLORS.gray400, marginTop: 4, fontStyle: "italic" },
  catBadge: { backgroundColor: "#dbeafe", borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 6 },
  catText: { fontSize: 11, color: "#1d4ed8", fontWeight: "600", textTransform: "capitalize" },
  lawCard: { backgroundColor: "#fef3c7", borderRadius: RADIUS.lg, padding: 16, marginHorizontal: 16, marginTop: 12 },
  lawTitle: { fontSize: 15, fontWeight: "700", color: "#92400e", marginBottom: 8 },
  lawText: { fontSize: 13, color: "#78350f", lineHeight: 20 },
});

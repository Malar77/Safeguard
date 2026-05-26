import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { incidentAPI } from "../../services/api";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const INCIDENT_TYPES = [
  { value: "harassment", label: "Harassment" },
  { value: "assault", label: "Assault" },
  { value: "domestic_violence", label: "Domestic Violence" },
  { value: "stalking", label: "Stalking" },
  { value: "cyber_crime", label: "Cyber Crime" },
  { value: "child_abuse", label: "Child Abuse" },
  { value: "trafficking", label: "Trafficking" },
  { value: "other", label: "Other" },
];

export default function ReportIncidentScreen({ navigation }) {
  const [form, setForm] = useState({
    title: "", description: "", incident_type: "harassment", location: "", is_anonymous: false,
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title || !form.description) {
      return Alert.alert("Missing fields", "Please fill in title and description.");
    }
    setLoading(true);
    try {
      await incidentAPI.report(form);
      Alert.alert(
        "✅ Reported",
        "Your incident has been reported. You can track its status in My Reports.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to submit report.";
      Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>📝 Report Incident</Text>
          <Text style={styles.sub}>All reports are confidential. You may choose to report anonymously.</Text>

          <View style={styles.card}>
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Brief description of what happened"
                placeholderTextColor={COLORS.gray400}
                value={form.title}
                onChangeText={set("title")}
              />
            </View>

            {/* Type */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Incident Type *</Text>
              <View style={styles.typeGrid}>
                {INCIDENT_TYPES.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.typeChip, form.incident_type === value && styles.typeChipActive]}
                    onPress={() => set("incident_type")(value)}
                  >
                    <Text style={[styles.typeText, form.incident_type === value && styles.typeTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide detailed information about the incident..."
                placeholderTextColor={COLORS.gray400}
                value={form.description}
                onChangeText={set("description")}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            {/* Location */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Location (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MG Road, Bangalore"
                placeholderTextColor={COLORS.gray400}
                value={form.location}
                onChangeText={set("location")}
              />
            </View>

            {/* Anonymous */}
            <TouchableOpacity
              style={styles.anonRow}
              onPress={() => set("is_anonymous")(!form.is_anonymous)}
            >
              <View style={[styles.checkbox, form.is_anonymous && styles.checkboxActive]}>
                {form.is_anonymous && <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: "700" }}>✓</Text>}
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.anonLabel}>Report Anonymously</Text>
                <Text style={styles.anonHint}>Your name will be hidden from this report</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.btnText}>Submit Report</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  scroll: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "800", color: COLORS.gray800, marginBottom: 6 },
  sub: { fontSize: 13, color: COLORS.gray500, marginBottom: 20, lineHeight: 20 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: 20, ...SHADOW.md },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.gray700, marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: COLORS.text, backgroundColor: COLORS.gray50,
  },
  textArea: { minHeight: 110 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.gray50,
  },
  typeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  typeText: { fontSize: 13, color: COLORS.gray600, fontWeight: "500" },
  typeTextActive: { color: COLORS.primary, fontWeight: "700" },
  anonRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.gray50,
    borderRadius: RADIUS.md, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: COLORS.border,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: COLORS.gray300, alignItems: "center", justifyContent: "center",
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  anonLabel: { fontSize: 14, fontWeight: "600", color: COLORS.gray700 },
  anonHint: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center", ...SHADOW.sm },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
});

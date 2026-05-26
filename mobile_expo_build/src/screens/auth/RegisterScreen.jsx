import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../components/Logo";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const ROLE_OPTIONS = [
  {
    value: "child",
    icon: "👦",
    label: "Child / Minor",
    color: "#2563eb",
    bg: "#eff6ff",
    description: "Under 18 — protected by linked guardians",
  },
  {
    value: "women",
    icon: "👩",
    label: "Woman / Adult",
    color: COLORS.primary,
    bg: COLORS.primaryBg,
    description: "Personal safety & one-tap SOS access",
  },
  {
    value: "parent",
    icon: "🛡️",
    label: "Parent / Guardian",
    color: "#7c3aed",
    bg: "#f5f3ff",
    description: "Monitor linked children's safety alerts",
  },
];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [role, setRole] = useState("child");
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", password: "", confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleRegister = async () => {
    if (!form.full_name || !form.email || !form.password) {
      return Alert.alert("Missing fields", "Please fill in all required fields.");
    }
    if (form.password !== form.confirmPassword) {
      return Alert.alert("Password mismatch", "Passwords do not match.");
    }
    if (form.password.length < 8) {
      return Alert.alert("Weak password", "Password must be at least 8 characters.");
    }
    setLoading(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role,
      });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Registration failed.";
      Alert.alert("Error", typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[COLORS.primaryDark, COLORS.primary, "#7c3aed"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.gradHeader}
      >
        <SafeAreaView>
          <View style={styles.header}>
            <Logo size={56} white />
          </View>
        </SafeAreaView>
      </LinearGradient>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.card}>
            <Text style={styles.title}>Get protected</Text>
            <Text style={styles.subtitle}>Choose your account type</Text>

            {/* Role selector */}
            <View style={styles.roleRow}>
              {ROLE_OPTIONS.map((opt) => {
                const selected = role === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.roleCard,
                      { borderColor: selected ? opt.color : COLORS.border,
                        backgroundColor: selected ? opt.bg : COLORS.white },
                    ]}
                    onPress={() => setRole(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.roleIcon}>{opt.icon}</Text>
                    <Text style={[styles.roleLabel, selected && { color: opt.color }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Role description */}
            {(() => {
              const opt = ROLE_OPTIONS.find((r) => r.value === role);
              return (
                <View style={[styles.roleDesc, { backgroundColor: opt.bg, borderColor: opt.color }]}>
                  <Text style={[styles.roleDescText, { color: opt.color }]}>
                    {opt.icon}  {opt.description}
                  </Text>
                </View>
              );
            })()}

            <View style={styles.divider} />

            {[
              { key: "full_name", label: "Full Name *", placeholder: "Jane Doe" },
              { key: "email", label: "Email Address *", placeholder: "you@example.com", keyboard: "email-address" },
              { key: "phone", label: "Phone Number", placeholder: "+91 98765 43210", keyboard: "phone-pad" },
            ].map(({ key, label, placeholder, keyboard }) => (
              <View style={styles.fieldGroup} key={key}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.gray400}
                  value={form[key]}
                  onChangeText={set(key)}
                  keyboardType={keyboard || "default"}
                  autoCapitalize={key === "email" ? "none" : "words"}
                  autoCorrect={false}
                />
              </View>
            ))}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={COLORS.gray400}
                  value={form.password}
                  onChangeText={set("password")}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text style={{ fontSize: 18 }}>{showPassword ? "🙈" : "👁️"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor={COLORS.gray400}
                value={form.confirmPassword}
                onChangeText={set("confirmPassword")}
                secureTextEntry={!showPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.btnText}>Create Account</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>Already have an account? <Text style={{ color: COLORS.primary, fontWeight: "700" }}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradHeader: { paddingBottom: 20, paddingTop: 10 },
  header: { alignItems: "center", paddingTop: 6, paddingBottom: 2 },
  scroll: { flexGrow: 1, padding: 20, paddingBottom: 40, backgroundColor: COLORS.gray50 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: 24, ...SHADOW.md },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.gray800 },
  subtitle: { fontSize: 13, color: COLORS.gray500, marginTop: 4, marginBottom: 16 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  roleCard: {
    flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 4,
    borderRadius: RADIUS.md, borderWidth: 2,
  },
  roleIcon: { fontSize: 24, marginBottom: 4 },
  roleLabel: { fontSize: 11, fontWeight: "700", color: COLORS.gray600, textAlign: "center" },
  roleDesc: {
    borderRadius: RADIUS.md, borderWidth: 1.5,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12,
  },
  roleDescText: { fontSize: 13, fontWeight: "600" },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.gray700, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text,
    backgroundColor: COLORS.gray50,
  },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: { padding: 12, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, backgroundColor: COLORS.gray50 },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center", marginTop: 8, ...SHADOW.sm },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  backLink: { alignItems: "center", marginTop: 20 },
  backText: { fontSize: 14, color: COLORS.gray500 },
});


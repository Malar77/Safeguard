import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { aiAssistantAPI } from "../../services/api";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const QUICK_PROMPTS = [
  "I need emotional support right now.",
  "Someone is threatening me and I need a safety plan.",
  "I feel unsafe at home.",
  "Please help me figure out the next step.",
];

export default function AIAssistantScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      assistant_name: "SafeGuard Support Assistant",
      content: "I’m here to listen and help you stay safe. Tell me what is happening, and I’ll respond with support and safety actions.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [distress, setDistress] = useState(null);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.measure?.(() => {});
  }, [messages, sending]);

  const history = useMemo(() => messages.map((item) => ({ role: item.role, content: item.content })), [messages]);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } finally {
      setLocating(false);
    }
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const { data } = await aiAssistantAPI.chat({
        message: text,
        history,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
      });

      setDistress({ level: data.distress_level, score: data.distress_score, crisis_message: data.crisis_message });
      setMessages((prev) => [...prev, {
        role: "assistant",
        assistant_name: data.assistant_name,
        content: data.reply,
        safety_actions: data.safety_actions || [],
        helplines: data.helplines || [],
        nearby_safe_places: data.nearby_safe_places || [],
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        assistant_name: "SafeGuard Support Assistant",
        content: "I’m sorry, I couldn’t reach the assistant right now. Use SOS or Helplines if this is urgent.",
        safety_actions: ["Use SOS if you feel unsafe.", "Call 112 or open Helplines."],
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.heroTag}>SAFEGUARD AI</Text>
            <Text style={styles.heroTitle}>Emotional support and safety suggestions</Text>
            <Text style={styles.heroSub}>Tell me what is going on and I’ll answer with support, safety actions, and useful resources.</Text>
            <View style={styles.heroRow}>
              <TouchableOpacity style={styles.heroBtnDanger} onPress={() => navigation.navigate("SOS")}>
                <Text style={styles.heroBtnText}>Open SOS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtn} onPress={useCurrentLocation} disabled={locating}>
                <Text style={styles.heroBtnText}>{locating ? "Locating…" : location ? "Location attached" : "Use location"}</Text>
              </TouchableOpacity>
            </View>
            {distress?.crisis_message && <Text style={styles.crisis}>{distress.crisis_message}</Text>}
          </View>

          <View style={styles.chatCard}>
            {messages.map((m, idx) => (
              <View key={`${m.role}-${idx}`} style={[styles.bubble, m.role === "user" ? styles.userBubble : styles.assistantBubble]}>
                <Text style={styles.bubbleLabel}>{m.role === "user" ? "You" : m.assistant_name || "Assistant"}</Text>
                <Text style={[styles.bubbleText, m.role === "user" && styles.userText]}>{m.content}</Text>
                {m.role === "assistant" && m.safety_actions?.length > 0 && (
                  <View style={styles.actionsBox}>
                    <Text style={styles.actionsTitle}>Safety actions</Text>
                    {m.safety_actions.slice(0, 5).map((action) => <Text key={action} style={styles.actionItem}>• {action}</Text>)}
                  </View>
                )}
              </View>
            ))}
            {sending && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />}
            <View ref={bottomRef} />
          </View>

          <View style={styles.quickWrap}>
            {QUICK_PROMPTS.map((item) => (
              <TouchableOpacity key={item} style={styles.quickChip} onPress={() => sendMessage(item)}>
                <Text style={styles.quickChipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Describe what you’re feeling or what happened..."
              placeholderTextColor={COLORS.gray400}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage()} disabled={sending || !input.trim()}>
              <Text style={styles.sendBtnText}>Send to assistant</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  scroll: { padding: 16, paddingBottom: 36, gap: 14 },
  hero: { backgroundColor: COLORS.primary, borderRadius: RADIUS.xl, padding: 18, ...SHADOW.md },
  heroTag: { color: COLORS.white, opacity: 0.75, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: COLORS.white, fontSize: 22, fontWeight: "800", marginTop: 6 },
  heroSub: { color: COLORS.white, opacity: 0.85, fontSize: 13, marginTop: 8, lineHeight: 19 },
  heroRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  heroBtnDanger: { backgroundColor: COLORS.danger, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10 },
  heroBtn: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10 },
  heroBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 13 },
  crisis: { marginTop: 12, color: COLORS.white, fontWeight: "700", fontSize: 13 },
  chatCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: 14, ...SHADOW.sm, gap: 10 },
  bubble: { borderRadius: RADIUS.lg, padding: 12, borderWidth: 1 },
  userBubble: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primaryLight, alignSelf: "flex-end" },
  assistantBubble: { backgroundColor: COLORS.gray50, borderColor: COLORS.border, alignSelf: "flex-start" },
  bubbleLabel: { fontSize: 10, fontWeight: "800", color: COLORS.gray400, textTransform: "uppercase", marginBottom: 4 },
  bubbleText: { color: COLORS.gray800, fontSize: 14, lineHeight: 20 },
  userText: { color: COLORS.primary, fontWeight: "600" },
  actionsBox: { marginTop: 10, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  actionsTitle: { fontWeight: "800", fontSize: 12, color: COLORS.gray700, marginBottom: 4 },
  actionItem: { fontSize: 12, color: COLORS.gray600, lineHeight: 18 },
  quickWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickChip: { backgroundColor: COLORS.white, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 8, flexGrow: 1 },
  quickChipText: { fontSize: 12, color: COLORS.gray700, fontWeight: "600" },
  inputCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: 14, ...SHADOW.sm, gap: 12 },
  input: { minHeight: 90, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, color: COLORS.text, fontSize: 14, backgroundColor: COLORS.gray50 },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: "center" },
  sendBtnText: { color: COLORS.white, fontWeight: "800", fontSize: 14 },
});
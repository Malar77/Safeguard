import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Logo from "./Logo";
import { COLORS } from "../theme";

/**
 * Full-screen animated splash shown while the app is loading.
 * Fades in the logo then calls onFinish when done.
 */
export default function SplashScreen({ onFinish }) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo zooms + fades in
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
      ]),
      // Tagline fades in
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Small pause
      Animated.delay(800),
      // Fade out everything
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      if (onFinish) onFinish();
    });

    // Pulsing dots animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const dotOpacity = dotAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <LinearGradient
      colors={[COLORS.primaryDark, COLORS.primary, "#7c3aed"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Logo size={90} white icon />
      </Animated.View>

      <Animated.View style={[styles.brandWrap, { opacity: logoOpacity }]}>
        <Text style={styles.brand}>SafeGuard</Text>
        <Text style={styles.tagline}>Women & Child Safety Platform</Text>
      </Animated.View>

      <Animated.View style={[styles.loadingRow, { opacity: textOpacity }]}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { opacity: dotOpacity, transform: [{ scale: dotOpacity }] }]}
          />
        ))}
      </Animated.View>

      <Animated.Text style={[styles.bottomText, { opacity: textOpacity }]}>
        Your safety is our priority
      </Animated.Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  logoWrap: { marginBottom: 20 },
  brandWrap: { alignItems: "center", marginBottom: 50 },
  brand: { fontSize: 34, fontWeight: "900", color: "#ffffff", letterSpacing: 1 },
  tagline: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 6, letterSpacing: 0.5 },
  loadingRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.8)" },
  bottomText: {
    position: "absolute", bottom: 48,
    fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: 0.5,
  },
});

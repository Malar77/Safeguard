import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop, G } from "react-native-svg";

/**
 * SafeGuard Shield Logo
 * @param {number} size   - Overall size (default 64)
 * @param {boolean} white - Render in all-white for dark backgrounds
 * @param {boolean} icon  - Icon-only mode (no text)
 */
export default function Logo({ size = 64, white = false, icon = false }) {
  const shield = size;
  const textColor = white ? "#ffffff" : "#be185d";
  const subtitleColor = white ? "rgba(255,255,255,0.75)" : "#9d174d";

  return (
    <View style={styles.wrap}>
      {/* Shield SVG */}
      <Svg width={shield} height={shield * 1.1} viewBox="0 0 100 110">
        <Defs>
          <LinearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={white ? "#ffffff" : "#be185d"} stopOpacity="1" />
            <Stop offset="100%" stopColor={white ? "rgba(255,255,255,0.7)" : "#7c3aed"} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={white ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.2)"} stopOpacity="1" />
            <Stop offset="100%" stopColor={white ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)"} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Outer shield shape */}
        <Path
          d="M50 4 L90 20 L90 55 C90 78 72 97 50 106 C28 97 10 78 10 55 L10 20 Z"
          fill="url(#shieldGrad)"
        />

        {/* Inner shield highlight */}
        <Path
          d="M50 12 L84 26 L84 55 C84 74 68 91 50 99 C32 91 16 74 16 55 L16 26 Z"
          fill="url(#innerGrad)"
        />

        {/* Checkmark / tick icon */}
        <G>
          {/* Female symbol – circle + cross with feminine overtone */}
          <Circle cx="50" cy="48" r="18" fill="none" stroke={white ? "#ffffff" : "#ffffff"} strokeWidth="4.5" />
          <Path
            d="M42 48 L48 54 L60 42"
            fill="none"
            stroke={white ? "#ffffff" : "#ffffff"}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Bottom pin of female symbol */}
          <Path
            d="M50 66 L50 76 M44 71 L56 71"
            fill="none"
            stroke={white ? "#ffffff" : "#ffffff"}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* Text */}
      {!icon && (
        <View style={styles.textWrap}>
          <Text style={[styles.appName, { color: textColor, fontSize: size * 0.4 }]}>
            SafeGuard
          </Text>
          <Text style={[styles.tagline, { color: subtitleColor, fontSize: size * 0.16 }]}>
            Women & Child Safety
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  textWrap: { marginTop: 8, alignItems: "center" },
  appName: { fontWeight: "800", letterSpacing: 0.5 },
  tagline: { fontWeight: "500", marginTop: 2, letterSpacing: 0.3 },
});

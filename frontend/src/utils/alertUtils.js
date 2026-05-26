/**
 * Alert utilities and helper functions for parent dashboard
 */

/**
 * Format alert data with additional computed properties
 */
export function formatAlert(rawAlert) {
  return {
    ...rawAlert,
    hasLocation: !!(rawAlert.latitude && rawAlert.longitude),
    hasSelfie: !!rawAlert.selfie_data,
    mapUrl: rawAlert.latitude && rawAlert.longitude 
      ? `https://www.google.com/maps?q=${rawAlert.latitude},${rawAlert.longitude}`
      : null,
    mapsEmbedUrl: rawAlert.latitude && rawAlert.longitude
      ? `https://maps.google.com/maps?q=${rawAlert.latitude},${rawAlert.longitude}&z=16&output=embed`
      : null,
    displayAddress: rawAlert.address || 
      (rawAlert.latitude && rawAlert.longitude 
        ? `${parseFloat(rawAlert.latitude).toFixed(5)}, ${parseFloat(rawAlert.longitude).toFixed(5)}`
        : "Location not captured"),
  };
}

/**
 * Generate audio beep for alarm (880 Hz siren tone)
 * Returns data URI that can be played by Audio element
 */
export function generateAlarmWave() {
  const sampleRate = 22050;
  const duration = 0.5; // 500ms burst
  const frequency = 880; // Hz - standard alarm tone
  const buffer = new ArrayBuffer(sampleRate * duration * 2);
  const view = new Int16Array(buffer);

  for (let i = 0; i < sampleRate * duration; i++) {
    const time = i / sampleRate;
    const value = Math.sin(2 * Math.PI * frequency * time);
    // Add slight modulation for more urgent sound
    const modulation = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * time); // 4 Hz wobble
    view[i] = Math.max(-32768, Math.min(32767, value * modulation * 32767 * 0.8));
  }

  // Simple WAV header
  const wav = new Uint8Array(44 + buffer.byteLength);
  const view2 = new DataView(wav.buffer);

  // RIFF identifier
  wav[0] = 0x52; // 'R'
  wav[1] = 0x49; // 'I'
  wav[2] = 0x46; // 'F'
  wav[3] = 0x46; // 'F'

  // File length
  view2.setUint32(4, 36 + buffer.byteLength, true);

  // RIFF type
  wav[8] = 0x57; // 'W'
  wav[9] = 0x41; // 'A'
  wav[10] = 0x56; // 'V'
  wav[11] = 0x45; // 'E'

  // Subchunk1ID
  wav[12] = 0x66; // 'f'
  wav[13] = 0x6d; // 'm'
  wav[14] = 0x74; // 't'
  wav[15] = 0x20; // ' '

  // Subchunk1Size
  view2.setUint32(16, 16, true);

  // AudioFormat (1 = PCM)
  view2.setUint16(20, 1, true);

  // NumChannels
  view2.setUint16(22, 1, true);

  // SampleRate
  view2.setUint32(24, sampleRate, true);

  // ByteRate
  view2.setUint32(28, sampleRate * 2, true);

  // BlockAlign
  view2.setUint16(32, 2, true);

  // BitsPerSample
  view2.setUint16(34, 16, true);

  // Subchunk2ID
  wav[36] = 0x64; // 'd'
  wav[37] = 0x61; // 'a'
  wav[38] = 0x74; // 't'
  wav[39] = 0x61; // 'a'

  // Subchunk2Size
  view2.setUint32(40, buffer.byteLength, true);

  // Audio data
  wav.set(new Uint8Array(buffer), 44);

  // Return as base64 data URI
  const blob = new Blob([wav], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

/**
 * Calculate time difference in human-readable format
 */
export function timeAgo(dateStr) {
  if (!dateStr) return "unknown time";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Format as date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Alert severity badge styling
 */
export function getAlertSeverityStyle(alert) {
  // Determine severity based on message or other factors
  const message = (alert.message || "").toLowerCase();
  
  if (message.includes("critical") || message.includes("danger")) {
    return "bg-red-600 text-white";
  } else if (message.includes("urgent")) {
    return "bg-orange-600 text-white";
  } else {
    return "bg-red-600 text-white"; // Default to red for SOS
  }
}

/**
 * Validate alert data before display
 */
export function isValidAlert(alert) {
  return alert && typeof alert === "object" && alert.id && alert.child_user_id;
}

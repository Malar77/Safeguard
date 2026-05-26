/**
 * Enhanced Alarm Manager with Vibration Support
 * Plays loud siren + vibrates mobile for SOS alerts
 */
class EnhancedAlarmManager {
  constructor() {
    this.ctx = null;
    this.intervalId = null;
    this.vibrateIntervalId = null;
    this.canVibrate = false;
    this.isStarting = false;
  }

  _init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  // Unlock audio context from user gesture
  unlock() {
    this._init();
    this.canVibrate = true;
    if (this.ctx?.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    const buf = this.ctx.createBuffer(1, 1, 22050);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    src.start(0);
  }

  // Strong guardian siren burst: layered tones + rapid cadence
  _burst() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    [
      [820, 1320, t + 0.00, 0.24],
      [940, 1580, t + 0.26, 0.24],
      [740, 1760, t + 0.52, 0.26],
      [980, 1860, t + 0.80, 0.26],
      [700, 1680, t + 1.08, 0.32],
    ].forEach(([fromFreq, toFreq, start, dur]) => {
      const lead = this.ctx.createOscillator();
      const support = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      const supportGain = this.ctx.createGain();

      lead.type = "square";
      support.type = "sawtooth";

      lead.frequency.setValueAtTime(fromFreq, start);
      lead.frequency.linearRampToValueAtTime(toFreq, start + dur);

      support.frequency.setValueAtTime(fromFreq * 0.5, start);
      support.frequency.linearRampToValueAtTime(toFreq * 0.5, start + dur);

      leadGain.gain.setValueAtTime(0.0001, start);
      leadGain.gain.exponentialRampToValueAtTime(0.95, start + 0.03);
      leadGain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      supportGain.gain.setValueAtTime(0.0001, start);
      supportGain.gain.exponentialRampToValueAtTime(0.26, start + 0.03);
      supportGain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      lead.connect(leadGain);
      support.connect(supportGain);
      leadGain.connect(this.ctx.destination);
      supportGain.connect(this.ctx.destination);

      lead.start(start);
      support.start(start);
      lead.stop(start + dur + 0.03);
      support.stop(start + dur + 0.03);
    });
  }

  // Vibrate pattern for mobile (pulse vibration)
  async _vibrate() {
    try {
      // Use browser's native Vibration API
      // Pattern tuned for urgency while remaining battery-friendly.
      if (!this.canVibrate) return;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([350, 120, 350, 120, 500]);
      }
    } catch (err) {
      console.log("Vibration not available:", err);
    }
  }

  // Start alarm with siren + vibration
  start() {
    if (this.intervalId || this.isStarting) return;
    this.isStarting = true;
    
    this._init();
    this.unlock(); // Best effort context unlock

    const startPlaybackLoop = () => {
      // Initial burst
      this._burst();
      this._vibrate();

      // Repeat more frequently for a stronger guardian-side alarm.
      this.intervalId = setInterval(() => {
        this._burst();
        this._vibrate();
      }, 2200);
      this.isStarting = false;
    };

    if (this.ctx?.state === "running") {
      startPlaybackLoop();
      return;
    }

    Promise.resolve(this.ctx?.resume?.())
      .then(() => startPlaybackLoop())
      .catch(() => {
        // Fall back to vibration-only if browser blocks audio autoplay.
        this._vibrate();
        this.isStarting = false;
      });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isStarting = false;
    if (this.vibrateIntervalId) {
      clearInterval(this.vibrateIntervalId);
      this.vibrateIntervalId = null;
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(0);
    }
  }

  isPlaying() {
    return this.intervalId !== null;
  }
}

export const alertService = new EnhancedAlarmManager();

/**
 * Send native push notification when SOS alert arrives
 * Plays system sound + notification sound on mobile
 */
export const sendSOSNotification = (wardName, location) => {
  try {
    // Browser Notification API
    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("🚨 EMERGENCY SOS ALERT!", {
        body: `${wardName} triggered SOS${location ? ` near ${location}` : ""}`,
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23ef4444'/><text x='50' y='60' font-size='60' fill='white' text-anchor='middle' dominant-baseline='middle'>!</text></svg>",
        badge: "🚨",
        tag: "sos-alert",
        requireInteraction: true, // Keep on screen until user interacts
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  } catch (err) {
    console.log("Notification API not available:", err);
  }
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("Notifications not supported");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (err) {
      console.log("Failed to request notification permission:", err);
      return false;
    }
  }

  return false;
};

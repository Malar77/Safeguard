import { useState, useRef, useEffect, useCallback } from "react";
import { sosAPI, familyAPI, authAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  FiAlertTriangle, FiMapPin, FiCheckCircle, FiCamera,
  FiUsers, FiShield, FiX, FiRefreshCw, FiCast,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

// Roles that cannot trigger SOS
const OBSERVER_ROLES = new Set(["admin", "parent", "counselor"]);
const isNativeAndroidWebView =
  typeof navigator !== "undefined" &&
  /android/i.test(navigator.userAgent || "") &&
  typeof window !== "undefined" &&
  typeof window.location !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export default function SOSPage() {
  const { user, setUser } = useAuth();

  // ── Core SOS state ──────────────────────────────────────────────────────
  const [sosActive,       setSosActive]       = useState(false);
  const [alertId,         setAlertId]         = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [resolving,       setResolving]       = useState(false);
  const [locating,        setLocating]        = useState(false);
  const [location,        setLocation]        = useState(null);
  const [videoPreview,    setVideoPreview]    = useState(null);
  const [familyNotified,  setFamilyNotified]  = useState(0);
  const [cameraActive,    setCameraActive]    = useState(false);
  const [countdown,       setCountdown]       = useState(null);
  const [capturingVideo,  setCapturingVideo]  = useState(false);
  const [initialLoading,  setInitialLoading]  = useState(true);
  const [resolveConfirm,  setResolveConfirm]  = useState(false);
  const [parentCheck,     setParentCheck]     = useState({ loading: true, hasParents: false, count: 0, warning: null }); // ← NEW: parent status
  const [isStreaming,     setIsStreaming]     = useState(false); // ← NEW: streaming status

  const videoRef  = useRef(null);
  const videoInputRef = useRef(null);
  const streamRef = useRef(null); // ← NEW: stream reference
  const streamIntervalRef = useRef(null); // ← NEW: streaming interval

  const pickVideoFromFile = useCallback(() => {
    return new Promise((resolve) => {
      const input = videoInputRef.current;
      if (!input) {
        resolve(null);
        return;
      }

      input.value = "";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        const mime = (file.type || "").toLowerCase();
        const name = (file.name || "").toLowerCase();
        const looksLikeVideo = mime.startsWith("video/") || /\.(mp4|webm|ogg|ogv|mov|3gp|m4v)$/.test(name);
        if (!looksLikeVideo) {
          toast.error("Please capture or choose a valid video clip.");
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };

      input.click();
    });
  }, []);

  const captureLiveVideo = async (allowPickerFallback = true) => {
    const cleanupStream = (stream) => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraActive(false);
      setCountdown(null);
    };

    try {
      if (isNativeAndroidWebView) {
        return allowPickerFallback ? await pickVideoFromFile() : null;
      }

      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        return allowPickerFallback ? await pickVideoFromFile() : null;
      }

      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("camera_timeout")), 10000)),
      ]);

      const preview = videoRef.current;
      preview.srcObject = stream;
      preview.muted = true;
      preview.playsInline = true;
      setCameraActive(true);
      await preview.play();
      await new Promise((r) => { preview.onloadeddata = r; setTimeout(r, 600); });

      for (let i = 3; i >= 1; i--) {
        setCountdown(i);
        await new Promise((r) => setTimeout(r, 600));
      }
      setCountdown(null);

      const mimeOptions = ["video/mp4", "video/webm;codecs=vp8,opus", "video/webm"];
      const supportedMime = mimeOptions.find((m) => MediaRecorder.isTypeSupported?.(m)) || "";
      const recorder = supportedMime ? new MediaRecorder(stream, { mimeType: supportedMime }) : new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const stopped = new Promise((resolve) => {
        recorder.onstop = resolve;
      });

      recorder.start(300);
      await new Promise((r) => setTimeout(r, 6000));
      recorder.stop();
      await stopped;

      const blob = new Blob(chunks, { type: recorder.mimeType || supportedMime || "video/webm" });
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });

      cleanupStream(stream);
      return dataUrl;
    } catch {
      toast.error("Live video capture failed. Please record and attach a video.");
      return allowPickerFallback ? await pickVideoFromFile() : null;
    }
  };

  // ── START LIVE VIDEO STREAMING ──────────────────────────────────────────
  const startLiveVideoStream = async (sosAlertId) => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Camera access not available. Video streaming disabled.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setIsStreaming(true);

      // Send video frames every 500ms (2 fps for bandwidth efficiency)
      let frameCount = 0;
      streamIntervalRef.current = setInterval(async () => {
        try {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(videoRef.current, 0, 0);
            
            canvas.toBlob(async (blob) => {
              if (blob) {
                try {
                  const formData = new FormData();
                  formData.append("frame", blob);
                  formData.append("frame_number", frameCount++);
                  
                  // Send frame to backend
                  await sosAPI.streamFrame(sosAlertId, formData);
                } catch (err) {
                  console.log("Frame send skipped:", err?.response?.status);
                }
              }
            }, "image/jpeg", 0.7);
          }
        } catch (err) {
          console.error("Streaming error:", err);
        }
      }, 500);

      toast.success("📹 Live video streaming started!");
    } catch (err) {
      toast.error("Could not start video streaming: " + err.message);
      setIsStreaming(false);
    }
  };

  // ── STOP LIVE VIDEO STREAMING ──────────────────────────────────────────
  const stopLiveVideoStream = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsStreaming(false);
    toast.success("📹 Live video streaming stopped.");
  };

  // ── BUG FIX: On mount, check if user already has an active SOS ──────────
  useEffect(() => {
    if (!user || OBSERVER_ROLES.has(user.role)) { setInitialLoading(false); return; }
    sosAPI.myAlerts()
      .then((r) => {
        const active = r.data.find((a) => a.is_active);
        if (active) {
          setSosActive(true);
          setAlertId(active.id);
          // restore location if stored
          if (active.latitude && active.longitude) {
            setLocation({ lat: active.latitude, lng: active.longitude });
          }
        }
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, [user]);

  // ── CLEANUP: Stop streaming on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      // Stop streaming if page is left while streaming is active
      if (isStreaming) {
        stopLiveVideoStream();
      }
    };
  }, [isStreaming]);

  // ── Check if user has linked parents ──────────────────────────────────────
  useEffect(() => {
    if (!user || OBSERVER_ROLES.has(user.role)) {
      setParentCheck({ loading: false, hasParents: false, count: 0, warning: null });
      return;
    }

    sosAPI.checkParents()
      .then((res) => {
        const { has_parents, parent_count, warning } = res.data;
        setParentCheck({ loading: false, hasParents: has_parents, count: parent_count, warning });
      })
      .catch(() => {
        setParentCheck({ loading: false, hasParents: false, count: 0, warning: "Could not verify parents" });
      });
  }, [user]);

  // ── GPS Location ─────────────────────────────────────────────────────────
  const getLocation = () =>
    new Promise((resolve) => {
      setLocating(true);
      if (!navigator.geolocation) { setLocating(false); resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => { setLocating(false); resolve(null); },
        { timeout: 8000, maximumAge: 0 }
      );
    });

  const handleVideoCapture = async () => {
    if (capturingVideo) return;
    setCapturingVideo(true);
    try {
      const clip = await captureLiveVideo(true);
      if (clip) {
        setVideoPreview(clip);
        toast.success("Live video attached successfully.");
      } else {
        toast.error("Could not capture video. Please try again.");
      }
    } finally {
      setCapturingVideo(false);
    }
  };

  // ── TRIGGER SOS ──────────────────────────────────────────────────────────
  const triggerSOS = async () => {
    setLoading(true);
    try {
      // Always verify the latest backend role before triggering SOS.
      // This prevents stale sessions from showing women/child UI while token belongs to a guardian.
      try {
        const me = await authAPI.me();
        const currentRole = me?.data?.role;
        if (currentRole && currentRole !== user?.role) {
          setUser(me.data);
        }
        if (currentRole && OBSERVER_ROLES.has(currentRole)) {
          toast.error("Current session is a guardian/admin account. Please login with a women/child account to trigger SOS.");
          return;
        }
      } catch {
        toast.error("Could not verify your current session. Please re-login and try again.");
        return;
      }

      if (!parentCheck.hasParents) {
        toast.error("Link at least one guardian before triggering SOS.");
        return;
      }

      const loc    = await getLocation();
      if (!loc) {
        toast.error("Location is required. Please enable GPS and try again.");
        return;
      }
      setLocation(loc);

      const payload = {
        message:   `EMERGENCY! ${user.full_name} needs immediate help!`,
        latitude:  loc?.lat  ?? null,
        longitude: loc?.lng  ?? null,
        selfie_data: null,
      };

      const res   = await sosAPI.trigger(payload);
      const sosId = res.data.id;
      setAlertId(sosId);
      setSosActive(true);
      setFamilyNotified(parentCheck.count || 0);

      try {
        await familyAPI.sendAlert({
          sos_alert_id: sosId,
          latitude: loc?.lat ?? null,
          longitude: loc?.lng ?? null,
          message: payload.message,
          selfie_data: null,
        });
      } catch {
        // Parent alert delivery should not block SOS creation.
      }

      // Clear the sending spinner as soon as the SOS is created and delivered.
      setLoading(false);

      // Start live video streaming in the background so it cannot keep the UI stuck on "Sending Alert…"
      void startLiveVideoStream(sosId).catch((err) => {
        console.error("Live video streaming failed:", err);
        toast.error("SOS sent, but live video streaming could not start.");
      });

      toast.success(
        `🚨 SOS SENT! ${parentCheck.count || 0} guardian(s) notified.`,
        { duration: 6000 }
      );
    } catch (err) {
      const existingMsg = err?.response?.data?.detail;
      toast.error(existingMsg || "Failed to send SOS. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── RESOLVE SOS ───────────────────────────────────────────────────────────
  // Always calls resolveActive() — works even if alertId was lost on page refresh
  const resolveSOS = async () => {
    setResolving(true);
    try {
      // Stop live video streaming before resolving
      stopLiveVideoStream();
      
      // Try resolveActive first (no ID needed — most robust)
      await sosAPI.resolveActive();
      setSosActive(false);
      setAlertId(null);
      setFamilyNotified(0);
      setLocation(null);
      setResolveConfirm(false);
      toast.success("✅ SOS resolved. Stay safe!");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail === "No active SOS alert found") {
        // Already resolved (e.g. by admin or another session) — just clear UI
        setSosActive(false);
        setAlertId(null);
        setFamilyNotified(0);
        setLocation(null);
        setResolveConfirm(false);
        toast.success("SOS was already resolved. You are safe.");
      } else {
        toast.error(detail || "Failed to resolve SOS — try again");
      }
    } finally {
      setResolving(false);
    }
  };

  // ── OBSERVER / NOT-ALLOWED ACCOUNTS ──────────────────────────────────────
  if (user && OBSERVER_ROLES.has(user.role)) {
    const isParent = user.role === "parent";
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="card">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FiShield className="text-gray-400 text-4xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">SOS Not Available</h1>
          <p className="text-gray-500 mb-6 text-sm">
            {isParent
              ? "Guardian accounts monitor SOS alerts — they cannot trigger SOS themselves. This feature is reserved for child and women accounts."
              : "Admin/Counselor accounts cannot trigger SOS. This is reserved for child and women accounts."}
          </p>
          <Link
            to={isParent ? "/parent-dashboard" : "/admin"}
            className="btn-primary inline-block px-8"
          >
            {isParent ? "Go to Guardian Dashboard" : "Go to Admin Panel"}
          </Link>
        </div>
      </div>
    );
  }

  // ── INITIAL LOADING ───────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-500 border-t-transparent" />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 text-center">
      {/* Hidden camera elements */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        style={{ display: "none" }}
      />
      <div className={`mb-4 rounded-2xl overflow-hidden border-4 border-red-400 shadow-xl relative bg-black ${cameraActive ? "block" : "hidden"}`}>
        <video ref={videoRef} className="w-full max-h-56 object-cover" playsInline muted />
        {countdown !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <span className="text-white text-7xl font-black drop-shadow-lg animate-bounce">{countdown}</span>
            <span className="text-white text-sm mt-3 font-semibold">🎥 Recording live video…</span>
          </div>
        )}
      </div>

      {/* ── Resolve Confirm Modal ── */}
      {resolveConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-left">
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
              <FiCheckCircle className="text-green-600 text-2xl" />
            </div>
            <h2 className="font-extrabold text-gray-900 text-lg mb-1">Cancel SOS?</h2>
            <p className="text-gray-500 text-sm mb-5">
              Only cancel if you are <strong>safe</strong>. This will notify your guardians that the emergency is resolved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={resolveSOS}
                disabled={resolving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2"
              >
                <FiCheckCircle size={15} />
                {resolving ? "Resolving…" : "Yes, I'm Safe"}
              </button>
              <button
                onClick={() => setResolveConfirm(false)}
                className="px-4 py-3 border-2 border-gray-200 text-gray-500 font-semibold rounded-2xl hover:bg-gray-50 transition"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVE SOS BANNER ── */}
      {sosActive && (
        <div className="mb-5 bg-red-600 text-white rounded-3xl p-4 flex items-center gap-3 shadow-xl animate-pulse">
          <div className="text-3xl flex-shrink-0">🚨</div>
          <div className="text-left flex-1">
            <div className="font-extrabold text-base">SOS IS ACTIVE</div>
            <div className="text-red-100 text-xs">
              {isStreaming ? "📹 Live video streaming to guardians..." : "Help is being summoned. Stay on the line."}
            </div>
          </div>
          <div className="w-3 h-3 bg-white rounded-full animate-ping flex-shrink-0" />
        </div>
      )}

      {/* ── Main Card ── */}
      <div className="card">
        {/* Icon + title */}
        <div className="mb-6">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 transition-all ${
            sosActive ? "bg-green-100 scale-110" : "bg-red-100"
          }`}>
            {sosActive
              ? <FiCheckCircle className="text-green-600 text-5xl" />
              : <FiAlertTriangle className="text-red-600 text-5xl animate-pulse" />
            }
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800">
            {sosActive ? "🚨 Alert is Active" : "Emergency SOS"}
          </h1>
          {user && (
            <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-bold ${
              user.role === "child" ? "bg-blue-100 text-blue-700" : "bg-primary-100 text-primary-700"
            }`}>
              {user.role === "child" ? "👦 Child Account" : "👩 Women Account"}
            </div>
          )}
          <p className="text-gray-500 mt-3 text-sm leading-relaxed">
            {sosActive
              ? "Your trusted contacts and linked guardians have been notified. Help is on the way. Stay calm."
              : "One tap to instantly alert your trusted contacts, share your GPS location, and send a live video clip to linked guardians."}
          </p>
        </div>

        {/* ── NOT ACTIVE: trigger button ── */}
        {!sosActive ? (
          <>
            {/* Parent warning if no linked parents */}
            {!parentCheck.loading && !parentCheck.hasParents && (
              <div className="mb-4 rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
                <FiAlertTriangle className="text-amber-600 text-xl flex-shrink-0 mt-0.5" />
                <div className="text-left text-xs text-amber-800">
                  <p className="font-bold mb-1">⚠️ No Linked Guardians</p>
                  <p className="text-amber-700">You don't have any linked parents/guardians yet. Ask a parent to link with your account so they receive your SOS alerts with location & live video.</p>
                  <Link to="/family-linking" className="inline-block mt-2 text-amber-700 font-bold underline hover:no-underline">
                    → Set up family linking
                  </Link>
                </div>
              </div>
            )}

            <button
              onClick={triggerSOS}
              disabled={loading || locating}
              className="w-full bg-gradient-to-b from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 disabled:from-gray-300 disabled:to-gray-400 text-white font-black text-xl py-7 rounded-2xl shadow-2xl active:scale-95 transition-all duration-150"
              style={{ boxShadow: "0 8px 32px rgba(220,38,38,0.45)" }}
            >
              {loading || locating
                ? <span className="flex items-center justify-center gap-3"><FiRefreshCw className="animate-spin" size={22}/> Sending Alert…</span>
                : "🚨 TRIGGER SOS NOW"
              }
            </button>
            <p className="text-xs text-gray-400 mt-2">Hold and press firmly — this is a real emergency alert</p>
            <div className="mt-5 flex justify-center gap-6 text-xs text-gray-400">
              <span className="flex items-center gap-1"><FiMapPin size={12} /> Live GPS</span>
              <span className="flex items-center gap-1"><FiCamera size={12} /> Automatic Live Video</span>
              <span className="flex items-center gap-1"><FiUsers size={12} /> Notify Guardians</span>
            </div>
          </>
        ) : (
          /* ── ACTIVE: status + resolve ── */
          <div className="space-y-4">
            {/* Alert details */}
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-left">
              <p className="font-extrabold text-red-700 text-base mb-2">🚨 Alert Status: ACTIVE</p>
              {location && (
                <p className="text-sm text-red-600 flex items-center gap-1.5 mb-1">
                  <FiMapPin size={13} />
                  GPS: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                  <a
                    href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="underline font-bold ml-1 text-red-700"
                  >Open Map</a>
                </p>
              )}
              {familyNotified > 0 && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <FiUsers size={13} />
                  {familyNotified} guardian(s) notified with live location and automatic live video
                </p>
              )}
              {!location && (
                <p className="text-xs text-amber-600 mt-1">⚠ GPS not available — guardians notified without location</p>
              )}
            </div>

            {/* Video or fallback */}
            <div className="rounded-2xl overflow-hidden border-4 border-red-300 shadow-lg bg-red-50 p-4 text-left text-sm text-red-700 font-semibold">
              📹 Live video is captured automatically and streamed to guardians after SOS is sent.
            </div>

            {/* Resolve button */}
            <button
              onClick={() => setResolveConfirm(true)}
              disabled={resolving}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-extrabold text-lg py-4 rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              <FiCheckCircle size={18} />
              {resolving ? "Resolving…" : "✅ I'm Safe — Cancel SOS"}
            </button>
            <p className="text-xs text-gray-400">Only cancel when you are truly safe</p>
          </div>
        )}

        <div className="mt-8 border-t pt-6">
          <p className="text-gray-600 font-bold mb-2 text-sm">Guardian Emergency Delivery</p>
          <p className="text-xs text-gray-500">SOS will be delivered directly to your linked parents/guardians with live location and camera live-video evidence.</p>
        </div>
      </div>

      {/* How it works */}
      <div className="card mt-4 text-left">
        <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FiShield size={15} className="text-primary-500" /> What Happens When You Trigger SOS?
        </h2>
        <ul className="space-y-2 text-sm text-gray-600">
          {[
            "Your linked parents/guardians receive an emergency notification instantly",
            "Your live GPS location is captured and shared",
            "A short live video clip is auto-recorded and sent to linked guardians",
            "Linked guardians receive live location + live video on their dashboard",
            "An alert is logged in the system for responders",
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <FiCheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl p-3 text-sm text-blue-700">
          <strong>Guardian Setup:</strong> Ask your parent/guardian to register as a "Guardian" account, then go to{" "}
          <Link to="/profile?tab=family" className="underline font-semibold">Profile → Family</Link> to link them.
        </div>
      </div>
    </div>
  );
}

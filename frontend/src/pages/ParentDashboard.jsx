import { useState, useEffect, useCallback, useRef } from "react";
import { familyAPI } from "../services/api";
import { alertService, sendSOSNotification, requestNotificationPermission } from "../services/alertService";
import toast from "react-hot-toast";
import {
  FiUsers, FiBell, FiMapPin, FiCamera, FiCheck, FiX,
  FiTrash2, FiRefreshCw, FiAlertTriangle, FiUserCheck,
  FiEye, FiClock, FiPhone, FiVolume2, FiVolumeX, FiExternalLink,
  FiFileText, FiShield,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

const TABS = ["Alerts", "Ward Reports", "Children", "Pending Requests"];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getDataUrlMime(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const m = dataUrl.match(/^data:([^;]+);base64,/i);
  return m ? m[1].toLowerCase() : null;
}

function getVideoExtFromMime(mime) {
  if (!mime) return "webm";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogv";
  if (mime.includes("quicktime")) return "mov";
  return "webm";
}

function canPlayVideoMime(mime) {
  if (!mime || typeof document === "undefined") return true;
  const video = document.createElement("video");
  return video.canPlayType(mime) !== "";
}

function roleLabel(role) {
  if (role === "women") return "Women Ward";
  if (role === "child") return "Child Ward";
  return role ? `${role.charAt(0).toUpperCase()}${role.slice(1)} Ward` : "Ward";
}


// ─── Alert triggered from fetchUnread ─────────────────────────────────

function MapSection({ lat, lon, address }) {
  if (!lat && !lon) {
    return (
      <span className="text-gray-400 text-sm italic flex items-center gap-1">
        <FiMapPin size={13} /> Location not captured
      </span>
    );
  }
  const q          = `${lat},${lon}`;
  const googleUrl  = `https://www.google.com/maps?q=${q}`;
  const embedUrl   = `https://maps.google.com/maps?q=${q}&z=16&output=embed`;

  return (
    <div className="space-y-2">
      <a href={googleUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-blue-600 hover:underline text-sm font-semibold">
        <FiMapPin size={14} />
        {address || `${parseFloat(lat).toFixed(5)}, ${parseFloat(lon).toFixed(5)}`}
        <FiExternalLink size={12} />
      </a>
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <iframe
          title={`map-${lat}-${lon}`}
          src={embedUrl}
          width="100%"
          height="200"
          style={{ border: 0, display: "block" }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

// ─── Alert card ───────────────────────────────────────────────────────────────
function AlertCard({ alert, onMarkRead, onDelete }) {
  // Auto-expand media for unread alerts that have a live video clip
  const [mediaOpen, setMediaOpen] = useState(!alert.is_read && !!alert.selfie_data);
  const [liveOpen, setLiveOpen] = useState(!!alert.live_frame_data);

  useEffect(() => {
    if (alert.live_frame_data) {
      setLiveOpen(true);
    }
  }, [alert.live_frame_data]);

  const videoMime = getDataUrlMime(alert.selfie_data);
  const videoExt = getVideoExtFromMime(videoMime);
  const isVideoPlayable = canPlayVideoMime(videoMime);

  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm transition-all ${
      alert.is_read ? "border-gray-200 bg-white" : "border-red-400 bg-red-50"
    }`}>

      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
          ${alert.is_read ? "bg-gray-100" : "bg-red-100"}`}>
          <FiAlertTriangle className={alert.is_read ? "text-gray-400" : "text-red-600"} size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-gray-800 text-base">{alert.child_name || "Unknown Ward"}</span>
            {!alert.is_read && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                🚨 NEW
              </span>
            )}
          </div>
          {alert.child_phone && (
            <a href={`tel:${alert.child_phone}`}
              className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700
                         px-2 py-0.5 rounded-full hover:bg-blue-200 font-medium mt-1">
              <FiPhone size={11} /> Call: {alert.child_phone}
            </a>
          )}
          <p className="text-red-700 font-bold text-sm mt-1.5">{alert.message}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <FiClock size={11} /> {timeAgo(alert.created_at)}
          </p>
        </div>
      </div>

      {/* Live Location + embedded map */}
      <div className="mt-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
          📍 Live Location
        </p>
        <MapSection lat={alert.latitude} lon={alert.longitude} address={alert.address} />
      </div>

      {/* Live video transport (latest frame from child camera) */}
      {alert.live_frame_data && (
        <div className="mt-4">
          <button
            onClick={() => setLiveOpen((o) => !o)}
            className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-full transition mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {liveOpen ? "Hide Live Transport" : "View Live Transport"}
          </button>
          {liveOpen && (
            <div className="rounded-xl overflow-hidden border-2 border-emerald-300 shadow-md bg-black">
              <img
                src={alert.live_frame_data}
                alt="Live SOS transport"
                className="w-full max-h-80 object-cover"
              />
              <div className="bg-emerald-50 py-2 px-3 flex items-center justify-between">
                <span className="text-xs text-emerald-700 font-medium">
                  🔴 Live frame transport from child camera
                </span>
                <span className="text-xs text-emerald-500 font-semibold">
                  {alert.live_frame_updated_at ? `Updated ${timeAgo(alert.live_frame_updated_at)}` : "Updating"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto-captured live video */}
      {alert.selfie_data && (
        <div className="mt-4">
          <button
            onClick={() => setMediaOpen(o => !o)}
            className="flex items-center gap-2 text-xs font-bold text-purple-700
                       bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-full transition mb-2">
            <FiCamera size={13} />
            {mediaOpen ? "Hide Video" : "🎥 View Auto-Captured Live Video"}
          </button>
          {mediaOpen && (
            <div className="rounded-xl overflow-hidden border-2 border-purple-300 shadow-md">
              {isVideoPlayable ? (
                <video
                  className="w-full max-h-80 object-cover"
                  controls
                  playsInline
                  preload="metadata"
                >
                  <source src={alert.selfie_data} type={videoMime || "video/webm"} />
                </video>
              ) : (
                <div className="p-4 text-sm text-purple-700 bg-purple-50">
                  This browser cannot play this SOS video format directly. Use download to view it.
                </div>
              )}
              <div className="bg-purple-50 py-2 px-3 flex items-center justify-between">
                <span className="text-xs text-purple-700 font-medium">
                  🎥 Auto-recorded SOS clip ({videoMime || "video/webm"})
                </span>
                <a
                  href={alert.selfie_data}
                  download={`sos-video-${alert.id}.${videoExt}`}
                  className="text-xs bg-purple-600 text-white px-3 py-1
                             rounded-full hover:bg-purple-700 transition font-medium">
                  ⬇ Download
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
        {!alert.is_read && (
          <button onClick={() => onMarkRead(alert.id)}
            className="inline-flex items-center gap-1.5 text-xs bg-green-600 text-white
                       px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-bold">
            <FiCheck size={13} /> Ward is Safe — Mark Read
          </button>
        )}
        {alert.latitude && alert.longitude && (
          <a href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs bg-blue-600 text-white
                       px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium">
            <FiMapPin size={12} /> Open in Google Maps
          </a>
        )}
        <button onClick={() => onDelete(alert.id)}
          className="inline-flex items-center gap-1 text-xs text-red-600 border border-red-200
                     bg-white px-3 py-1.5 rounded-lg hover:bg-red-50 transition ml-auto">
          <FiTrash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}

// ─── Main Guardian Dashboard ──────────────────────────────────────────────────
export default function ParentDashboard() {
  const { user } = useAuth();
  const [tab,      setTab]      = useState("Alerts");
  const [alerts,   setAlerts]   = useState([]);
  const [children, setChildren] = useState([]);
  const [pending,  setPending]  = useState([]);
  const [unread,   setUnread]   = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [soundOn,        setSoundOn]        = useState(() => {
    const saved = localStorage.getItem("guardian_sound_on");
    return saved === null ? true : saved === "true";
  });
  const [alarmOn,        setAlarmOn]        = useState(false);
  const [wardIncidents,  setWardIncidents]  = useState([]);
  const [alertFilter,    setAlertFilter]    = useState("all");
  const prevUnreadRef = useRef(0);
  const unreadInitializedRef = useRef(false);
  const seenUnreadSosIdsRef = useRef(new Set());
  const alarmOnRef = useRef(false);

  useEffect(() => {
    alarmOnRef.current = alarmOn;
  }, [alarmOn]);

  // ── Fetchers ─────────────────────────────────────────────────────────────────
  const fetchAlerts = useCallback(async () => {
    try { const r = await familyAPI.getAlerts(); setAlerts(r.data); } catch {}
  }, []);

  const fetchChildren = useCallback(async () => {
    try { const r = await familyAPI.myChildren(); setChildren(r.data); } catch {}
  }, []);

  const fetchPending = useCallback(async () => {
    try { const r = await familyAPI.pendingRequests(); setPending(r.data); } catch {}
  }, []);

  const fetchWardIncidents = useCallback(async () => {
    try { const r = await familyAPI.wardIncidents(); setWardIncidents(r.data); } catch {}
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const r     = await familyAPI.unreadCount();
      const count = r.data.unread_count;

      let unreadSosAlerts = [];
      let hasActiveSos = false;
      try {
        const alertsRes = await familyAPI.getAlerts();
        unreadSosAlerts = (alertsRes.data || []).filter((a) => !a.is_read && !!a.sos_alert_id);
        hasActiveSos = unreadSosAlerts.some((a) => !!a.sos_is_active);
      } catch {
        // If alerts fetch fails, fall back to unread count behavior below.
      }

      const currentUnreadSosIds = new Set(unreadSosAlerts.map((alert) => alert.id));
      const newUnreadSosAlerts = unreadSosAlerts.filter((alert) => !seenUnreadSosIdsRef.current.has(alert.id));

      // Prime baseline on first load so historical unread alerts don't fire a fresh emergency alarm.
      if (!unreadInitializedRef.current) {
        unreadInitializedRef.current = true;
        prevUnreadRef.current = count;
        seenUnreadSosIdsRef.current = currentUnreadSosIds;
        setUnread(count);
        return;
      }

      if (newUnreadSosAlerts.length > 0) {
        // ── New SOS arrived since this session baseline ─────────────────────
        setTab("Alerts");
        fetchAlerts();

        const latestAlert = newUnreadSosAlerts[0];
        if (latestAlert) {
          sendSOSNotification(latestAlert.child_name || "Your ward", latestAlert.address);
        }

        if (soundOn && unreadSosAlerts.length > 0) {
          alertService.start();
          setAlarmOn(true);
        }

        toast("🚨 EMERGENCY! Your ward triggered SOS!", {
          icon: "🔔",
          duration: 12000,
          style: {
            background: "#fef2f2",
            border: "2px solid #ef4444",
            color: "#7f1d1d",
            fontWeight: "bold",
            fontSize: "15px",
          },
        });
      }

      seenUnreadSosIdsRef.current = currentUnreadSosIds;

      if (alarmOnRef.current) {
        if (!hasActiveSos) {
          alertService.stop();
          setAlarmOn(false);
        } else if (unreadSosAlerts.length === 0 && count === 0) {
          alertService.stop();
          setAlarmOn(false);
        }
      }

      prevUnreadRef.current = count;
      setUnread(count);
    } catch {}
  }, [soundOn, fetchAlerts]);

  // Poll frequently so parent alerts appear automatically without manual refresh.
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAlerts(), fetchChildren(), fetchPending(), fetchUnread(), fetchWardIncidents()])
      .finally(() => setLoading(false));

    const iv = setInterval(() => {
      fetchAlerts();
      fetchUnread();
      fetchWardIncidents();
    }, 1500);
    return () => { clearInterval(iv); };
  }, [fetchAlerts, fetchChildren, fetchPending, fetchUnread, fetchWardIncidents]);

  useEffect(() => {
    return () => {
      alertService.stop();
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    localStorage.setItem("guardian_sound_on", String(soundOn));
  }, [soundOn]);

  useEffect(() => {
    const primeAudio = () => {
      if (soundOn) {
        alertService.unlock();
      }
      window.removeEventListener("click", primeAudio);
      window.removeEventListener("touchstart", primeAudio);
    };

    window.addEventListener("click", primeAudio, { once: true });
    window.addEventListener("touchstart", primeAudio, { once: true });

    return () => {
      window.removeEventListener("click", primeAudio);
      window.removeEventListener("touchstart", primeAudio);
    };
  }, [soundOn]);

  // ── Sound controls ───────────────────────────────────────────────────────────
  const enableSound = () => {
    alertService.unlock();
    setSoundOn(true);
    toast.success("🔔 Sound alerts enabled! You'll hear an alarm + vibration on every SOS.", { duration: 5000 });
  };

  const stopAlarm = () => {
    alertService.stop();
    setAlarmOn(false);
  };

  // ── Alert handlers ────────────────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await familyAPI.markRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
      const next = Math.max(0, unread - 1);
      setUnread(next);
      prevUnreadRef.current = next;
    } catch { toast.error("Failed"); }
  };

  const handleMarkAllRead = async () => {
    try {
      await familyAPI.markAllRead();
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      setUnread(0);
      prevUnreadRef.current = 0;
      toast.success("All alerts marked as read");
    } catch { toast.error("Failed"); }
  };

  const handleDeleteAlert = async (id) => {
    if (!window.confirm("Delete this alert?")) return;
    try {
      await familyAPI.deleteAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch { toast.error("Failed to delete"); }
  };

  const handleAccept = async (id) => {
    try {
      await familyAPI.accept(id);
      toast.success("Linked! You'll now receive this ward's SOS alerts.");
      setPending(prev => prev.filter(p => p.id !== id));
      fetchChildren();
    } catch { toast.error("Failed to accept"); }
  };

  const handleReject = async (id) => {
    try {
      await familyAPI.reject(id);
      setPending(prev => prev.filter(p => p.id !== id));
      toast.success("Request rejected.");
    } catch { toast.error("Failed to reject"); }
  };

  const handleUnlink = async (id) => {
    if (!window.confirm("Remove this family link?")) return;
    try {
      await familyAPI.unlink(id);
      setChildren(prev => prev.filter(c => c.id !== id));
      toast.success("Link removed.");
    } catch { toast.error("Failed to unlink"); }
  };

  const refresh = () => {
    setLoading(true);
    Promise.all([fetchAlerts(), fetchChildren(), fetchPending(), fetchUnread(), fetchWardIncidents()])
      .finally(() => setLoading(false));
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* ══ ACTIVE ALARM BANNER ══════════════════════════════════════════════ */}
      {alarmOn && (
        <div className="mb-5 rounded-2xl bg-red-600 text-white p-4 shadow-2xl border-4
                        border-red-300 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🚨</span>
            <div>
              <p className="font-extrabold text-xl leading-tight">EMERGENCY ALERT!</p>
              <p className="text-red-100 text-sm mt-0.5">
                Your ward just triggered SOS. Check the location map and live video below.
              </p>
            </div>
          </div>
          <button
            onClick={stopAlarm}
            className="flex-shrink-0 flex items-center gap-2 bg-white text-red-700
                       font-extrabold px-5 py-2.5 rounded-xl hover:bg-red-50 transition shadow">
            <FiVolumeX size={18} /> Stop Alarm
          </button>
        </div>
      )}

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-2">
            <FiUsers className="text-pink-600" /> Guardian Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Welcome, <strong>{user?.full_name}</strong>. Real-time family monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!soundOn ? (
            <button onClick={enableSound}
              className="flex items-center gap-2 bg-pink-600 text-white text-sm font-bold
                         px-4 py-2 rounded-xl hover:bg-pink-700 transition shadow-md">
              <FiVolume2 size={16} /> Enable Sound Alerts
            </button>
          ) : (
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full
                             font-semibold flex items-center gap-1 border border-green-200">
              <FiVolume2 size={13} /> Sound ON
            </span>
          )}
          <button onClick={refresh} disabled={loading}
            className="flex items-center gap-2 text-sm border border-gray-200 bg-white
                       text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-50 transition">
            <FiRefreshCw className={loading ? "animate-spin" : ""} size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ══ SOUND-OFF WARNING ════════════════════════════════════════════════ */}
      {!soundOn && (
        <div className="mb-5 bg-amber-50 border border-amber-300 rounded-xl p-3
                        flex items-start gap-3 text-sm text-amber-800">
          <FiVolumeX size={20} className="flex-shrink-0 text-amber-500 mt-0.5" />
          <span>
            <strong>Sound alerts are OFF.</strong> Click{" "}
            <em>"Enable Sound Alerts"</em> above — you'll hear a LOUD repeating siren
            + feel vibrations the moment your ward triggers SOS, even on mobile when the app is in background.
          </span>
        </div>
      )}

      {/* ══ STATS ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-5 shadow-sm">
          <p className="text-3xl font-extrabold text-pink-600">{children.length}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium">Linked Wards</p>
        </div>
        <div className={`rounded-2xl border text-center py-5 shadow-sm ${
          unread > 0 ? "bg-red-50 border-red-300" : "bg-white border-gray-200"
        }`}>
          <p className={`text-3xl font-extrabold ${unread > 0 ? "text-red-600" : "text-gray-300"}`}>
            {unread}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium">Unread Alerts</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-5 shadow-sm">
          <p className="text-3xl font-extrabold text-yellow-500">{pending.length}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium">Pending Requests</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-5 shadow-sm">
          <p className="text-3xl font-extrabold text-indigo-600">{wardIncidents.length}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium">Ward Reports</p>
        </div>
      </div>

      {/* ══ TABS ═════════════════════════════════════════════════════════════ */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "bg-white text-gray-800 shadow font-bold" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t}
            {t === "Alerts" && unread > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {unread}
              </span>
            )}
            {t === "Ward Reports" && wardIncidents.length > 0 && (
              <span className="ml-2 bg-indigo-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {wardIncidents.length}
              </span>
            )}
            {t === "Pending Requests" && pending.length > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════ ALERTS TAB ══════════════════════════════════ */}
      {tab === "Alerts" && (
        <div>
          {/* History filter bar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => setAlertFilter("active")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  alertFilter === "active"
                    ? "bg-white text-red-700 font-bold shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                🚨 Active {unread > 0 && `(${unread})`}
              </button>
              <button
                onClick={() => setAlertFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  alertFilter === "all"
                    ? "bg-white text-gray-800 font-bold shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                📋 Full History ({alerts.length})
              </button>
            </div>
            {unread > 0 && (
              <button onClick={handleMarkAllRead}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <FiEye size={13} /> Mark all as read
              </button>
            )}
          </div>

          {(() => {
            const displayed = alertFilter === "active"
              ? alerts.filter(a => !a.is_read)
              : alerts;
            return loading ? (
              <div className="text-center py-12 text-gray-400 animate-pulse">Loading alerts…</div>
            ) : alerts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 text-center py-14 px-6 shadow-sm">
                <FiBell className="text-gray-200 text-6xl mx-auto mb-3" />
                <p className="text-gray-500 font-semibold text-lg">No alerts yet</p>
                <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                  When a linked ward triggers SOS, their live GPS map and live video clip
                  appear here instantly — with a loud alarm sound.
                </p>
                <div className="mt-8 text-left bg-gradient-to-br from-pink-50 to-purple-50
                                border border-pink-100 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-800 mb-3">How to receive alerts</h3>
                  <ol className="space-y-2 text-sm text-gray-600">
                    <li className="flex gap-2">
                      <span className="text-pink-600 font-bold">1.</span>
                      Your ward registers a <strong>Child</strong> or <strong>Women</strong> account
                    </li>
                    <li className="flex gap-2">
                      <span className="text-pink-600 font-bold">2.</span>
                      They go to <strong>Profile → Family Settings</strong> and enter your email
                    </li>
                    <li className="flex gap-2">
                      <span className="text-pink-600 font-bold">3.</span>
                      Accept the request in the <em>Pending Requests</em> tab above
                    </li>
                    <li className="flex gap-2">
                      <span className="text-pink-600 font-bold">4.</span>
                      Click <strong>"Enable Sound Alerts"</strong> on this page
                    </li>
                    <li className="flex gap-2">
                      <span className="text-pink-600 font-bold">5.</span>
                      When they press SOS → you instantly get{" "}
                      <strong>live map + live video + repeating alarm</strong>
                    </li>
                  </ol>
                </div>
              </div>
            ) : displayed.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 text-center py-14 shadow-sm">
                <FiShield className="text-green-200 text-6xl mx-auto mb-3" />
                <p className="text-green-600 font-semibold text-lg">All clear — no active alerts</p>
                <p className="text-sm text-gray-400 mt-1">
                  All previous alerts have been reviewed. Switch to{" "}
                  <button onClick={() => setAlertFilter("all")} className="text-blue-500 underline">
                    Full History
                  </button>{" "}
                  to see past alerts.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {displayed.map(a => (
                  <AlertCard key={a.id} alert={a}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDeleteAlert}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ══════════════════════ WARD REPORTS TAB ════════════════════════════ */}
      {tab === "Ward Reports" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Non-anonymous incidents reported by your linked wards.
          </p>
          {loading ? (
            <div className="text-center py-12 text-gray-400 animate-pulse">Loading…</div>
          ) : wardIncidents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 text-center py-14 px-6 shadow-sm">
              <FiFileText className="text-gray-200 text-6xl mx-auto mb-3" />
              <p className="text-gray-500 font-semibold text-lg">No incident reports yet</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
                When a linked ward files a non-anonymous incident report, it will appear here
                so you can stay informed and take action.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {wardIncidents.map(inc => (
                <div key={inc.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-11 h-11 rounded-full bg-indigo-100
                                    flex items-center justify-center">
                      <FiFileText className="text-indigo-600" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-extrabold text-gray-800 text-base truncate">
                          {inc.title}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          inc.status === "resolved"
                            ? "bg-green-100 text-green-700"
                            : inc.status === "under_review"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {inc.status?.replace(/_/g, " ")}
                        </span>
                        {inc.incident_type && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                            {inc.incident_type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                        <span className="font-semibold text-gray-700">
                          👤 {inc.reporter_name}
                        </span>
                        {inc.location && (
                          <span className="flex items-center gap-1">
                            <FiMapPin size={11} /> {inc.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <FiClock size={11} />
                          {timeAgo(inc.created_at)}
                        </span>
                      </p>
                      {inc.description && (
                        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                          {inc.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ CHILDREN TAB ════════════════════════════════ */}
      {tab === "Children" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Linked women and child wards who will send alerts to this guardian.
          </p>
          {loading ? (
            <div className="text-center py-12 text-gray-400 animate-pulse">Loading…</div>
          ) : children.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 text-center py-14 shadow-sm">
              <FiUserCheck className="text-gray-200 text-6xl mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">No linked wards yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Ask your ward to go to <strong>Profile → Family Settings</strong> and enter your email.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map(link => (
                <div key={link.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-pink-700 font-extrabold text-lg">
                      {(link.child_name || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800">{link.child_name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${link.child_role === "women" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
                        {roleLabel(link.child_role)}
                      </span>
                      {link.status && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">
                          {String(link.status).replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{link.child_email}</p>
                    {link.child_phone && (
                      <a href={`tel:${link.child_phone}`}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                        <FiPhone size={11} /> {link.child_phone}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      ✓ Linked
                    </span>
                    <button onClick={() => handleUnlink(link.id)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                      <FiTrash2 size={11} /> Unlink
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ PENDING REQUESTS TAB ════════════════════════ */}
      {tab === "Pending Requests" && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-gray-400 animate-pulse">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 text-center py-14 shadow-sm">
              <FiUsers className="text-gray-200 text-6xl mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">No pending requests</p>
              <p className="text-sm text-gray-400 mt-1">
                When a ward sends a link request to your email, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(link => (
                <div key={link.id}
                  className="bg-white rounded-2xl border-2 border-yellow-300 p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-700 font-extrabold text-lg">
                        {(link.child_name || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{link.child_name}</p>
                      <p className="text-sm text-gray-500">{link.child_email}</p>
                      {link.child_phone && (
                        <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                          <FiPhone size={11} /> {link.child_phone}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <FiClock size={11} /> Requested {timeAgo(link.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleAccept(link.id)}
                        className="flex items-center gap-1 bg-green-600 text-white text-sm
                                   px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-medium">
                        <FiCheck size={13} /> Accept
                      </button>
                      <button onClick={() => handleReject(link.id)}
                        className="flex items-center gap-1 bg-red-100 text-red-700 text-sm
                                   px-3 py-1.5 rounded-lg hover:bg-red-200 transition font-medium">
                        <FiX size={13} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

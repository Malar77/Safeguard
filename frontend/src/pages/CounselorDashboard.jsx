import { useEffect, useState, useCallback } from "react";
import { sessionsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiUsers, FiVideo, FiMic, FiPhone, FiClock, FiCheckCircle,
  FiAlertCircle, FiRefreshCw, FiActivity, FiBriefcase,
  FiCalendar, FiLoader, FiLogOut, FiUser, FiHeadphones,
  FiPhoneCall, FiList,
} from "react-icons/fi";

const STATUS_STYLES = {
  waiting:   "bg-amber-100  text-amber-700  border-amber-200",
  active:    "bg-green-100  text-green-700  border-green-200",
  ended:     "bg-gray-100   text-gray-600   border-gray-200",
  cancelled: "bg-red-100    text-red-600    border-red-200",
};

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
function fmtDuration(mins) {
  if (mins == null) return "—";
  if (mins < 1) return "< 1 min";
  return `${mins} min`;
}
function avatar(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function CounselorDashboard() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  // Guard: only counselors
  useEffect(() => {
    if (user && user.role !== "counselor") {
      toast.error("This page is for counselors only.");
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const [tab,       setTab]       = useState("queue");   // "queue" | "sessions" | "history"
  const [stats,     setStats]     = useState(null);
  const [waiting,   setWaiting]   = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [joining,   setJoining]   = useState(null);     // room_id being joined
  const [polling,   setPolling]   = useState(true);

  /* ── Fetch everything ─────────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    try {
      const [dashRes, waitRes, pendingRes, histRes] = await Promise.all([
        sessionsAPI.counselorDashboard(),
        sessionsAPI.waiting(),
        sessionsAPI.pendingAppointments(),
        sessionsAPI.counselorSessions(),
      ]);
      setStats(dashRes.data);
      setWaiting(waitRes.data);
      setPendingAppointments(pendingRes.data || []);
      setHistory(histRes.data);
    } catch (err) {
      if (err?.response?.status !== 403) toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll waiting queue every 15 s
  useEffect(() => {
    if (!polling) return;
    const iv = setInterval(() => {
      sessionsAPI.waiting()
        .then(r => setWaiting(r.data))
        .catch(() => {});
    }, 15_000);
    return () => clearInterval(iv);
  }, [polling]);

  // Re-fetch on window focus
  useEffect(() => {
    const h = () => fetchAll();
    window.addEventListener("focus", h);
    return () => window.removeEventListener("focus", h);
  }, [fetchAll]);

  /* ── Join a waiting session (become counselor) ────────────────────────── */
  const joinSession = async (roomId, callType) => {
    if (!user) return;
    setJoining(roomId);
    try {
      // Navigate directly to call page — WS handshake sets counselor_id
      navigate(`/counseling/call/${roomId}?type=${callType}`);
    } catch {
      toast.error("Failed to join session.");
      setJoining(null);
    }
  };

  /* ── Loading screen ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  const completedSessions = history.filter(s => s.status === "ended");
  const activeSessions    = history.filter(s => s.status === "active");

  /* ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-3xl mx-auto pb-24">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-600 px-5 pt-8 pb-6 rounded-b-3xl">
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute top-10 -right-3 w-16 h-16 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
            {avatar(user?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Counselor Dashboard</p>
            <h1 className="text-white font-extrabold text-xl truncate">{user?.full_name}</h1>
            <p className="text-white/60 text-xs truncate">{user?.email}</p>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }}
            className="p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl transition flex-shrink-0">
            <FiLogOut size={16}/>
          </button>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="relative grid grid-cols-4 gap-2">
            {[
              { label: "Upcoming",  val: stats.upcoming_appointments || 0, icon: <FiCalendar size={13}/>, bg: (stats.upcoming_appointments || 0) > 0 ? "bg-sky-400/40" : "bg-white/15" },
              { label: "Waiting",   val: stats.waiting_queue,      icon: <FiClock size={13}/>,       bg: waiting.length > 0 ? "bg-amber-400/40" : "bg-white/15" },
              { label: "Active",    val: stats.active_sessions,    icon: <FiPhoneCall size={13}/>,  bg: stats.active_sessions > 0 ? "bg-green-400/40" : "bg-white/15" },
              { label: "Done",      val: stats.completed_sessions, icon: <FiCheckCircle size={13}/>, bg: "bg-white/15" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center text-white`}>
                <div className="flex justify-center mb-1 opacity-70">{s.icon}</div>
                <div className="text-xl font-extrabold leading-none">{s.val}</div>
                <div className="text-[10px] opacity-60 mt-0.5 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Waiting-queue live alert */}
        {waiting.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl overflow-hidden">
            <div className="bg-amber-400 px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-ping" />
              <span className="text-white font-extrabold text-sm">
                {waiting.length} User{waiting.length > 1 ? "s" : ""} Waiting for a Counselor
              </span>
            </div>
            <div className="p-3 space-y-2">
              {waiting.slice(0, 3).map(w => (
                <div key={w.room_id} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-black text-sm flex-shrink-0">
                    {avatar(w.user_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{w.user_name}</p>
                    <p className="text-gray-400 text-xs flex items-center gap-1">
                      {w.call_type === "video" ? <FiVideo size={10}/> : <FiMic size={10}/>}
                      {w.call_type} · {w.scheduled_for ? `scheduled ${fmtTime(w.scheduled_for)}` : `waiting since ${fmtTime(w.created_at)}`}
                    </p>
                  </div>
                  <button
                    onClick={() => joinSession(w.room_id, w.call_type)}
                    disabled={joining === w.room_id}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold text-xs px-4 py-2 rounded-xl transition active:scale-95"
                  >
                    {joining === w.room_id
                      ? <FiLoader className="animate-spin" size={13}/>
                      : (w.call_type === "video" ? <FiVideo size={13}/> : <FiMic size={13}/>)
                    }
                    Join
                  </button>
                </div>
              ))}
              {waiting.length > 3 && (
                <p className="text-xs text-amber-600 text-center font-semibold">
                  +{waiting.length - 3} more in queue
                </p>
              )}
            </div>
          </div>
        )}

        {waiting.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <FiCheckCircle className="text-green-600 flex-shrink-0" size={18}/>
            <div>
              <p className="text-green-800 font-semibold text-sm">No one waiting right now</p>
              <p className="text-green-600 text-xs">Queue updates automatically every 15 seconds</p>
            </div>
            <button onClick={fetchAll} className="ml-auto p-2 text-green-600 hover:bg-green-100 rounded-xl transition">
              <FiRefreshCw size={15}/>
            </button>
          </div>
        )}

        {pendingAppointments.length > 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-violet-600 flex-shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-violet-800 font-semibold text-sm">
                  {pendingAppointments.length} appointment request{pendingAppointments.length > 1 ? "s" : ""} waiting for your response
                </p>
                <p className="text-violet-600 text-xs">Open the appointment panel to accept or reject them.</p>
              </div>
              <button
                onClick={() => navigate("/counseling/appointments")}
                className="ml-auto flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition"
              >
                Open
              </button>
            </div>
            <div className="space-y-2">
              {pendingAppointments.slice(0, 3).map((appointment) => (
                <div key={appointment.room_id} className="bg-white rounded-2xl px-4 py-3 border border-violet-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-black text-sm flex-shrink-0">
                    {avatar(appointment.user_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{appointment.user_name}</p>
                    <p className="text-gray-400 text-xs truncate">
                      {appointment.topic || "Counseling appointment"} · {fmtTime(appointment.scheduled_for)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wide">Pending</p>
                    <p className="text-[10px] text-gray-400">{appointment.call_type || "video"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(stats?.upcoming_appointments || 0) > 0 && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center gap-3">
            <FiCalendar className="text-sky-600 flex-shrink-0" size={18} />
            <div className="min-w-0">
              <p className="text-sky-800 font-semibold text-sm truncate">
                {stats.upcoming_appointments} upcoming appointment{stats.upcoming_appointments > 1 ? "s" : ""}
              </p>
              <p className="text-sky-600 text-xs">Review and respond from appointment panel</p>
            </div>
            <button
              onClick={() => navigate("/counseling/appointments")}
              className="ml-auto flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition"
            >
              Open
            </button>
          </div>
        )}

        {/* Tab nav */}
        <div className="bg-gray-100 rounded-2xl p-1 flex gap-1">
          {[
            { key: "queue",    label: "Queue",    icon: <FiHeadphones size={14}/>, count: waiting.length },
            { key: "sessions", label: "Active",   icon: <FiActivity size={14}/>,   count: activeSessions.length },
            { key: "history",  label: "History",  icon: <FiList size={14}/>,       count: completedSessions.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition ${
                tab === t.key
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}>
              {t.icon}
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? "bg-primary-100 text-primary-700" : "bg-gray-200 text-gray-600"
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: QUEUE ───────────────────────────────────────────────── */}
        {tab === "queue" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800 text-sm">Waiting Queue</p>
              <button onClick={fetchAll} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                <FiRefreshCw size={11}/> Refresh
              </button>
            </div>

            {waiting.length === 0 ? (
              <div className="card text-center py-10">
                <FiHeadphones size={32} className="text-gray-300 mx-auto mb-3"/>
                <p className="text-gray-500 font-semibold">No users waiting</p>
                <p className="text-gray-400 text-xs mt-1">When a user starts a session it will appear here instantly</p>
              </div>
            ) : (
              waiting.map(w => (
                <div key={w.room_id} className="bg-white border-2 border-amber-200 rounded-3xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-base flex-shrink-0">
                      {avatar(w.user_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-gray-800">{w.user_name}</p>
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Waiting</span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                        <FiClock size={10}/> {w.scheduled_for ? `Scheduled for ${fmtTime(w.scheduled_for)}` : `Requested at ${fmtTime(w.created_at)}`}
                      </p>
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                        {w.call_type === "video" ? <FiVideo size={10}/> : <FiMic size={10}/>}
                        {w.call_type === "video" ? "Video call" : "Voice call"} session
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => joinSession(w.room_id, w.call_type)}
                      disabled={!!joining}
                      className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 rounded-2xl transition active:scale-95 text-sm disabled:opacity-60 ${
                        w.call_type === "video"
                          ? "bg-gradient-to-r from-primary-600 to-purple-600 text-white"
                          : "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                      }`}
                    >
                      {joining === w.room_id
                        ? <FiLoader className="animate-spin" size={16}/>
                        : (w.call_type === "video" ? <FiVideo size={16}/> : <FiMic size={16}/>)
                      }
                      {joining === w.room_id ? "Joining…" : `Join ${w.call_type === "video" ? "Video" : "Voice"} Call`}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB: ACTIVE SESSIONS ─────────────────────────────────────── */}
        {tab === "sessions" && (
          <div className="space-y-3">
            <p className="font-bold text-gray-800 text-sm">Your Active Sessions</p>
            {activeSessions.length === 0 ? (
              <div className="card text-center py-10">
                <FiActivity size={32} className="text-gray-300 mx-auto mb-3"/>
                <p className="text-gray-500 font-semibold">No active sessions</p>
                <p className="text-gray-400 text-xs mt-1">Join a call from the Queue tab to start a session</p>
              </div>
            ) : (
              activeSessions.map(s => (
                <div key={s.room_id} className="bg-white border-2 border-green-300 rounded-3xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-black text-base flex-shrink-0">
                      {avatar(s.user_name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-extrabold text-gray-800">{s.user_name}</p>
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>  LIVE
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/counseling/call/${s.room_id}?type=${s.call_type}`)}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition">
                      <FiPhoneCall size={12}/> Rejoin
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="font-semibold text-gray-700">Type</p>
                      <p className="flex items-center justify-center gap-1 mt-0.5">
                        {s.call_type === "video" ? <FiVideo size={11}/> : <FiMic size={11}/>}
                        {s.call_type}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="font-semibold text-gray-700">Started</p>
                      <p className="mt-0.5">{s.started_at ? new Date(s.started_at).toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit"}) : "—"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="font-semibold text-gray-700">Duration</p>
                      <p className="mt-0.5">{fmtDuration(s.duration_mins)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB: HISTORY ─────────────────────────────────────────────── */}
        {tab === "history" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-gray-800 text-sm">Session History</p>
              <p className="text-xs text-gray-400">{history.length} total</p>
            </div>

            {history.length === 0 ? (
              <div className="card text-center py-10">
                <FiList size={32} className="text-gray-300 mx-auto mb-3"/>
                <p className="text-gray-500 font-semibold">No session history yet</p>
                <p className="text-gray-400 text-xs mt-1">Completed sessions will appear here</p>
              </div>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gradient-to-br from-primary-50 to-indigo-50 border border-primary-100 rounded-2xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-primary-700">{completedSessions.length}</p>
                    <p className="text-xs text-primary-500 font-semibold mt-0.5">Completed</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-2xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-emerald-700">
                      {completedSessions.filter(s => s.duration_mins != null).length > 0
                        ? Math.round(completedSessions.reduce((sum, s) => sum + (s.duration_mins || 0), 0) / completedSessions.filter(s => s.duration_mins != null).length)
                        : 0}
                    </p>
                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">Avg mins</p>
                  </div>
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-3 text-center">
                    <p className="text-2xl font-extrabold text-violet-700">
                      {history.filter(s => s.call_type === "video").length}
                    </p>
                    <p className="text-xs text-violet-600 font-semibold mt-0.5">Video</p>
                  </div>
                </div>

                {/* Session list */}
                <div className="space-y-2">
                  {history.map(s => (
                    <div key={s.room_id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 hover:shadow-sm transition">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${
                        s.status === "ended"  ? "bg-gray-400" :
                        s.status === "active" ? "bg-green-500" : "bg-amber-400"
                      }`}>
                        {avatar(s.user_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800 text-sm truncate">{s.user_name}</p>
                          <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[s.status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                            {s.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                          {s.call_type === "video" ? <FiVideo size={10}/> : <FiMic size={10}/>}
                          {s.call_type}
                          <span className="text-gray-300">·</span>
                          <FiCalendar size={10}/> {fmtTime(s.created_at)}
                          {s.duration_mins != null && (
                            <><span className="text-gray-300">·</span> <FiClock size={10}/> {fmtDuration(s.duration_mins)}</>
                          )}
                        </p>
                      </div>
                      {s.status === "active" && (
                        <button
                          onClick={() => navigate(`/counseling/call/${s.room_id}?type=${s.call_type}`)}
                          className="flex-shrink-0 text-xs bg-green-100 text-green-700 font-bold px-3 py-1.5 rounded-xl hover:bg-green-200 transition">
                          Rejoin
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tips card */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <p className="font-bold text-indigo-800 text-sm mb-2 flex items-center gap-2">
            <FiAlertCircle size={13}/> Counselor Guidelines
          </p>
          <ul className="text-xs text-indigo-700 space-y-1.5">
            {[
              "Maintain confidentiality — never share client information",
              "Be in a quiet, private space before joining any session",
              "If you cannot attend, let the queue auto-expire (user can re-request)",
              "Session ends when either party hangs up or closes the browser",
              "Refer to emergency services (112, 1091) for immediate safety risks",
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <FiCheckCircle size={10} className="mt-0.5 text-indigo-400 flex-shrink-0"/>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

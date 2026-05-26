import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { incidentAPI, sosAPI } from "../services/api";
import { FiAlertTriangle, FiFileText, FiPhone, FiBook, FiHeart, FiMap, FiUser, FiShield, FiCheckCircle, FiUsers, FiClipboard, FiShare2, FiLink, FiX, FiMessageSquare } from "react-icons/fi";
import toast from "react-hot-toast";

const BASE_ACTIONS = [
  {
    title: "SOS Emergency", desc: "Instant alert", link: "/sos",
    icon: <FiAlertTriangle className="w-5 h-5" />,
    cardBg: "bg-red-50 border-red-100",
    iconBg: "bg-red-600 text-white",
  },
  {
    title: "Report Incident", desc: "Secure reporting", link: "/report",
    icon: <FiFileText className="w-5 h-5" />,
    cardBg: "bg-blue-50 border-blue-100",
    iconBg: "bg-blue-600 text-white",
  },
  {
    title: "My Reports", desc: "Track status", link: "/my-incidents",
    icon: <FiClipboard className="w-5 h-5" />,
    cardBg: "bg-emerald-50 border-emerald-100",
    iconBg: "bg-emerald-600 text-white",
  },
  {
    title: "Helplines", desc: "24/7 Support", link: "/helplines",
    icon: <FiPhone className="w-5 h-5" />,
    cardBg: "bg-purple-50 border-purple-100",
    iconBg: "bg-purple-600 text-white",
  },
  {
    title: "Legal Rights", desc: "Expert advice", link: "/legal-resources",
    icon: <FiBook className="w-5 h-5" />,
    cardBg: "bg-amber-50 border-amber-100",
    iconBg: "bg-amber-500 text-white",
  },
  {
    title: "Counseling", desc: "Safe space", link: "/counseling",
    icon: <FiHeart className="w-5 h-5" />,
    cardBg: "bg-pink-50 border-pink-100",
    iconBg: "bg-pink-600 text-white",
  },
  {
    title: "AI Assistant", desc: "Talk it through", link: "/ai-assistant",
    icon: <FiMessageSquare className="w-5 h-5" />,
    cardBg: "bg-slate-50 border-slate-200",
    iconBg: "bg-slate-900 text-white",
  },
  {
    title: "Safe Routes", desc: "Find safe places", link: "/safe-routes",
    icon: <FiMap className="w-5 h-5" />,
    cardBg: "bg-cyan-50 border-cyan-100",
    iconBg: "bg-cyan-600 text-white",
  },
  {
    title: "My Profile", desc: "Identity & info", link: "/profile",
    icon: <FiUser className="w-5 h-5" />,
    cardBg: "bg-slate-50 border-slate-100",
    iconBg: "bg-slate-600 text-white",
  },
];

const WOMEN_EXTRA = {
  title: "Share Location", desc: "Live GPS & SafeWalk", link: "/share-location",
  icon: <FiShare2 className="w-5 h-5" />,
  cardBg: "bg-fuchsia-50 border-fuchsia-100",
  iconBg: "bg-fuchsia-600 text-white",
};

const CHILD_ACTIONS = [
  {
    title: "SOS Emergency", desc: "Alert guardian now", link: "/sos",
    icon: <FiAlertTriangle className="w-5 h-5" />,
    cardBg: "bg-red-50 border-red-100",
    iconBg: "bg-red-600 text-white",
  },
  {
    title: "Link Guardian", desc: "Connect parent/guardian", link: "/family-linking",
    icon: <FiLink className="w-5 h-5" />,
    cardBg: "bg-indigo-50 border-indigo-100",
    iconBg: "bg-indigo-600 text-white",
  },
  {
    title: "Share Location", desc: "Live GPS to guardian", link: "/share-location",
    icon: <FiShare2 className="w-5 h-5" />,
    cardBg: "bg-fuchsia-50 border-fuchsia-100",
    iconBg: "bg-fuchsia-600 text-white",
  },
  {
    title: "Child Safety", desc: "Safety guides", link: "/child-safety",
    icon: <FiShield className="w-5 h-5" />,
    cardBg: "bg-blue-50 border-blue-100",
    iconBg: "bg-blue-600 text-white",
  },
  {
    title: "Report Incident", desc: "Secure reporting", link: "/report",
    icon: <FiFileText className="w-5 h-5" />,
    cardBg: "bg-emerald-50 border-emerald-100",
    iconBg: "bg-emerald-600 text-white",
  },
  {
    title: "Helplines", desc: "24/7 Support", link: "/helplines",
    icon: <FiPhone className="w-5 h-5" />,
    cardBg: "bg-purple-50 border-purple-100",
    iconBg: "bg-purple-600 text-white",
  },
  {
    title: "Counseling", desc: "Talk to someone", link: "/counseling",
    icon: <FiHeart className="w-5 h-5" />,
    cardBg: "bg-pink-50 border-pink-100",
    iconBg: "bg-pink-600 text-white",
  },
  {
    title: "My Reports", desc: "Track status", link: "/my-incidents",
    icon: <FiClipboard className="w-5 h-5" />,
    cardBg: "bg-amber-50 border-amber-100",
    iconBg: "bg-amber-500 text-white",
  },
];

const STATUS_COLOR = {
  pending: "text-yellow-700 bg-yellow-50 border-yellow-200",
  under_review: "text-blue-700 bg-blue-50 border-blue-200",
  resolved: "text-green-700 bg-green-50 border-green-200",
  closed: "text-gray-600 bg-gray-50 border-gray-200",
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Role-specific redirects
  useEffect(() => {
    if (user?.role === "parent")    navigate("/parent-dashboard",    { replace: true });
    if (user?.role === "counselor") navigate("/counselor-dashboard", { replace: true });
  }, [user, navigate]);

  const [incidents,    setIncidents]    = useState([]);
  const [sosAlerts,    setSosAlerts]    = useState([]);
  const [loadingData,  setLoadingData]  = useState(true);
  const [resolving,    setResolving]    = useState(false);

  // Fetch latest SOS + incidents
  const fetchData = useCallback(() => {
    Promise.all([incidentAPI.my(), sosAPI.myAlerts()])
      .then(([inc, sos]) => { setIncidents(inc.data); setSosAlerts(sos.data); })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  // Initial load
  useEffect(() => { fetchData(); }, [fetchData]);

  // ── BUG FIX: re-fetch on window focus (catches resolves done on SOS page)
  useEffect(() => {
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchData]);

  // ── BUG FIX: poll every 30 s so active badge stays in sync
  useEffect(() => {
    const iv = setInterval(fetchData, 30_000);
    return () => clearInterval(iv);
  }, [fetchData]);

  // ── Inline resolve from Dashboard banner (no navigation needed)
  const resolveFromDashboard = async () => {
    setResolving(true);
    try {
      await sosAPI.resolveActive();
      // Immediately update local state — mark all active alerts as resolved
      setSosAlerts((prev) =>
        prev.map((a) => a.is_active ? { ...a, is_active: false, resolved_at: new Date().toISOString() } : a)
      );
      toast.success("✅ SOS resolved. Stay safe!");
    } catch (err) {
      const msg = err?.response?.data?.detail;
      if (msg === "No active SOS alert found") {
        // Already resolved elsewhere — just sync local state
        setSosAlerts((prev) => prev.map((a) => ({ ...a, is_active: false })));
        toast.success("SOS was already resolved.");
      } else {
        toast.error(msg || "Failed to resolve SOS");
      }
    } finally {
      setResolving(false);
    }
  };

  const actions =
    user?.role === "women" ? [BASE_ACTIONS[0], WOMEN_EXTRA, ...BASE_ACTIONS.slice(1)]
    : user?.role === "child" ? CHILD_ACTIONS
    : BASE_ACTIONS;

  const recentIncidents = incidents.slice(0, 3);
  const activeAlert     = sosAlerts.find((s) => s.is_active);
  const totalResolved   = incidents.filter((i) => i.status === "resolved").length;
  const totalPending    = incidents.filter((i) => i.status === "pending").length;

  return (
    <div className="px-4 py-4">
      {/* Greeting */}
      <div className="card mb-6 bg-gradient-to-r from-primary-600 to-rose-600 text-white flex items-center gap-4">
        <div className="bg-white/20 p-3 rounded-full">
          <FiShield className="text-3xl" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{greeting}, {user?.full_name?.split(" ")[0]}!</h1>
          <p className="text-primary-100 text-sm mt-1">You are safe with SafeGuard. Here are your quick actions.</p>
        </div>
        <div className="hidden sm:flex gap-4 text-center">
          <div>
            <div className="text-2xl font-extrabold">{incidents.length}</div>
            <div className="text-primary-200 text-xs">Reports</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold">{totalResolved}</div>
            <div className="text-primary-200 text-xs">Resolved</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold">{sosAlerts.length}</div>
            <div className="text-primary-200 text-xs">SOS Alerts</div>
          </div>
        </div>
      </div>

      {/* Active SOS Warning */}
      {activeAlert && (
        <div className="mb-6 rounded-2xl overflow-hidden shadow-xl border-2 border-red-400">
          {/* top strip */}
          <div className="bg-red-600 text-white px-4 py-3 flex items-center gap-3 animate-pulse">
            <span className="text-2xl">🚨</span>
            <div className="flex-1">
              <div className="font-extrabold text-sm">SOS ALERT IS ACTIVE</div>
              <div className="text-red-100 text-xs">
                Triggered: {new Date(activeAlert.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </div>
            <div className="w-3 h-3 bg-white rounded-full animate-ping flex-shrink-0" />
          </div>
          {/* action row */}
          <div className="bg-red-50 px-4 py-3 flex items-center gap-3">
            <p className="text-red-700 text-xs font-medium flex-1">
              Are you safe? Tap below to cancel the alert.
            </p>
            <button
              onClick={resolveFromDashboard}
              disabled={resolving}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition active:scale-95 whitespace-nowrap"
            >
              <FiCheckCircle size={13} />
              {resolving ? "Resolving…" : "I'm Safe"}
            </button>
            <Link
              to="/sos"
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
            >
              Manage
            </Link>
          </div>
        </div>
      )}

      {/* SOS Banner (when no active alert) */}
      {!activeAlert && (
        <Link to="/sos" className="block mb-6 bg-red-600 hover:bg-red-700 transition text-white rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="bg-white/20 p-3 rounded-full text-3xl">🚨</div>
          <div>
            <div className="font-bold text-xl">Need Help Right Now?</div>
            <div className="text-red-100 text-sm">One tap to trigger SOS & notify your trusted contacts</div>
          </div>
          <div className="ml-auto text-3xl">›</div>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {actions.map((a) => (
          <Link
            key={a.title}
            to={a.link}
            className={`flex flex-col items-start p-4 rounded-[2rem] border transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md ${a.cardBg}`}
          >
            <div className={`p-2.5 rounded-2xl mb-3 ${a.iconBg}`}>
              {a.icon}
            </div>
            <h3 className="font-bold text-sm mb-1 leading-tight text-slate-800">{a.title}</h3>
            <p className="text-[10px] opacity-70 font-semibold uppercase tracking-wider text-slate-600">{a.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-700 flex items-center gap-2"><FiFileText className="text-blue-500" /> Recent Reports</h3>
            <Link to="/my-incidents" className="text-xs text-primary-600 hover:underline">View all →</Link>
          </div>
          {loadingData ? (
            <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent" /></div>
          ) : recentIncidents.length === 0 ? (
            <div className="text-center text-gray-400 py-6 text-sm">
              <FiFileText className="text-3xl mx-auto mb-2 text-gray-300" />
              No incidents reported yet.<br />
              <Link to="/report" className="text-primary-600 hover:underline text-xs">Report one now →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentIncidents.map((inc) => (
                <div key={inc.id} className={`rounded-xl border p-3 ${STATUS_COLOR[inc.status] || "bg-gray-50 border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm truncate">{inc.title}</span>
                    <span className="text-xs capitalize ml-2 flex-shrink-0">{inc.status.replace(/_/g, " ")}</span>
                  </div>
                  <p className="text-xs mt-0.5 opacity-70 capitalize">{inc.incident_type.replace(/_/g, " ")} · {new Date(inc.created_at).toLocaleDateString()}</p>
                </div>
              ))}
              {incidents.length > 3 && (
                <p className="text-xs text-gray-400 text-center">{incidents.length - 3} more report{incidents.length - 3 > 1 ? "s" : ""} — <Link to="/my-incidents" className="text-primary-600 hover:underline">view all</Link></p>
              )}
            </div>
          )}
        </div>

        {/* Summary Stats + Emergency */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="card">
            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><FiShield className="text-primary-500" /> My Safety Summary</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-yellow-50 rounded-xl p-3">
                <div className="text-2xl font-extrabold text-yellow-700">{totalPending}</div>
                <div className="text-xs text-yellow-600 mt-1">Pending</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="text-2xl font-extrabold text-blue-700">{incidents.filter(i => i.status === "under_review").length}</div>
                <div className="text-xs text-blue-600 mt-1">Under Review</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-2xl font-extrabold text-green-700">{totalResolved}</div>
                <div className="text-xs text-green-600 mt-1">Resolved</div>
              </div>
            </div>
          </div>

          {/* Emergency Numbers */}
          <div className="card">
            <h3 className="font-bold text-gray-700 mb-3">Emergency Numbers</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[["112", "Emergency"], ["1091", "Women"], ["1098", "Children"], ["181", "DV"], ["100", "Police"], ["108", "Ambulance"], ["1930", "Cyber"], ["15100", "Legal Aid"]].map(([num, label]) => (
                <a key={num} href={`tel:${num}`} className="flex items-center gap-2 bg-gray-50 hover:bg-primary-50 border border-gray-200 rounded-lg px-3 py-2 transition">
                  <span className="font-bold text-primary-700">{num}</span>
                  <span className="text-gray-600 text-xs">{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

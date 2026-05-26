import { useEffect, useMemo, useState } from "react";
import { adminAPI, incidentAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  FiUsers,
  FiFileText,
  FiAlertTriangle,
  FiCheckCircle,
  FiShield,
  FiMapPin,
  FiTrash2,
  FiBell,
  FiActivity,
  FiHeadphones,
  FiPlus,
  FiX,
  FiEye,
  FiEyeOff,
  FiToggleLeft,
  FiToggleRight,
  FiFilter,
  FiRefreshCw,
  FiSend,
} from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const STATUS_BADGE = {
  pending: "badge-pending",
  under_review: "badge-under_review",
  resolved: "badge-resolved",
  closed: "badge-closed",
};
const COLORS = ["#f97316", "#0ea5e9", "#22c55e", "#ef4444", "#8b5cf6", "#14b8a6", "#f59e0b", "#64748b"];
const ROLES = ["user", "child", "women", "parent", "admin"];

const TABS = [
  { key: "overview", label: "Command" },
  { key: "incidents", label: "Reports" },
  { key: "sos", label: "Emergency" },
  { key: "users", label: "People" },
  { key: "counselors", label: "Counselors" },
  { key: "logs", label: "Logs" },
];

function shellCard(extra = "") {
  return `rounded-3xl border border-slate-200 bg-white/90 backdrop-blur shadow-sm ${extra}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  const [incidentTypes, setIncidentTypes] = useState([]);
  const [incidentStatusFilter, setIncidentStatusFilter] = useState("all");
  const [incidentTypeFilter, setIncidentTypeFilter] = useState("all");
  const [viewIncident, setViewIncident] = useState(null);

  const [notesModal, setNotesModal] = useState(null);
  const [notesInput, setNotesInput] = useState("");

  const [notifModal, setNotifModal] = useState(false);
  const [notifForm, setNotifForm] = useState({ title: "", message: "", user_id: "" });
  const [notifLoading, setNotifLoading] = useState(false);

  const [showAddCounselor, setShowAddCounselor] = useState(false);
  const [counselorForm, setCounselorForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [counselorPwShow, setCounselorPwShow] = useState(false);
  const [counselorLoading, setCounselorLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  const chartData = useMemo(
    () => (stats ? Object.entries(stats.incidents_by_type || {}).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })) : []),
    [stats]
  );
  const activeSOS = useMemo(() => sosAlerts.filter((a) => a.is_active), [sosAlerts]);

  const loadIncidents = async (status = incidentStatusFilter, type = incidentTypeFilter) => {
    const params = {};
    if (status !== "all") params.status = status;
    if (type !== "all") params.incident_type = type;
    const inc = await adminAPI.getIncidents(params);
    setIncidents(inc.data);
  };

  const loadEverything = async () => {
    setLoading(true);
    try {
      const [s, u, inc, sos, c, types] = await Promise.all([
        adminAPI.stats(),
        adminAPI.users(),
        adminAPI.getIncidents({}),
        adminAPI.sosAlerts(),
        adminAPI.listCounselors(),
        incidentAPI.types(),
      ]);
      setStats(s.data);
      setUsers(u.data);
      setIncidents(inc.data);
      setSosAlerts(sos.data);
      setCounselors(c.data);
      setIncidentTypes(types.data || []);
    } catch {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEverything();
  }, []);

  const loadActivityLogs = () => {
    if (activityLogs.length > 0) return;
    adminAPI.activityLogs().then((r) => setActivityLogs(r.data)).catch(() => toast.error("Failed to load logs"));
  };

  const openConfirm = ({ title, message, confirmLabel, tone = "danger", onConfirm }) => {
    setConfirmModal({ title, message, confirmLabel, tone, onConfirm, loading: false });
  };

  const runConfirmAction = async () => {
    if (!confirmModal?.onConfirm || confirmModal.loading) return;
    setConfirmModal((m) => ({ ...m, loading: true }));
    try {
      await confirmModal.onConfirm();
      setConfirmModal(null);
    } catch {
      setConfirmModal(null);
    }
  };

  const toggleUser = async (id) => {
    try {
      const res = await adminAPI.toggleUser(id);
      setUsers((u) => u.map((user) => (user.id === id ? { ...user, is_active: res.data.is_active } : user)));
      toast.success(res.data.message);
    } catch {
      toast.error("Failed to update user");
    }
  };

  const updateRole = async (id, role) => {
    try {
      await adminAPI.updateRole(id, role);
      setUsers((u) => u.map((user) => (user.id === id ? { ...user, role } : user)));
      toast.success(`Role updated to ${role}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update role");
    }
  };

  const deleteUser = async (id, name) => {
    openConfirm({
      title: "Delete User",
      message: `Delete user \"${name}\"? This is permanent.`,
      confirmLabel: "Delete User",
      tone: "danger",
      onConfirm: async () => {
        try {
          await adminAPI.deleteUser(id);
          setUsers((u) => u.filter((user) => user.id !== id));
          toast.success("User deleted");
        } catch (err) {
          toast.error(err.response?.data?.detail || "Failed to delete user");
        }
      },
    });
  };

  const openNotesModal = (inc) => {
    setNotesModal({ id: inc.id, status: inc.status });
    setNotesInput(inc.admin_notes || "");
  };

  const saveIncidentUpdate = async () => {
    try {
      await incidentAPI.update(notesModal.id, { status: notesModal.status, admin_notes: notesInput });
      setIncidents((arr) => arr.map((i) => (i.id === notesModal.id ? { ...i, status: notesModal.status, admin_notes: notesInput } : i)));
      toast.success("Incident updated");
      setNotesModal(null);
      await loadIncidents();
    } catch {
      toast.error("Failed to update");
    }
  };

  const completeIncident = async (inc) => {
    try {
      await incidentAPI.update(inc.id, {
        status: "resolved",
        admin_notes: inc.admin_notes || "Report reviewed and marked completed by admin.",
      });
      toast.success("Report marked completed");
      await loadIncidents();
    } catch {
      toast.error("Failed to complete report");
    }
  };

  const deleteIncident = async (id) => {
    openConfirm({
      title: "Delete Report",
      message: "Delete this report permanently? This action cannot be undone.",
      confirmLabel: "Delete Report",
      tone: "danger",
      onConfirm: async () => {
        try {
          await adminAPI.deleteIncident(id);
          setIncidents((arr) => arr.filter((i) => i.id !== id));
          toast.success("Incident deleted");
        } catch {
          toast.error("Failed to delete");
        }
      },
    });
  };

  const resolveSOS = async (id) => {
    try {
      await adminAPI.resolveSOS(id);
      setSosAlerts((s) => s.map((a) => (a.id === id ? { ...a, is_active: false } : a)));
      toast.success("SOS marked as resolved");
    } catch {
      toast.error("Failed to resolve SOS");
    }
  };

  const deleteSOS = async (id) => {
    openConfirm({
      title: "Delete SOS Alert",
      message: "Delete this SOS alert record? This is permanent.",
      confirmLabel: "Delete SOS",
      tone: "danger",
      onConfirm: async () => {
        try {
          await adminAPI.deleteSOS(id);
          setSosAlerts((s) => s.filter((a) => a.id !== id));
          toast.success("SOS deleted");
        } catch {
          toast.error("Failed to delete");
        }
      },
    });
  };

  const sendNotification = async (e) => {
    e.preventDefault();
    if (!notifForm.title || !notifForm.message) return toast.error("Title and message required");
    setNotifLoading(true);
    try {
      await adminAPI.sendNotification({
        title: notifForm.title,
        message: notifForm.message,
        user_id: notifForm.user_id ? Number(notifForm.user_id) : null,
      });
      toast.success(notifForm.user_id ? "Notification sent to user" : "Broadcast sent to all users");
      setNotifModal(false);
      setNotifForm({ title: "", message: "", user_id: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send");
    } finally {
      setNotifLoading(false);
    }
  };

  const addCounselor = async (e) => {
    e.preventDefault();
    if (!counselorForm.full_name || !counselorForm.email || !counselorForm.password) {
      return toast.error("Name, email and password are required");
    }
    if (counselorForm.password.length < 6) return toast.error("Password must be at least 6 characters");

    setCounselorLoading(true);
    try {
      const res = await adminAPI.createCounselor(counselorForm);
      setCounselors((prev) => [res.data, ...prev]);
      setCounselorForm({ full_name: "", email: "", phone: "", password: "" });
      setShowAddCounselor(false);
      toast.success(`Counselor \"${res.data.full_name}\" created!`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create counselor");
    } finally {
      setCounselorLoading(false);
    }
  };

  const deleteCounselor = async (id, name) => {
    openConfirm({
      title: "Remove Counselor",
      message: `Remove counselor \"${name}\"? This is permanent.`,
      confirmLabel: "Remove Counselor",
      tone: "danger",
      onConfirm: async () => {
        try {
          await adminAPI.deleteCounselor(id);
          setCounselors((prev) => prev.filter((c) => c.id !== id));
          toast.success("Counselor removed");
        } catch (err) {
          toast.error(err?.response?.data?.detail || "Failed to remove");
        }
      },
    });
  };

  const toggleCounselor = async (id) => {
    try {
      const res = await adminAPI.toggleCounselor(id);
      setCounselors((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: res.data.is_active } : c)));
      toast.success(res.data.message);
    } catch {
      toast.error("Failed to toggle");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#fff7ed_0%,#ffffff_45%,#ecfeff_100%)]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className={`${shellCard("p-5 md:p-6 mb-6")} border-orange-200`}>
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center shadow-lg">
                <FiShield size={26} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-800">Admin Command Center</h1>
                <p className="text-slate-500 text-sm">Operational control for reports, emergency events, user safety, and counselors</p>
              </div>
            </div>

            <div className="lg:ml-auto flex flex-wrap gap-2">
              <button onClick={loadEverything} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold">
                <FiRefreshCw size={14} /> Refresh
              </button>
              <button onClick={() => setNotifModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold">
                <FiBell size={14} /> Send Notification
              </button>
            </div>
          </div>

          {activeSOS.length > 0 && (
            <div className="mt-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-bold animate-pulse inline-flex items-center gap-2">
              <FiAlertTriangle /> {activeSOS.length} Active SOS Event(s)
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Users", value: stats?.total_users ?? 0, icon: <FiUsers />, tone: "from-sky-500 to-cyan-500" },
            { label: "Reports", value: stats?.total_incidents ?? 0, icon: <FiFileText />, tone: "from-orange-500 to-amber-500" },
            { label: "Active SOS", value: stats?.active_sos ?? 0, icon: <FiAlertTriangle />, tone: "from-red-500 to-rose-500" },
            { label: "Resolved", value: stats?.resolved_incidents ?? 0, icon: <FiCheckCircle />, tone: "from-emerald-500 to-teal-500" },
          ].map((k) => (
            <div key={k.label} className={`${shellCard("p-4")} overflow-hidden relative`}>
              <div className={`absolute -right-5 -top-5 w-20 h-20 rounded-full bg-gradient-to-br ${k.tone} opacity-10`} />
              <div className="flex items-center justify-between">
                <div className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{k.label}</div>
                <div className={`w-9 h-9 rounded-xl text-white bg-gradient-to-br ${k.tone} flex items-center justify-center`}>{k.icon}</div>
              </div>
              <div className="text-3xl font-black text-slate-800 mt-2">{k.value}</div>
            </div>
          ))}
        </div>

        <div className={`${shellCard("p-2 mb-6")} border-slate-200 overflow-x-auto`}>
          <div className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  if (t.key === "logs") loadActivityLogs();
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ${
                  tab === t.key ? "bg-slate-900 text-white shadow" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
                {t.key === "counselors" ? ` (${counselors.length})` : ""}
              </button>
            ))}
          </div>
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className={`${shellCard("p-5")} xl:col-span-3`}>
              <h2 className="text-lg font-black text-slate-800 mb-4">Incident Mix</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 0, right: 10, bottom: 5, left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={`${shellCard("p-5")} xl:col-span-2`}>
              <h2 className="text-lg font-black text-slate-800 mb-4">Status Radar</h2>
              <div className="space-y-4">
                {[
                  { label: "Pending", value: stats?.pending_incidents ?? 0, color: "bg-amber-500" },
                  { label: "Resolved", value: stats?.resolved_incidents ?? 0, color: "bg-emerald-500" },
                  {
                    label: "Other",
                    value: (stats?.total_incidents ?? 0) - (stats?.pending_incidents ?? 0) - (stats?.resolved_incidents ?? 0),
                    color: "bg-slate-400",
                  },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600 font-semibold">{s.label}</span>
                      <span className="text-slate-800 font-bold">{s.value}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${s.color}`}
                        style={{ width: (stats?.total_incidents ?? 0) > 0 ? `${(s.value / stats.total_incidents) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "incidents" && (
          <div className="space-y-4">
            <div className={`${shellCard("p-4")} border-slate-200 flex flex-wrap items-end gap-3`}>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                <select value={incidentStatusFilter} onChange={(e) => setIncidentStatusFilter(e.target.value)} className="input-field text-sm">
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Type</label>
                <select value={incidentTypeFilter} onChange={(e) => setIncidentTypeFilter(e.target.value)} className="input-field text-sm">
                  <option value="all">All</option>
                  {incidentTypes.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <button onClick={() => loadIncidents()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">
                <FiFilter size={14} /> Apply
              </button>
            </div>

            {incidents.length === 0 && <div className={`${shellCard("p-10 text-center text-slate-400")}`}>No reports found.</div>}

            {incidents.map((inc) => (
              <div key={inc.id} className={`${shellCard("p-4 border-l-4 border-l-orange-500")}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={STATUS_BADGE[inc.status] || "badge-closed"}>{inc.status.replace(/_/g, " ")}</span>
                      <span className="text-xs text-slate-400">#{inc.id}</span>
                    </div>
                    <h3 className="font-black text-slate-800 mt-1">{inc.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {inc.incident_type.replace(/_/g, " ")} · {new Date(inc.created_at).toLocaleString()} · Reporter #{inc.reporter_id || "N/A"}
                    </p>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">{inc.description}</p>
                    {inc.location && <p className="text-xs text-slate-500 mt-2">{inc.location}</p>}
                    {inc.admin_notes && <p className="text-xs mt-2 text-blue-700 bg-blue-50 rounded-lg px-2 py-1 inline-block">Note: {inc.admin_notes}</p>}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => setViewIncident(inc)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold inline-flex items-center gap-1">
                      <FiEye size={12} /> View
                    </button>
                    {inc.status !== "resolved" && inc.status !== "closed" && (
                      <button onClick={() => completeIncident(inc)} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold">
                        Complete
                      </button>
                    )}
                    <button onClick={() => openNotesModal(inc)} className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 font-semibold">
                      Update
                    </button>
                    <button onClick={() => deleteIncident(inc.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-semibold">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "sos" && (
          <div className="space-y-3">
            {sosAlerts.length === 0 && <div className={`${shellCard("p-10 text-center text-slate-400")}`}>No SOS alerts yet.</div>}
            {sosAlerts.map((alert) => (
              <div key={alert.id} className={`${shellCard(`p-4 border-l-4 ${alert.is_active ? "border-l-red-500 bg-red-50/70" : "border-l-emerald-500"}`)}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {alert.is_active ? (
                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">ACTIVE</span>
                      ) : (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Resolved</span>
                      )}
                      <span className="text-xs text-slate-400">Alert #{alert.id}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{alert.message}</p>
                    {(alert.latitude || alert.address) && (
                      <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
                        <FiMapPin size={12} /> {alert.address || `${alert.latitude?.toFixed(5)}, ${alert.longitude?.toFixed(5)}`}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {alert.is_active && (
                      <button onClick={() => resolveSOS(alert.id)} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold">
                        Resolve
                      </button>
                    )}
                    <button onClick={() => deleteSOS(alert.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-semibold">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "counselors" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800 inline-flex items-center gap-2">
                <FiHeadphones className="text-violet-600" /> Personal Counselors
              </h2>
              <button
                onClick={() => setShowAddCounselor((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold"
              >
                {showAddCounselor ? <FiX size={14} /> : <FiPlus size={14} />}
                {showAddCounselor ? "Cancel" : "Add Counselor"}
              </button>
            </div>

            {showAddCounselor && (
              <div className={`${shellCard("p-5")} border-violet-200 bg-violet-50/60`}>
                <h3 className="font-black text-violet-800 mb-4">Create Counselor Account</h3>
                <form onSubmit={addCounselor} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input className="input-field" placeholder="Full name" required value={counselorForm.full_name} onChange={(e) => setCounselorForm({ ...counselorForm, full_name: e.target.value })} />
                  <input className="input-field" placeholder="Email" type="email" required value={counselorForm.email} onChange={(e) => setCounselorForm({ ...counselorForm, email: e.target.value })} />
                  <input className="input-field" placeholder="Phone" value={counselorForm.phone} onChange={(e) => setCounselorForm({ ...counselorForm, phone: e.target.value })} />
                  <div className="relative">
                    <input className="input-field pr-10" placeholder="Password" type={counselorPwShow ? "text" : "password"} required value={counselorForm.password} onChange={(e) => setCounselorForm({ ...counselorForm, password: e.target.value })} />
                    <button type="button" onClick={() => setCounselorPwShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {counselorPwShow ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </button>
                  </div>
                  <div className="sm:col-span-2 flex gap-3">
                    <button type="submit" disabled={counselorLoading} className="px-5 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 text-white text-sm font-bold disabled:opacity-60">
                      {counselorLoading ? "Creating..." : "Create Counselor"}
                    </button>
                  </div>
                </form>
                <p className="text-xs text-violet-700 mt-3 font-semibold">Counselors are admin-created only and cannot self-register.</p>
              </div>
            )}

            {counselors.length === 0 ? (
              <div className={`${shellCard("p-10 text-center text-slate-400")}`}>No counselors yet.</div>
            ) : (
              <div className="space-y-3">
                {counselors.map((c) => (
                  <div key={c.id} className={`${shellCard("p-4")} ${!c.is_active ? "bg-red-50/60 border-red-200" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl text-white font-black flex items-center justify-center ${c.active_now ? "bg-emerald-600" : "bg-violet-600"}`}>
                        {(c.full_name || "?")
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{c.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{c.email}</p>
                        <p className="text-xs text-violet-700 mt-0.5">{c.total_sessions} sessions</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => toggleCounselor(c.id)} className={`text-xs px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1 ${c.is_active ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {c.is_active ? <FiToggleRight size={13} /> : <FiToggleLeft size={13} />}
                          {c.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => deleteCounselor(c.id, c.full_name)} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 font-bold inline-flex items-center gap-1">
                          <FiTrash2 size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "users" && (
          <div className={`${shellCard("p-3 overflow-x-auto")}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Joined</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-3 font-semibold text-slate-800">{u.full_name}</td>
                    <td className="py-3 text-slate-600 text-xs">{u.email}</td>
                    <td className="py-3">
                      <select value={u.role} onChange={(e) => updateRole(u.id, e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white">
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => toggleUser(u.id)} className={`text-xs px-2 py-1 rounded-lg font-bold ${u.is_active ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button onClick={() => deleteUser(u.id, u.full_name)} className="text-xs p-1.5 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-700">
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-3">
            {activityLogs.length === 0 && (
              <div className={`${shellCard("p-10 text-center text-slate-400")}`}>
                <FiActivity className="text-4xl mx-auto mb-2 text-slate-300" />
                No activity logs yet.
              </div>
            )}
            {activityLogs.map((log) => (
              <div key={log.id} className={`${shellCard("p-3 border border-slate-100")} flex items-start gap-3`}>
                <div className="text-lg">{log.action.includes("delete") ? "🗑" : log.action.includes("create") ? "✨" : "🛠"}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{log.action.replace(/_/g, " ")}</p>
                  {log.details && <p className="text-xs text-slate-500 mt-0.5 truncate">{log.details}</p>}
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-black text-slate-800 text-lg mb-4">Update Report</h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
              <select className="input-field" value={notesModal.status} onChange={(e) => setNotesModal({ ...notesModal, status: e.target.value })}>
                {[
                  "pending",
                  "under_review",
                  "resolved",
                  "closed",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Admin Notes</label>
              <textarea className="input-field min-h-[90px] resize-none" value={notesInput} onChange={(e) => setNotesInput(e.target.value)} placeholder="Internal or user-facing update notes..." />
            </div>
            <div className="flex gap-3">
              <button onClick={saveIncidentUpdate} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold">
                Save
              </button>
              <button onClick={() => setNotesModal(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {viewIncident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-slate-800 text-lg mb-3">Report #{viewIncident.id}</h3>
            <div className="space-y-3 text-sm">
              <p>
                <strong>Title:</strong> {viewIncident.title}
              </p>
              <p>
                <strong>Type:</strong> {viewIncident.incident_type?.replace(/_/g, " ")}
              </p>
              <p>
                <strong>Status:</strong> {viewIncident.status?.replace(/_/g, " ")}
              </p>
              <p>
                <strong>Reporter ID:</strong> {viewIncident.reporter_id || "N/A"}
              </p>
              <p>
                <strong>Created:</strong> {new Date(viewIncident.created_at).toLocaleString()}
              </p>
              {viewIncident.location && (
                <p>
                  <strong>Location:</strong> {viewIncident.location}
                </p>
              )}
              <div>
                <strong>Description:</strong>
                <p className="mt-1 text-slate-700 whitespace-pre-wrap">{viewIncident.description}</p>
              </div>
              {viewIncident.evidence_url && (
                <p>
                  <strong>Evidence:</strong>{" "}
                  <a href={viewIncident.evidence_url} target="_blank" rel="noreferrer" className="text-orange-700 underline">
                    Open attachment
                  </a>
                </p>
              )}
              {viewIncident.admin_notes && (
                <div className="bg-blue-50 rounded-xl p-3 text-blue-800">
                  <strong>Admin Notes:</strong> {viewIncident.admin_notes}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              {viewIncident.status !== "resolved" && viewIncident.status !== "closed" && (
                <button
                  onClick={async () => {
                    await completeIncident(viewIncident);
                    setViewIncident(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold"
                >
                  Mark as Completed
                </button>
              )}
              <button onClick={() => setViewIncident(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {notifModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-black text-slate-800 text-lg mb-1">Send Notification</h3>
            <p className="text-slate-500 text-sm mb-4">Leave User ID blank to broadcast to all users.</p>
            <form onSubmit={sendNotification} className="space-y-4">
              <input className="input-field" required placeholder="Title" value={notifForm.title} onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })} />
              <textarea className="input-field min-h-[90px] resize-none" required placeholder="Message" value={notifForm.message} onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })} />
              <input className="input-field" type="number" placeholder="User ID (optional)" value={notifForm.user_id} onChange={(e) => setNotifForm({ ...notifForm, user_id: e.target.value })} />
              <div className="flex gap-3">
                <button type="submit" disabled={notifLoading} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-600 text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                  <FiSend size={14} /> {notifLoading ? "Sending..." : "Send"}
                </button>
                <button type="button" onClick={() => setNotifModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-gradient-to-br from-white to-rose-50 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-md">
                <FiAlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-slate-900">{confirmModal.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{confirmModal.message}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => !confirmModal.loading && setConfirmModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-white disabled:opacity-60"
                disabled={confirmModal.loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runConfirmAction}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold hover:from-red-700 hover:to-rose-700 disabled:opacity-60"
                disabled={confirmModal.loading}
              >
                {confirmModal.loading ? "Working..." : confirmModal.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

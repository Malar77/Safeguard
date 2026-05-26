import { useEffect, useState } from "react";
import { incidentAPI } from "../services/api";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  FiFileText, FiTrash2, FiMapPin, FiClock,
  FiCheckCircle, FiRefreshCw, FiPlus, FiChevronDown,
  FiChevronUp, FiShield, FiEyeOff,
} from "react-icons/fi";

const TYPE_ICONS = {
  harassment: "😣", domestic_violence: "🏠", child_abuse: "👦",
  cybercrime: "💻", stalking: "👁", assault: "⚠️",
  trafficking: "🚨", other: "📋",
};

const SC = {
  pending:      { label: "Pending",      cls: "bg-amber-100 text-amber-700 border-amber-200",  dot: "bg-amber-400"  },
  under_review: { label: "Under Review", cls: "bg-blue-100  text-blue-700  border-blue-200",   dot: "bg-blue-400"   },
  resolved:     { label: "Resolved",     cls: "bg-green-100 text-green-700 border-green-200",  dot: "bg-green-500"  },
  closed:       { label: "Closed",       cls: "bg-gray-100  text-gray-600  border-gray-200",   dot: "bg-gray-400"   },
};

const SB = {
  pending: "border-l-amber-400", under_review: "border-l-blue-400",
  resolved: "border-l-green-500", closed: "border-l-gray-300",
};

function fmtDate(iso) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function MyIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState(null);
  const [expanded,  setExpanded]  = useState(null);
  const [filter,    setFilter]    = useState("all");
  const [typeOptions, setTypeOptions] = useState([]);
  const [query, setQuery] = useState({
    status: "",
    incident_type: "",
    start_date: "",
    end_date: "",
  });

  const buildParams = (input) => {
    const params = {};
    if (input.status) params.status = input.status;
    if (input.incident_type) params.incident_type = input.incident_type;
    if (input.start_date) params.start_date = input.start_date;
    if (input.end_date) params.end_date = input.end_date;
    return params;
  };

  const load = async (paramsState = query) => {
    setLoading(true);
    try {
      const res = await incidentAPI.my(buildParams(paramsState));
      setIncidents(res.data);
    } catch {
      toast.error("Failed to load your reports");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    incidentAPI.types().then((res) => {
      if (Array.isArray(res.data)) setTypeOptions(res.data);
    }).catch(() => {
      setTypeOptions([]);
    });
  }, []);

  const handleDelete = async (id, status) => {
    if (status !== "pending") { toast.error("Only pending reports can be deleted"); return; }
    if (!window.confirm("Delete this report? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await incidentAPI.deleteMyIncident(id);
      setIncidents(prev => prev.filter(i => i.id !== id));
      toast.success("Report deleted");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete");
    } finally { setDeleting(null); }
  };

  const filtered = filter === "all" ? incidents : incidents.filter(i => i.status === filter);
  const stats = {
    total:        incidents.length,
    pending:      incidents.filter(i => i.status === "pending").length,
    under_review: incidents.filter(i => i.status === "under_review").length,
    resolved:     incidents.filter(i => i.status === "resolved").length,
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pb-24">

      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-rose-600 to-red-500 px-5 pt-8 pb-6 rounded-b-3xl mb-5">
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <FiFileText className="text-white text-2xl" />
          </div>
          <div className="flex-1">
            <h1 className="text-white font-extrabold text-xl">My Reports</h1>
            <p className="text-white/60 text-xs">{stats.total} report{stats.total !== 1 ? "s" : ""} submitted</p>
          </div>
          <button onClick={load} className="p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl transition">
            <FiRefreshCw size={16}/>
          </button>
        </div>
        <div className="relative grid grid-cols-4 gap-2">
          {[
            { label: "Total",    val: stats.total,        key: "all",          bg: "bg-white/15" },
            { label: "Pending",  val: stats.pending,       key: "pending",      bg: stats.pending > 0 ? "bg-amber-400/40" : "bg-white/15" },
            { label: "Review",   val: stats.under_review,  key: "under_review", bg: stats.under_review > 0 ? "bg-blue-400/40" : "bg-white/15" },
            { label: "Resolved", val: stats.resolved,      key: "resolved",     bg: "bg-white/15" },
          ].map(s => (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className={`${s.bg} ${filter === s.key ? "ring-2 ring-white/60" : ""} rounded-2xl p-3 text-center text-white transition`}>
              <div className="text-xl font-extrabold leading-none">{s.val}</div>
              <div className="text-[10px] opacity-70 mt-0.5 font-medium">{s.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3">
        <Link to="/report"
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-primary-600 to-rose-500 text-white font-bold py-3.5 rounded-2xl shadow-md transition active:scale-95 text-sm">
          <FiPlus size={16}/> File a New Report
        </Link>

        <div className="bg-white border border-gray-100 rounded-2xl p-3 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">History Filters</p>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={query.status}
              onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={query.incident_type}
              onChange={(e) => setQuery((prev) => ({ ...prev, incident_type: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700"
            >
              <option value="">All Types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={query.start_date}
              onChange={(e) => setQuery((prev) => ({ ...prev, start_date: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700"
            />
            <input
              type="date"
              value={query.end_date}
              onChange={(e) => setQuery((prev) => ({ ...prev, end_date: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => load(query)}
              className="bg-primary-600 text-white text-xs font-bold py-2.5 rounded-xl"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={() => {
                const reset = { status: "", incident_type: "", start_date: "", end_date: "" };
                setQuery(reset);
                setFilter("all");
                load(reset);
              }}
              className="bg-gray-100 text-gray-700 text-xs font-bold py-2.5 rounded-xl"
            >
              Reset
            </button>
          </div>
        </div>

        {incidents.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all","pending","under_review","resolved","closed"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
                  filter === f ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
                }`}>
                {f === "all" ? "All" : f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="card text-center py-14">
            <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <FiFileText size={28} className="text-gray-300"/>
            </div>
            {incidents.length === 0 ? (
              <>
                <p className="text-gray-600 font-bold mb-1">No reports yet</p>
                <p className="text-gray-400 text-sm mb-5">Your submitted reports will appear here</p>
                <Link to="/report" className="inline-flex items-center gap-2 bg-primary-600 text-white font-bold px-6 py-3 rounded-2xl text-sm">
                  <FiPlus size={14}/> File First Report
                </Link>
              </>
            ) : (
              <>
                <p className="text-gray-600 font-bold mb-1">No {filter.replace(/_/g, " ")} reports</p>
                <button onClick={() => setFilter("all")} className="text-primary-600 text-sm font-semibold mt-2">View all</button>
              </>
            )}
          </div>
        )}

        {filtered.map(inc => {
          const sc = SC[inc.status] || SC.closed;
          const isOpen = expanded === inc.id;
          return (
            <div key={inc.id} className={`bg-white border border-gray-100 border-l-4 ${SB[inc.status] || "border-l-gray-300"} rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
                    {TYPE_ICONS[inc.incident_type] || "📋"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className="font-extrabold text-gray-800 text-sm flex-1 min-w-0 truncate">{inc.title}</p>
                      <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${sc.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`}/>
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                        {(inc.incident_type || "").replace(/_/g, " ")}
                      </span>
                      {inc.is_anonymous && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <FiEyeOff size={9}/> Anonymous
                        </span>
                      )}
                      <span className="text-gray-400 text-xs ml-auto flex items-center gap-1">
                        <FiClock size={10}/> #{inc.id}
                      </span>
                    </div>
                    {inc.location && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <FiMapPin size={10}/> {inc.location.slice(0, 60)}{inc.location.length > 60 ? "..." : ""}
                      </p>
                    )}
                  </div>
                </div>
                <button onClick={() => setExpanded(isOpen ? null : inc.id)}
                  className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition py-1">
                  {isOpen ? <><FiChevronUp size={12}/> Show less</> : <><FiChevronDown size={12}/> Show details</>}
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-3 bg-gray-50/50">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-gray-600 text-xs leading-relaxed">{inc.description}</p>
                  </div>
                  {inc.admin_notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <FiShield size={10}/> Admin Note
                      </p>
                      <p className="text-blue-700 text-xs leading-relaxed">{inc.admin_notes}</p>
                    </div>
                  )}
                  {inc.status === "resolved" && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                      <FiCheckCircle className="text-green-600 flex-shrink-0" size={14}/>
                      <p className="text-green-700 text-xs font-semibold">This report has been resolved. Thank you for reporting.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div className="bg-white rounded-xl p-2 text-center border border-gray-100">
                      <p className="font-bold text-gray-700 mb-0.5">Submitted</p>
                      <p>{fmtDate(inc.created_at)}</p>
                    </div>
                    <div className="bg-white rounded-xl p-2 text-center border border-gray-100">
                      <p className="font-bold text-gray-700 mb-0.5">Last Updated</p>
                      <p>{fmtDate(inc.updated_at)}</p>
                    </div>
                  </div>
                  {inc.status === "pending" && (
                    <button onClick={() => handleDelete(inc.id, inc.status)} disabled={deleting === inc.id}
                      className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-60">
                      {deleting === inc.id ? "Deleting..." : <><FiTrash2 size={12}/> Delete this report</>}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

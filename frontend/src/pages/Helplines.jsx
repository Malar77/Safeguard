import { useEffect, useState } from "react";
import { helplineAPI } from "../services/api";
import toast from "react-hot-toast";
import { FiPhone } from "react-icons/fi";

const CATEGORIES = ["all", "women", "child", "emergency", "counseling", "legal", "cyber"];
const CAT_COLORS = { women: "bg-pink-100 text-pink-700", child: "bg-blue-100 text-blue-700", emergency: "bg-red-100 text-red-700", counseling: "bg-purple-100 text-purple-700", legal: "bg-yellow-100 text-yellow-700", cyber: "bg-teal-100 text-teal-700" };

export default function Helplines() {
  const [helplines, setHelplines] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    helplineAPI.get()
      .then((r) => setHelplines(r.data))
      .catch(() => toast.error("Failed to load helplines"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? helplines : helplines.filter((h) => h.category === filter);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <FiPhone className="text-green-500 text-4xl mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-gray-800">Helpline Directory</h1>
        <p className="text-gray-500 mt-1">Verified national helplines for women, children, and emergency services.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${filter === c ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-300 hover:border-primary-400"}`}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((h) => (
          <div key={h.id} className="card hover:shadow-lg transition border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${CAT_COLORS[h.category] || "bg-gray-100 text-gray-600"}`}>
                {h.category}
              </span>
              {h.available_24x7 && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">24×7</span>}
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1">{h.name}</h3>
            {h.description && <p className="text-gray-500 text-sm mb-3">{h.description}</p>}
            <a href={`tel:${h.number}`} className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-bold py-2 px-4 rounded-lg transition text-lg w-full justify-center">
              <FiPhone /> {h.number}
            </a>
            {h.website && (
              <a href={h.website} target="_blank" rel="noreferrer" className="block text-center text-xs text-primary-600 hover:underline mt-2">Visit Website</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

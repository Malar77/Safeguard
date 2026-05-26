import { useEffect, useState } from "react";
import { childSafetyAPI } from "../services/api";
import toast from "react-hot-toast";
import { FiShield, FiBookOpen, FiAlertCircle, FiMonitor, FiUserCheck, FiHeart } from "react-icons/fi";

const CATEGORY_MAP = {
  abuse_prevention: { icon: <FiShield size={18} className="text-rose-500" />, label: "Abuse Prevention", color: "border-rose-200 bg-rose-50" },
  online_safety:    { icon: <FiMonitor size={18} className="text-blue-500" />, label: "Online Safety",    color: "border-blue-200 bg-blue-50" },
  rights:           { icon: <FiBookOpen size={18} className="text-purple-500" />, label: "Child Rights",    color: "border-purple-200 bg-purple-50" },
  parenting:        { icon: <FiHeart size={18} className="text-pink-500" />, label: "Parenting Guide",   color: "border-pink-200 bg-pink-50" },
  general:          { icon: <FiUserCheck size={18} className="text-emerald-500" />, label: "General Safety",  color: "border-emerald-200 bg-emerald-50" },
};

export default function ChildSafety() {
  const [tips, setTips]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");

  useEffect(() => {
    childSafetyAPI.get()
      .then(res => setTips(res.data))
      .catch(() => toast.error("Failed to load safety tips"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? tips : tips.filter(t => t.category === filter);

  // Derive unique categories from fetched data (fallback to "general" if missing)
  const availableCategories = ["all", ...new Set(tips.map(t => t.category || "general"))];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 pb-24">
      
      {/* Premium Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-200">
          <FiShield className="text-white text-3xl" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">Child Safety Hub</h1>
        <p className="text-gray-500 mt-2 max-w-lg mx-auto text-sm leading-relaxed">
          Age-appropriate educational content, abuse prevention techniques, and online safety guidelines to empower children and parents.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {availableCategories.map(cat => {
          const cData = CATEGORY_MAP[cat] || CATEGORY_MAP.general;
          const isAll = cat === "all";
          return (
            <button key={cat} onClick={() => setFilter(cat)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all border-2 ${
                filter === cat
                  ? "bg-primary-600 text-white border-primary-600 shadow-md transform scale-105"
                  : "bg-white text-gray-600 border-gray-100 hover:border-primary-200 hover:bg-primary-50"
              }`}>
              {!isAll && (
                <span className={filter === cat ? "text-white" : cData.icon.props.className}>{cData.icon.type({ size: 16 })}</span>
              )}
              {isAll ? "All Topics" : cData.label}
            </button>
          );
        })}
      </div>

      {/* Grid of Tips */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <FiAlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-600 font-bold">No tips found</h3>
          <p className="text-gray-400 text-sm mt-1">Select a different category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(tip => {
            const cData = CATEGORY_MAP[tip.category] || CATEGORY_MAP.general;
            return (
              <div key={tip.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
                
                {/* Card Header (Icon + Badge) */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110 ${cData.color}`}>
                    {cData.icon}
                  </div>
                  {tip.age_group && (
                    <span className="bg-gray-100 text-gray-600 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Age: {tip.age_group}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg mb-2 leading-tight group-hover:text-primary-600 transition-colors">
                    {tip.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {tip.content}
                  </p>
                </div>

                <div className="border-t border-gray-50 pt-4 mt-auto">
                  <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                    {cData.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Emergency CTA */}
      <div className="mt-12 bg-gradient-to-br from-rose-500 to-red-600 rounded-3xl p-8 lg:p-10 flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-red-200">
        <div className="text-white mb-6 md:mb-0 text-center md:text-left">
          <h2 className="text-2xl font-extrabold mb-2">Notice Child Abuse?</h2>
          <p className="text-red-100 max-w-md">Under the POCSO Act, reporting child abuse is mandatory. Call the national child helpline immediately to save a life.</p>
        </div>
        <a href="tel:1098" className="bg-white text-red-600 font-extrabold px-8 py-4 rounded-full text-lg shadow-lg hover:shadow-xl transition-transform hover:scale-105 active:scale-95 flex items-center gap-2">
          📞 Dial 1098
        </a>
      </div>
    </div>
  );
}

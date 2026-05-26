import { useEffect, useState } from "react";
import { legalAPI } from "../services/api";
import toast from "react-hot-toast";
import { FiBook, FiChevronDown, FiChevronUp, FiExternalLink, FiSearch, FiBookmark } from "react-icons/fi";

export default function LegalResources() {
  const [resources, setResources] = useState([]);
  const [filter, setFilter] = useState("all");
  const [categories, setCategories] = useState(["all"]);
  const [search, setSearch] = useState("");
  const [bookmarks, setBookmarks] = useState(new Set());
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadResources = () => {
    const params = {};
    if (filter !== "all") params.category = filter;
    if (search.trim()) params.q = search.trim();

    legalAPI.get(params)
      .then((r) => setResources(r.data))
      .catch(() => toast.error("Failed to load legal resources"))
      .finally(() => setLoading(false));
  };

  const loadBookmarks = () => {
    legalAPI.myBookmarks()
      .then((r) => {
        const ids = new Set((r.data || []).map((b) => b.legal_resource_id));
        setBookmarks(ids);
      })
      .catch(() => {
        // Not logged in or no bookmarks yet.
      });
  };

  useEffect(() => {
    legalAPI.categories()
      .then((r) => {
        const cats = ["all", ...(r.data || [])];
        setCategories(cats);
      })
      .catch(() => setCategories(["all", "women", "child"]));

    loadBookmarks();
  }, []);

  useEffect(() => {
    setLoading(true);
    loadResources();
  }, [filter, search]);

  const filtered = bookmarksOnly
    ? resources.filter((r) => bookmarks.has(r.id))
    : resources;

  const toggleBookmark = async (resourceId) => {
    try {
      if (bookmarks.has(resourceId)) {
        await legalAPI.removeBookmark(resourceId);
        setBookmarks((prev) => {
          const next = new Set(prev);
          next.delete(resourceId);
          return next;
        });
        toast.success("Removed from bookmarks");
      } else {
        await legalAPI.addBookmark(resourceId);
        setBookmarks((prev) => new Set([...prev, resourceId]));
        toast.success("Saved to bookmarks");
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        toast.error("Please log in to save bookmarks");
        return;
      }
      toast.error(detail || "Failed to update bookmark");
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <FiBook className="text-purple-500 text-4xl mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-gray-800">Know Your Legal Rights</h1>
        <p className="text-gray-500 mt-1">Important Indian laws protecting women and children. Know your rights.</p>
      </div>

      <div className="max-w-xl mx-auto mb-5 relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search laws, acts, rights, protection..."
          className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="flex gap-2 justify-center mb-8">
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition border ${filter === c ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-300 hover:border-primary-400"}`}>
            {c === "all" ? "All Laws" : c === "women" ? "Women's Laws" : c === "child" ? "Child Protection" : c}
          </button>
        ))}
      </div>

      <div className="flex justify-center mb-6">
        <button
          onClick={() => setBookmarksOnly((v) => !v)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
            bookmarksOnly
              ? "bg-yellow-100 text-yellow-700 border-yellow-300"
              : "bg-white text-gray-600 border-gray-300"
          }`}
        >
          <FiBookmark />
          {bookmarksOnly ? "Showing Bookmarks" : "Show Saved Bookmarks"}
        </button>
      </div>

      <div className="space-y-4">
        {filtered.map((res) => (
          <div key={res.id} className="card border border-gray-100 hover:shadow-md transition">
            <button className="w-full text-left flex items-start justify-between gap-4" onClick={() => setExpanded(expanded === res.id ? null : res.id)}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${res.category === "women" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
                    {res.category === "women" ? "Women" : "Child"}
                  </span>
                  {res.law_name && <span className="text-xs text-gray-400">{res.law_name}</span>}
                </div>
                <h3 className="font-bold text-gray-800 text-base">{res.title}</h3>
                <p className="text-gray-500 text-sm mt-1">{res.summary}</p>
              </div>
              <div className="mt-1 text-gray-400 flex-shrink-0">
                {expanded === res.id ? <FiChevronUp /> : <FiChevronDown />}
              </div>
            </button>

            <div className="mt-3 flex justify-end">
              <button
                onClick={() => toggleBookmark(res.id)}
                className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border ${
                  bookmarks.has(res.id)
                    ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                    : "bg-white text-gray-500 border-gray-300"
                }`}
              >
                <FiBookmark />
                {bookmarks.has(res.id) ? "Saved" : "Save"}
              </button>
            </div>

            {expanded === res.id && res.full_text && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-gray-700 text-sm leading-relaxed">{res.full_text}</p>
                {res.reference_url && (
                  <a href={res.reference_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-primary-600 text-sm hover:underline">
                    <FiExternalLink /> Read Full Law
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card text-center text-gray-500 py-10">No legal resources found for this filter.</div>
        )}
      </div>

      <div className="mt-8 card bg-yellow-50 border border-yellow-200">
        <p className="font-bold text-yellow-800 mb-1">⚖ Need Legal Help?</p>
        <p className="text-yellow-700 text-sm">Free legal aid is available. Call <a href="tel:15100" className="font-bold underline">15100</a> (Legal Aid Services Authority) or visit your nearest District Legal Services Authority.</p>
      </div>
    </div>
  );
}

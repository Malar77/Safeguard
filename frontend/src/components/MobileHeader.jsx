import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  FiChevronLeft, FiBell, FiSearch, FiX,
  FiAlertTriangle, FiUser
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect, useRef } from "react";
import { notificationsAPI } from "../services/api";

const PAGE_TITLES = {
  "/login":            { label: "Sign In",        emoji: "🔐" },
  "/register":         { label: "Create Account",  emoji: "✨" },
  "/sos":              { label: "SOS Emergency",   emoji: "🚨" },
  "/report":           { label: "Report Incident",  emoji: "📋" },
  "/my-incidents":     { label: "My Reports",      emoji: "📁" },
  "/helplines":        { label: "Helplines",        emoji: "📞" },
  "/legal-resources":  { label: "Legal Rights",    emoji: "⚖️" },
  "/counseling":       { label: "Counseling",       emoji: "💬" },
  "/child-safety":     { label: "Child Safety",    emoji: "🛡️" },
  "/safe-routes":      { label: "Safe Routes",     emoji: "🗺️" },
  "/profile":          { label: "My Profile",      emoji: "👤" },
  "/notifications":    { label: "Notifications",   emoji: "🔔" },
  "/admin":            { label: "Admin Panel",     emoji: "⚙️" },
  "/share-location":   { label: "Share Location",  emoji: "📍" },
};

const LOGO_PATHS = new Set(["/", "/dashboard", "/parent-dashboard"]);

// Quick-search nav items
const SEARCH_ITEMS = [
  { to: "/sos",            label: "SOS Emergency",   emoji: "🚨" },
  { to: "/report",         label: "Report Incident", emoji: "📋" },
  { to: "/helplines",      label: "Helplines",       emoji: "📞" },
  { to: "/legal-resources",label: "Legal Rights",    emoji: "⚖️" },
  { to: "/counseling",     label: "Counseling",      emoji: "💬" },
  { to: "/child-safety",   label: "Child Safety",    emoji: "🛡️" },
  { to: "/safe-routes",    label: "Safe Routes",     emoji: "🗺️" },
  { to: "/profile",        label: "My Profile",      emoji: "👤" },
];

export default function MobileHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unread, setUnread]         = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery]           = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    notificationsAPI.unreadCount()
      .then((r) => setUnread(r.data.unread_count || 0))
      .catch(() => {});
  }, [user, pathname]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 80);
    else setQuery("");
  }, [searchOpen]);

  // Close search on route change
  useEffect(() => { setSearchOpen(false); }, [pathname]);

  const showLogo  = LOGO_PATHS.has(pathname);
  const pageInfo  = PAGE_TITLES[pathname];

  const filtered = SEARCH_ITEMS.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase())
  );

  /* ───── Search overlay ───── */
  if (searchOpen) {
    return (
      <div className="mobile-header-search">
        {/* Row */}
        <div className="flex items-center gap-2 px-4 h-[54px]">
          <button
            onClick={() => setSearchOpen(false)}
            className="btn-icon flex-shrink-0"
            aria-label="Close search"
          >
            <FiX className="text-[18px]" />
          </button>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SafeGuard…"
            className="flex-1 bg-transparent outline-none text-[14px] text-gray-800 placeholder-gray-400"
          />
        </div>

        {/* Dropdown results */}
        <div className="search-dropdown">
          {filtered.map((item) => (
            <button
              key={item.to}
              onClick={() => { navigate(item.to); setSearchOpen(false); }}
              className="search-item"
            >
              <span className="text-[18px]">{item.emoji}</span>
              <span className="text-[13px] font-medium text-gray-700">{item.label}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-xs py-3">No results</p>
          )}
        </div>
      </div>
    );
  }

  /* ───── Normal header ───── */
  return (
    <header className="mobile-header">
      {/* LEFT: Logo (home) or back button */}
      {showLogo ? (
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          {/* App icon */}
          <div className="sg-logo-icon">
            <span className="sg-logo-text">SG</span>
            <div className="sg-logo-shine" />
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-gray-900 text-[15px] tracking-tight">SafeGuard</div>
            <div className="text-[9px] text-pink-500 font-bold tracking-widest uppercase">Stay Safe, Always</div>
          </div>
        </Link>
      ) : (
        <button
          onClick={() => navigate(-1)}
          className="btn-icon -ml-1.5 flex items-center gap-0.5 text-gray-700"
          aria-label="Go back"
        >
          <FiChevronLeft className="text-[22px]" />
          {pageInfo && (
            <span className="text-[13px] font-semibold text-gray-600 max-w-[120px] truncate">
              {pageInfo.emoji} {pageInfo.label}
            </span>
          )}
        </button>
      )}

      {/* CENTER: SOS pill (only on home/dashboard for logged-in users) */}
      {showLogo && user && (
        <Link
          to="/sos"
          className="sos-header-pill"
          aria-label="SOS Emergency"
        >
          <FiAlertTriangle className="text-[13px]" />
          <span>SOS</span>
        </Link>
      )}

      {/* RIGHT: action buttons */}
      <div className="flex items-center gap-1">
        {/* Search (only when logged in) */}
        {user && (
          <button
            onClick={() => setSearchOpen(true)}
            className="btn-icon"
            aria-label="Search"
          >
            <FiSearch className="text-[18px] text-gray-500" />
          </button>
        )}

        {/* Notification bell */}
        {user ? (
          <Link to="/notifications" className="btn-icon relative" aria-label="Notifications">
            <FiBell className="text-[18px] text-gray-600" />
            {unread > 0 && (
              <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>
            )}
          </Link>
        ) : (
          /* show avatar placeholder when logged out */
          <Link to="/login" className="btn-icon" aria-label="Sign in">
            <FiUser className="text-[18px] text-gray-500" />
          </Link>
        )}

        {/* User avatar (logged in) */}
        {user && (
          <Link to="/profile" className="ml-0.5" aria-label="Profile">
            <div className="user-avatar-chip">
              {user.full_name
                ? user.full_name.charAt(0).toUpperCase()
                : user.email.charAt(0).toUpperCase()}
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}

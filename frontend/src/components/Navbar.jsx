import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiShield, FiAlertTriangle, FiMenu, FiX, FiPhone,
  FiBell, FiUsers, FiChevronDown, FiLogOut, FiUser,
  FiGrid, FiMap, FiBook, FiHeart, FiFileText, FiMessageSquare,
} from "react-icons/fi";
import { useState, useEffect, useRef } from "react";
import { notificationsAPI, familyAPI } from "../services/api";

/* Resources dropdown items */
const RESOURCES = [
  { to: "/ai-assistant",   icon: FiMessageSquare, label: "AI Assistant", desc: "Emotional support and safety actions" },
  { to: "/helplines",       icon: FiPhone,    label: "Helplines",      desc: "Emergency contact numbers" },
  { to: "/legal-resources", icon: FiBook,     label: "Legal Rights",   desc: "Know your rights" },
  { to: "/counseling",      icon: FiHeart,    label: "Counseling",     desc: "Mental health support" },
  { to: "/child-safety",    icon: FiShield,   label: "Child Safety",   desc: "Protection for children" },
];

export default function Navbar() {
  const { user, logout, isAdmin, isParent } = useAuth();
  const navigate   = useNavigate();
  const { pathname } = useLocation();

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [userMenuOpen,  setUserMenuOpen]  = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [familyUnread, setFamilyUnread] = useState(0);

  const resourcesRef = useRef(null);
  const userMenuRef  = useRef(null);

  /* Scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Notification count */
  useEffect(() => {
    if (!user) { setUnreadCount(0); setFamilyUnread(0); return; }
    notificationsAPI.unreadCount()
      .then((r) => setUnreadCount(r.data.unread_count || 0))
      .catch(() => {});
    if (user.role === "parent") {
      const fetch = () =>
        familyAPI.unreadCount()
          .then((r) => setFamilyUnread(r.data.unread_count || 0))
          .catch(() => {});
      fetch();
      const iv = setInterval(fetch, 30_000);
      return () => clearInterval(iv);
    }
  }, [user]);

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target)) setResourcesOpen(false);
      if (userMenuRef.current  && !userMenuRef.current.contains(e.target))  setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Close menus on route change */
  useEffect(() => { setMobileOpen(false); setResourcesOpen(false); setUserMenuOpen(false); }, [pathname]);

  const handleLogout = () => { logout(); navigate("/"); };

  /* Initials for user avatar */
  const initials = user
    ? (user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase())
    : "";

  return (
    <nav className={`navbar${scrolled ? " navbar-scrolled" : ""}`}>
      <div className="navbar-inner">

        {/* ── Logo ── */}
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo-icon">
            <FiShield className="text-white text-[16px]" />
            <div className="navbar-logo-shine" />
          </div>
          <div className="leading-tight">
            <span className="navbar-brand-name">SafeGuard</span>
            <span className="navbar-brand-tagline">Women &amp; Child Safety</span>
          </div>
        </Link>

        {/* ── Desktop centre nav ── */}
        <div className="navbar-links">
          {/* Resources dropdown */}
          <div ref={resourcesRef} className="relative">
            <button
              onClick={() => setResourcesOpen((o) => !o)}
              className={`navbar-link flex items-center gap-1 ${resourcesOpen ? "navbar-link-active" : ""}`}
            >
              Resources
              <FiChevronDown className={`text-[13px] transition-transform duration-200 ${resourcesOpen ? "rotate-180" : ""}`} />
            </button>

            {resourcesOpen && (
              <div className="navbar-dropdown">
                <div className="navbar-dropdown-header">Resources &amp; Support</div>
                {RESOURCES.map((item) => (
                  <Link key={item.to} to={item.to} className="navbar-dropdown-item">
                    <div className="navbar-dropdown-icon">
                      <item.icon className="text-white text-[14px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-800">{item.label}</div>
                      <div className="text-[11px] text-gray-400 truncate">{item.desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {user && (
            <NavLink
              to="/safe-routes"
              className={({ isActive }) => `navbar-link flex items-center gap-1.5 ${isActive ? "navbar-link-active" : ""}`}
            >
              <FiMap className="text-[13px]" /> Safe Routes
            </NavLink>
          )}

          {user && (
            <NavLink
              to="/report"
              className={({ isActive }) => `navbar-link flex items-center gap-1.5 ${isActive ? "navbar-link-active" : ""}`}
            >
              <FiFileText className="text-[13px]" /> Report
            </NavLink>
          )}

          {isParent && (
            <NavLink
              to="/parent-dashboard"
              className={({ isActive }) => `navbar-link flex items-center gap-1.5 ${isActive ? "navbar-link-active" : ""}`}
            >
              <FiUsers className="text-[13px]" /> Guardian
              {familyUnread > 0 && (
                <span className="notif-badge-sm">{familyUnread > 9 ? "9+" : familyUnread}</span>
              )}
            </NavLink>
          )}

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `navbar-link flex items-center gap-1.5 ${isActive ? "navbar-link-active" : ""}`}
            >
              <FiGrid className="text-[13px]" /> Admin
            </NavLink>
          )}
        </div>

        {/* ── Desktop right actions ── */}
        <div className="navbar-actions">
          {/* Emergency chip */}
          <a href="tel:112" className="emergency-chip" aria-label="Call 112">
            <FiPhone className="text-[13px]" />
            <span>112</span>
          </a>

          {!user ? (
            <>
              <Link to="/login"    className="navbar-btn-outline">Login</Link>
              <Link to="/register" className="navbar-btn-primary">Register</Link>
            </>
          ) : (
            <>
              {/* SOS button */}
              <Link to="/sos" className="sos-navbar-btn">
                <FiAlertTriangle className="text-[14px]" />
                <span>SOS</span>
              </Link>

              {/* Notification bell */}
              <Link to="/notifications" className="btn-icon relative" aria-label="Notifications">
                <FiBell className="text-[18px] text-gray-500" />
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                )}
              </Link>

              {/* User avatar dropdown */}
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="user-avatar-chip"
                  aria-label="User menu"
                >
                  {initials}
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown">
                    {/* User info */}
                    <div className="user-dropdown-header">
                      <div className="user-avatar-chip user-avatar-lg">{initials}</div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-gray-900 truncate">
                          {user.full_name || "SafeGuard User"}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
                        <span className="role-badge">{user.role}</span>
                      </div>
                    </div>
                    <div className="user-dropdown-divider" />
                    <Link to={isParent ? "/parent-dashboard" : "/dashboard"} className="user-dropdown-item">
                      <FiGrid className="text-[16px]" /> Dashboard
                    </Link>
                    <Link to="/profile" className="user-dropdown-item">
                      <FiUser className="text-[16px]" /> My Profile
                    </Link>
                    <Link to="/notifications" className="user-dropdown-item">
                      <FiBell className="text-[16px]" />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-auto notif-badge-sm">{unreadCount}</span>
                      )}
                    </Link>
                    <div className="user-dropdown-divider" />
                    <button onClick={handleLogout} className="user-dropdown-item user-dropdown-logout">
                      <FiLogOut className="text-[16px]" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Mobile hamburger ── */}
        <button
          className="md:hidden btn-icon ml-1"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <FiX className="text-2xl" /> : <FiMenu className="text-2xl" />}
        </button>
      </div>

      {/* ── Mobile full-screen menu ── */}
      {mobileOpen && (
        <div className="mobile-nav-menu">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <Link to="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
              <div className="navbar-logo-icon">
                <FiShield className="text-white text-[14px]" />
              </div>
              <span className="font-extrabold text-gray-900 text-[16px]">SafeGuard</span>
            </Link>
            <button onClick={() => setMobileOpen(false)} className="btn-icon">
              <FiX className="text-xl" />
            </button>
          </div>

          <div className="px-5 py-4 flex flex-col gap-2 overflow-y-auto flex-1">
            {/* User info strip */}
            {user && (
              <div className="mobile-user-strip">
                <div className="user-avatar-chip">{initials}</div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-gray-900 truncate">{user.full_name || "SafeGuard User"}</div>
                  <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
                </div>
                <span className="role-badge ml-auto">{user.role}</span>
              </div>
            )}

            {/* SOS — prominent */}
            {user && (
              <Link
                to="/sos"
                onClick={() => setMobileOpen(false)}
                className="mobile-sos-btn"
              >
                <FiAlertTriangle className="text-[18px]" /> SOS Emergency
              </Link>
            )}

            {/* Resources section */}
            <div className="mobile-section-label">Resources</div>
            {RESOURCES.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="mobile-nav-item"
              >
                <item.icon className="text-primary-600 text-[16px] flex-shrink-0" />
                {item.label}
              </Link>
            ))}

            {/* User-specific links */}
            {user && (
              <>
                <div className="mobile-section-label mt-2">Navigation</div>
                <Link to="/safe-routes" onClick={() => setMobileOpen(false)} className="mobile-nav-item">
                  <FiMap className="text-primary-600 text-[16px]" /> Safe Routes
                </Link>
                <Link to="/report" onClick={() => setMobileOpen(false)} className="mobile-nav-item">
                  <FiFileText className="text-primary-600 text-[16px]" /> Report Incident
                </Link>
                {isParent && (
                  <Link to="/parent-dashboard" onClick={() => setMobileOpen(false)} className="mobile-nav-item">
                    <FiUsers className="text-primary-600 text-[16px]" />
                    Guardian Dashboard
                    {familyUnread > 0 && <span className="notif-badge-sm ml-auto">{familyUnread}</span>}
                  </Link>
                )}
                {!isParent && (
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="mobile-nav-item">
                    <FiGrid className="text-primary-600 text-[16px]" /> Dashboard
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} className="mobile-nav-item">
                    <FiGrid className="text-primary-600 text-[16px]" /> Admin Panel
                  </Link>
                )}
                <Link to="/notifications" onClick={() => setMobileOpen(false)} className="mobile-nav-item">
                  <FiBell className="text-primary-600 text-[16px]" />
                  Notifications
                  {unreadCount > 0 && <span className="notif-badge-sm ml-auto">{unreadCount}</span>}
                </Link>
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="mobile-nav-item">
                  <FiUser className="text-primary-600 text-[16px]" /> My Profile
                </Link>
              </>
            )}

            {/* Emergency */}
            <a href="tel:112" className="emergency-chip-mobile mt-3">
              <FiPhone /> Emergency: 112
            </a>

            {/* Auth actions */}
            <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-2">
              {!user ? (
                <>
                  <Link to="/login"    onClick={() => setMobileOpen(false)} className="btn-outline">Login</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-primary">Register</Link>
                </>
              ) : (
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold text-red-600 border-2 border-red-100 hover:bg-red-50 transition"
                >
                  <FiLogOut /> Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

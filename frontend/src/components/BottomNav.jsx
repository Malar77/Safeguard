import { NavLink, Link, useLocation } from "react-router-dom";
import {
  FiHome, FiAlertTriangle, FiFileText,
  FiBell, FiUser, FiGrid
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { notificationsAPI } from "../services/api";

export default function BottomNav() {
  const { user }      = useAuth();
  const { pathname }  = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    notificationsAPI.unreadCount()
      .then((r) => setUnread(r.data.unread_count || 0))
      .catch(() => {});
  }, [user, pathname]);

  if (!user) return null;
  if (pathname === "/admin") return null;

  const homeLink = user.role === "parent" ? "/parent-dashboard" : "/dashboard";

  const tabs = [
    { to: homeLink,          icon: FiHome,          label: "Home"   },
    { to: "/report",         icon: FiFileText,       label: "Report" },
    ...(user.role === "parent" ? [] : [{ to: "/sos", icon: FiAlertTriangle, label: "SOS", sos: true }]),
    { to: "/notifications",  icon: FiBell,           label: "Alerts", badge: unread },
    { to: "/profile",        icon: FiUser,           label: "Profile" },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, icon: Icon, label, sos, badge }) => {
        const active = pathname === to;

        if (sos) {
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center justify-center flex-1 h-full group"
              aria-label="SOS Emergency"
            >
              <div className="sos-fab group-active:scale-90 transition-transform">
                <Icon className="text-[20px]" />
                <span>{label}</span>
              </div>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={to}
            to={to}
            className={`bottom-nav-tab${active ? " active" : ""}`}
            aria-label={label}
          >
            <div className="relative">
              <Icon className={`text-[22px] transition-transform duration-150 ${active ? "scale-110" : ""}`} />
              {badge > 0 && (
                <span className="notif-badge">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </div>
            <span className={`transition-all duration-150 ${active ? "font-bold" : ""}`}>
              {label}
            </span>
            {active && <span className="bottom-nav-dot" />}
          </NavLink>
        );
      })}
    </nav>
  );
}

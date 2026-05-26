import { Link } from "react-router-dom";
import {
  FiAlertTriangle, FiFileText, FiPhone, FiBook,
  FiHeart, FiShield, FiUsers, FiMap, FiChevronRight,
} from "react-icons/fi";

const QUICK_TILES = [
  { icon: FiPhone,  bg: "bg-green-50",  ic: "text-green-500",  label: "Helplines",    to: "/helplines" },
  { icon: FiBook,   bg: "bg-purple-50", ic: "text-purple-500", label: "Legal Rights",  to: "/legal-resources" },
  { icon: FiHeart,  bg: "bg-pink-50",   ic: "text-pink-500",   label: "Counseling",   to: "/counseling" },
  { icon: FiUsers,  bg: "bg-blue-50",   ic: "text-blue-500",   label: "Child Safety", to: "/child-safety" },
  { icon: FiMap,    bg: "bg-teal-50",   ic: "text-teal-500",   label: "Safe Places",  to: "/safe-routes" },
  { icon: FiShield, bg: "bg-indigo-50", ic: "text-indigo-500", label: "Guardian",     to: "/register" },
];

const HELPLINES = [
  { num: "112",  label: "National Emergency", color: "bg-red-600" },
  { num: "1091", label: "Women Helpline",      color: "bg-primary-600" },
  { num: "1098", label: "Child Helpline",      color: "bg-blue-600" },
  { num: "181",  label: "Domestic Violence",   color: "bg-orange-600" },
];

export default function Home() {
  return (
    <div className="pb-6">
      {/* Hero / Splash */}
      <div className="bg-gradient-to-b from-primary-700 via-primary-800 to-rose-800 text-white px-6 pt-8 pb-12 text-center">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-[28px] flex items-center justify-center mx-auto mb-5 shadow-xl border border-white/20">
          <FiShield className="text-5xl text-white drop-shadow" />
        </div>
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight">SafeGuard</h1>
        <p className="text-primary-100 text-sm leading-relaxed mb-7 max-w-xs mx-auto">
          Empowering women & protecting children through technology.
          One tap away from safety.
        </p>
        {/* Emergency call pill */}
        <a
          href="tel:112"
          className="inline-flex items-center gap-2 bg-red-600/90 backdrop-blur text-white font-bold px-5 py-2.5 rounded-2xl text-sm shadow-lg border border-red-500/30"
        >
          <FiAlertTriangle className="text-base" /> Emergency: Call 112
        </a>
      </div>

      {/* CTA card (overlaps hero) */}
      <div className="px-4 -mt-5 mb-5">
        <div className="bg-white rounded-3xl shadow-lg p-4 border border-gray-100">
          <Link to="/register" className="btn-primary mb-3">
            Get Started — It's Free
          </Link>
          <Link to="/login" className="btn-outline">
            Sign In to My Account
          </Link>
        </div>
      </div>

      {/* Quick Resources */}
      <div className="px-4 mb-5">
        <p className="section-title">Resources — Login Required</p>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_TILES.map(({ icon: Icon, bg, ic, label, to }) => (
            <Link
              key={to}
              to={to}
              className={`${bg} rounded-2xl p-3 flex flex-col items-center gap-2 text-center active:scale-95 transition border border-transparent`}
            >
              <div className={`text-2xl ${ic}`}><Icon /></div>
              <span className="text-[11px] font-semibold text-gray-700 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Emergency Helplines */}
      <div className="px-4 mb-5">
        <p className="section-title">Emergency Helplines</p>
        <div className="grid grid-cols-2 gap-2">
          {HELPLINES.map(({ num, label, color }) => (
            <a
              key={num}
              href={`tel:${num}`}
              className={`${color} text-white rounded-2xl p-3 flex items-center justify-between active:opacity-80 transition`}
            >
              <div>
                <div className="font-extrabold text-lg leading-none">{num}</div>
                <div className="text-[11px] opacity-80 mt-0.5">{label}</div>
              </div>
              <FiPhone className="text-xl opacity-70" />
            </a>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-5">
        <div className="bg-gradient-to-r from-primary-50 to-rose-50 rounded-2xl p-4 grid grid-cols-2 gap-4 border border-primary-100">
          {[
            { v: "50K+",  l: "Women Helped",        c: "text-primary-600" },
            { v: "12K+",  l: "Incidents Reported",   c: "text-blue-600"   },
            { v: "100+",  l: "Legal Resources",      c: "text-green-600"  },
            { v: "200+",  l: "Partner NGOs",         c: "text-orange-600" },
          ].map(({ v, l, c }) => (
            <div key={l} className="text-center">
              <div className={`text-2xl font-extrabold ${c}`}>{v}</div>
              <div className="text-gray-500 text-xs mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature highlights */}
      <div className="px-4">
        <p className="section-title">Why SafeGuard?</p>
        <div className="space-y-2">
          {[
            { icon: <FiAlertTriangle className="text-red-500" />,    text: "One-tap SOS with live GPS + auto live video to guardians" },
            { icon: <FiFileText className="text-blue-500" />,        text: "Anonymous incident reporting with status tracking" },
            { icon: <FiUsers className="text-pink-500" />,           text: "Guardian dashboard — real-time child safety monitoring" },
            { icon: <FiBook className="text-purple-500" />,          text: "POCSO, POSH, Domestic Violence Act resources" },
          ].map(({ icon, text }) => (
            <div key={text} className="list-item">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <span className="text-sm text-gray-700 flex-1">{text}</span>
              <FiChevronRight className="text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


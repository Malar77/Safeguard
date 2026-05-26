import { useEffect, useState } from "react";
import { authAPI, incidentAPI, sosAPI, familyAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FiUser, FiPlus, FiTrash2, FiFileText, FiAlertTriangle,
  FiShield, FiCheckCircle, FiEdit2, FiLock, FiSave, FiX,
  FiUsers, FiLogOut, FiBell, FiPhone, FiMail, FiMapPin,
  FiEye, FiEyeOff, FiSettings, FiAlertCircle, FiCalendar,
  FiChevronRight, FiStar, FiRefreshCw,
} from "react-icons/fi";

/* ── helpers ───────────────────────────────────────────────────────────── */
const STATUS_COLOR = {
  pending:      "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  resolved:     "bg-emerald-100 text-emerald-700",
  closed:       "bg-gray-100 text-gray-500",
};
const ROLE_COLOR = {
  admin:     "from-red-500 to-red-600",
  parent:    "from-blue-500 to-blue-600",
  child:     "from-purple-500 to-purple-600",
  counselor: "from-teal-500 to-teal-600",
  user:      "from-pink-600 to-rose-500",
};
const AVATAR_GRADIENT = [
  "from-pink-500 to-rose-600",
  "from-purple-500 to-indigo-600",
  "from-blue-500 to-cyan-600",
  "from-teal-500 to-green-600",
];

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function PwInput({ placeholder, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className="input-field pr-10"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
      />
      <button type="button" onClick={() => setShow(s => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
        {show ? <FiEyeOff size={16} /> : <FiEye size={16} />}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* state */
  const [contacts,   setContacts]   = useState([]);
  const [incidents,  setIncidents]  = useState([]);
  const [sosAlerts,  setSosAlerts]  = useState([]);
  const [myParents,  setMyParents]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  /* contact form */
  const [addingContact,    setAddingContact]    = useState(false);
  const [contactForm,      setContactForm]      = useState({ name:"", phone:"", email:"", relation:"" });
  const [contactLoading,   setContactLoading]   = useState(false);
  const [editContactId,    setEditContactId]    = useState(null);
  const [editContactForm,  setEditContactForm]  = useState({});

  /* profile form */
  const [editingProfile,   setEditingProfile]   = useState(false);
  const [profileForm,      setProfileForm]      = useState({ full_name:"", phone:"" });
  const [profileLoading,   setProfileLoading]   = useState(false);

  /* password form */
  const [pwForm,    setPwForm]    = useState({ current:"", next:"", confirm:"" });
  const [pwLoading, setPwLoading] = useState(false);

  /* delete account */
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting,      setDeleting]      = useState(false);

  /* family */
  const [parentEmail,  setParentEmail]  = useState("");
  const [linkLoading,  setLinkLoading]  = useState(false);

  /* load data */
  useEffect(() => {
    Promise.all([
      authAPI.getContacts(),
      incidentAPI.my(),
      sosAPI.myAlerts(),
      familyAPI.myParents(),
    ]).then(([c, i, s, p]) => {
      setContacts(c.data);
      setIncidents(i.data);
      setSosAlerts(s.data);
      setMyParents(p.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  /* ── actions ─────────────────────────────────────────────────────────── */
  const handleLogout = () => { logout(); navigate("/login", { replace: true }); };

  const addContact = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone) return toast.error("Name and phone required");
    setContactLoading(true);
    try {
      const r = await authAPI.addContact(contactForm);
      setContacts(c => [...c, r.data]);
      setContactForm({ name:"", phone:"", email:"", relation:"" });
      setAddingContact(false);
      toast.success("Trusted contact added!");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setContactLoading(false); }
  };

  const saveEditContact = async (id) => {
    try {
      const r = await authAPI.updateContact(id, editContactForm);
      setContacts(cs => cs.map(c => c.id === id ? r.data : c));
      setEditContactId(null);
      toast.success("Contact updated");
    } catch { toast.error("Failed to update"); }
  };

  const deleteContact = async (id) => {
    try {
      await authAPI.deleteContact(id);
      setContacts(c => c.filter(x => x.id !== id));
      toast.success("Contact removed");
    } catch { toast.error("Failed"); }
  };

  const deleteIncident = async (id) => {
    if (!window.confirm("Delete this pending incident? Cannot be undone.")) return;
    try {
      await incidentAPI.deleteMyIncident(id);
      setIncidents(i => i.filter(x => x.id !== id));
      toast.success("Incident deleted");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.full_name.trim()) return toast.error("Name cannot be empty");
    setProfileLoading(true);
    try {
      const r = await authAPI.updateProfile(profileForm);
      if (setUser) setUser(r.data);
      toast.success("Profile updated!");
      setEditingProfile(false);
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setProfileLoading(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) return toast.error("Passwords don't match");
    if (pwForm.next.length < 8) return toast.error("Password must be ≥ 8 characters");
    setPwLoading(true);
    try {
      await authAPI.changePassword({ current_password: pwForm.current, new_password: pwForm.next });
      toast.success("Password changed!");
      setPwForm({ current:"", next:"", confirm:"" });
    } catch (err) { toast.error(err.response?.data?.detail || "Wrong current password"); }
    finally { setPwLoading(false); }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return toast.error('Type DELETE to confirm');
    setDeleting(true);
    try {
      await authAPI.deleteAccount();
      logout();
      navigate("/", { replace: true });
      toast.success("Account deleted");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setDeleting(false); }
  };

  const sendLinkRequest = async (e) => {
    e.preventDefault();
    if (!parentEmail.trim()) return toast.error("Enter guardian email");
    setLinkLoading(true);
    try {
      await familyAPI.requestLink(parentEmail.trim());
      toast.success("Link request sent!");
      setParentEmail("");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setLinkLoading(false); }
  };

  const unlinkParent = async (id) => {
    if (!window.confirm("Remove this guardian link?")) return;
    try {
      await familyAPI.unlink(id);
      setMyParents(p => p.filter(l => l.id !== id));
      toast.success("Guardian unlinked");
    } catch { toast.error("Failed"); }
  };

  /* ── derived ──────────────────────────────────────────────────────────── */
  const initials = user?.full_name
    ? user.full_name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "?";

  const avatarGrad = AVATAR_GRADIENT[(user?.id || 0) % AVATAR_GRADIENT.length];
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : "";

  const TABS = [
    { key: "overview",  label: "Overview",  icon: FiUser },
    { key: "contacts",  label: "Contacts",  icon: FiPhone,         count: contacts.length },
    { key: "incidents", label: "Reports",   icon: FiFileText,      count: incidents.length },
    { key: "sos",       label: "SOS",       icon: FiAlertTriangle, count: sosAlerts.length },
    { key: "family",    label: "Family",    icon: FiUsers,         count: myParents.length },
    { key: "settings",  label: "Settings",  icon: FiSettings },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-60">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
    </div>
  );

  /* ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-2xl mx-auto pb-24">

      {/* ── Hero Card ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-rose-500 px-5 pt-8 pb-6 mb-0">
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute top-16 -right-4 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative flex items-start gap-4">
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-3xl font-black shadow-lg border-4 border-white/30 flex-shrink-0`}>
            {initials}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-white font-extrabold text-xl leading-snug truncate">
              {user?.full_name || "SafeGuard User"}
            </h1>
            <p className="text-white/70 text-sm truncate">{user?.email}</p>
            {user?.phone && (
              <p className="text-white/60 text-xs mt-0.5 flex items-center gap-1">
                <FiPhone size={10} /> {user.phone}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`bg-gradient-to-r ${ROLE_COLOR[user?.role] || ROLE_COLOR.user} text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider`}>
                {user?.role}
              </span>
              {memberSince && (
                <span className="text-white/60 text-[10px] flex items-center gap-1">
                  <FiCalendar size={9} /> Since {memberSince}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={() => { setProfileForm({ full_name: user?.full_name||"", phone: user?.phone||"" }); setEditingProfile(true); setActiveTab("settings"); }}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
            >
              <FiEdit2 size={11} /> Edit
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500/80 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1"
            >
              <FiLogOut size={11} /> Logout
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative mt-5 grid grid-cols-4 gap-2">
          {[
            { label: "Reports",  value: incidents.length, color: "text-white" },
            { label: "Contacts", value: contacts.length,  color: "text-white" },
            { label: "SOS",      value: sosAlerts.length, color: "text-white" },
            { label: "Guardians",value: myParents.length, color: "text-white" },
          ].map(s => (
            <div key={s.label} className="bg-white/15 rounded-2xl py-2 px-1 text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-white/60 text-[9px] font-semibold uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-[54px] md:top-[62px] z-30 px-3">
        <div className="flex overflow-x-auto scrollbar-hide gap-0">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0
                  ${active ? "border-primary-600 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                <Icon size={13} />
                {t.label}
                {t.count > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${active ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ══ OVERVIEW TAB ══════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Account info */}
            <div className="card">
              <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FiUser size={15} className="text-primary-500" /> Account Info</h2>
              <div className="space-y-0 divide-y divide-gray-50">
                {[
                  { label: "Full Name", value: user?.full_name || "—", icon: FiUser },
                  { label: "Email",     value: user?.email,             icon: FiMail },
                  { label: "Phone",     value: user?.phone || "Not set", icon: FiPhone },
                  { label: "Role",      value: user?.role,              icon: FiStar },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3 py-3">
                    <row.icon size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-500 w-20 flex-shrink-0">{row.label}</span>
                    <span className="text-sm font-medium text-gray-800 flex-1 truncate">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent incidents */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-800 flex items-center gap-2"><FiFileText size={15} className="text-blue-500" /> Recent Reports</h2>
                <button onClick={() => setActiveTab("incidents")} className="text-xs text-primary-600 font-semibold flex items-center gap-0.5">See all <FiChevronRight size={12} /></button>
              </div>
              {incidents.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">No reports yet</p>
              ) : incidents.slice(0, 3).map(inc => (
                <div key={inc.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_COLOR[inc.status] || "bg-gray-100 text-gray-500"}`}>
                    {inc.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{inc.title}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(inc.created_at)}</span>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Link to="/sos" className="card flex flex-col items-center gap-2 py-5 border-red-100 bg-red-50 hover:bg-red-100 transition active:scale-95">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                  <FiAlertTriangle className="text-white" size={18} />
                </div>
                <span className="text-sm font-bold text-red-700">SOS Alert</span>
              </Link>
              <Link to="/report" className="card flex flex-col items-center gap-2 py-5 border-blue-100 bg-blue-50 hover:bg-blue-100 transition active:scale-95">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                  <FiFileText className="text-white" size={18} />
                </div>
                <span className="text-sm font-bold text-blue-700">Report Incident</span>
              </Link>
              <Link to="/safe-routes" className="card flex flex-col items-center gap-2 py-5 border-green-100 bg-green-50 hover:bg-green-100 transition active:scale-95">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                  <FiMapPin className="text-white" size={18} />
                </div>
                <span className="text-sm font-bold text-green-700">Safe Routes</span>
              </Link>
              <Link to="/share-location" className="card flex flex-col items-center gap-2 py-5 border-purple-100 bg-purple-50 hover:bg-purple-100 transition active:scale-95">
                <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                  <FiShield className="text-white" size={18} />
                </div>
                <span className="text-sm font-bold text-purple-700">Share Location</span>
              </Link>
            </div>
          </div>
        )}

        {/* ══ CONTACTS TAB ══════════════════════════════════════════════ */}
        {activeTab === "contacts" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-800 text-base">Trusted Contacts</h2>
                <p className="text-gray-400 text-xs mt-0.5">Notified instantly on SOS. Max 5.</p>
              </div>
              {contacts.length < 5 && (
                <button onClick={() => setAddingContact(a => !a)}
                  className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
                  <FiPlus size={13} /> Add
                </button>
              )}
            </div>

            {addingContact && (
              <form onSubmit={addContact} className="bg-pink-50 border border-pink-100 rounded-2xl p-4 mb-4 space-y-3">
                <p className="text-xs font-bold text-primary-700 uppercase tracking-wide">New Contact</p>
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-field text-sm" placeholder="Name *" required value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} />
                  <input className="input-field text-sm" placeholder="Phone *" required value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} />
                  <input className="input-field text-sm" placeholder="Email (optional)" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
                  <input className="input-field text-sm" placeholder="Relation (e.g. Mother)" value={contactForm.relation} onChange={e => setContactForm({...contactForm, relation: e.target.value})} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={contactLoading}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold py-2.5 rounded-xl transition">
                    {contactLoading ? "Adding…" : "Add Contact"}
                  </button>
                  <button type="button" onClick={() => setAddingContact(false)}
                    className="px-4 py-2.5 border-2 border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {contacts.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <FiUsers size={22} className="text-gray-300" />
                </div>
                <p className="text-gray-400 text-sm font-medium">No contacts yet</p>
                <p className="text-gray-300 text-xs mt-1">Add people to alert in an emergency</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((c, i) => (
                  <div key={c.id} className="rounded-2xl border border-gray-100 overflow-hidden">
                    {editContactId === c.id ? (
                      <div className="p-3 bg-blue-50 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input className="input-field text-sm" value={editContactForm.name} placeholder="Name" onChange={e => setEditContactForm({...editContactForm, name: e.target.value})} />
                          <input className="input-field text-sm" value={editContactForm.phone} placeholder="Phone" onChange={e => setEditContactForm({...editContactForm, phone: e.target.value})} />
                          <input className="input-field text-sm" value={editContactForm.email} placeholder="Email" onChange={e => setEditContactForm({...editContactForm, email: e.target.value})} />
                          <input className="input-field text-sm" value={editContactForm.relation} placeholder="Relation" onChange={e => setEditContactForm({...editContactForm, relation: e.target.value})} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEditContact(c.id)} className="flex items-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-xl"><FiSave size={11}/> Save</button>
                          <button onClick={() => setEditContactId(null)} className="text-xs text-gray-500 px-3 py-2 rounded-xl border border-gray-200">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${AVATAR_GRADIENT[i % AVATAR_GRADIENT.length].replace("from-","bg-").split(" ")[0]}`}
                          style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
                        >
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${AVATAR_GRADIENT[i % AVATAR_GRADIENT.length]} flex items-center justify-center text-white font-bold text-sm`}>
                            {c.name[0].toUpperCase()}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.phone}{c.relation ? ` · ${c.relation}` : ""}</p>
                          {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                        </div>
                        <div className="flex gap-1">
                          <a href={`tel:${c.phone}`} className="p-2 rounded-xl text-green-500 hover:bg-green-50"><FiPhone size={14}/></a>
                          <button onClick={() => { setEditContactId(c.id); setEditContactForm({name:c.name, phone:c.phone, email:c.email||"", relation:c.relation||""}); }} className="p-2 rounded-xl text-blue-400 hover:bg-blue-50"><FiEdit2 size={14}/></button>
                          <button onClick={() => deleteContact(c.id)} className="p-2 rounded-xl text-red-400 hover:bg-red-50"><FiTrash2 size={14}/></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ REPORTS TAB ═══════════════════════════════════════════════ */}
        {activeTab === "incidents" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-base flex items-center gap-2"><FiFileText size={15} className="text-blue-500"/> My Reports</h2>
              <Link to="/report" className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
                <FiPlus size={13}/> New
              </Link>
            </div>
            {incidents.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><FiFileText size={22} className="text-blue-300"/></div>
                <p className="text-gray-400 text-sm font-medium">No reports yet</p>
                <Link to="/report" className="text-primary-600 text-xs font-semibold mt-2 block">Report an incident →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map(inc => (
                  <div key={inc.id} className="p-3 border border-gray-100 rounded-2xl hover:border-primary-200 hover:bg-pink-50/30 transition">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[inc.status] || "bg-gray-100 text-gray-500"}`}>
                            {inc.status.replace(/_/g," ")}
                          </span>
                          {inc.is_anonymous && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Anonymous</span>}
                          <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(inc.created_at)}</span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm truncate">{inc.title}</p>
                        <p className="text-xs text-gray-400 capitalize">{inc.incident_type.replace(/_/g," ")}</p>
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{inc.description}</p>
                        {inc.location && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><FiMapPin size={10}/>{inc.location}</p>}
                        {inc.admin_notes && (
                          <div className="mt-2 p-2 bg-blue-50 rounded-xl text-xs text-blue-700">
                            <strong>Admin note:</strong> {inc.admin_notes}
                          </div>
                        )}
                      </div>
                      {inc.status === "pending" && (
                        <button onClick={() => deleteIncident(inc.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex-shrink-0">
                          <FiTrash2 size={14}/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SOS TAB ═══════════════════════════════════════════════════ */}
        {activeTab === "sos" && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800 text-base flex items-center gap-2"><FiAlertTriangle size={15} className="text-red-500"/> SOS History</h2>
              <Link to="/sos" className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition">
                🚨 New SOS
              </Link>
            </div>
            {sosAlerts.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3"><FiShield size={22} className="text-green-400"/></div>
                <p className="text-gray-400 text-sm font-medium">No SOS alerts</p>
                <p className="text-gray-300 text-xs mt-1">You're safe! 🛡️</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sosAlerts.map(a => (
                  <div key={a.id} className={`p-4 rounded-2xl border ${a.is_active ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50"}`}>
                    <div className="flex items-center justify-between mb-2">
                      {a.is_active
                        ? <span className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-full font-bold animate-pulse">🔴 ACTIVE</span>
                        : <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><FiCheckCircle size={10}/> Resolved</span>
                      }
                      <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium">{a.message}</p>
                    {a.address && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><FiMapPin size={10}/>{a.address}</p>}
                    {a.latitude && <p className="text-xs text-gray-400 mt-0.5 font-mono">GPS: {a.latitude.toFixed(5)}, {a.longitude.toFixed(5)}</p>}
                    {a.resolved_at && <p className="text-xs text-emerald-600 mt-1">✓ Resolved {timeAgo(a.resolved_at)}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ FAMILY TAB ════════════════════════════════════════════════ */}
        {activeTab === "family" && (
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center"><FiUsers className="text-white" size={18}/></div>
                <div>
                  <h2 className="font-bold text-gray-800">Guardian Links</h2>
                  <p className="text-gray-400 text-xs">Link with a guardian to share location on SOS</p>
                </div>
              </div>

              <form onSubmit={sendLinkRequest} className="flex gap-2 mb-5">
                <input type="email" required className="input-field flex-1 text-sm" placeholder="Guardian's email address"
                  value={parentEmail} onChange={e => setParentEmail(e.target.value)} />
                <button type="submit" disabled={linkLoading}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold px-4 rounded-xl transition whitespace-nowrap flex items-center gap-1">
                  <FiPlus size={13}/> {linkLoading ? "…" : "Send"}
                </button>
              </form>

              {myParents.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-2"><FiUsers size={20} className="text-gray-300"/></div>
                  <p className="text-gray-400 text-sm">No guardians linked yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myParents.map(link => (
                    <div key={link.id} className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(link.parent_name||"?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{link.parent_name}</p>
                        <p className="text-xs text-gray-500">{link.parent_email}</p>
                        <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">✓ Linked</span>
                      </div>
                      <button onClick={() => unlinkParent(link.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition"><FiTrash2 size={15}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card bg-blue-50 border-blue-100">
              <h3 className="font-bold text-blue-800 mb-3 text-sm">How Guardian Alerts Work</h3>
              <ol className="text-xs text-blue-700 space-y-2">
                {[
                  "Enter your guardian's email and send a link request",
                  "They accept from their Guardian Dashboard",
                  "When you press SOS, your guardian instantly gets:",
                  "→ Your live GPS location",
                  "→ A live video from your camera",
                  "→ Your emergency message",
                ].map((s,i) => (
                  <li key={i} className={`flex gap-2 ${s.startsWith("→") ? "pl-4" : ""}`}>
                    {!s.startsWith("→") && <span className="w-4 h-4 bg-blue-200 text-blue-800 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>}
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* ══ SETTINGS TAB ══════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            {/* Edit Profile */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center"><FiEdit2 className="text-primary-600" size={15}/></div>
                <div><h2 className="font-bold text-gray-800">Edit Profile</h2><p className="text-gray-400 text-xs">Update your name and phone</p></div>
              </div>
              <form onSubmit={saveProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name *</label>
                  <input className="input-field" value={editingProfile ? profileForm.full_name : (user?.full_name||"")}
                    placeholder="Your full name" required
                    onChange={e => { setEditingProfile(true); setProfileForm({...profileForm, full_name: e.target.value}); }}
                    onFocus={() => { if(!editingProfile) setProfileForm({full_name:user?.full_name||"",phone:user?.phone||""}); setEditingProfile(true); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone Number</label>
                  <input className="input-field" value={editingProfile ? profileForm.phone : (user?.phone||"")}
                    placeholder="+91 XXXXX XXXXX"
                    onChange={e => { setEditingProfile(true); setProfileForm({...profileForm, phone: e.target.value}); }}
                    onFocus={() => { if(!editingProfile) setProfileForm({full_name:user?.full_name||"",phone:user?.phone||""}); setEditingProfile(true); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                  <input className="input-field bg-gray-100 cursor-not-allowed" value={user?.email||""} disabled />
                </div>
                <button type="submit" disabled={profileLoading || !editingProfile}
                  className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2">
                  <FiSave size={14}/> {profileLoading ? "Saving…" : "Save Changes"}
                </button>
              </form>
            </div>

            {/* Change Password */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center"><FiLock className="text-amber-600" size={15}/></div>
                <div><h2 className="font-bold text-gray-800">Change Password</h2><p className="text-gray-400 text-xs">Keep your account secure</p></div>
              </div>
              <form onSubmit={changePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Current Password *</label>
                  <PwInput placeholder="Current password" value={pwForm.current} onChange={e => setPwForm({...pwForm, current: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">New Password * (min 8 chars)</label>
                  <PwInput placeholder="New password" value={pwForm.next} onChange={e => setPwForm({...pwForm, next: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Confirm New Password *</label>
                  <PwInput placeholder="Repeat new password" value={pwForm.confirm} onChange={e => setPwForm({...pwForm, confirm: e.target.value})} />
                </div>
                {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
                  <p className="text-xs text-red-500 flex items-center gap-1"><FiAlertCircle size={11}/> Passwords don't match</p>
                )}
                <button type="submit" disabled={pwLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2">
                  <FiLock size={14}/> {pwLoading ? "Updating…" : "Update Password"}
                </button>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="card border-red-100 bg-red-50/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center"><FiAlertCircle className="text-red-600" size={15}/></div>
                <div><h2 className="font-bold text-red-800">Danger Zone</h2><p className="text-gray-400 text-xs">Permanent actions — cannot be undone</p></div>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                To delete your account, type <strong className="text-red-600">DELETE</strong> below and confirm. All your data, contacts, and reports will be permanently erased.
              </p>
              <input
                className="input-field mb-3 border-red-200 focus:ring-red-400"
                placeholder='Type "DELETE" to confirm'
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
              />
              <button
                onClick={deleteAccount}
                disabled={deleteConfirm !== "DELETE" || deleting}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-2xl transition flex items-center justify-center gap-2"
              >
                <FiTrash2 size={14}/> {deleting ? "Deleting…" : "Delete My Account"}
              </button>
            </div>

            {/* Sign out */}
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 text-red-600 bg-white hover:bg-red-50 font-bold transition active:scale-95">
              <FiLogOut size={16}/> Sign Out
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

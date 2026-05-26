import { useCallback, useEffect, useState } from "react";
import { counselingAPI, sessionsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiHeart, FiPhone, FiGlobe, FiMapPin, FiVideo, FiMic,
  FiLoader, FiUsers, FiCalendar, FiClock, FiCheckCircle,
  FiBriefcase, FiShield, FiBook, FiAlertCircle, FiX,
  FiStar, FiChevronRight, FiExternalLink,
} from "react-icons/fi";

/* ── Government helpline data (static, always available) ─────────────────── */
const GOV_HELPLINES = [
  {
    id: 1,
    name: "National Commission for Women",
    number: "7827170170",
    category: "Women's Rights",
    desc: "24×7 helpline for women in distress — legal aid, counseling referrals, and emergency support.",
    website: "https://ncw.nic.in",
    available: "24×7",
    icon: "👩‍⚖️",
    color: "from-pink-500 to-rose-600",
  },
  {
    id: 2,
    name: "iCall — TISS",
    number: "9152987821",
    category: "Mental Health",
    desc: "Free psychological counseling and mental health support by trained counselors at TISS Mumbai.",
    website: "https://icallhelpline.org",
    available: "Mon–Sat, 8am–10pm",
    icon: "🧠",
    color: "from-purple-500 to-indigo-600",
  },
  {
    id: 3,
    name: "Vandrevala Foundation",
    number: "1860-2662-345",
    category: "Crisis Support",
    desc: "24-hour free mental health helpline. Trained counselors for depression, anxiety, and crisis support.",
    website: "https://vandrevalafoundation.com",
    available: "24×7",
    icon: "🆘",
    color: "from-red-500 to-rose-500",
  },
  {
    id: 4,
    name: "Childline India",
    number: "1098",
    category: "Child Safety",
    desc: "Free 24×7 emergency service for children in distress. Run by Ministry of Women & Child Development.",
    website: "https://childlineindia.org",
    available: "24×7",
    icon: "👦",
    color: "from-blue-500 to-cyan-600",
  },
  {
    id: 5,
    name: "SNEHI — Mental Health Helpline",
    number: "044-24640050",
    category: "Mental Health",
    desc: "Suicide prevention and mental health helpline for those in emotional distress.",
    website: "https://snehi.org",
    available: "Mon–Sat, 8am–10pm",
    icon: "💙",
    color: "from-teal-500 to-green-600",
  },
  {
    id: 6,
    name: "National Domestic Violence Helpline",
    number: "181",
    category: "Domestic Violence",
    desc: "Government-run helpline for domestic violence victims — connects to local support services and police.",
    website: "https://wcd.nic.in",
    available: "24×7",
    icon: "🏠",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: 7,
    name: "NIMHANS Helpline",
    number: "080-46110007",
    category: "Mental Health",
    desc: "National Institute of Mental Health — professional psychiatric support and counseling referrals.",
    website: "https://nimhans.ac.in",
    available: "Mon–Fri, 9am–5pm",
    icon: "🏥",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: 8,
    name: "Cyber Crime Helpline",
    number: "1930",
    category: "Cyber Safety",
    desc: "Report online harassment, cyberstalking, deepfakes, and digital crimes. Immediate response team.",
    website: "https://cybercrime.gov.in",
    available: "24×7",
    icon: "🛡️",
    color: "from-slate-500 to-blue-600",
  },
];

const GOV_CATEGORIES = ["All", "Women's Rights", "Mental Health", "Crisis Support", "Child Safety", "Domestic Violence", "Cyber Safety"];

/* ── Personal counselors (fetched from backend + static fallback) ─────────── */
const PERSONAL_COUNSELORS = [
  {
    id: "c1",
    name: "Dr. Priya Sharma",
    specialization: "Trauma & PTSD",
    experience: "8 years",
    languages: ["Hindi", "English"],
    rating: 4.9,
    reviews: 128,
    available_slots: ["10:00 AM", "2:00 PM", "5:00 PM"],
    bio: "Specialized in trauma recovery, domestic violence support, and women's mental health. NIMHANS certified.",
    call_types: ["audio", "video"],
    avatar: "PS",
    color: "from-pink-500 to-rose-600",
    price: "Free",
  },
  {
    id: "c2",
    name: "Ravi Menon",
    specialization: "Child & Adolescent Counseling",
    experience: "6 years",
    languages: ["Tamil", "English", "Malayalam"],
    rating: 4.8,
    reviews: 96,
    available_slots: ["9:00 AM", "11:00 AM", "3:00 PM"],
    bio: "Expert in child abuse recovery, adolescent mental health, and family counseling. iCall trained.",
    call_types: ["audio", "video"],
    avatar: "RM",
    color: "from-blue-500 to-indigo-600",
    price: "Free",
  },
  {
    id: "c3",
    name: "Dr. Anitha Rao",
    specialization: "Anxiety & Depression",
    experience: "11 years",
    languages: ["Telugu", "Kannada", "English"],
    rating: 4.9,
    reviews: 214,
    available_slots: ["11:30 AM", "4:00 PM", "6:30 PM"],
    bio: "Senior clinical psychologist specializing in anxiety disorders, depression, and crisis intervention.",
    call_types: ["audio", "video"],
    avatar: "AR",
    color: "from-purple-500 to-violet-600",
    price: "Free",
  },
  {
    id: "c4",
    name: "Sahana Krishnamurthy",
    specialization: "Legal & Domestic Violence",
    experience: "5 years",
    languages: ["Kannada", "Hindi", "English"],
    rating: 4.7,
    reviews: 73,
    available_slots: ["2:30 PM", "4:30 PM", "7:00 PM"],
    bio: "Counselor with dual expertise in legal aid and emotional support for domestic violence survivors.",
    call_types: ["audio"],
    avatar: "SK",
    color: "from-teal-500 to-emerald-600",
    price: "Free",
  },
];

const TODAY = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

function labelToDate(label) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (label === "Tomorrow") d.setDate(d.getDate() + 1);
  else if (label === "In 2 days") d.setDate(d.getDate() + 2);
  else if (label === "In 3 days") d.setDate(d.getDate() + 3);
  else if (label === "In 4 days") d.setDate(d.getDate() + 4);
  return d;
}

function applySlotToDate(dateOnly, slot) {
  if (!slot) return null;
  const m = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && hour !== 12) hour += 12;
  if (ap === "AM" && hour === 12) hour = 0;

  const dt = new Date(dateOnly);
  dt.setHours(hour, minute, 0, 0);
  return dt;
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Counseling() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [mainTab,   setMainTab]   = useState("government"); // "government" | "personal"
  const [govFilter, setGovFilter] = useState("All");
  const [starting,  setStarting]  = useState(null);

  /* Personal counselor flow */
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [bookingStep,        setBookingStep]        = useState("list"); // "list"|"book"|"confirmed"|"call"
  const [chosenSlot,         setChosenSlot]         = useState("");
  const [chosenDate,         setChosenDate]         = useState("Today");
  const [chosenCallType,     setChosenCallType]     = useState("video");
  const [confirmedAppt,      setConfirmedAppt]      = useState(null);
  const [appointments,       setAppointments]       = useState([]);
  const [bookingSaving,      setBookingSaving]      = useState(false);
  const [callLoading,        setCallLoading]        = useState(false);

  /* Government resources from backend (supplements static list) */
  const [extraResources, setExtraResources] = useState([]);
  /* Live counselors from backend (admin-created counselor-role accounts) */
  const [liveCounselors, setLiveCounselors] = useState([]);

  const loadAppointments = useCallback(() => {
    sessionsAPI.myAppointments().then(r => setAppointments(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    counselingAPI.get().then(r => setExtraResources(r.data)).catch(() => {});
    // Fetch real counselor-role users created by admin
    sessionsAPI.listCounselors()
      .then(r => {
        const mapped = (r.data || [])
          .filter(c => c.is_active !== false) // show active counselors; tolerate older payloads
          .map((c, i) => {
            const colors = ["from-pink-500 to-rose-600","from-purple-500 to-indigo-600","from-teal-500 to-emerald-600","from-blue-500 to-cyan-600"];
            const slots  = ["9:00 AM","11:00 AM","2:00 PM","4:00 PM","6:00 PM"];
            return {
              id:            `live-${c.id}`,
              name:          c.full_name,
              specialization:"Personal Counseling",
              experience:    "Certified",
              languages:     ["English","Hindi"],
              rating:        5.0,
              reviews:       c.total_sessions || 0,
              counselor_id:  c.id,
              available_slots: slots.slice(0, 3),
              bio:           `Verified counselor. ${c.total_sessions} sessions completed. Contact: ${c.email}`,
              call_types:    ["audio","video"],
              avatar:        c.full_name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
              color:         colors[i % colors.length],
              price:         "Free",
              verified:      true,
              phone:         c.phone,
            };
          });
        setLiveCounselors(mapped);
      })
      .catch(() => {});
      loadAppointments();
      }, [loadAppointments]);

  /* ── Government: filter helplines ────────────────────────────────────────── */
  const filteredGov = govFilter === "All"
    ? GOV_HELPLINES
    : GOV_HELPLINES.filter(h => h.category === govFilter);

  /* ── Personal: quick call (skip appointment) ─────────────────────────── */
  const quickCall = async (callType) => {
    if (!user) { toast.error("Please log in first"); navigate("/login"); return; }
    setStarting(callType);
    try {
      const res = await sessionsAPI.create(callType);
      navigate(`/counseling/call/${res.data.room_id}?type=${callType}`);
    } catch {
      toast.error("Failed to start session. Try again.");
    } finally { setStarting(null); }
  };

  /* ── Personal: book appointment ─────────────────────────────────────────── */
  const bookAppointment = (counselor) => {
    if (!user) { toast.error("Please log in to book"); navigate("/login"); return; }
    setSelectedCounselor(counselor);
    setChosenSlot(counselor.available_slots[0]);
    setChosenCallType(counselor.call_types[0]);
    setBookingStep("book");
  };

  const confirmBooking = async () => {
    if (!selectedCounselor || !chosenSlot || !chosenDate) {
      toast.error("Please select date, time, and session type");
      return;
    }

    const dt = applySlotToDate(labelToDate(chosenDate), chosenSlot);
    if (!dt) {
      toast.error("Invalid time slot selected");
      return;
    }

    setBookingSaving(true);
    try {
      const payload = {
        call_type: chosenCallType,
        scheduled_for: dt.toISOString(),
        topic: `Counseling with ${selectedCounselor.name}`,
        notes: `Preferred date: ${chosenDate}; Preferred slot: ${chosenSlot}; Counselor: ${selectedCounselor.name}; Mode: ${chosenCallType}`,
      };
      if (selectedCounselor.counselor_id) {
        payload.counselor_id = selectedCounselor.counselor_id;
      }

      const res = await sessionsAPI.create(payload);
      const booked = { ...res.data, counselor: selectedCounselor };
      setConfirmedAppt(booked);
      setAppointments((prev) => [booked, ...prev]);
      loadAppointments();
      setBookingStep("confirmed");
      toast.success(`Appointment booked with ${selectedCounselor.name}!`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to book appointment");
    } finally {
      setBookingSaving(false);
    }
  };

  const startBookedCall = async () => {
    if (!user || !confirmedAppt?.room_id) { navigate("/login"); return; }
    setCallLoading(true);
    try {
      navigate(`/counseling/call/${confirmedAppt.room_id}?type=${confirmedAppt.call_type || chosenCallType}`);
    } finally {
      setCallLoading(false);
    }
  };

  const joinAppointment = (appt) => {
    if (!appt?.room_id) return;

    const isAccepted = appt.status === "appointment_accepted";
    const canStart = appt.can_start === true || !appt.scheduled_for || (new Date(appt.scheduled_for).getTime() <= Date.now());
    if (isAccepted && !canStart) {
      toast.error("This appointment is accepted, but the scheduled time has not arrived yet.");
      return;
    }

    navigate(`/counseling/call/${appt.room_id}?type=${appt.call_type || "video"}`);
  };

  const cancelAppointment = async (roomId) => {
    try {
      await sessionsAPI.cancel(roomId);
      setAppointments((prev) => prev.map((a) => (a.room_id === roomId ? { ...a, status: "cancelled" } : a)));
      loadAppointments();
      toast.success("Appointment cancelled");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to cancel appointment");
    }
  };

  /* ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-3xl mx-auto pb-24">

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-pink-600 to-rose-500 px-5 pt-8 pb-6 rounded-b-3xl mb-0">
        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute top-12 -right-2 w-16 h-16 rounded-full bg-white/5" />
        <div className="relative text-center">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FiHeart className="text-white text-2xl" />
          </div>
          <h1 className="text-white text-2xl font-extrabold">Counseling & Support</h1>
          <p className="text-white/70 text-sm mt-1">
            Government helplines & personal counselors — you're not alone
          </p>
        </div>

        {/* Main Tabs */}
        <div className="relative mt-5 bg-white/15 rounded-2xl p-1 flex gap-1">
          {[
            { key: "government", label: "🏛️ Government", desc: "Helplines & services" },
            { key: "personal",   label: "👩‍💼 Personal",   desc: "Book a counselor" },
          ].map(t => (
            <button key={t.key} onClick={() => { setMainTab(t.key); setBookingStep("list"); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mainTab === t.key
                  ? "bg-white text-primary-700 shadow-md"
                  : "text-white/80 hover:text-white"
              }`}>
              {t.label}
              <span className={`block text-[9px] font-normal mt-0.5 ${mainTab===t.key?"text-primary-500":"text-white/50"}`}>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* ══════════════════════════════════════════════════════════════
            GOVERNMENT TAB
        ══════════════════════════════════════════════════════════════ */}
        {mainTab === "government" && (
          <>
            {/* Info banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <FiShield className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-amber-800 font-semibold text-sm">Free Government Services</p>
                <p className="text-amber-700 text-xs mt-0.5">All helplines below are free, government-run, and available to all citizens. No registration needed.</p>
              </div>
            </div>

            {/* Category filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {GOV_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setGovFilter(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                    govFilter === cat
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
                  }`}>
                  {cat}
                </button>
              ))}
            </div>

            {/* Helpline cards */}
            <div className="space-y-3">
              {filteredGov.map(h => (
                <div key={h.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition">
                  {/* Header strip */}
                  <div className={`bg-gradient-to-r ${h.color} px-4 py-3 flex items-center gap-3`}>
                    <span className="text-2xl">{h.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{h.name}</p>
                      <p className="text-white/70 text-xs">{h.category}</p>
                    </div>
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                      {h.available}
                    </span>
                  </div>
                  {/* Body */}
                  <div className="px-4 py-3">
                    <p className="text-gray-600 text-xs leading-relaxed mb-3">{h.desc}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={`tel:${h.number.replace(/\D/g,"")}`}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition active:scale-95">
                        <FiPhone size={13} /> {h.number}
                      </a>
                      {h.website && (
                        <a href={h.website} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 text-primary-600 text-xs font-semibold border border-primary-200 px-3 py-2 rounded-xl hover:bg-primary-50 transition">
                          <FiExternalLink size={12} /> Website
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Extra from backend */}
            {extraResources.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">More Resources</p>
                <div className="space-y-2">
                  {extraResources.map(r => (
                    <div key={r.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                      <p className="font-semibold text-gray-800 text-sm">{r.title}</p>
                      <p className="text-gray-500 text-xs mt-1">{r.description}</p>
                      {r.contact && (
                        <a href={`tel:${r.contact.replace(/\D/g,"")}`}
                          className="inline-flex items-center gap-1.5 mt-2 text-green-700 text-xs font-semibold">
                          <FiPhone size={11}/> {r.contact}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PERSONAL TAB
        ══════════════════════════════════════════════════════════════ */}
        {mainTab === "personal" && (
          <>
            {/* ── STEP: CONFIRMED Appointment ─────────────────────────── */}
            {bookingStep === "confirmed" && confirmedAppt && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl p-6 text-white text-center shadow-xl">
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <FiCheckCircle className="text-white text-3xl" />
                  </div>
                  <h2 className="text-xl font-extrabold mb-1">Appointment Confirmed!</h2>
                  <p className="text-green-100 text-sm">Your session is booked and ready</p>

                  <div className="mt-5 bg-white/15 rounded-2xl p-4 text-left space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-100">Counselor</span>
                      <span className="font-bold">{confirmedAppt.counselor?.name || confirmedAppt.counselor_name || "Assigned Counselor"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-100">Date</span>
                      <span className="font-bold">{confirmedAppt.scheduled_for ? new Date(confirmedAppt.scheduled_for).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "Today"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-100">Time</span>
                      <span className="font-bold">{confirmedAppt.scheduled_for ? new Date(confirmedAppt.scheduled_for).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "Now"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-100">Type</span>
                      <span className="font-bold capitalize flex items-center gap-1">
                        {(confirmedAppt.call_type || chosenCallType) === "video" ? <FiVideo size={13}/> : <FiMic size={13}/>}
                        {confirmedAppt.call_type || chosenCallType} Call
                      </span>
                    </div>
                  </div>
                </div>

                {/* Start call now */}
                <div className="card">
                  <p className="text-gray-700 font-semibold text-sm text-center mb-4">Ready to connect?</p>
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={startBookedCall} disabled={callLoading}
                      className="flex flex-col items-center gap-2 bg-gradient-to-b from-primary-500 to-primary-700 text-white font-bold py-4 rounded-2xl transition active:scale-95 disabled:opacity-60">
                      {callLoading
                        ? <FiLoader className="animate-spin" size={20}/>
                        : ((confirmedAppt.call_type || chosenCallType) === "video" ? <FiVideo size={20}/> : <FiMic size={20}/>)
                      }
                      <span className="text-sm">Join Scheduled Call</span>
                    </button>
                  </div>
                  <button onClick={() => { setBookingStep("list"); setConfirmedAppt(null); setSelectedCounselor(null); }}
                    className="w-full mt-3 py-3 text-gray-500 text-sm font-medium border border-gray-200 rounded-2xl hover:bg-gray-50 transition">
                    Back to Counselors
                  </button>
                </div>

                {/* Tips while waiting */}
                <div className="card bg-blue-50 border-blue-100">
                  <p className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2"><FiAlertCircle size={13}/> Before your session</p>
                  <ul className="text-xs text-blue-700 space-y-1.5">
                    {["Find a quiet, private space","Ensure stable internet connection","Have paper & pen to take notes","You may record the session with consent"].map((t,i)=>(
                      <li key={i} className="flex items-start gap-2"><FiCheckCircle size={10} className="mt-0.5 flex-shrink-0 text-blue-500"/>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ── STEP: BOOKING FORM ───────────────────────────────────── */}
            {bookingStep === "book" && selectedCounselor && (
              <div className="space-y-4">
                {/* Counselor mini card */}
                <div className="card flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedCounselor.color} flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0`}>
                    {selectedCounselor.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800">{selectedCounselor.name}</p>
                    <p className="text-gray-500 text-xs">{selectedCounselor.specialization}</p>
                    <p className="text-gray-400 text-xs">{selectedCounselor.experience} experience</p>
                  </div>
                  <button onClick={() => setBookingStep("list")} className="p-2 text-gray-400 hover:text-gray-600">
                    <FiX size={18}/>
                  </button>
                </div>

                {/* Date picker (simple) */}
                <div className="card">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Date</p>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {["Today", "Tomorrow", "In 2 days", "In 3 days", "In 4 days"].map(d => (
                      <button key={d} onClick={() => setChosenDate(d)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                          chosenDate === d
                            ? "bg-primary-600 text-white border-primary-600"
                            : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
                        }`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time slot picker */}
                <div className="card">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Select Time Slot</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedCounselor.available_slots.map(slot => (
                      <button key={slot} onClick={() => setChosenSlot(slot)}
                        className={`py-3 rounded-xl text-sm font-bold transition border ${
                          chosenSlot === slot
                            ? "bg-primary-600 text-white border-primary-600 shadow-md"
                            : "bg-white text-gray-700 border-gray-200 hover:border-primary-300"
                        }`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Call type picker */}
                <div className="card">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Session Type</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedCounselor.call_types.includes("video") && (
                      <button onClick={() => setChosenCallType("video")}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition ${
                          chosenCallType === "video"
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-primary-300"
                        }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${chosenCallType==="video"?"bg-primary-600":"bg-gray-100"}`}>
                          <FiVideo className={chosenCallType==="video"?"text-white":"text-gray-500"} size={18}/>
                        </div>
                        <div className="text-left">
                          <p className={`font-bold text-sm ${chosenCallType==="video"?"text-primary-700":"text-gray-700"}`}>Video Call</p>
                          <p className="text-xs text-gray-400">Face to face</p>
                        </div>
                      </button>
                    )}
                    {selectedCounselor.call_types.includes("audio") && (
                      <button onClick={() => setChosenCallType("audio")}
                        className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition ${
                          chosenCallType === "audio"
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-emerald-300"
                        }`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${chosenCallType==="audio"?"bg-emerald-600":"bg-gray-100"}`}>
                          <FiMic className={chosenCallType==="audio"?"text-white":"text-gray-500"} size={18}/>
                        </div>
                        <div className="text-left">
                          <p className={`font-bold text-sm ${chosenCallType==="audio"?"text-emerald-700":"text-gray-700"}`}>Voice Call</p>
                          <p className="text-xs text-gray-400">Audio only</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Confirm button */}
                <button onClick={confirmBooking} disabled={bookingSaving}
                  className="w-full bg-gradient-to-r from-primary-600 to-rose-500 text-white font-extrabold py-4 rounded-2xl shadow-lg transition active:scale-95 text-base disabled:opacity-60">
                  {bookingSaving ? "Booking..." : "✓ Confirm Appointment"}
                </button>
                <button onClick={() => setBookingStep("list")} className="w-full py-3 text-gray-400 text-sm">
                  Cancel
                </button>
              </div>
            )}

            {/* ── STEP: COUNSELOR LIST ─────────────────────────────────── */}
            {bookingStep === "list" && (
              <>
                {/* Counselor Management (if user is a counselor) */}
                {user?.role === "counselor" && (
                  <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl p-5 text-white shadow-xl mb-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FiPhone size={18} className="text-white"/>
                      </div>
                      <div className="flex-1">
                        <h2 className="font-extrabold text-base">Your Appointments</h2>
                        <p className="text-white/70 text-xs mt-0.5">Manage appointment requests from users</p>
                      </div>
                    </div>
                    <button onClick={() => navigate("/counseling/appointments")}
                      className="w-full flex items-center justify-center gap-2 bg-white text-purple-700 font-bold py-3 rounded-xl transition active:scale-95 hover:shadow-lg">
                      <FiCalendar size={16}/>
                      <span>View Pending Appointments</span>
                      <FiChevronRight size={16}/>
                    </button>
                  </div>
                )}

                {/* Book Structured Appointment Button */}
                {user?.role !== "counselor" && (
                  <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-3xl p-5 text-white shadow-xl mb-4">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FiCalendar size={18} className="text-white"/>
                      </div>
                      <div className="flex-1">
                        <h2 className="font-extrabold text-base">Schedule an Appointment</h2>
                        <p className="text-white/70 text-xs mt-0.5">Book a specific time with a counselor you choose</p>
                      </div>
                    </div>
                    <button onClick={() => navigate("/counseling/appointment")}
                      className="w-full flex items-center justify-center gap-2 bg-white text-indigo-700 font-bold py-3 rounded-xl transition active:scale-95 hover:shadow-lg">
                      <FiCheckCircle size={16}/>
                      <span>Book Appointment</span>
                      <FiChevronRight size={16}/>
                    </button>
                  </div>
                )}

                {/* Quick call banner */}
                <div className="bg-gradient-to-br from-primary-600 to-rose-600 rounded-3xl p-5 text-white shadow-xl">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FiUsers size={18} className="text-white"/>
                    </div>
                    <div>
                      <h2 className="font-extrabold text-base">Talk to a Counselor Now</h2>
                      <p className="text-white/70 text-xs mt-0.5">Connect instantly — no appointment needed</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => quickCall("audio")} disabled={!!starting}
                      className="flex-1 flex items-center justify-center gap-2 bg-white text-primary-700 font-bold py-3 rounded-xl transition active:scale-95 disabled:opacity-60">
                      {starting === "audio" ? <FiLoader className="animate-spin" size={16}/> : <FiMic size={16}/>}
                      <span className="text-sm">Quick Voice</span>
                    </button>
                    <button onClick={() => quickCall("video")} disabled={!!starting}
                      className="flex-1 flex items-center justify-center gap-2 bg-white/20 border border-white/40 text-white font-bold py-3 rounded-xl transition active:scale-95 disabled:opacity-60">
                      {starting === "video" ? <FiLoader className="animate-spin" size={16}/> : <FiVideo size={16}/>}
                      <span className="text-sm">Quick Video</span>
                    </button>
                  </div>
                  <div className="mt-3 flex gap-4 text-xs text-white/60 justify-center">
                    <span>🔒 Private & secure</span>
                    <span>⚡ Instant connect</span>
                    <span>🆓 100% free</span>
                  </div>
                </div>

                {/* My appointments */}
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
                      <FiCalendar size={14} /> My Appointments
                    </p>
                    <button onClick={loadAppointments} className="text-xs text-gray-400 hover:text-gray-600">
                      Refresh
                    </button>
                  </div>
                  {appointments.length === 0 ? (
                    <p className="text-xs text-gray-400">No appointments booked yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {appointments.slice(0, 6).map((a) => (
                        <div key={a.room_id} className="border border-gray-100 rounded-2xl p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800 truncate">{a.topic || "Counseling Appointment"}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              a.status === "waiting" || a.status === "appointment_pending"
                                ? "bg-amber-100 text-amber-700"
                                : a.status === "active" || a.status === "appointment_accepted"
                                ? "bg-emerald-100 text-emerald-700"
                                : a.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : a.status === "rejected"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>{a.status}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            Counselor: {a.counselor_name || a.counselor?.name || "Any available counselor"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {a.scheduled_for
                              ? new Date(a.scheduled_for).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                              : "Immediate session"}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            {(a.status === "waiting" || a.status === "active" || a.status === "appointment_accepted") && (
                              <button
                                onClick={() => joinAppointment(a)}
                                disabled={a.status === "appointment_accepted" && !(a.can_start === true || !a.scheduled_for || (new Date(a.scheduled_for).getTime() <= Date.now()))}
                                className="text-xs bg-primary-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-primary-700"
                              >
                                Join
                              </button>
                            )}
                            {(a.status === "waiting" || a.status === "appointment_pending" || a.status === "appointment_accepted") && (
                              <button
                                onClick={() => cancelAppointment(a.room_id)}
                                className="text-xs border border-red-200 text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Counselor list */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-gray-800 text-sm">Available Counselors</p>
                    <p className="text-xs text-gray-400">{TODAY}</p>
                  </div>

                  {/* Live (admin-created) counselors shown first */}
                  {liveCounselors.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FiCheckCircle size={10}/> Verified Counselors (Admin Assigned)
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {[...liveCounselors, ...PERSONAL_COUNSELORS].map(c => (
                      <div key={c.id} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition">
                        {/* Top */}
                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0`}>
                              {c.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-extrabold text-gray-800 text-sm">{c.name}</p>
                                  <p className="text-gray-500 text-xs">{c.specialization}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                                    {c.price}
                                  </span>
                                  {c.verified && (
                                    <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-0.5">
                                      <FiCheckCircle size={8}/> Verified
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="flex items-center gap-0.5 text-amber-500 text-xs font-bold">
                                  <FiStar size={11}/> {c.rating}
                                  <span className="text-gray-400 font-normal ml-0.5">({c.reviews})</span>
                                </span>
                                <span className="text-gray-300">·</span>
                                <span className="text-gray-400 text-xs">{c.experience}</span>
                              </div>
                            </div>
                          </div>

                          <p className="text-gray-500 text-xs leading-relaxed mb-1">{c.bio}</p>
                          {c.phone && (
                            <a href={`tel:${c.phone.replace(/\D/g,'')}`} className="flex items-center gap-1 text-green-700 text-xs font-semibold mb-3">
                              <FiPhone size={11}/> {c.phone}
                            </a>
                          )}
                          {!c.phone && <div className="mb-3" />}

                          {/* Languages */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {c.languages.map(l => (
                              <span key={l} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{l}</span>
                            ))}
                            <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                              {c.call_types.includes("video") && <><FiVideo size={9}/> Video</>}
                              {c.call_types.length > 1 && " · "}
                              {c.call_types.includes("audio") && <><FiMic size={9}/> Voice</>}
                            </span>
                          </div>

                          {/* Available slots preview */}
                          <div className="flex items-center gap-1.5 mb-4">
                            <FiClock size={11} className="text-gray-400"/>
                            <span className="text-xs text-gray-500 font-medium">Today's slots:</span>
                            {c.available_slots.slice(0, 3).map(s => (
                              <span key={s} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{s}</span>
                            ))}
                          </div>

                          {/* Actions */}
                          <button onClick={() => bookAppointment(c)}
                            className={`w-full bg-gradient-to-r ${c.color} text-white font-bold py-3 rounded-2xl transition active:scale-95 flex items-center justify-center gap-2 text-sm`}>
                            <FiCalendar size={14}/> Book Appointment
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* How personal counseling works */}
                <div className="card bg-blue-50 border-blue-100">
                  <p className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2"><FiBook size={13}/> How Personal Counseling Works</p>
                  <ol className="space-y-2">
                    {[
                      ["Choose a counselor", "Browse profiles, specializations, and ratings"],
                      ["Book a time slot", "Select your preferred date, time, and call type"],
                      ["Get confirmed", "Your appointment is instantly confirmed"],
                      ["Join the call", "Start voice or video call at the scheduled time"],
                    ].map(([title, desc], i) => (
                      <li key={i} className="flex items-start gap-3 text-xs text-blue-700">
                        <span className="w-5 h-5 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-[10px]">{i+1}</span>
                        <div>
                          <span className="font-semibold">{title}</span>
                          <span className="text-blue-500 ml-1">— {desc}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

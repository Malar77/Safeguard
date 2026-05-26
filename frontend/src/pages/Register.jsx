import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI, familyAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { FiShield, FiUser, FiUsers, FiHeart, FiCheck, FiChevronRight, FiChevronLeft, FiSearch, FiArrowRight } from "react-icons/fi";

const ROLES = [
  {
    role: "women",
    emoji: "👩",
    label: "Woman",
    tagline: "I need personal safety tools",
    color: "from-pink-500 to-rose-600",
    lightBg: "bg-pink-50",
    border: "border-pink-400",
    textColor: "text-pink-700",
    features: [
      "🆘 One-tap SOS emergency alert",
      "📍 Live GPS location sharing",
      "🎥 Auto live video sent to guardians",
      "📝 Report incidents anonymously",
      "⚖️ Know your legal rights",
      "💬 Counseling & shelter finder",
      "🗺️ Safe routes near you",
      "📞 Emergency helplines",
    ],
    desc: "Full access to all safety features. Report incidents, trigger SOS alerts with live location, and connect with support services.",
  },
  {
    role: "child",
    emoji: "🧒",
    label: "Child / Minor",
    tagline: "I am under 18 or a student",
    color: "from-blue-500 to-indigo-600",
    lightBg: "bg-blue-50",
    border: "border-blue-400",
    textColor: "text-blue-700",
    features: [
      "🆘 One-tap SOS emergency alert",
      "📍 Live GPS to linked guardian",
      "🎥 Auto live video to guardian on SOS",
      "📝 Report incidents safely",
      "🔗 Link to a parent/guardian",
      "📞 Emergency helplines",
      "💬 Counseling resources",
      "🛡️ Child safety guides",
    ],
    desc: "Trigger SOS and instantly alert your linked parent/guardian with live location and live video. Stay safe with guardian monitoring.",
  },
  {
    role: "parent",
    emoji: "👨‍👩‍👧",
    label: "Parent / Guardian",
    tagline: "I want to monitor my child's safety",
    color: "from-purple-500 to-violet-600",
    lightBg: "bg-purple-50",
    border: "border-purple-400",
    textColor: "text-purple-700",
    features: [
      "🔔 Instant SOS alert notifications",
      "📍 Live GPS location of ward",
      "🎥 Automatic live video on every SOS",
      "🗂️ Full SOS alert history",
      "👥 Monitor multiple children",
      "🔗 Accept ward link requests",
      "📊 Incident reports from ward",
      "🛡️ Guardian safety dashboard",
    ],
    desc: "Receive instant alerts with live GPS and live video the moment your linked child/ward triggers an SOS. Full monitoring dashboard.",
  },
];

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = pick role, 2 = fill form, 3 = link family
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  
  // Step 3: Family linking
  const [familyEmail, setFamilyEmail] = useState("");
  const [familySearchLoading, setFamilySearchLoading] = useState(false);
  const [familyFound, setFamilyFound] = useState(null); // { id, full_name, email, role }
  const [linkingUser, setLinkingUser] = useState(null); // Logged-in user data

  const getErrorMessage = (err) => {
    // Network/timeout errors
    if (err.message === "Network Error") return "Network error - Check your internet connection";
    if (err.code === "ECONNABORTED") return "Request timed out - Server not responding";
    if (!err.response) {
      console.error("No response received:", err.message);
      return `Connection error: ${err.message || "Cannot reach server"}`;
    }
    
    // HTTP error responses
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (typeof d === "string" ? d : d?.msg || JSON.stringify(d)))
        .join(", ");
    }
    if (detail && typeof detail === "object") {
      return detail.message || JSON.stringify(detail);
    }
    
    // Default error message with status code
    const status = err.response?.status;
    return `Error (${status}): ${err.response?.statusText || "Registration failed"}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Frontend validation
    if (!form.full_name.trim()) return toast.error("Full name is required");
    if (!form.email.trim()) return toast.error("Email is required");
    if (form.phone && form.phone.length < 10) return toast.error("Phone must be at least 10 digits");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (form.password !== form.confirm) return toast.error("Passwords do not match");
    
    setLoading(true);
    try {
      const res = await authAPI.register({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        role: selectedRole.role,
      });
      // Login but don't navigate yet - go to Step 3 (family linking)
      login(res.data.access_token, res.data.user);
      setLinkingUser(res.data.user);
      setStep(3); // Move to family linking step
      toast.success(`Welcome to SafeGuard, ${form.full_name.split(" ")[0]}! 🎉`);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error("Registration error:", err, "Message:", errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Search for parent/child by email
  const handleSearchFamily = async () => {
    if (!familyEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setFamilySearchLoading(true);
    try {
      // Query the backend to find this user
      const res = await authAPI.searchUser(familyEmail.trim());
      if (res.data.user) {
        setFamilyFound(res.data.user);
        toast.success(`Found ${res.data.user.full_name}!`);
      } else {
        setFamilyFound(null);
        toast.error("User not found. Check email and try again.");
      }
    } catch (err) {
      setFamilyFound(null);
      toast.error("User not found");
    } finally {
      setFamilySearchLoading(false);
    }
  };

  // Send family link request
  const handleSendLinkRequest = async () => {
    if (!familyFound) return;

    setFamilySearchLoading(true);
    try {
      await familyAPI.requestLink(familyFound.email);
      toast.success(`Link request sent to ${familyFound.full_name}!`);
      // Navigate to dashboard
      navigate(selectedRole.role === "parent" ? "/parent-dashboard" : "/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to send link request");
    } finally {
      setFamilySearchLoading(false);
    }
  };

  // Skip family linking
  const handleSkipLinking = () => {
    navigate(selectedRole.role === "parent" ? "/parent-dashboard" : "/dashboard");
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /* ── STEP 1: Role Selection ── */
  if (step === 1) {
    return (
      <div className="px-4 py-5">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <FiShield className="text-white text-2xl" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Join SafeGuard</h1>
          <p className="text-gray-500 text-sm mt-1">First, tell us who you are</p>
        </div>

        {/* Role Cards */}
        <div className="space-y-3 mb-6">
          {ROLES.map((r) => (
            <button
              key={r.role}
              type="button"
              onClick={() => setSelectedRole(r)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all active:scale-95 ${
                selectedRole?.role === r.role
                  ? `${r.border} ${r.lightBg}`
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Emoji avatar */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center text-2xl flex-shrink-0 shadow`}>
                  {r.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-[15px]">{r.label}</span>
                    {selectedRole?.role === r.role && (
                      <span className={`w-5 h-5 rounded-full bg-gradient-to-br ${r.color} flex items-center justify-center flex-shrink-0`}>
                        <FiCheck className="text-white text-xs" />
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">{r.tagline}</p>
                </div>
                <FiChevronRight className="text-gray-300 flex-shrink-0" />
              </div>

              {/* Feature list — shown when selected */}
              {selectedRole?.role === r.role && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">{r.desc}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {r.features.map((f, i) => (
                      <div key={i} className="text-xs text-gray-700 flex items-start gap-1">
                        <span className="leading-4">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!selectedRole}
          onClick={() => setStep(2)}
          className={`w-full py-3.5 rounded-2xl font-bold text-white text-base transition-all active:scale-95 ${
            selectedRole
              ? `bg-gradient-to-r ${selectedRole.color} shadow-lg`
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {selectedRole ? `Continue as ${selectedRole.label}` : "Select your account type"}
          {selectedRole && <FiChevronRight className="inline ml-1" />}
        </button>

        <p className="text-center mt-4 text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    );
  }

  /* ── STEP 3: Family Linking (Optional) ── */
  if (step === 3) {
    return (
      <div className="px-4 py-5">
        {/* Back + role badge */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r ${selectedRole.color}`}>
            <span className="text-lg">{selectedRole.emoji}</span>
            <span className="text-white font-semibold text-sm">{selectedRole.label}</span>
          </div>
          <span className="text-gray-400 text-sm ml-auto">Step 3 of 3</span>
        </div>

        <div className="card">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiUsers className="text-blue-600 text-2xl" />
          </div>
          <h2 className="font-bold text-gray-900 text-lg mb-1 text-center">
            {selectedRole.role === "parent" ? "Find Your Children 👨‍👩‍👧" : "Link Your Guardian 🔗"}
          </h2>
          <p className="text-gray-500 text-sm mb-5 text-center">
            {selectedRole.role === "parent"
              ? "Search for your child/ward to link them. You'll receive their SOS alerts."
              : "Search for your parent/guardian so they get your SOS alerts with location & live video."}
          </p>

          {/* Search form */}
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {selectedRole.role === "parent" ? "Child/Ward Email" : "Parent/Guardian Email"}
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  className="flex-1 input-field"
                  placeholder={selectedRole.role === "parent" ? "child@example.com" : "parent@example.com"}
                  value={familyEmail}
                  onChange={(e) => setFamilyEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearchFamily()}
                />
                <button
                  type="button"
                  onClick={handleSearchFamily}
                  disabled={familySearchLoading || !familyEmail.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition disabled:opacity-60 flex items-center gap-2"
                >
                  <FiSearch size={16} />
                  {familySearchLoading ? "Searching…" : "Search"}
                </button>
              </div>
            </div>

            {/* Search result */}
            {familyFound && (
              <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                    {familyFound.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{familyFound.full_name}</p>
                    <p className="text-xs text-gray-500">{familyFound.email}</p>
                  </div>
                  <FiCheck className="text-green-600 text-xl ml-auto" />
                </div>
                <button
                  type="button"
                  onClick={handleSendLinkRequest}
                  disabled={familySearchLoading}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition disabled:opacity-60"
                >
                  {familySearchLoading ? "Sending request…" : "Send Link Request"}
                </button>
              </div>
            )}

            {/* No result message */}
            {familyEmail && !familyFound && !familySearchLoading && (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <strong>Not found.</strong> Check the email and try again, or skip to do this later.
              </div>
            )}
          </div>

          {/* Skip button */}
          <button
            type="button"
            onClick={handleSkipLinking}
            className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            <FiArrowRight size={16} />
            Skip for Now
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            You can link family members later from your Profile or Dashboard.
          </p>
        </div>
      </div>
    );
  }

  /* ── STEP 2: Registration Form ── */
  return (
    <div className="px-4 py-5">
      {/* Back + role badge */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition active:scale-90"
        >
          <FiChevronLeft className="text-gray-600" />
        </button>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r ${selectedRole.color}`}>
          <span className="text-lg">{selectedRole.emoji}</span>
          <span className="text-white font-semibold text-sm">{selectedRole.label}</span>
        </div>
        <span className="text-gray-400 text-sm ml-auto">Step 2 of 2</span>
      </div>

      <div className="card">
        <h2 className="font-bold text-gray-900 text-lg mb-1">Create your account</h2>
        <p className="text-gray-500 text-sm mb-5">Fill in your details to get started</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" required className="input-field" placeholder="Your full name"
              value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input type="email" required className="input-field" placeholder="you@example.com"
              value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input type="tel" className="input-field" placeholder="10-digit mobile number"
              value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" required className="input-field" placeholder="At least 6 characters"
              value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input type="password" required className="input-field" placeholder="Repeat password"
              value={form.confirm} onChange={(e) => set("confirm", e.target.value)} />
          </div>

          {/* Role-specific reminder */}
          {selectedRole.role === "parent" && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-800">
              <strong>👨‍👩‍👧 Guardian Reminder:</strong> After registering, ask your child/ward to link to you via their Profile → Family Settings. You'll then receive their SOS alerts.
            </div>
          )}
          {selectedRole.role === "child" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
              <strong>🔗 Link Your Guardian:</strong> After registering, go to Profile → Family Settings to link your parent/guardian so they receive your SOS alerts.
            </div>
          )}
          {selectedRole.role === "women" && (
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 text-xs text-pink-800">
              <strong>🛡️ Stay Safe:</strong> Add trusted contacts in your Profile so they get notified when you trigger SOS.
            </div>
          )}

          <p className="text-xs text-gray-400">By registering you agree to our Terms of Service. Your data is kept confidential.</p>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-2xl font-bold text-white text-base transition-all active:scale-95 bg-gradient-to-r ${selectedRole.color} shadow-lg disabled:opacity-60`}
          >
            {loading ? "Creating account…" : `Create ${selectedRole.label} Account`}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

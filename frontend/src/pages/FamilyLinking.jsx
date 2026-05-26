import { useState } from "react";
import { familyAPI } from "../services/api";
import toast from "react-hot-toast";
import { FiArrowLeft, FiLink, FiMail, FiLoader, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function FamilyLinking() {
  const navigate = useNavigate();
  const [parentEmail, setParentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!parentEmail.trim()) {
      toast.error("Please enter parent's email");
      return;
    }

    if (!parentEmail.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      await familyAPI.requestLink(parentEmail);
      setSubmitted(true);
      toast.success("Link request sent! Your guardian will receive a notification.");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to send link request");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiCheckCircle size={40} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Request Sent!</h2>
        <p className="text-gray-600 mb-6">
          Your guardian will receive a notification to confirm the family link.
          Once accepted, they'll be able to see your safety alerts.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-primary-600 text-white font-bold py-3 px-6 rounded-2xl w-full"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-28 pt-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-primary-600 font-semibold mb-6"
      >
        <FiArrowLeft size={18} /> Back
      </button>

      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-gray-800">Family Linking</h1>
          <p className="text-gray-600">
            Connect with your parent or guardian so they can receive your safety alerts
          </p>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-start gap-2">
            <FiAlertCircle className="text-rose-600 mt-0.5 flex-shrink-0" size={18} />
            <div>
              <p className="font-semibold text-rose-900 text-sm">How it works</p>
              <ol className="text-xs text-rose-700 mt-2 space-y-1 list-decimal list-inside">
                <li>Enter your guardian's email address below</li>
                <li>They'll get a notification to review your request</li>
                <li>Once they accept, you'll be linked</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <p className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2">
              <FiMail size={14} /> Guardian's Email
            </p>
            <input
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
              className="w-full border-2 border-rose-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-rose-400"
            />
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 transition"
        >
          {loading ? (
            <>
              <FiLoader className="animate-spin" size={18} /> Sending...
            </>
          ) : (
            <>
              <FiLink size={18} /> Send Link Request
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Your guardian will receive a notification and can approve or decline your request
        </p>
      </div>
    </div>
  );
}

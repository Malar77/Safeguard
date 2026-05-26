import { useState, useEffect } from "react";
import { sessionsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiUser,
  FiFileText,
  FiCheckCircle,
  FiLoader,
  FiAlertCircle,
} from "react-icons/fi";

const AppointmentBooking = ({ counselorId: initialCounselorId, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [counselors, setCounselors] = useState([]);
  const [selectedCounselor, setSelectedCounselor] = useState(initialCounselorId || null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    scheduled_for: "",
    topic: "",
    notes: "",
  });

  useEffect(() => {
    fetchCounselors();
  }, []);

  const fetchCounselors = async () => {
    try {
      setLoading(true);
      const response = await sessionsAPI.listCounselors();
      setCounselors(response.data);
    } catch (error) {
      console.error("Error fetching counselors:", error);
      toast.error("Failed to load counselors");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCounselor) {
      toast.error("Please select a counselor");
      return;
    }

    if (!formData.scheduled_for) {
      toast.error("Please select an appointment date and time");
      return;
    }

    if (!formData.topic || formData.topic.trim().length < 5) {
      toast.error("Please provide a topic (at least 5 characters)");
      return;
    }

    // Validate appointment time is not in the past
    const appointmentTime = new Date(formData.scheduled_for);
    if (appointmentTime <= new Date()) {
      toast.error("Appointment time must be in the future");
      return;
    }

    try {
      setSubmitting(true);
      const response = await sessionsAPI.bookAppointment({
        counselor_id: selectedCounselor,
        scheduled_for: formData.scheduled_for,
        topic: formData.topic.trim(),
        notes: formData.notes.trim() || null,
      });

      if (response.status === 200 || response.status === 201) {
        toast.success(
          "Appointment request sent! The counselor will respond shortly."
        );
        if (onClose) {
          onClose();
        } else {
          navigate("/counseling");
        }
      }
    } catch (error) {
      console.error("Error booking appointment:", error);
      const errorMessage =
        error.response?.data?.detail || error.message || "Failed to book appointment";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <FiLoader className="text-4xl text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading counselors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4 transition-colors"
            >
              <FiArrowLeft size={20} />
              Back
            </button>
          )}
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Book a Counseling Appointment
          </h1>
          <p className="text-gray-600">
            Schedule a one-on-one session with a professional counselor
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Select Counselor */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiUser className="text-indigo-600" />
                Select a Counselor
              </h2>

              {counselors.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <FiAlertCircle className="text-blue-600 flex-shrink-0 mt-1" />
                  <p className="text-blue-700">
                    No counselors are currently available. Please try again later.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {counselors.map((counselor) => (
                    <div
                      key={counselor.id}
                      onClick={() => setSelectedCounselor(counselor.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCounselor === counselor.id
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-200 bg-gray-50 hover:border-indigo-400"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {counselor.full_name}
                          </h3>
                          <p className="text-sm text-gray-600">{counselor.email}</p>
                          {counselor.phone && (
                            <p className="text-sm text-gray-600">{counselor.phone}</p>
                          )}
                        </div>
                        {selectedCounselor === counselor.id && (
                          <FiCheckCircle className="text-indigo-600 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span>📊 {counselor.total_sessions} sessions</span>
                        {counselor.active_now && (
                          <span className="text-green-600 font-semibold">● Available</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Appointment Details */}
            {selectedCounselor && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FiCalendar className="text-indigo-600" />
                  Appointment Details
                </h2>

                <div className="space-y-4">
                  {/* Date & Time */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="scheduled_for"
                      value={formData.scheduled_for}
                      onChange={handleInputChange}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Select a future date and time for your appointment
                    </p>
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Topic of Discussion <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="topic"
                      value={formData.topic}
                      onChange={handleInputChange}
                      placeholder="e.g., Stress management, Relationship issues, Work anxiety"
                      maxLength="200"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.topic.length}/200 characters
                    </p>
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Share any additional context or concerns (optional)"
                      maxLength="1000"
                      rows="4"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all resize-vertical"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.notes.length}/1000 characters
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-700">
                ℹ️ Once you submit your appointment request, the counselor will review it and
                send a notification confirming or declining the appointment. You'll receive
                a notification with their response.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !selectedCounselor}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <FiLoader className="animate-spin" /> Booking...
                </>
              ) : (
                <>
                  <FiCheckCircle /> Book Appointment
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;

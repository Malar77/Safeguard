import { useState, useEffect } from "react";
import { sessionsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiX,
  FiLoader,
  FiAlertCircle,
  FiPhoneIncoming,
} from "react-icons/fi";

const CounselorAppointments = ({ onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filter, setFilter] = useState("pending"); // pending, accepted, all

  useEffect(() => {
    fetchAppointments();
    // Poll for new appointments every 30 seconds
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const [pendingRes, allRes] = await Promise.all([
        sessionsAPI.pendingAppointments(),
        sessionsAPI.myAppointments(),
      ]);
      setPendingAppointments(pendingRes.data || []);
      setAllAppointments(allRes.data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToAppointment = async (roomId, action, reason = "") => {
    try {
      const response = await sessionsAPI.respondToAppointment(roomId, {
        action: action,
        response_notes: reason || null,
      });

      if (response.status === 200) {
        toast.success(`Appointment ${action}ed successfully!`);
        if (action === "accept") {
          toast.success(`The user will be notified to join the call at the scheduled time.`);
        }
        setRespondingTo(null);
        setRejectReason("");
        fetchAppointments();
      }
    } catch (error) {
      console.error(`Error ${action}ing appointment:`, error);
      const errorMessage =
        error.response?.data?.detail || `Failed to ${action} appointment`;
      toast.error(errorMessage);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      appointment_pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      appointment_accepted: "bg-green-100 text-green-800 border-green-300",
      active: "bg-blue-100 text-blue-800 border-blue-300",
      ended: "bg-gray-100 text-gray-800 border-gray-300",
      rejected: "bg-red-100 text-red-800 border-red-300",
      cancelled: "bg-orange-100 text-orange-800 border-orange-300",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const canStartAppointment = (appointment) => {
    if (!appointment || appointment.status !== "appointment_accepted") return false;
    if (appointment.can_start === true) return true;
    if (!appointment.scheduled_for) return true;
    return new Date(appointment.scheduled_for).getTime() <= Date.now();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="text-center">
          <FiLoader className="text-4xl text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  const displayAppointments = {
    pending: pendingAppointments,
    accepted: allAppointments.filter((a) => a.status === "appointment_accepted"),
    all: allAppointments,
  }[filter];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-800 mb-4 transition-colors"
            >
              <FiArrowLeft size={20} />
              Back
            </button>
          )}
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Appointment Requests
          </h1>
          <p className="text-gray-600">
            Manage your incoming counseling appointment requests
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-4 mb-8">
          {[
            { key: "pending", label: "Pending", icon: <FiClock /> },
            { key: "accepted", label: "Accepted", icon: <FiCheckCircle /> },
            { key: "all", label: "All", icon: "📋" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                filter === tab.key
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {typeof tab.icon === "string" ? tab.icon : tab.icon}
              {tab.label}
              {tab.key === "pending" && pendingAppointments.length > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                  {pendingAppointments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Appointments List */}
        <div className="space-y-6">
          {displayAppointments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <FiAlertCircle className="text-4xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                No {filter !== "all" ? filter + " " : ""}appointments found
              </p>
              {filter === "pending" && (
                <p className="text-sm text-gray-500 mt-2">
                  You'll see incoming appointment requests here
                </p>
              )}
            </div>
          ) : (
            displayAppointments.map((appointment) => (
              <div
                key={appointment.room_id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {appointment.user_name}
                      </h3>
                      <p className="text-sm text-gray-600">{appointment.user_email}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(
                        appointment.status
                      )}`}
                    >
                      {appointment.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-start gap-3">
                      <FiCalendar className="text-purple-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Scheduled For</p>
                        <p className="font-semibold text-gray-900">
                          {formatDateTime(appointment.scheduled_for)}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Topic</p>
                      <p className="font-semibold text-gray-900">
                        {appointment.topic || "Not specified"}
                      </p>
                    </div>
                  </div>

                  {/* Notes */}
                  {appointment.notes && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">User's Notes:</p>
                      <p className="text-gray-900">{appointment.notes}</p>
                    </div>
                  )}

                  {/* Request Time */}
                  <p className="text-xs text-gray-500 mb-6">
                    Requested: {formatDateTime(appointment.created_at)}
                  </p>

                  {/* Actions */}
                  {appointment.status === "appointment_pending" && (
                    <div className="space-y-3">
                      {respondingTo === appointment.room_id ? (
                        <div className="space-y-3">
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="(Optional) Why are you declining this appointment?"
                            maxLength="500"
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-vertical"
                          />
                          <div className="flex gap-3">
                            <button
                              onClick={() =>
                                handleRespondToAppointment(
                                  appointment.room_id,
                                  "reject",
                                  rejectReason
                                )
                              }
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                              <FiX /> Decline
                            </button>
                            <button
                              onClick={() => setRespondingTo(null)}
                              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-2 px-4 rounded-lg transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              handleRespondToAppointment(
                                appointment.room_id,
                                "accept"
                              )
                            }
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                          >
                            <FiCheckCircle /> Accept
                          </button>
                          <button
                            onClick={() => setRespondingTo(appointment.room_id)}
                            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                          >
                            <FiX /> Decline
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {appointment.status === "appointment_accepted" && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="flex items-center gap-2 text-green-700 font-semibold">
                        <FiPhoneIncoming /> Ready for video call
                      </p>
                      <p className="text-sm text-green-600 mt-2">
                        The user will see your acceptance notification and can join the call
                        starting from the scheduled time.
                      </p>
                      <button
                        onClick={() => navigate(`/counseling/call/${appointment.room_id}?type=${appointment.call_type || "video"}`)}
                        disabled={!canStartAppointment(appointment)}
                        className={`mt-3 w-full font-bold py-2 px-4 rounded-lg transition-all ${
                          canStartAppointment(appointment)
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {canStartAppointment(appointment) ? "Join Call" : "Available at scheduled time"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CounselorAppointments;

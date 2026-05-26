import { useEffect, useState } from "react";
import { familyAPI } from "../services/api";
import toast from "react-hot-toast";
import { FiCheck, FiX, FiLoader, FiLink, FiMail, FiUser } from "react-icons/fi";

export default function PendingLinkRequests({ onClose }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    setLoading(true);
    try {
      const res = await familyAPI.pendingRequests();
      setLinks(res.data || []);
    } catch {
      toast.error("Failed to load pending requests");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (linkId) => {
    setActing(linkId);
    try {
      await familyAPI.accept(linkId);
      toast.success("Link accepted!");
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch {
      toast.error("Failed to accept request");
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (linkId) => {
    setActing(linkId);
    try {
      await familyAPI.reject(linkId);
      toast.success("Link rejected");
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch {
      toast.error("Failed to reject request");
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-rose-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <FiLink size={20} /> Pending Link Requests
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FiX size={20} />
          </button>
        )}
      </div>

      {links.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <FiLink size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-semibold">No pending requests</p>
          <p className="text-gray-400 text-sm">You'll see family link requests here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md transition"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <FiUser size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm">{link.child_name}</p>
                  <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                    <FiMail size={12} /> {link.child_email}
                  </p>
                  {link.child_phone && (
                    <p className="text-gray-500 text-xs mt-0.5">📱 {link.child_phone}</p>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-600 mb-4 bg-gray-50 rounded-lg p-2">
                {link.child_name} wants to link with you as a guardian. Once you accept,
                you'll receive their safety alerts.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(link.id)}
                  disabled={acting === link.id}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 text-sm transition"
                >
                  {acting === link.id ? (
                    <FiLoader className="animate-spin" size={14} />
                  ) : (
                    <>
                      <FiCheck size={14} /> Accept
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleReject(link.id)}
                  disabled={acting === link.id}
                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 text-sm transition"
                >
                  {acting === link.id ? (
                    <FiLoader className="animate-spin" size={14} />
                  ) : (
                    <>
                      <FiX size={14} /> Reject
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { notificationsAPI } from "../services/api";
import toast from "react-hot-toast";
import { FiBell, FiCheck, FiTrash2, FiCheckCircle } from "react-icons/fi";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);

  const load = () => {
    notificationsAPI.get()
      .then((r) => setNotifications(r.data))
      .catch(() => toast.error("Failed to load notifications"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((n) => n.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    } catch { toast.error("Failed to mark as read"); }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((n) => n.map((x) => ({ ...x, is_read: true })));
      toast.success("All notifications marked as read");
    } catch { toast.error("Failed to mark all as read"); }
  };

  const deleteNotif = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications((n) => n.filter((x) => x.id !== id));
    } catch { toast.error("Failed to delete"); }
  };

  const unread = notifications.filter((n) => !n.is_read).length;

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FiBell className="text-primary-600 text-3xl" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
            {unread > 0 && (
              <p className="text-sm text-primary-600 font-medium">{unread} unread</p>
            )}
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="btn-outline text-sm flex items-center gap-1.5">
            <FiCheckCircle size={14} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <FiBell className="text-5xl mx-auto mb-3 text-gray-200" />
          <p className="text-lg">No notifications yet</p>
          <p className="text-sm mt-1">You'll see updates about your incidents and alerts here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div key={n.id}
              className={`card border flex items-start gap-4 transition ${n.is_read ? "border-gray-100 opacity-75" : "border-primary-200 bg-primary-50/30"}`}>
              <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${n.is_read ? "bg-gray-300" : "bg-primary-600"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{n.title}</p>
                <p className="text-gray-600 text-sm mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)}
                    className="text-primary-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-primary-100 transition"
                    title="Mark as read">
                    <FiCheck size={14} />
                  </button>
                )}
                <button onClick={() => deleteNotif(n.id)}
                  className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
                  title="Delete">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

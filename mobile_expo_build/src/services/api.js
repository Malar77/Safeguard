import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL, API_BASE_URL_CANDIDATES } from "../config";

const API = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

// Attach JWT token to every request
API.interceptors.request.use(async (config) => {
  const candidates = API_BASE_URL_CANDIDATES?.length ? API_BASE_URL_CANDIDATES : [API_BASE_URL];
  config.__apiBaseUrlCandidates = config.__apiBaseUrlCandidates || candidates;
  config.__apiBaseUrlIndex = config.__apiBaseUrlIndex || 0;
  config.baseURL = config.__apiBaseUrlCandidates[config.__apiBaseUrlIndex] || API_BASE_URL;

  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const candidates = error.config?.__apiBaseUrlCandidates || [];
    const nextIndex = (error.config?.__apiBaseUrlIndex || 0) + 1;
    const isNetworkOrTimeout = !error.response && (
      error.code === "ECONNABORTED" ||
      error.message?.toLowerCase?.().includes("timeout") ||
      error.message?.toLowerCase?.().includes("network")
    );

    if (isNetworkOrTimeout && nextIndex < candidates.length) {
      const retryConfig = { ...error.config, __apiBaseUrlIndex: nextIndex };
      retryConfig.baseURL = candidates[nextIndex];
      return API.request(retryConfig);
    }

    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:         (data)     => API.post("/api/auth/login", data),
  register:      (data)     => API.post("/api/auth/register", data),
  me:            ()         => API.get("/api/auth/me"),
  updateProfile: (data)     => API.put("/api/auth/me", data),
  changePassword:(data)     => API.post("/api/auth/change-password", data),
  getContacts:   ()         => API.get("/api/auth/trusted-contacts"),
  addContact:    (data)     => API.post("/api/auth/trusted-contacts", data),
  updateContact: (id, data) => API.put(`/api/auth/trusted-contacts/${id}`, data),
  deleteContact: (id)       => API.delete(`/api/auth/trusted-contacts/${id}`),
};

// ─── Incidents ───────────────────────────────────────────────────────────────
export const incidentAPI = {
  report:          (data)     => API.post("/api/incidents/report", data),
  my:              ()         => API.get("/api/incidents/my"),
  all:             (params)   => API.get("/api/incidents/", { params }),
  get:             (id)       => API.get(`/api/incidents/${id}`),
  update:          (id, data) => API.patch(`/api/incidents/${id}`, data),
  deleteMyIncident:(id)       => API.delete(`/api/incidents/my/${id}`),
};

// ─── SOS ─────────────────────────────────────────────────────────────────────
export const sosAPI = {
  trigger:  (data) => API.post("/api/sos/trigger", data),
  resolve:  (id)   => API.post(`/api/sos/resolve/${id}`),
  myAlerts: ()     => API.get("/api/sos/my-alerts"),
  active:   ()     => API.get("/api/sos/active"),
};

// ─── Helplines ───────────────────────────────────────────────────────────────
export const helplineAPI = {
  list: (category) => API.get("/api/helplines/", { params: category ? { category } : {} }),
};

// ─── Legal Resources ─────────────────────────────────────────────────────────
export const legalAPI = {
  list:   (category) => API.get("/api/resources/legal", { params: category ? { category } : {} }),
  getOne: (id)       => API.get(`/api/resources/legal/${id}`),
};

// ─── Counseling Resources ────────────────────────────────────────────────────
export const counselingAPI = {
  list:   (category) => API.get("/api/counseling/", { params: category ? { category } : {} }),
  getOne: (id)       => API.get(`/api/counseling/${id}`),
};

// ─── AI Assistant ────────────────────────────────────────────────────────────
export const aiAssistantAPI = {
  chat: (payload) => API.post("/api/assistant/chat", payload),
};

// ─── Counseling Sessions ────────────────────────────────────────────────────
export const sessionsAPI = {
  listCounselors: () => API.get("/api/sessions/counselors"),
  counselorDashboard: () => API.get("/api/sessions/counselor/dashboard"),
  counselorSessions: () => API.get("/api/sessions/counselor/sessions"),
  waiting: () => API.get("/api/sessions/waiting"),
  my: () => API.get("/api/sessions/my"),
  myAppointments: () => API.get("/api/sessions/appointments/my"),
  pendingAppointments: () => API.get("/api/sessions/appointments/pending"),
  bookAppointment: (payload) => API.post("/api/sessions/appointment", payload),
  respondToAppointment: (room_id, payload) => API.post(`/api/sessions/${room_id}/respond`, payload),
  cancel: (room_id) => API.patch(`/api/sessions/${room_id}/cancel`),
  end: (room_id) => API.post(`/api/sessions/${room_id}/end`),
};

// ─── Child Safety ────────────────────────────────────────────────────────────
export const childSafetyAPI = {
  list:   (category) => API.get("/api/child-safety/", { params: category ? { category } : {} }),
  getOne: (id)       => API.get(`/api/child-safety/${id}`),
};

// ─── Safe Places ─────────────────────────────────────────────────────────────
export const safePlaceAPI = {
  list:   (params)              => API.get("/api/safe-places/", { params: params || {} }),
  nearby: (lat, lon, radius_km) => API.get("/api/safe-places/nearby", { params: { lat, lon, radius_km: radius_km || 10 } }),
  getOne: (id)                  => API.get(`/api/safe-places/${id}`),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsAPI = {
  get:         ()   => API.get("/api/notifications/"),
  unreadCount: ()   => API.get("/api/notifications/unread-count"),
  markRead:    (id) => API.patch(`/api/notifications/${id}/read`),
  markAllRead: ()   => API.patch("/api/notifications/read-all"),
  delete:      (id) => API.delete(`/api/notifications/${id}`),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminAPI = {
  stats:            ()         => API.get("/api/admin/stats"),
  users:            (params)   => API.get("/api/admin/users", { params: params || {} }),
  getUser:          (id)       => API.get(`/api/admin/users/${id}`),
  toggleUser:       (id)       => API.patch(`/api/admin/users/${id}/toggle-active`),
  updateRole:       (id, role) => API.patch(`/api/admin/users/${id}/role`, null, { params: { role } }),
  deleteUser:       (id)       => API.delete(`/api/admin/users/${id}`),
  sosAlerts:        (params)   => API.get("/api/admin/sos-alerts", { params: params || {} }),
  resolveSOS:       (id)       => API.patch(`/api/admin/sos-alerts/${id}/resolve`),
  deleteSOS:        (id)       => API.delete(`/api/admin/sos-alerts/${id}`),
  getIncidents:     (params)   => API.get("/api/admin/incidents", { params: params || {} }),
  activityLogs:     (params)   => API.get("/api/admin/activity-logs", { params: params || {} }),
  sendNotification: (data)     => API.post("/api/admin/notifications/send", data),
};

// ─── Family / Guardian ────────────────────────────────────────────────────────
export const familyAPI = {
  requestLink:     (parentEmail) => API.post("/api/family/request-link", { parent_email: parentEmail }),
  pendingRequests: ()            => API.get("/api/family/pending-requests"),
  accept:          (linkId)      => API.post(`/api/family/accept/${linkId}`),
  reject:          (linkId)      => API.post(`/api/family/reject/${linkId}`),
  unlink:          (linkId)      => API.delete(`/api/family/unlink/${linkId}`),
  myParents:       ()            => API.get("/api/family/my-parents"),
  myChildren:      ()            => API.get("/api/family/my-children"),
  allMyLinks:      ()            => API.get("/api/family/my-links"),
  sendAlert:       (data)        => API.post("/api/family/alert", data),
  getAlerts:       (params)      => API.get("/api/family/alerts", { params: params || {} }),
  unreadCount:     ()            => API.get("/api/family/alerts/unread-count"),
  markRead:        (id)          => API.patch(`/api/family/alerts/${id}/read`),
  markAllRead:     ()            => API.patch("/api/family/alerts/mark-all-read"),
  deleteAlert:     (id)          => API.delete(`/api/family/alerts/${id}`),
};

export default API;


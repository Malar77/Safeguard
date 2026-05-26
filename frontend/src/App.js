import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";

import Navbar       from "./components/Navbar";
import MobileHeader from "./components/MobileHeader";
import BottomNav    from "./components/BottomNav";

import Home          from "./pages/Home";
import Login         from "./pages/Login";
import Register      from "./pages/Register";
import Dashboard     from "./pages/Dashboard";
import SOSPage       from "./pages/SOSPage";
import ReportIncident from "./pages/ReportIncident";
import MyIncidents   from "./pages/MyIncidents";
import Helplines     from "./pages/Helplines";
import LegalResources from "./pages/LegalResources";
import Counseling    from "./pages/Counseling";
import AIAssistant   from "./pages/AIAssistant";
import ChildSafety   from "./pages/ChildSafety";
import SafeRoutes    from "./pages/SafeRoutes";
import AdminDashboard from "./pages/AdminDashboard";
import Profile        from "./pages/Profile";
import Notifications  from "./pages/Notifications";
import ParentDashboard from "./pages/ParentDashboard";
import ShareLocation from './pages/ShareLocation';
import CounselingCall       from './pages/CounselingCall';
import CounselorDashboard  from './pages/CounselorDashboard';
import FamilyLinking       from './pages/FamilyLinking';
import Diagnostics        from './pages/Diagnostics';
import AppointmentBooking from './pages/AppointmentBooking';
import CounselorAppointments from './pages/CounselorAppointments';

const isNativeAndroidWebView = () => {
  const platform = window?.Capacitor?.getPlatform?.();
  if (platform === "android") return true;

  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent || "");
};

function getDefaultRoute(user) {
  if (!user) return "/login";
  if (user.role === "admin") return "/admin";
  if (user.role === "parent") return "/parent-dashboard";
  if (user.role === "counselor") return "/counselor-dashboard";
  return "/dashboard";
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to={getDefaultRoute(user)} replace /> : children;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user)    return <Navigate to="/login"     replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function CounselorRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)                   return <Navigate to="/login"              replace />;
  if (user.role !== "counselor") return <Navigate to="/dashboard"        replace />;
  return children;
}

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !isNativeAndroidWebView()) return;

    const alreadyRequested = sessionStorage.getItem("permissions_requested_v1") === "1";
    if (alreadyRequested) return;

    const requestAppPermissions = async () => {
      try {
        const { Camera } = await import("@capacitor/camera");
        const current = await Camera.checkPermissions();
        const hasCamera = current?.camera === "granted";
        if (!hasCamera) {
          await Camera.requestPermissions({ permissions: ["camera"] });
        }
      } catch {
        // Keep app usable even if plugin call fails on non-native contexts.
      }

      try {
        await new Promise((resolve) => {
          if (!navigator.geolocation) {
            resolve();
            return;
          }
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            () => resolve(),
            { timeout: 8000, maximumAge: 0 }
          );
        });
      } catch {
        // Location permission denial is handled in feature flows.
      }

      sessionStorage.setItem("permissions_requested_v1", "1");
    };

    requestAppPermissions();
  }, [user]);

  useEffect(() => {
    if (!isNativeAndroidWebView()) return;

    const defaultRoute = getDefaultRoute(user);
    const rootLikeRoutes = new Set([defaultRoute, "/", "/dashboard", "/parent-dashboard", "/counselor-dashboard", "/admin"]);

    const listenerPromise = CapacitorApp.addListener("backButton", () => {
      const path = window.location?.pathname || location.pathname;
      if (!rootLikeRoutes.has(path)) {
        navigate(-1);
        return;
      }
      // Keep users in-app at root screens instead of closing immediately.
    });

    return () => {
      Promise.resolve(listenerPromise)
        .then((listener) => listener?.remove?.())
        .catch(() => {});
    };
  }, [location.pathname, navigate, user]);

  if (loading) return (
    <div className="app-shell items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="animate-spin rounded-full h-6 w-6 border-4 border-primary-600 border-t-transparent mx-auto" />
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <Navbar />
      <MobileHeader />
      <main className="page-content">
        <Routes>
          <Route
            path="/"
            element={user ? <Navigate to={getDefaultRoute(user)} replace /> : <Home />}
          />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/helplines" element={<PrivateRoute><Helplines /></PrivateRoute>} />
          <Route path="/legal-resources" element={<PrivateRoute><LegalResources /></PrivateRoute>} />
          <Route path="/counseling" element={<PrivateRoute><Counseling /></PrivateRoute>} />
          <Route path="/ai-assistant" element={<PrivateRoute><AIAssistant /></PrivateRoute>} />
          <Route path="/counseling/appointment" element={<PrivateRoute><AppointmentBooking /></PrivateRoute>} />
          <Route path="/counseling/appointments" element={<CounselorRoute><CounselorAppointments /></CounselorRoute>} />
          <Route path="/child-safety" element={<PrivateRoute><ChildSafety /></PrivateRoute>} />

          <Route path="/dashboard"        element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/sos"              element={<PrivateRoute><SOSPage /></PrivateRoute>} />
          <Route path="/report"           element={<PrivateRoute><ReportIncident /></PrivateRoute>} />
          <Route path="/my-incidents"     element={<PrivateRoute><MyIncidents /></PrivateRoute>} />
          <Route path="/safe-routes"      element={<PrivateRoute><SafeRoutes /></PrivateRoute>} />
          <Route path="/share-location"   element={<PrivateRoute><ShareLocation /></PrivateRoute>} />
          <Route path="/family-linking"   element={<PrivateRoute><FamilyLinking /></PrivateRoute>} />
          <Route path="/profile"          element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/notifications"    element={<PrivateRoute><Notifications /></PrivateRoute>} />
          <Route path="/parent-dashboard" element={<PrivateRoute><ParentDashboard /></PrivateRoute>} />
          <Route path="/counseling/call/:roomId"  element={<PrivateRoute><CounselingCall /></PrivateRoute>} />
          <Route path="/counselor-dashboard"       element={<CounselorRoute><CounselorDashboard /></CounselorRoute>} />
          <Route path="/admin"                      element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          <Route path="*" element={<Navigate to={user ? getDefaultRoute(user) : "/login"} replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: { borderRadius: 14, fontSize: 13, maxWidth: 340 },
          }}
        />
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

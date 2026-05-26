import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { FiShield, FiEye, FiEyeOff } from "react-icons/fi";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      login(res.data.access_token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.full_name}!`);
      const role = res.data.user.role;
      navigate(role === "admin" ? "/admin" : role === "parent" ? "/parent-dashboard" : "/dashboard");
    } catch (err) {
      // Better error handling
      let errorMsg = "Login failed";
      
      if (err.message === "Network Error") {
        errorMsg = "Network error - Check your connection";
      } else if (err.code === "ECONNABORTED") {
        errorMsg = "Request timed out - Server not responding";
      } else if (!err.response) {
        errorMsg = `Connection error: ${err.message || "Cannot reach server"}`;
      } else {
        errorMsg = err.response?.data?.detail || `Error (${err.response?.status}): Login failed`;
      }
      
      console.error("Login error:", err, "Message:", errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-8">
      <div className="card">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <FiShield className="text-white text-3xl" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your SafeGuard account.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input type="email" required className="input-field" placeholder="you@example.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input type={showPw ? "text" : "password"} required className="input-field pr-10" placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPw(!showPw)}>
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="text-center mt-4 text-sm text-gray-600">
          Don't have an account? <Link to="/register" className="text-primary-600 font-semibold hover:underline">Register free</Link>
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 text-center">
          Demo admin: <strong>admin@safeguard.in</strong> / <strong>Admin@1234</strong>
        </div>
      </div>
    </div>
  );
}

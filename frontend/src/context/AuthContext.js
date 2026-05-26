import { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../services/api";
import { Preferences } from "@capacitor/preferences";

const AuthContext = createContext(null);
const TOKEN_KEY = "safeguard_auth_token";

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check Capacitor Preferences first (mobile native storage)
        let token = null;
        try {
          const result = await Preferences.get({ key: TOKEN_KEY });
          token = result.value;
          if (token) {
            // Sync to localStorage if missing
            localStorage.setItem("token", token);
          }
        } catch {
          // Fallback: check localStorage (web)
          token = localStorage.getItem("token");
        }

        if (token) {
          try {
            const res = await authAPI.me();
            setUser(res.data);
            console.log("✅ Login persisted - User restored:", res.data.full_name);
          } catch (err) {
            console.error("❌ Token invalid, clearing...");
            localStorage.removeItem("token");
            try {
              await Preferences.remove({ key: TOKEN_KEY });
            } catch {}
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (token, userData) => {
    // Save to localStorage (for API interceptor)
    localStorage.setItem("token", token);
    
    // Also save to Capacitor Preferences (mobile native secure storage)
    try {
      await Preferences.set({ key: TOKEN_KEY, value: token });
    } catch (err) {
      console.log("Preferences save skipped (web environment)");
    }
    
    setUser(userData);
    console.log("✅ Login successful - Will persist until logout:", userData.full_name);
  };

  const logout = async () => {
    // Clear from localStorage
    localStorage.removeItem("token");
    
    // Clear from Capacitor Preferences
    try {
      await Preferences.remove({ key: TOKEN_KEY });
    } catch (err) {
      console.log("Preferences clear skipped (web environment)");
    }
    
    setUser(null);
    console.log("✅ Logout successful - Login session cleared");
  };

  return (
    <AuthContext.Provider value={{
      user, setUser, login, logout, loading,
      isAdmin:     user?.role === "admin",
      isParent:    user?.role === "parent",
      isCounselor: user?.role === "counselor",
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

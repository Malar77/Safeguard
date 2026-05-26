import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authAPI } from "../services/api";
import { initDB, saveUser, getUser, clearAllData } from "../services/db";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await initDB();
        const savedToken = await AsyncStorage.getItem("token");
        if (savedToken) {
          setToken(savedToken);
          try {
            const { data } = await authAPI.me();
            setUser(data);
            await saveUser(data);
          } catch {
            // Network unavailable — load from local SQLite cache
            const cached = await getUser();
            if (cached) {
              setUser(cached);
            } else {
              await AsyncStorage.removeItem("token");
            }
          }
        }
      } catch {
        await AsyncStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    await AsyncStorage.setItem("token", data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    await saveUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    await AsyncStorage.setItem("token", data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    await saveUser(data.user);
    return data.user;
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    await clearAllData();
    setToken(null);
    setUser(null);
  };

  // Role helpers
  const isParent = user?.role === "parent";
  const isChild  = user?.role === "child";
  const isWomen  = user?.role === "women";
  const isCounselor = user?.role === "counselor";
  const isAdmin  = user?.role === "admin";
  const canSOS   = ["user", "child", "women"].includes(user?.role);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout,
               isParent, isChild, isWomen, isCounselor, isAdmin, canSOS }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

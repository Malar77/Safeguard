import { useState, useEffect } from "react";
import { resolveApiBaseUrl, resolveWsBaseUrl, isNativeAndroidApp } from "../services/api";
import { FiCheck, FiX, FiRefreshCw } from "react-icons/fi";

export default function Diagnostics() {
  const [apiUrl, setApiUrl] = useState("");
  const [wsUrl, setWsUrl] = useState("");
  const [isNative, setIsNative] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const checkConnection = async () => {
      setApiUrl(resolveApiBaseUrl());
      setWsUrl(resolveWsBaseUrl());
      setIsNative(isNativeAndroidApp());
      
      addLog(`API URL: ${resolveApiBaseUrl()}`);
      addLog(`WS URL: ${resolveWsBaseUrl()}`);
      addLog(`Is Native Android: ${isNativeAndroidApp()}`);
      
      try {
        const response = await fetch(`${resolveApiBaseUrl()}/health`, {
          timeout: 5000,
        });
        if (response.ok) {
          setBackendStatus("connected");
          addLog("✅ Backend is reachable!");
        } else {
          setBackendStatus("error");
          addLog(`❌ Backend returned: ${response.status}`);
        }
      } catch (error) {
        setBackendStatus("error");
        addLog(`❌ Backend not reachable: ${error.message}`);
      }
    };

    checkConnection();
  }, []);

  const addLog = (msg) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const testLogin = async () => {
    addLog("🔄 Testing login...");
    try {
      const response = await fetch(`${resolveApiBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@safeguard.in",
          password: "Admin@1234",
        }),
      });
      const data = await response.json();
      if (response.ok) {
        addLog("✅ Login successful!");
        addLog(`Token: ${data.access_token.substring(0, 20)}...`);
      } else {
        addLog(`❌ Login failed: ${data.detail || JSON.stringify(data)}`);
      }
    } catch (error) {
      addLog(`❌ Login error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">🔧 Diagnostics</h1>
          <p className="text-gray-500 text-sm">Check app connectivity and API configuration</p>
        </div>

        {/* API Configuration */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-bold text-lg text-gray-900 mb-4">API Configuration</h2>
          
          <div className="space-y-3">
            <div className="border rounded p-3 bg-gray-50">
              <p className="text-xs text-gray-500">API Base URL</p>
              <p className="font-mono text-sm text-gray-900 break-all">{apiUrl}</p>
            </div>

            <div className="border rounded p-3 bg-gray-50">
              <p className="text-xs text-gray-500">WebSocket URL</p>
              <p className="font-mono text-sm text-gray-900 break-all">{wsUrl}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded p-3 bg-gray-50">
                <p className="text-xs text-gray-500">Is Native Android</p>
                <p className="text-sm font-bold">{isNative ? "✅ YES" : "❌ NO"}</p>
              </div>

              <div className="border rounded p-3 bg-gray-50">
                <p className="text-xs text-gray-500">Backend Status</p>
                <p
                  className={`text-sm font-bold ${
                    backendStatus === "connected"
                      ? "text-green-600"
                      : backendStatus === "error"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {backendStatus === "connected" && "✅ Connected"}
                  {backendStatus === "error" && "❌ Not Reachable"}
                  {backendStatus === "checking" && "⏳ Checking..."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-bold text-lg text-gray-900 mb-4">Test Endpoints</h2>
          <button
            onClick={testLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            Test Login (admin@safeguard.in)
          </button>
        </div>

        {/* Logs */}
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-auto max-h-96">
          <p className="font-bold mb-2">📋 Diagnostic Logs:</p>
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet...</p>
          ) : (
            logs.map((log, i) => (
              <p key={i} className="mb-1">
                {log}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

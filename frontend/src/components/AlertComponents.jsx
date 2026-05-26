/**
 * Alert Status Indicator Component
 * Shows real-time status of alert system (connected, polling, paused)
 */
export function AlertStatusIndicator({ isPolling, lastUpdate, connectionStatus = "connected" }) {
  const statuses = {
    connected: { color: "text-green-600", bgColor: "bg-green-100", label: "Live" },
    disconnected: { color: "text-red-600", bgColor: "bg-red-100", label: "Offline" },
    paused: { color: "text-yellow-600", bgColor: "bg-yellow-100", label: "Paused" },
  };

  const status = statuses[connectionStatus] || statuses.connected;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
      <span className={`w-2 h-2 rounded-full ${status.color} ${isPolling ? "animate-pulse" : ""}`} />
      {status.label}
      {lastUpdate && (
        <span className="text-gray-500 ml-1">
          {Math.floor((Date.now() - new Date(lastUpdate)) / 1000)}s ago
        </span>
      )}
    </div>
  );
}

/**
 * Alert Quick Stats
 * Shows summary metrics in a card grid
 */
export function AlertStats({ unread, total, linked, pending }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <StatCard 
        value={linked} 
        label="Linked Wards" 
        color="pink" 
        icon="👨‍👩‍👧"
      />
      <StatCard 
        value={unread} 
        label="Unread Alerts" 
        color={unread > 0 ? "red" : "green"} 
        icon="🚨"
      />
      <StatCard 
        value={pending} 
        label="Pending Requests" 
        color="yellow" 
        icon="⏳"
      />
      <StatCard 
        value={total} 
        label="Total Alerts" 
        color="blue" 
        icon="📋"
      />
    </div>
  );
}

function StatCard({ value, label, color, icon }) {
  const colorMap = {
    pink: "text-pink-600 bg-pink-50 border-pink-200",
    red: "text-red-600 bg-red-50 border-red-200",
    green: "text-green-600 bg-green-50 border-green-200",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
    blue: "text-blue-600 bg-blue-50 border-blue-200",
  };

  return (
    <div className={`rounded-2xl border p-4 text-center shadow-sm ${colorMap[color]}`}>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-xs font-medium opacity-80">{icon} {label}</p>
    </div>
  );
}

/**
 * Empty State for Alerts
 */
export function EmptyAlertsState({ soundOn, onEnableSound }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 text-center py-14 px-6 shadow-sm">
      <div className="text-6xl mx-auto mb-3">🔔</div>
      <p className="text-gray-500 font-semibold text-lg">No alerts yet</p>
      <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
        When a linked ward triggers SOS, their live GPS map and live video clip
        appear here instantly — with a loud alarm sound.
      </p>
      <div className="mt-8 text-left bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100 rounded-2xl p-5">
        <h3 className="font-bold text-gray-800 mb-3">How to receive alerts</h3>
        <ol className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2">
            <span className="text-pink-600 font-bold">1.</span>
            Your ward registers a <strong>Child</strong> or <strong>Women</strong> account
          </li>
          <li className="flex gap-2">
            <span className="text-pink-600 font-bold">2.</span>
            They go to <strong>Profile → Family Settings</strong> and enter your email
          </li>
          <li className="flex gap-2">
            <span className="text-pink-600 font-bold">3.</span>
            Accept the request in the <em>Pending Requests</em> tab
          </li>
          <li className="flex gap-2">
            <span className="text-pink-600 font-bold">4.</span>
            {soundOn ? (
              <span><strong>✓ Sound alerts are ON</strong> — you'll hear a loud alarm when SOS is triggered</span>
            ) : (
              <span>Click <strong>"Enable Sound Alerts"</strong> at the top</span>
            )}
          </li>
          <li className="flex gap-2">
            <span className="text-pink-600 font-bold">5.</span>
            When they press SOS → you instantly get <strong>live map + live video + repeating alarm</strong>
          </li>
        </ol>
      </div>
    </div>
  );
}

/**
 * All Clear State
 */
export function AllClearState({ onViewHistory }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 text-center py-14 shadow-sm">
      <div className="text-6xl mx-auto mb-3">✅</div>
      <p className="text-green-600 font-semibold text-lg">All clear — no active alerts</p>
      <p className="text-sm text-gray-400 mt-1">
        All previous alerts have been reviewed. Switch to{" "}
        <button onClick={onViewHistory} className="text-blue-500 hover:underline font-medium">
          Full History
        </button>{" "}
        to see past alerts.
      </p>
    </div>
  );
}

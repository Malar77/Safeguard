import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { familyAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { FiMapPin, FiNavigation, FiRadio, FiShield, FiUsers } from "react-icons/fi";

const customIcon = new L.Icon({
  iconUrl: "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#ec4899" stroke="white" stroke-width="3"/><circle cx="16" cy="16" r="5" fill="white"/></svg>`),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

export default function ShareLocation() {
  const { user } = useAuth();
  const [pos, setPos] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locError, setLocError] = useState("");
  const watchId = useRef(null);
  const pulseId = useRef(null);
  const mapRef = useRef(null);

  const stopSharing = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (pulseId.current !== null) {
      window.clearInterval(pulseId.current);
      pulseId.current = null;
    }
    setSharing(false);
  };

  const getFreshLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });

  const detectInitialLocation = () => {
    setLoading(true);
    setLocError("");

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setLocError("Geolocation is not supported on this device.");
      setLoading(false);
      return;
    }

    let settled = false;
    const hardTimeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setLoading(false);
      setLocError("Location request timed out. Please enable GPS and try again.");
      toast.error("Location request timed out. Try again.");
    }, 12000);

    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(hardTimeout);
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLoading(false);
      },
      (err) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(hardTimeout);
        const msg =
          err?.code === 1
            ? "Location permission denied. Please allow location access."
            : err?.code === 2
              ? "Unable to get GPS signal. Move to open sky and try again."
              : "Location request timed out. Please try again.";
        setLocError(msg);
        toast.error(msg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Initialize Map
  useEffect(() => {
    detectInitialLocation();

    return () => stopSharing();
  }, []);

  const startSharing = async () => {
    if (!navigator.geolocation) return;
    setLocError("");

    // Always fetch a fresh GPS point first so sharing starts from current location.
    const firstFix = await getFreshLocation();

    if (!firstFix) {
      setLocError("Unable to get current location. Enable GPS and try again.");
      toast.error("Could not fetch current location.");
      return;
    }

    setPos(firstFix);
    setSharing(true);
    toast.success("Live Location Sharing Started");
    await sendLocationUpdate(firstFix.lat, firstFix.lng);

    // Watch position
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const coords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(coords);
        sendLocationUpdate(coords.lat, coords.lng);
      },
      (err) => toast.error("Lost location signal"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );

    // Force a fresh GPS pulse periodically for near-real-time tracking.
    pulseId.current = window.setInterval(async () => {
      const latest = await getFreshLocation();
      if (!latest) return;
      setPos(latest);
      sendLocationUpdate(latest.lat, latest.lng);
    }, 7000);
  };

  const sendLocationUpdate = async (lat, lng) => {
    if (lat === null || lat === undefined || lng === null || lng === undefined) return;
    try {
      const preciseAddress = `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
      // Send location directly to parents/trusted contacts via family API
      await familyAPI.sendAlert({
        message: "Live tracking active",
        latitude: lat,
        longitude: lng,
        address: preciseAddress
      });
    } catch {
      // Slient failure for background updates
    }
  };

  const centerMap = () => {
    if (pos && mapRef.current) {
      mapRef.current.setView([pos.lat, pos.lng], 16, { animate: true });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 h-screen flex flex-col">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-gray-800 flex justify-center items-center gap-2">
          <FiMapPin className="text-pink-500" /> Share Live Location
        </h1>
        <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
          Share your real-time GPS coordinates securely with your trusted family contacts.
        </p>
      </div>

      {pos ? (
        <div className="flex-1 bg-white rounded-3xl overflow-hidden shadow-2xl relative border-4 border-white flex flex-col">
          {/* Map Section */}
          <div className="flex-1 relative z-0">
            <MapContainer
              center={[pos.lat, pos.lng]}
              zoom={16}
              style={{ height: "100%", width: "100%" }}
              ref={mapRef}
              zoomControl={false}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[pos.lat, pos.lng]} icon={customIcon}>
                <Popup className="font-bold text-pink-600">You are here</Popup>
              </Marker>
              
              {/* Radar pulse effect when sharing */}
              {sharing && (
                <Circle 
                  center={[pos.lat, pos.lng]} 
                  pathOptions={{ fillColor: '#ec4899', fillOpacity: 0.2, color: 'transparent' }} 
                  radius={100} 
                  className="animate-pulse"
                />
              )}
            </MapContainer>

            {/* Recenter Button */}
            <button 
              onClick={centerMap}
              className="absolute bottom-6 right-6 z-[1000] w-12 h-12 bg-white text-gray-800 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-50 hover:text-pink-600 transition"
            >
              <FiNavigation size={22} className={sharing ? "text-pink-500" : ""} />
            </button>
          </div>

          {/* Controls Section */}
          <div className="bg-white p-6 z-10 border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${sharing ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-400"}`}>
                  <FiRadio size={28} className={sharing ? "animate-pulse" : ""} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-800 text-lg">
                    {sharing ? "Live Tracking Active" : "Tracking is OFF"}
                  </h3>
                  <p className="text-gray-500 text-sm flex items-center gap-1">
                    <FiUsers size={12} /> {sharing ? "Trusted contacts are receiving updates" : "Your location is private"}
                  </p>
                </div>
              </div>

              <button
                onClick={sharing ? stopSharing : startSharing}
                className={`w-full md:w-auto px-8 py-4 rounded-2xl font-extrabold text-white shadow-xl transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 ${
                  sharing 
                    ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-red-500/30" 
                    : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/30"
                }`}
              >
                {sharing ? (
                  <>Stop Sharing</>
                ) : (
                  <><FiShield size={20} /> Start Live Share</>
                )}
              </button>
              
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-10 text-center">
           <FiMapPin className="text-gray-300 text-5xl mb-4" />
           <h2 className="text-xl font-bold text-gray-600 mb-2">Location Required</h2>
           <p className="text-gray-500 text-sm max-w-sm">
             We need access to your device's location to show you on the map and share it with your emergency contacts.
           </p>
           {locError && <p className="text-xs text-rose-600 mt-3 font-semibold">{locError}</p>}
           <button
             onClick={detectInitialLocation}
             className="mt-5 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
           >
             Try Again
           </button>
        </div>
      )}
    </div>
  );
}

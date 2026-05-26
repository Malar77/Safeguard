import { useEffect, useState } from "react";
import { safePlacesAPI } from "../services/api";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import toast from "react-hot-toast";
import { FiMap } from "react-icons/fi";

// Fix leaflet default icon (use locally bundled assets, not CDN)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

const TYPE_COLORS = { police_station: "#ef4444", hospital: "#3b82f6", shelter: "#22c55e", ngo: "#f59e0b" };
const TYPE_EMOJI  = { police_station: "👮", hospital: "🏥", shelter: "🏠", ngo: "🤝" };
const DEFAULT_CENTER = [20.5937, 78.9629];
const DEFAULT_RADIUS_KM = 50;

function RecenterMap({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);

  return null;
}

export default function SafeRoutes() {
  const [places, setPlaces] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState(null);

  useEffect(() => {
    const loadPlaces = async () => {
      try {
        if (!navigator.geolocation) {
          const fallback = await safePlacesAPI.get();
          setPlaces(fallback.data || []);
          return;
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0,
          });
        });

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserPos({ lat, lng });

        const nearby = await safePlacesAPI.nearby(lat, lng, DEFAULT_RADIUS_KM);
        setPlaces(nearby.data || []);
      } catch {
        const fallback = await safePlacesAPI.get();
        setPlaces(fallback.data || []);
        toast("Location unavailable. Showing all safe places.", { icon: "📍" });
      } finally {
        setLoading(false);
      }
    };

    loadPlaces();
  }, []);

  const filtered = filter === "all" ? places : places.filter((p) => p.place_type === filter);
  const center = userPos
    ? [userPos.lat, userPos.lng]
    : places.length > 0
      ? [places[0].latitude, places[0].longitude]
      : DEFAULT_CENTER;
  const zoom = userPos ? 13 : 10;

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-6">
        <FiMap className="text-yellow-600 text-4xl mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-gray-800">Safe Places Near You</h1>
        <p className="text-gray-500 mt-1">Find verified police stations, hospitals, shelters, and NGOs on the map.</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {["all", "police_station", "hospital", "shelter", "ngo"].map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${filter === t ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-300 hover:border-primary-400"}`}>
            {TYPE_EMOJI[t] || "📍"} {t === "all" ? "All Places" : t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden shadow-lg mb-6" style={{ height: 420 }}>
        <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
          <RecenterMap center={center} zoom={zoom} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
          {userPos && (
            <Marker position={[userPos.lat, userPos.lng]} icon={new L.Icon({
              iconUrl: "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><circle cx="16" cy="16" r="14" fill="#ec4899" stroke="white" stroke-width="3"/><circle cx="16" cy="16" r="5" fill="white"/></svg>`),
              iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
            })}>
              <Popup><strong>📍 You are here</strong></Popup>
            </Marker>
          )}
          {filtered.map((p) => (
            <Marker key={p.id} position={[p.latitude, p.longitude]}>
              <Popup>
                <strong>{TYPE_EMOJI[p.place_type]} {p.name}</strong><br />
                {p.address}<br />
                {p.phone && <a href={`tel:${p.phone}`} className="text-blue-600">{p.phone}</a>}
                {p.is_verified && <span className="block text-green-600 text-xs mt-1">✓ Verified</span>}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="card border border-gray-100 flex gap-4 items-start">
            <div className="text-3xl">{TYPE_EMOJI[p.place_type] || "📍"}</div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800">{p.name}</h3>
                {p.is_verified && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Verified</span>}
              </div>
              <p className="text-gray-500 text-sm">{p.address}</p>
              {p.phone && <a href={`tel:${p.phone}`} className="text-green-600 text-sm font-medium mt-1 block hover:underline">📞 {p.phone}</a>}
            </div>
          </div>
        ))}
      </div>

      {places.length === 0 && (
        <div className="text-center text-gray-400 py-10">No safe places registered yet.</div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiAlertCircle,
  FiArrowRight,
  FiEdit2,
  FiLoader,
  FiMapPin,
  FiNavigation,
  FiShield,
  FiUploadCloud,
} from "react-icons/fi";
import { PiSmileyStickerLight } from "react-icons/pi";
import { incidentAPI } from "../services/api";

const TYPE_META = {
  harassment: { label: "Harassment", icon: FiAlertCircle },
  domestic_violence: { label: "Domestic Violence", icon: FiShield },
  child_abuse: { label: "Child Abuse", icon: PiSmileyStickerLight },
  cybercrime: { label: "Cybercrime", icon: FiEdit2 },
  stalking: { label: "Stalking", icon: FiAlertCircle },
  assault: { label: "Assault", icon: FiShield },
  trafficking: { label: "Trafficking", icon: FiAlertCircle },
  other: { label: "Other", icon: FiEdit2 },
};

const DEFAULT_TYPES = Object.keys(TYPE_META);

const toTitle = (value) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const mapCardStyle = {
  backgroundColor: "#8b929a",
  backgroundImage:
    "radial-gradient(circle at 8px 8px, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(115deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.05) 35%, rgba(255,255,255,0.35) 70%, rgba(255,255,255,0.05) 100%)",
  backgroundSize: "16px 16px, 100% 100%",
};

export default function ReportIncident() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [incidentTypes, setIncidentTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFileName, setMediaFileName] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");

  useEffect(() => {
    let active = true;

    const loadTypes = async () => {
      try {
        const res = await incidentAPI.types();
        const serverTypes = Array.isArray(res.data) && res.data.length > 0 ? res.data : DEFAULT_TYPES;
        if (!active) return;
        setIncidentTypes(serverTypes);
        setSelectedCategory((prev) => prev || serverTypes[0]);
      } catch {
        if (!active) return;
        setIncidentTypes(DEFAULT_TYPES);
        setSelectedCategory((prev) => prev || DEFAULT_TYPES[0]);
      } finally {
        if (active) setTypesLoading(false);
      }
    };

    loadTypes();
    return () => {
      active = false;
    };
  }, []);

  const categories = incidentTypes.length > 0 ? incidentTypes : DEFAULT_TYPES;

  const selected = useMemo(
    () => ({
      key: selectedCategory,
      label: TYPE_META[selectedCategory]?.label || toTitle(selectedCategory || "other"),
      icon: TYPE_META[selectedCategory]?.icon || FiEdit2,
    }),
    [selectedCategory]
  );

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported on this device");
      return;
    }

    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLatitude(lat);
        setLongitude(lng);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          const detectedAddress = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setLocation(detectedAddress);
        } catch {
          setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
          setLocLoading(false);
        }
      },
      () => {
        toast.error("Unable to detect location. Please add it manually.");
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMediaSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("Max file size is 25MB");
      return;
    }

    setUploadingMedia(true);
    try {
      const res = await incidentAPI.uploadEvidence(file);
      setMediaFileName(file.name);
      setEvidenceUrl(res.data?.evidence_url || "");
      toast.success("Media uploaded");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Media upload failed");
      setMediaFileName("");
      setEvidenceUrl("");
    } finally {
      setUploadingMedia(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      toast.error("Please choose a category");
      return;
    }

    if (description.trim().length < 20) {
      toast.error("Please describe the incident with at least 20 characters");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        incident_type: selectedCategory,
        title: `${selected.label} report`,
        description: description.trim(),
        location: location.trim() || null,
        latitude,
        longitude,
        is_anonymous: isAnonymous,
        evidence_url: evidenceUrl || null,
      };

      await incidentAPI.report(payload);
      toast.success("Incident report submitted successfully");
      navigate("/my-incidents");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-28 pt-4 space-y-5 text-slate-900">
      <div className="space-y-1">
        <h1 className="text-4xl font-black tracking-tight text-rose-900">Report Incident</h1>
        <p className="text-base text-slate-600 leading-relaxed">
          Your safety is our priority. Please provide as much detail as possible to help us assist you better.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold tracking-[0.18em] text-rose-700 uppercase">Step 1: Category</p>
          <span className="text-xs font-semibold text-rose-500">Required</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {categories.map((typeValue) => {
            const Icon = TYPE_META[typeValue]?.icon || FiEdit2;
            const label = TYPE_META[typeValue]?.label || toTitle(typeValue);
            const active = selectedCategory === typeValue;
            return (
              <button
                key={typeValue}
                type="button"
                onClick={() => setSelectedCategory(typeValue)}
                className={`rounded-2xl p-4 border text-center transition ${
                  active
                    ? "bg-rose-100 border-rose-400 shadow-sm"
                    : "bg-rose-50/60 border-rose-100 hover:border-rose-300"
                }`}
              >
                <div
                  className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center ${
                    active ? "bg-rose-600 text-white" : "bg-white text-rose-600"
                  }`}
                >
                  <Icon size={18} />
                </div>
                <p className={`mt-2.5 font-semibold text-sm ${active ? "text-rose-900" : "text-slate-700"}`}>
                  {label}
                </p>
              </button>
            );
          })}
        </div>
        {typesLoading && <p className="text-xs text-rose-500">Loading categories...</p>}
      </section>

      <section className="space-y-3">
        <p className="text-xs font-extrabold tracking-[0.18em] text-rose-700 uppercase">Step 2: Location</p>

        <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3.5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            {locLoading ? <FiLoader className="animate-spin" size={19} /> : <FiNavigation size={19} />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Auto-detecting...</p>
            <p className="text-base text-slate-800 leading-tight break-words">
              {location || "Tap edit and provide location manually"}
            </p>
          </div>

          <button
            type="button"
            onClick={detectLocation}
            className="text-sm font-semibold text-rose-700 underline underline-offset-2"
          >
            Edit
          </button>
        </div>

        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter location manually"
          className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />

        <div className="rounded-2xl h-40 border border-white/40 shadow-inner" style={mapCardStyle} />

        {latitude && longitude && (
          <p className="text-xs text-rose-700 flex items-center gap-1.5">
            <FiMapPin size={13} /> GPS saved: {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </p>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-xs font-extrabold tracking-[0.18em] text-rose-700 uppercase">Step 3: Description</p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what happened with as much detail as possible..."
          className="w-full h-36 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        <p className={`text-xs ${description.trim().length < 20 ? "text-rose-600" : "text-slate-500"}`}>
          {description.trim().length}/20 minimum characters
        </p>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-extrabold tracking-[0.18em] text-rose-700 uppercase">Step 4: Media</p>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadingMedia}
          className="w-full rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/60 px-4 py-8 text-center hover:border-rose-300 transition"
        >
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
            {uploadingMedia ? <FiLoader className="animate-spin" size={22} /> : <FiUploadCloud size={22} />}
          </div>
          <p className="text-2xl font-semibold text-slate-900">Upload Photo or Video</p>
          <p className="text-sm text-slate-500 mt-1">Max file size 25MB. Supports JPG, PNG, MP4</p>
          {mediaFileName && <p className="text-sm font-semibold text-rose-700 mt-3">{mediaFileName}</p>}
          {evidenceUrl && <p className="text-xs font-semibold text-rose-500 mt-1">Uploaded successfully</p>}
        </button>

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleMediaSelect}
          accept="image/jpeg,image/png,video/mp4"
        />
      </section>

      <div className="h-px bg-rose-100" />

      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold text-slate-900">Report Anonymously</p>
          <p className="text-sm text-slate-500">Your identity will be hidden from public logs</p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isAnonymous}
          onClick={() => setIsAnonymous((state) => !state)}
          className={`relative w-14 h-8 rounded-full transition ${isAnonymous ? "bg-rose-600" : "bg-slate-300"}`}
        >
          <span
            className={`absolute top-1 w-6 h-6 rounded-full bg-white transition ${isAnonymous ? "right-1" : "left-1"}`}
          />
        </button>
      </section>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full mt-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-extrabold py-4 text-xl shadow-lg shadow-rose-300/60 disabled:opacity-70 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <FiLoader className="animate-spin" size={18} /> Submitting...
          </>
        ) : (
          <>
            Submit Secure Report <FiArrowRight size={20} />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => navigate("/my-incidents")}
        className="w-full text-center text-sm font-bold tracking-wide text-rose-700 uppercase"
      >
        View My Past Reports
      </button>

      <div className="pb-2" />
    </div>
  );
}

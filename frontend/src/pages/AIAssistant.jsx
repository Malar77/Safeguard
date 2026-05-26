import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiAlertTriangle, FiArrowRight, FiMapPin, FiMessageSquare, FiPhone, FiRefreshCw, FiSend, FiShield, FiStar } from "react-icons/fi";
import { aiAssistantAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

const QUICK_PROMPTS = [
  "I feel overwhelmed and need someone to talk to.",
  "Someone is harassing me online and I feel unsafe.",
  "I am in a fight at home and need a safe next step.",
  "I am anxious and need emotional support right now.",
];

const LEVEL_STYLE = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  moderate: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

function MessageBubble({ item }) {
  const isUser = item.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-3xl px-4 py-3 shadow-sm border ${
          isUser
            ? "bg-primary-600 text-white border-primary-600 rounded-br-md"
            : "bg-white text-slate-800 border-slate-200 rounded-bl-md"
        }`}
      >
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold opacity-70 mb-1">
          {isUser ? "You" : item.assistant_name || "Assistant"}
        </div>
        <div className="text-sm leading-6 whitespace-pre-wrap">{item.content}</div>
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      assistant_name: "SafeGuard Support Assistant",
      content: "I’m here to listen, help you stay safe, and suggest the next step. Tell me what is going on, and I’ll respond with support and safety actions.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [distress, setDistress] = useState(null);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const history = useMemo(
    () => messages.map((item) => ({ role: item.role, content: item.content })),
    [messages]
  );

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported in this browser.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        toast.success("Location attached for safety suggestions.");
        setLocating(false);
      },
      () => {
        toast.error("Could not access your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    try {
      const { data } = await aiAssistantAPI.chat({
        message: text,
        history,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
      });

      setDistress({
        level: data.distress_level,
        score: data.distress_score,
        topics: data.detected_topics || [],
        crisis_message: data.crisis_message,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          assistant_name: data.assistant_name,
          content: data.reply,
          safety_actions: data.safety_actions || [],
          helplines: data.helplines || [],
          nearby_safe_places: data.nearby_safe_places || [],
          should_escalate: data.should_escalate,
        },
      ]);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to reach the assistant.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          assistant_name: "SafeGuard Support Assistant",
          content: "I’m sorry, I couldn’t process that right now. Please try again, or use SOS / Helplines if you need immediate help.",
          safety_actions: [
            "Use the SOS button if you feel unsafe.",
            "Call 112 or open the Helplines page if this is urgent.",
          ],
          helplines: [],
          nearby_safe_places: [],
          should_escalate: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const latestAssistant = [...messages].reverse().find((item) => item.role === "assistant" && item.safety_actions);

  return (
    <div className="px-4 py-5 lg:px-8 max-w-6xl mx-auto pb-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-primary-900 text-white border border-white/10 shadow-2xl mb-5">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_40%),radial-gradient(circle_at_bottom_left,_rgba(244,63,94,0.22),_transparent_36%)]" />
        <div className="relative p-6 lg:p-8 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]">
              <FiShield /> SafeGuard AI
            </div>
            <h1 className="mt-4 text-3xl lg:text-4xl font-black leading-tight">Emotional support, safety advice, and distress detection in one place.</h1>
            <p className="mt-3 text-white/75 max-w-2xl text-sm lg:text-base leading-7">
              Share what you are facing and the assistant will respond with a supportive reply, safety actions, helplines, and nearby safe places when location is available.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/sos" className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-900/30 hover:bg-red-500 transition">
                <FiAlertTriangle /> Open SOS
              </Link>
              <Link to="/safe-routes" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white border border-white/15 hover:bg-white/15 transition">
                <FiMapPin /> Safe Routes
              </Link>
              <Link to="/helplines" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white border border-white/15 hover:bg-white/15 transition">
                <FiPhone /> Helplines
              </Link>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white/10 border border-white/15 backdrop-blur p-4 lg:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.16em] text-white/55 font-bold">Current status</div>
                <div className="mt-1 text-lg font-extrabold">{distress ? `${distress.level.toUpperCase()} support` : "Ready to listen"}</div>
              </div>
              <div className={`rounded-2xl border px-3 py-2 text-xs font-bold ${LEVEL_STYLE[distress?.level || "low"]}`}>
                {distress ? `${distress.score} / 15` : "0 / 15"}
              </div>
            </div>
            {location && (
              <div className="mt-4 rounded-2xl bg-black/20 px-4 py-3 text-sm text-white/85 flex items-center gap-2">
                <FiMapPin className="text-white/90" /> Location attached for safety suggestions
              </div>
            )}
            {distress?.crisis_message && (
              <div className="mt-4 rounded-2xl bg-red-500/15 border border-red-400/25 px-4 py-3 text-sm text-red-50 leading-6">
                {distress.crisis_message}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 bg-white border-b border-slate-200">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400 font-bold">Conversation</div>
              <div className="text-lg font-extrabold text-slate-900">Talk to the assistant</div>
            </div>
            <button
              onClick={useCurrentLocation}
              disabled={locating}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-60"
            >
              {locating ? <FiRefreshCw className="animate-spin" /> : <FiMapPin />}
              {location ? "Location attached" : "Use my location"}
            </button>
          </div>

          <div className="h-[56vh] overflow-y-auto px-4 py-5 space-y-4">
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} className="space-y-3">
                <MessageBubble item={item} />
                {item.role === "assistant" && item.safety_actions && (
                  <div className="ml-2 rounded-3xl border border-rose-100 bg-rose-50/70 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-rose-700 font-bold text-sm"><FiStar /> Safety actions</div>
                    <div className="flex flex-wrap gap-2">
                      {item.safety_actions.map((action) => (
                        <span key={action} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 border border-rose-100">{action}</span>
                      ))}
                    </div>
                    {item.helplines?.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {item.helplines.map((h) => (
                          <a key={`${h.number}-${h.name}`} href={`tel:${h.number}`} className="rounded-2xl bg-white border border-rose-100 p-3 hover:border-rose-200 transition">
                            <div className="text-sm font-bold text-slate-900">{h.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{h.number}</div>
                          </a>
                        ))}
                      </div>
                    )}
                    {item.nearby_safe_places?.length > 0 && (
                      <div className="space-y-2">
                        {item.nearby_safe_places.map((place) => (
                          <div key={place.id} className="rounded-2xl bg-white border border-rose-100 p-3">
                            <div className="font-bold text-sm text-slate-900">{place.name}</div>
                            <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                              <FiMapPin /> {place.address || "Location available"}
                              {typeof place.distance_km === "number" && <span>• {place.distance_km} km away</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-3xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm text-sm text-slate-500 animate-pulse">
                  SafeGuard is thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={3}
                placeholder="Tell the assistant what you are feeling or what happened..."
                className="flex-1 resize-none rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
              />
              <button
                onClick={() => sendMessage()}
                disabled={sending || !input.trim()}
                className="inline-flex items-center justify-center gap-2 self-end rounded-3xl bg-primary-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-primary-900/20 hover:bg-primary-500 transition disabled:opacity-60"
              >
                <FiSend /> Send
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg"><FiShield className="text-primary-600" /> What it does</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 leading-6">
              <p>• Gives a supportive conversation for stress, fear, abuse, or crisis.</p>
              <p>• Detects distress signals and adjusts safety guidance.</p>
              <p>• Suggests helplines and nearby safe places when location is attached.</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg"><FiAlertTriangle className="text-red-500" /> If this is urgent</div>
            <div className="mt-4 space-y-3">
              <Link to="/sos" className="flex items-center justify-between rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition">
                Open SOS <FiArrowRight />
              </Link>
              <Link to="/helplines" className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition">
                View helplines <FiArrowRight />
              </Link>
              <Link to="/safe-routes" className="flex items-center justify-between rounded-2xl bg-cyan-50 border border-cyan-100 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 transition">
                Find safe places <FiArrowRight />
              </Link>
            </div>
          </div>

          {latestAssistant?.safety_actions?.length > 0 && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-lg"><FiStar className="text-amber-500" /> Latest safety plan</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {latestAssistant.safety_actions.slice(0, 5).map((action) => (
                  <li key={action} className="rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2">{action}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-[2rem] border border-slate-200 bg-slate-900 text-white p-5 shadow-lg">
            <div className="text-xs uppercase tracking-[0.18em] text-white/60 font-bold">Account</div>
            <div className="mt-1 text-lg font-extrabold">{user?.full_name || "SafeGuard User"}</div>
            <div className="mt-1 text-sm text-white/70">{user?.role || "user"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
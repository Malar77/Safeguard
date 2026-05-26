import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { resolveWsBaseUrl, sessionsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff,
  FiMaximize2, FiMinimize2, FiAlertCircle, FiLoader,
} from "react-icons/fi";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const WS_BASE = resolveWsBaseUrl();

export default function CounselingCall() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const callType = searchParams.get("type") || "video"; // "audio" | "video"
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── WebSocket + WebRTC refs ──────────────────────────────────────────────
  const wsRef       = useRef(null);
  const pcRef       = useRef(null);
  const localStream = useRef(null);

  // ── Video elements ────────────────────────────────────────────────────────
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [status,      setStatus]      = useState("connecting"); // connecting | waiting | in-call | ended | error
  const [micOn,       setMicOn]       = useState(true);
  const [camOn,       setCamOn]       = useState(callType === "video");
  const [peerName,    setPeerName]    = useState("");
  const [fullscreen,  setFullscreen]  = useState(false);
  const [duration,    setDuration]    = useState(0); // seconds since call connected
  const durationRef   = useRef(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const sendWS = useCallback((obj) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  const stopDurationTimer = () => {
    if (durationRef.current) clearInterval(durationRef.current);
  };

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Build PeerConnection ─────────────────────────────────────────────────
  const buildPC = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Send local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach((t) => pc.addTrack(t, localStream.current));
    }

    // Receive remote track → attach to <video>
    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    // Forward ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendWS({ type: "ice", data: e.candidate });
      }
    };

    return pc;
  }, [sendWS]);

  // ── Main setup effect ─────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function init() {
      // 1. Get local media
      try {
        const constraints = {
          audio: true,
          video: callType === "video" ? { width: 1280, height: 720 } : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (!isMounted) return;
        toast.error("Camera/Microphone access denied. Please allow permissions and try again.");
        setStatus("error");
        return;
      }

      // 2. Open WebSocket signalling
      const token = localStorage.getItem("token");
      const ws = new WebSocket(`${WS_BASE}/api/sessions/ws/${roomId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) setStatus("waiting");
      };

      ws.onerror = () => {
        if (isMounted) {
          toast.error("Signalling connection failed.");
          setStatus("error");
        }
      };

      ws.onmessage = async (evt) => {
        if (!isMounted) return;
        const msg = JSON.parse(evt.data);

        if (msg.type === "peer_joined") {
          // Other peer connected — if we're the caller, send the offer
          setPeerName(msg.data?.name || "Counselor");
          setStatus("in-call");
          durationRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

          const pc = buildPC();
          // Caller creates and sends offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendWS({ type: "offer", data: offer });
        }

        else if (msg.type === "offer") {
          const pc = buildPC();
          await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendWS({ type: "answer", data: answer });
          setPeerName(msg.data?.name || "User");
          setStatus("in-call");
          durationRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
        }

        else if (msg.type === "answer") {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.data));
          }
        }

        else if (msg.type === "ice") {
          if (pcRef.current && msg.data) {
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.data));
            } catch {}
          }
        }

        else if (msg.type === "peer_left") {
          stopDurationTimer();
          setStatus("ended");
          toast("The other participant left the call.", { icon: "📞" });
        }
      };

      ws.onclose = () => {
        if (isMounted && status !== "ended") {
          stopDurationTimer();
        }
      };
    }

    init();

    return () => {
      isMounted = false;
      stopDurationTimer();
      // Cleanup media
      localStream.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      wsRef.current?.close();
    };
    // eslint-disable-next-line
  }, [roomId, callType]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (!localStream.current) return;
    const audio = localStream.current.getAudioTracks()[0];
    if (audio) { audio.enabled = !audio.enabled; setMicOn(audio.enabled); }
  };

  const toggleCam = () => {
    if (callType !== "video" || !localStream.current) return;
    const video = localStream.current.getVideoTracks()[0];
    if (video) { video.enabled = !video.enabled; setCamOn(video.enabled); }
  };

  const hangUp = async () => {
    sendWS({ type: "end_call", data: null });
    stopDurationTimer();
    localStream.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    wsRef.current?.close();
    try { await sessionsAPI.end(roomId); } catch {}
    setStatus("ended");
  };

  const leaveAndGoBack = () => navigate("/counseling");

  // ── Render ────────────────────────────────────────────────────────────────
  const isVideo = callType === "video";

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-gray-900 ${fullscreen ? "p-0" : "p-4"}`}>

      {/* ── STATUS OVERLAY ── */}
      {status === "connecting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-50">
          <FiLoader className="text-pink-400 text-5xl animate-spin mb-4" />
          <p className="text-white text-xl font-semibold">Setting up your {callType} call…</p>
          <p className="text-gray-400 text-sm mt-2">Requesting camera & microphone access</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-50 px-6 text-center">
          <FiAlertCircle className="text-red-400 text-6xl mb-4" />
          <p className="text-white text-xl font-bold mb-2">Unable to start call</p>
          <p className="text-gray-400 mb-6">
            Please allow camera/microphone access in your browser and ensure the backend is running.
          </p>
          <button onClick={leaveAndGoBack}
            className="bg-pink-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-pink-700 transition">
            Go Back
          </button>
        </div>
      )}

      {status === "waiting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-40 px-6 text-center">
          {/* Local preview in background */}
          {isVideo && (
            <video ref={localVideoRef} autoPlay muted playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-20" />
          )}
          <div className="relative z-10 bg-gray-800 bg-opacity-80 rounded-3xl p-10 max-w-sm w-full shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-pink-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              {isVideo ? <FiVideo className="text-white text-2xl" /> : <FiMic className="text-white text-2xl" />}
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">
              Waiting for a Counselor
            </h2>
            <p className="text-gray-300 text-sm mb-1">
              Your {callType === "video" ? "video" : "audio"} session is ready.
            </p>
            <p className="text-gray-400 text-xs mb-6">
              A counselor will join shortly. Please stay on this page.
            </p>
            <div className="flex justify-center gap-3 mb-4">
              <ControlBtn active={micOn} onClick={toggleMic}
                icon={micOn ? <FiMic /> : <FiMicOff />}
                label={micOn ? "Mute" : "Unmute"} />
              {isVideo && (
                <ControlBtn active={camOn} onClick={toggleCam}
                  icon={camOn ? <FiVideo /> : <FiVideoOff />}
                  label={camOn ? "Hide Cam" : "Show Cam"} />
              )}
            </div>
            <button onClick={hangUp}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2">
              <FiPhoneOff /> Cancel
            </button>
          </div>
        </div>
      )}

      {status === "ended" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-50 px-6 text-center">
          <div className="text-6xl mb-4">📞</div>
          <h2 className="text-white text-2xl font-bold mb-2">Call Ended</h2>
          <p className="text-gray-400 mb-1">Duration: {formatDuration(duration)}</p>
          <p className="text-gray-500 text-sm mb-8">
            Thank you for using SafeGuard counseling.
          </p>
          <button onClick={leaveAndGoBack}
            className="bg-pink-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-pink-700 transition">
            Back to Counseling
          </button>
        </div>
      )}

      {/* ── CALL UI ── only shown when in-call */}
      {status === "in-call" && (
        <div className={`relative w-full ${fullscreen ? "h-screen" : "max-w-4xl"} flex flex-col`}>

          {/* Remote video / audio indicator */}
          <div className="relative flex-1 bg-gray-800 rounded-2xl overflow-hidden min-h-64 flex items-center justify-center">
            {isVideo ? (
              <video ref={remoteVideoRef} autoPlay playsInline
                className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-pink-600 flex items-center justify-center mb-4">
                  <span className="text-white text-4xl font-bold">
                    {(peerName || "C")[0].toUpperCase()}
                  </span>
                </div>
                <audio ref={remoteVideoRef} autoPlay />
                <p className="text-white text-lg font-semibold">{peerName || "Counselor"}</p>
                <p className="text-gray-400 text-sm mt-1 flex items-center gap-1">
                  <FiMic size={13} /> Audio call connected
                </p>
              </div>
            )}

            {/* Peer name + duration overlay */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-sm px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {peerName || "Counselor"} — {formatDuration(duration)}
            </div>

            {/* Fullscreen toggle */}
            <button onClick={() => setFullscreen(f => !f)}
              className="absolute top-4 right-4 bg-black bg-opacity-40 text-white p-2 rounded-full hover:bg-opacity-70 transition">
              {fullscreen ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
            </button>

            {/* Local PiP */}
            {isVideo && (
              <div className="absolute bottom-4 right-4 w-36 h-24 rounded-xl overflow-hidden border-2 border-gray-600 shadow-lg">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                {!camOn && (
                  <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                    <FiVideoOff className="text-gray-400" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* For audio-only, attach local audio element too */}
          {!isVideo && (
            <video ref={localVideoRef} autoPlay muted playsInline className="hidden" />
          )}

          {/* Controls bar */}
          <div className="flex items-center justify-center gap-4 mt-4 pb-2">
            <ControlBtn active={micOn} onClick={toggleMic}
              icon={micOn ? <FiMic size={20} /> : <FiMicOff size={20} />}
              label={micOn ? "Mute" : "Unmute"} />

            {isVideo && (
              <ControlBtn active={camOn} onClick={toggleCam}
                icon={camOn ? <FiVideo size={20} /> : <FiVideoOff size={20} />}
                label={camOn ? "Hide Cam" : "Show Cam"} />
            )}

            <button onClick={hangUp}
              className="flex flex-col items-center gap-1 bg-red-600 hover:bg-red-700
                         text-white p-4 rounded-full transition shadow-lg">
              <FiPhoneOff size={22} />
            </button>
          </div>
          <p className="text-center text-gray-500 text-xs mt-1 mb-0">End Call</p>
        </div>
      )}

      {/* If not in-call and local video for waiting screen for VIDEO used above, 
          keep the local video for audio calls too */}
      {status === "waiting" && !isVideo && (
        <video ref={localVideoRef} autoPlay muted playsInline className="hidden" />
      )}
    </div>
  );
}

// ── Reusable control button ────────────────────────────────────────────────────
function ControlBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1 p-3 rounded-full transition shadow
        ${active
          ? "bg-gray-700 hover:bg-gray-600 text-white"
          : "bg-red-700 hover:bg-red-600 text-white"}`}>
      {icon}
      {label && <span className="text-xs hidden sm:block">{label}</span>}
    </button>
  );
}

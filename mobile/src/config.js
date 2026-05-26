import Constants from "expo-constants";

// API base URL for mobile app builds.
// You can provide multiple hosts via EXPO_PUBLIC_API_BASE_URL (comma/semicolon/space separated).
const FALLBACK_API_BASE_URLS = [
	"http://10.223.158.58:8000",
	"http://192.168.156.58:8000",
	"http://10.0.2.2:8000", // Android emulator
	"http://localhost:8000", // iOS simulator / local tooling
];

const envCandidates = (process.env.EXPO_PUBLIC_API_BASE_URL || "")
	.split(/[,;\s]+/)
	.map((url) => url.trim())
	.filter(Boolean);

const normalizeHttpUrl = (url) => {
	const value = (url || "").trim();
	if (!value) return null;
	const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;
	return withScheme.replace(/\/+$/, "");
};

const toBackendBaseUrl = (hostUri) => {
	const normalized = normalizeHttpUrl(hostUri);
	if (!normalized) return null;

	try {
		const parsed = new URL(normalized);
		parsed.port = "8000";
		return parsed.toString().replace(/\/+$/, "");
	} catch {
		return normalized.replace(/:\d+$/, ":8000");
	}
};

const expoHostCandidate = toBackendBaseUrl(
	Constants?.expoConfig?.hostUri ||
	Constants?.manifest2?.extra?.expoGo?.developer?.hostUri ||
	Constants?.manifest?.debuggerHost
);

const uniqueCandidates = [...envCandidates, expoHostCandidate, ...FALLBACK_API_BASE_URLS]
	.map(normalizeHttpUrl)
	.filter(Boolean)
	.filter((value, index, array) => array.indexOf(value) === index);

export const API_BASE_URL_CANDIDATES = uniqueCandidates;
export const API_BASE_URL = API_BASE_URL_CANDIDATES[0] || FALLBACK_API_BASE_URLS[0];
export const WEB_BASE_URL = API_BASE_URL.replace(/:8000$/, ":3000");


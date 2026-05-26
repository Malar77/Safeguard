import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Linking, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { safePlaceAPI } from "../../services/api";
import { COLORS, RADIUS, SHADOW } from "../../theme";

const TYPE_ICONS = {
  police_station: "🚔",
  hospital: "🏥",
  shelter: "🏠",
  ngo: "🤝",
  government_office: "🏛️",
  other: "📍",
};

const normalizeCoord = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export default function SafeRoutesScreen() {
  const [places, setPlaces] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [myLocation, setMyLocation] = useState(null);
  const [currentLocationLabel, setCurrentLocationLabel] = useState("");
  const [liveTracking, setLiveTracking] = useState(false);
  const locationWatcherRef = useRef(null);

  useEffect(() => {
    initializeWithLiveLocation();

    return () => {
      if (locationWatcherRef.current) {
        locationWatcherRef.current.remove();
        locationWatcherRef.current = null;
      }
    };
  }, []);

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (n) => (n * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const withDistance = (items, coords) => {
    const currentLat = normalizeCoord(coords?.latitude);
    const currentLon = normalizeCoord(coords?.longitude);
    if (currentLat === null || currentLon === null) {
      return items;
    }

    return (items || [])
      .map((p) => {
        const placeLat = normalizeCoord(p.latitude);
        const placeLon = normalizeCoord(p.longitude);
        if (placeLat === null || placeLon === null) {
          return p;
        }
        const distance_km = haversineKm(currentLat, currentLon, placeLat, placeLon);
        return { ...p, latitude: placeLat, longitude: placeLon, distance_km };
      })
      .sort((a, b) => {
        if (typeof a.distance_km !== "number") return 1;
        if (typeof b.distance_km !== "number") return -1;
        return a.distance_km - b.distance_km;
      });
  };

  const getLocationLabel = async (coords) => {
    try {
      const placemarks = await Location.reverseGeocodeAsync(coords);
      const place = placemarks?.[0];
      const parts = [
        place?.name,
        place?.street,
        place?.district || place?.subregion,
        place?.city || place?.region,
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    } catch {
      // Fall back to coordinates below.
    }

    return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
  };

  const loadAllSafePlaces = async (coords = null) => {
    const { data } = await safePlaceAPI.list();
    setPlaces(withDistance(data || [], coords));
  };

  const refreshNearbyFromCoords = async (coords) => {
    const { data } = await safePlaceAPI.nearby(coords.latitude, coords.longitude, 30);
    const nearby = withDistance(data || [], coords);
    if (nearby.length > 0) {
      setPlaces(nearby);
      return;
    }
    await loadAllSafePlaces(coords);
  };

  const stopLiveTracking = async () => {
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
    }
    setLiveTracking(false);
  };

  const useLiveLocation = async () => {
    setLocationLoading(true);
    setLocationError("");
    try {
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        setLocationError("Turn on device location to use exact nearby safe routes.");
        await stopLiveTracking();
        await loadAllSafePlaces();
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission denied. Showing all safe places.");
        await stopLiveTracking();
        await loadAllSafePlaces();
        return;
      }

      let position = null;
      try {
        position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
      } catch {
        position = await Location.getLastKnownPositionAsync({
          maxAge: 2 * 60 * 1000,
          requiredAccuracy: 200,
        });
      }

      if (!position?.coords) {
        throw new Error("Location unavailable");
      }

      const coords = {
        latitude: Number(position.coords.latitude),
        longitude: Number(position.coords.longitude),
      };
      setMyLocation(coords);
      setCurrentLocationLabel(await getLocationLabel(coords));

      await refreshNearbyFromCoords(coords);

      if (locationWatcherRef.current) {
        locationWatcherRef.current.remove();
        locationWatcherRef.current = null;
      }

      locationWatcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 15,
        },
        async (nextPos) => {
          const nextCoords = {
            latitude: nextPos.coords.latitude,
            longitude: nextPos.coords.longitude,
          };
          setMyLocation(nextCoords);
          setCurrentLocationLabel(await getLocationLabel(nextCoords));
          try {
            await refreshNearbyFromCoords(nextCoords);
          } catch {
            // Keep tracking even if one refresh fails.
          }
        }
      );
      setLiveTracking(true);
    } catch {
      setLocationError("Could not get live location. Showing all safe places.");
      await stopLiveTracking();
      await loadAllSafePlaces();
    } finally {
      setLocationLoading(false);
      setLoading(false);
    }
  };

  const initializeWithLiveLocation = async () => {
    setLoading(true);
    await useLiveLocation();
  };

  const openRoute = async (place) => {
    const destLat = normalizeCoord(place?.latitude);
    const destLon = normalizeCoord(place?.longitude);
    if (destLat === null || destLon === null) {
      Alert.alert("Route unavailable", "This safe place does not have map coordinates yet.");
      return;
    }

    const originLat = normalizeCoord(myLocation?.latitude);
    const originLon = normalizeCoord(myLocation?.longitude);
    const placeName = encodeURIComponent(place?.name || "Safe Place");

    const mapsUrl = originLat !== null && originLon !== null
      ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLon}&destination=${destLat},${destLon}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${destLat},${destLon}`;

    try {
      await Linking.openURL(mapsUrl);
      return;
    } catch {
      const fallbackUrl = Platform.OS === "android"
        ? `geo:${destLat},${destLon}?q=${destLat},${destLon}(${placeName})`
        : `http://maps.apple.com/?daddr=${destLat},${destLon}`;

      try {
        await Linking.openURL(fallbackUrl);
      } catch {
        Alert.alert("Unable to open maps", "Please install a maps app and try again.");
      }
    }
  };

  const types = ["all", ...new Set(places.map((p) => p.place_type))];
  const filtered = places.filter((p) => {
    const matchType = filter === "all" || p.place_type === filter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.address?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.liveLocationRow}>
          <TouchableOpacity
            style={styles.liveBtn}
            onPress={liveTracking ? stopLiveTracking : useLiveLocation}
            disabled={locationLoading}
          >
            <Text style={styles.liveBtnText}>
              {locationLoading ? "Locating..." : liveTracking ? "Stop Live Tracking" : "Use Live Location"}
            </Text>
          </TouchableOpacity>
          {myLocation && (
            <Text style={styles.liveOk}>{liveTracking ? "Live tracking active" : "Location active"}</Text>
          )}
        </View>
        {currentLocationLabel ? <Text style={styles.currentLocation}>Current location: {currentLocationLabel}</Text> : null}
        {!!locationError && <Text style={styles.locationError}>{locationError}</Text>}
        <TextInput
          style={styles.search}
          placeholder="🔍  Search by name or city..."
          placeholderTextColor={COLORS.gray400}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Type filter */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false}
          data={types}
          keyExtractor={(t) => t}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
          renderItem={({ item: t }) => (
            <TouchableOpacity
              style={[styles.chip, filter === t && styles.chipActive]}
              onPress={() => setFilter(t)}
            >
              <Text style={[styles.chipText, filter === t && styles.chipTextActive]}>
                {t === "all" ? "All" : t.replace(/_/g, " ")}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? "Loading safe places..." : "No safe places found."}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.typeIcon}>{TYPE_ICONS[item.place_type] || "📍"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.typeLabel}>{item.place_type?.replace(/_/g, " ")}</Text>
                {typeof item.distance_km === "number" && (
                  <Text style={styles.distance}>~ {item.distance_km.toFixed(2)} km away</Text>
                )}
              </View>
              {item.is_24_hours && (
                <View style={styles.badge24}>
                  <Text style={styles.badge24Text}>24/7</Text>
                </View>
              )}
            </View>
            {item.address && <Text style={styles.address}>📍 {item.address}</Text>}
            {item.phone && <Text style={styles.phone}>📞 {item.phone}</Text>}
            {item.description && <Text style={styles.desc}>{item.description}</Text>}
            {normalizeCoord(item.latitude) !== null && normalizeCoord(item.longitude) !== null && (
              <Text style={styles.coords}>
                🗺️ {normalizeCoord(item.latitude).toFixed(4)}, {normalizeCoord(item.longitude).toFixed(4)}
              </Text>
            )}
            <TouchableOpacity style={styles.routeBtn} onPress={() => openRoute(item)}>
              <Text style={styles.routeBtnText}>Open Safe Route</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.gray50 },
  searchRow: { backgroundColor: COLORS.white, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  liveLocationRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  liveBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  liveBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 12 },
  liveOk: { color: COLORS.success, fontSize: 12, fontWeight: "700" },
  currentLocation: { color: COLORS.gray700, fontSize: 12, marginBottom: 8, lineHeight: 17 },
  locationError: { color: COLORS.danger, fontSize: 12, marginBottom: 8 },
  search: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.gray50 },
  filterWrap: { backgroundColor: COLORS.white, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.gray100, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.gray600, fontWeight: "600", textTransform: "capitalize" },
  chipTextActive: { color: COLORS.primary },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  empty: { textAlign: "center", color: COLORS.gray400, marginTop: 40 },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 14, ...SHADOW.sm },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  typeIcon: { fontSize: 28 },
  name: { fontSize: 15, fontWeight: "700", color: COLORS.gray800 },
  typeLabel: { fontSize: 12, color: COLORS.primary, textTransform: "capitalize", marginTop: 1 },
  badge24: { backgroundColor: COLORS.successBg, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  badge24Text: { fontSize: 11, fontWeight: "700", color: COLORS.success },
  distance: { fontSize: 12, color: COLORS.gray600, marginTop: 2 },
  address: { fontSize: 13, color: COLORS.gray600, marginBottom: 4 },
  phone: { fontSize: 13, color: COLORS.danger, fontWeight: "600", marginBottom: 4 },
  desc: { fontSize: 13, color: COLORS.gray500, lineHeight: 18, marginBottom: 4 },
  coords: { fontSize: 11, color: COLORS.gray400 },
  routeBtn: { marginTop: 10, backgroundColor: COLORS.primaryBg, borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 9, alignItems: "center" },
  routeBtnText: { color: COLORS.primary, fontWeight: "700", fontSize: 13 },
});

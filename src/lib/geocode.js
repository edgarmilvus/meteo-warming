// Place search and reverse geocoding. Open-Meteo's geocoder for names,
// BigDataCloud for "where am I" (no key, CORS open).
//
// Location has two paths: inside the native shell the Capacitor plugin asks
// Android or iOS for the permission; in a browser it is navigator.geolocation.
// The WebView alone never shows the system prompt, which is why the plugin is
// here at all.

const SEARCH_URL = "https://geocoding-api.open-meteo.com/v1/search";
const REVERSE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

const shape = (r) => ({
  id: r.id ? `geo-${r.id}` : `geo-${r.latitude.toFixed(3)},${r.longitude.toFixed(3)}`,
  name: r.name,
  region: r.admin1 || "",
  country: r.country || "",
  lat: r.latitude,
  lon: r.longitude,
  population: r.population || 0,
});

export async function searchPlaces(query, { signal } = {}) {
  const q = query.trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({
    name: q,
    count: "8",
    language: "en",
    format: "json",
  });

  const res = await fetch(`${SEARCH_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`The place search answered ${res.status}.`);
  const j = await res.json();
  const places = (j.results || []).map(shape);

  // The API ranks by its own relevance. Exact names first, then the bigger
  // places, which is what people mean when they type a city.
  const exact = (p) => (p.name.toLowerCase() === q.toLowerCase() ? 1 : 0);
  return places.sort((a, b) => exact(b) - exact(a) || b.population - a.population);
}

const isNative = () => Boolean(window.Capacitor?.isNativePlatform?.());

async function nativePosition() {
  const { Geolocation } = await import("@capacitor/geolocation");

  const permission = await Geolocation.checkPermissions();
  let state = permission.location;
  if (state !== "granted") {
    const asked = await Geolocation.requestPermissions();
    state = asked.location;
  }
  if (state === "denied") {
    throw new Error(
      "Location permission was denied for this app. You can allow it in the phone settings, or search for a city.",
    );
  }

  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: false, // a 25 km grid cell does not need the GPS
    timeout: 25000,
    maximumAge: 600000,
  });
  return { lat: pos.coords.latitude, lon: pos.coords.longitude };
}

function browserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser cannot read your location. Search for a city instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        const messages = {
          1: "Location permission was denied. You can still search for a city.",
          2: "Your location is not available right now. Try searching for a city.",
          3: "Reading your location took too long. Try again or search for a city.",
        };
        reject(new Error(messages[err.code] || "Your location could not be read."));
      },
      { timeout: 25000, maximumAge: 600000, enableHighAccuracy: false },
    );
  });
}

export async function currentPosition() {
  if (isNative()) {
    try {
      return await nativePosition();
    } catch (err) {
      // Capacitor rejects with { code, message } or an Error; keep the message.
      throw new Error(err?.message || "Your location could not be read.");
    }
  }
  return browserPosition();
}

export async function reversePlace(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    localityLanguage: "en",
  });

  try {
    const res = await fetch(`${REVERSE_URL}?${params}`);
    if (!res.ok) throw new Error("reverse failed");
    const j = await res.json();
    const name = j.city || j.locality || j.principalSubdivision || "My location";
    return {
      id: `geo-${lat.toFixed(3)},${lon.toFixed(3)}`,
      name,
      region: j.principalSubdivision || "",
      country: j.countryName || "",
      lat,
      lon,
      here: true,
    };
  } catch {
    // The name is a nicety; the coordinates are what the record needs.
    return {
      id: `geo-${lat.toFixed(3)},${lon.toFixed(3)}`,
      name: "My location",
      region: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      country: "",
      lat,
      lon,
      here: true,
    };
  }
}

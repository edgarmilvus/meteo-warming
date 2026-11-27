// Loads the daily record for any place. New York ships with the app; every
// other place is fetched once from the Open-Meteo archive and kept in
// localStorage so the next visit is instant and works offline.

import bundled from "../data/nyc.json";

const CACHE_PREFIX = "climate.series.";
const INDEX_KEY = "climate.series.index";
const MAX_CACHED = 3;

const pad = (n) => String(n).padStart(2, "0");
const round1 = (v) =>
  v === null || v === undefined || Number.isNaN(v) ? null : Math.round(v * 10) / 10;

const keyFor = (city) => `${CACHE_PREFIX}${city.lat.toFixed(2)},${city.lon.toFixed(2)}`;

const nearNewYork = (city) =>
  Math.abs(city.lat - 40.7128) < 0.05 && Math.abs(city.lon + 74.006) < 0.05;

function readIndex() {
  try {
    const list = JSON.parse(localStorage.getItem(INDEX_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeIndex(list) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  } catch {
    /* storage is a convenience, never a requirement */
  }
}

export function cachedSeries(city) {
  try {
    const raw = localStorage.getItem(keyFor(city));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function store(city, data) {
  const key = keyFor(city);
  const index = readIndex().filter((k) => k !== key);
  index.push(key);
  while (index.length > MAX_CACHED) {
    const old = index.shift();
    try {
      localStorage.removeItem(old);
    } catch {
      /* ignore */
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(data));
    writeIndex(index);
  } catch {
    // Out of quota: drop our own cache and try once more without it.
    try {
      for (const k of readIndex()) localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
    writeIndex([]);
  }
}

export async function loadSeries(city, { signal } = {}) {
  if (city.id === "nyc" || nearNewYork(city)) return bundled;

  const cached = cachedSeries(city);
  if (cached) return cached;

  const now = new Date();
  const end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const params = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    start_date: "1940-01-01",
    end_date: end,
    daily: "temperature_2m_max,temperature_2m_min",
    timezone: "auto",
  });

  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`, { signal });
  if (!res.ok) {
    throw new Error(
      `The archive answered ${res.status}. It may be busy; try again, or pick another place.`,
    );
  }

  const j = await res.json();
  const times = j.daily?.time || [];
  const usable = (j.daily?.temperature_2m_max || []).filter((v) => v !== null).length;
  if (!times.length || usable < 365) {
    throw new Error("There are no daily records for this location. Try a place on land.");
  }

  const data = {
    city: {
      id: city.id,
      name: city.name,
      region: city.region || "",
      country: city.country || "",
      lat: city.lat,
      lon: city.lon,
    },
    start: times[0],
    end: times[times.length - 1],
    days: times.length,
    elevation: j.elevation,
    tmax: j.daily.temperature_2m_max.map(round1),
    tmin: j.daily.temperature_2m_min.map(round1),
    source: {
      name: "ERA5 via Open-Meteo Historical Weather API",
      url: "https://open-meteo.com/en/docs/historical-weather-api",
      licence: "CC BY 4.0",
      fetched: end,
    },
  };

  store(city, data);
  return data;
}

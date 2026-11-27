// Bakes the static datasets the app ships with.
// Run: node scripts/fetch-data.mjs
//
// 1. ERA5 daily max/min temperature for the default city, 1940 -> today (Open-Meteo archive)
// 2. NASA GISTEMP global annual anomalies, 1880 -> last complete year
//
// Both are written to src/data so the app works offline and makes no
// historical calls at runtime. Re-run once a month to refresh.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "src", "data");

const CITIES = [
  {
    id: "nyc",
    name: "New York",
    country: "United States",
    lat: 40.7128,
    lon: -74.006,
    tz: "America/New_York",
  },
];

const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const endDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const round1 = (v) =>
  v === null || v === undefined || Number.isNaN(v) ? null : Math.round(v * 10) / 10;

for (const c of CITIES) {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${c.lat}&longitude=${c.lon}` +
    `&start_date=1940-01-01&end_date=${endDate}` +
    `&daily=temperature_2m_max,temperature_2m_min&timezone=${encodeURIComponent(c.tz)}`;

  process.stdout.write(`fetching ${c.name} 1940-01-01 -> ${endDate} ... `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${c.name}: HTTP ${res.status}`);
  const j = await res.json();
  const times = j.daily.time;
  if (!times?.length) throw new Error(`${c.name}: empty response`);

  const payload = {
    city: { id: c.id, name: c.name, country: c.country, lat: c.lat, lon: c.lon, tz: c.tz },
    start: times[0],
    end: times[times.length - 1],
    days: times.length,
    elevation: j.elevation,
    // index i -> date = start + i days. Arrays are row aligned.
    tmax: j.daily.temperature_2m_max.map(round1),
    tmin: j.daily.temperature_2m_min.map(round1),
    source: {
      name: "ERA5 via Open-Meteo Historical Weather API",
      url: "https://open-meteo.com/en/docs/historical-weather-api",
      licence: "CC BY 4.0",
      fetched: new Date().toISOString().slice(0, 10),
    },
  };

  const file = join(dataDir, `${c.id}.json`);
  writeFileSync(file, JSON.stringify(payload));
  console.log(`ok, ${times.length} days, ${(JSON.stringify(payload).length / 1024).toFixed(0)} KB`);
}

// --- NASA GISTEMP: global land-ocean annual mean anomaly, base 1951-1980 ---
process.stdout.write("fetching NASA GISTEMP annual ... ");
let csv;
try {
  const gRes = await fetch("https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv");
  if (!gRes.ok) throw new Error(`HTTP ${gRes.status}`);
  csv = await gRes.text();
} catch (err) {
  // NASA sometimes drops the TLS connection. Fall back to the last good copy.
  console.warn(`\n  GISTEMP fetch failed (${err.message}), using local fallback`);
  csv = readFileSync(join(here, "gistemp-fallback.csv"), "utf8");
}

const years = [];
for (const line of csv.split("\n")) {
  const f = line.split(",");
  if (!/^\d{4}$/.test(f[0])) continue;
  const annual = f[13]; // "J-D" column, the annual mean
  if (!annual || annual === "***") continue;
  years.push({ year: Number(f[0]), anomaly: Number(annual) });
}

writeFileSync(
  join(dataDir, "global.json"),
  JSON.stringify({
    series: "NASA GISTEMP v4, global land-ocean temperature index",
    baseline: "1951-1980",
    unit: "degC",
    url: "https://data.giss.nasa.gov/gistemp/",
    fetched: new Date().toISOString().slice(0, 10),
    years,
  }),
);
console.log(`ok, ${years.length} years (${years[0].year}-${years[years.length - 1].year})`);

// Live forecast only. The historical series is baked into src/data and never
// fetched at runtime, so the comparison works offline and cannot drift.

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// WMO weather interpretation codes, as used by Open-Meteo.
const CODES = {
  0: ["Clear sky", "clear"],
  1: ["Mainly clear", "partly"],
  2: ["Partly cloudy", "partly"],
  3: ["Overcast", "cloud"],
  45: ["Fog", "fog"],
  48: ["Freezing fog", "fog"],
  51: ["Light drizzle", "drizzle"],
  53: ["Drizzle", "drizzle"],
  55: ["Heavy drizzle", "drizzle"],
  56: ["Freezing drizzle", "drizzle"],
  57: ["Freezing drizzle", "drizzle"],
  61: ["Light rain", "rain"],
  63: ["Rain", "rain"],
  65: ["Heavy rain", "rain"],
  66: ["Freezing rain", "rain"],
  67: ["Freezing rain", "rain"],
  71: ["Light snow", "snow"],
  73: ["Snow", "snow"],
  75: ["Heavy snow", "snow"],
  77: ["Snow grains", "snow"],
  80: ["Light showers", "rain"],
  81: ["Showers", "rain"],
  82: ["Heavy showers", "rain"],
  85: ["Snow showers", "snow"],
  86: ["Heavy snow showers", "snow"],
  95: ["Thunderstorm", "storm"],
  96: ["Thunderstorm with hail", "storm"],
  99: ["Thunderstorm with hail", "storm"],
};

export const describe = (code) => CODES[code] || ["Cloudy", "cloud"];

export async function fetchForecast(city, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: String(city.lat),
    longitude: String(city.lon),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "16",
  });

  const res = await fetch(`${FORECAST_URL}?${params}`, { signal });
  if (!res.ok) {
    throw new Error(`The forecast service answered ${res.status}. It may be rate limited; try again in a minute.`);
  }
  const j = await res.json();
  if (!j.current || !j.daily?.time) {
    throw new Error("The forecast service returned no data for this location.");
  }

  const [text, kind] = describe(j.current.weather_code);

  return {
    current: {
      temp: j.current.temperature_2m,
      feels: j.current.apparent_temperature,
      humidity: j.current.relative_humidity_2m,
      wind: j.current.wind_speed_10m,
      code: j.current.weather_code,
      text,
      kind,
      isDay: j.current.is_day === 1,
    },
    daily: j.daily.time.map((date, i) => {
      const [t, k] = describe(j.daily.weather_code[i]);
      return {
        date,
        max: j.daily.temperature_2m_max[i],
        min: j.daily.temperature_2m_min[i],
        rain: j.daily.precipitation_probability_max?.[i] ?? null,
        text: t,
        kind: k,
      };
    }),
    timezone: j.timezone,
    fetchedAt: new Date(),
  };
}

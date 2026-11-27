import { useCallback, useEffect, useMemo, useState } from "react";

import globalData from "./data/global.json";

import {
  annualAnomalies,
  annualBaseline,
  aroundToday,
  BASELINE,
  buildSeries,
  ERA,
  lastDay as lastDayOf,
  mean,
  monthName as monthNameOf,
  monthToDate,
  monthlyBaseline,
  periodAverages,
  records as recordsOf,
  sameDaySeries,
  windowHistory,
  yearToDate,
} from "./lib/stats.js";
import { fetchForecast } from "./lib/live.js";
import { loadSeries } from "./lib/series.js";
import { UnitsProvider } from "./lib/units.jsx";

import Today from "./screens/Today.jsx";
import History from "./screens/History.jsx";
import Planet from "./screens/Planet.jsx";
import About from "./screens/About.jsx";
import LocationPicker from "./components/LocationPicker.jsx";
import { TabIcon } from "./components/icons.jsx";

const CITY_KEY = "climate.city";
const UNIT_KEY = "climate.unit";

const DEFAULT_CITY = {
  id: "nyc",
  name: "New York",
  region: "",
  country: "United States",
  lat: 40.7128,
  lon: -74.006,
};

function readCity() {
  try {
    const raw = localStorage.getItem(CITY_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && typeof c.lat === "number" && typeof c.lon === "number" && c.name) {
        return { ...DEFAULT_CITY, ...c };
      }
    }
  } catch {
    /* a corrupt choice is not worth failing over */
  }
  return DEFAULT_CITY;
}

function saveCity(city) {
  try {
    localStorage.setItem(CITY_KEY, JSON.stringify(city));
  } catch {
    /* ignore */
  }
}

function readUnit() {
  try {
    const u = localStorage.getItem(UNIT_KEY);
    return u === "f" ? "f" : "c";
  } catch {
    return "c";
  }
}

function saveUnit(unit) {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch {
    /* ignore */
  }
}

const TABS = [
  { id: "today", label: "Today", icon: "today" },
  { id: "history", label: "History", icon: "history" },
  { id: "planet", label: "Planet", icon: "planet" },
  { id: "about", label: "About", icon: "about" },
];

function buildModel(data) {
  const series = buildSeries(data);
  const last = lastDayOf(data);
  const monthName = monthNameOf(last.month);

  const annualBase = annualBaseline(series);
  const anomalies = annualAnomalies(series);
  const periods = periodAverages(series);
  const records = recordsOf(series);
  const monthlyBase = monthlyBaseline(series);

  const mtd = monthToDate(series, last.year, last.month, last.day);
  const history = windowHistory(series, last.month, last.day, 20);
  const sameDay = sameDaySeries(series, last.month, last.day);
  const ytd = yearToDate(series, last.year, last.month, last.day);

  const ranked = sameDay.rows
    .filter((r) => r.year <= last.year)
    .sort((a, b) => b.mean - a.mean);
  const rankIndex = ranked.findIndex((r) => r.year === last.year);

  const yearMonths = [];
  for (let m = 1; m <= 12; m++) {
    const mo = series.months.get(`${last.year}-${String(m).padStart(2, "0")}`);
    if (!mo || !monthlyBase[m]) continue;
    yearMonths.push({
      month: m,
      label: monthNameOf(m).slice(0, 3),
      mean: mo.mean,
      anomaly: mo.mean - monthlyBase[m],
    });
  }

  const meanOfYears = (from, to) => {
    const rows = anomalies.filter((a) => a.year >= from && a.year <= to);
    return rows.length ? mean(rows.map((r) => r.mean)) : null;
  };

  const periodTable = periods.decades.map((d) => {
    const lastDecadeYear = Math.max(
      ...anomalies.filter((a) => Math.floor(a.year / 10) * 10 === d.decade).map((a) => a.year),
    );
    return {
      label: d.full ? `${d.decade}–${d.decade + 9}` : `${d.decade}–${lastDecadeYear}`,
      short: d.full ? `${d.decade}s` : `${d.decade}–${String(lastDecadeYear).slice(2)}`,
      mean: d.mean,
      anomaly: d.mean - annualBase,
      note: d.full ? "" : "incomplete",
      bar: true,
    };
  });

  const lastCompleteYear = anomalies.at(-1).year;

  periodTable.push(
    {
      label: "1991–2020",
      short: "baseline",
      mean: annualBase,
      anomaly: 0,
      note: "reference",
      baseline: true,
    },
    {
      label: "Last 10 years",
      short: "last 10",
      mean: meanOfYears(lastCompleteYear - 9, lastCompleteYear),
      anomaly: meanOfYears(lastCompleteYear - 9, lastCompleteYear) - annualBase,
      bar: true,
    },
    {
      label: "Last 5 years",
      short: "last 5",
      mean: meanOfYears(lastCompleteYear - 4, lastCompleteYear),
      anomaly: meanOfYears(lastCompleteYear - 4, lastCompleteYear) - annualBase,
      bar: true,
    },
    {
      label: `${last.year} so far`,
      short: `${String(last.year).slice(2)} ytd`,
      mean: ytd.current,
      anomaly: ytd.anomaly,
      note: `Jan 1 – ${monthNameOf(last.month).slice(0, 3)} ${last.day}, baseline ${ytd.baseline.toFixed(1)} °C`,
    },
  );

  return {
    series,
    lastDay: last,
    monthName,
    annualBaseline: annualBase,
    anomalies,
    periods,
    records,
    monthlyBase,
    mtd,
    history,
    around: aroundToday(series, last, 15),
    era: ERA,
    baseline: BASELINE,
    sameDay: { ...sameDay, rank: rankIndex + 1, value: ranked[rankIndex]?.mean ?? null },
    yearToDate: ytd,
    yearMonths,
    periodTable,
    decadeRows: periodTable.filter((p) => p.bar),
  };
}

function LoadingCity({ city, status, error, onRetry, onPick }) {
  const years = new Date().getFullYear() - 1940;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status === "error") return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1 className="place">{city.name}</h1>
          <p className="place-sub">{[city.region, city.country].filter(Boolean).join(", ")}</p>
        </div>
      </header>

      {status === "error" ? (
        <div className="card">
          <div className="error-box">{error}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button className="ghost-btn" onClick={onRetry} title="Ask the archive again">
              Try again
            </button>
            <button
              className="ghost-btn"
              onClick={onPick}
              title="Search for another city or use your location"
            >
              Choose another place
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="skeleton" style={{ margin: 0 }}>
            <span className="spinner" aria-hidden="true" />
            Reading {years} years of daily records for {city.name}…
            {elapsed > 4 && <span className="tnum" style={{ marginLeft: 6 }}>{elapsed}s</span>}
          </p>
          <p className="note" style={{ marginTop: 10 }}>
            The archive returns a value for every day since 1940. The first time takes up to a
            minute; after that the record stays on this device and works offline.
          </p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [city, setCity] = useState(readCity);
  const [dataset, setDataset] = useState(null);
  const [historyStatus, setHistoryStatus] = useState("loading");
  const [historyError, setHistoryError] = useState(null);

  const [forecast, setForecast] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  const [tab, setTab] = useState(() => {
    const h = window.location.hash.replace("#", "");
    return TABS.some((t) => t.id === h) ? h : "today";
  });
  const [unit, setUnit] = useState(readUnit);

  const changeUnit = useCallback((next) => {
    saveUnit(next);
    setUnit(next);
  }, []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // History: bundled for New York, fetched and cached for everything else.
  useEffect(() => {
    let cancelled = false;
    setDataset(null);
    setHistoryStatus("loading");
    setHistoryError(null);

    loadSeries(city)
      .then((data) => {
        if (cancelled) return;
        setDataset(data);
        setHistoryStatus("done");
      })
      .catch((err) => {
        if (cancelled) return;
        setHistoryError(err.message || "The record could not be read.");
        setHistoryStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [city]);

  // Forecast: live, for the same place.
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setError(null);

    fetchForecast(city, { signal: controller.signal })
      .then((f) => {
        setForecast(f);
        setStatus("done");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message || "Unknown error.");
        setStatus("error");
      });

    return () => controller.abort();
  }, [city, reloadKey]);

  const model = useMemo(() => (dataset ? buildModel(dataset) : null), [dataset]);

  useEffect(() => {
    document.title = `Climate — ${city.name}, and how it has changed since 1940`;
  }, [city]);

  const aroundRows = useMemo(() => {
    if (!model) return [];
    const byDate = new Map(
      (forecast?.daily || []).map((d) => [d.date, (d.max + d.min) / 2]),
    );
    return model.around.map((r) => ({ ...r, forecast: byDate.get(r.iso) ?? null }));
  }, [model, forecast]);

  const choose = useCallback((next) => {
    saveCity(next);
    setCity(next);
    setPickerOpen(false);
    setTab("today");
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  if (!model) {
    return (
      <>
        <LoadingCity
          city={city}
          status={historyStatus}
          error={historyError}
          onRetry={() => {
            setDataset(null);
            setHistoryStatus("loading");
            loadSeries(city)
              .then((data) => {
                setDataset(data);
                setHistoryStatus("done");
              })
              .catch((err) => {
                setHistoryError(err.message);
                setHistoryStatus("error");
              });
          }}
          onPick={() => setPickerOpen(true)}
        />
        <LocationPicker
          open={pickerOpen}
          city={city}
          onClose={() => setPickerOpen(false)}
          onChoose={choose}
        />
      </>
    );
  }

  return (
    <UnitsProvider unit={unit}>
    <div className="app">
      {tab === "today" && (
        <Today
          city={city}
          model={model}
          forecast={forecast}
          status={status}
          error={error}
          onRefresh={refresh}
          onOpenPicker={() => setPickerOpen(true)}
          around={aroundRows}
          unit={unit}
          onUnitChange={changeUnit}
        />
      )}
      {tab === "history" && <History model={model} city={city} />}
      {tab === "planet" && <Planet global={globalData} city={city} />}
      {tab === "about" && <About city={city} data={dataset} global={globalData} model={model} />}

      <nav className="tabbar" aria-label="Sections">
        <div className="tabbar-inner" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className="tab"
              onClick={() => {
                setTab(t.id);
                window.history.replaceState(null, "", `#${t.id}`);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
              title={`${t.label}: ${
                t.id === "today"
                  ? "current conditions and this month against the average"
                  : t.id === "history"
                    ? `how the climate of ${city.name} changed since 1940`
                    : t.id === "planet"
                      ? "the global temperature record"
                      : "sources, method and limits"
              }`}
            >
              <TabIcon name={t.icon} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <LocationPicker
        open={pickerOpen}
        city={city}
        onClose={() => setPickerOpen(false)}
        onChoose={choose}
      />
    </div>
    </UnitsProvider>
  );
}

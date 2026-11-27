import { AnomalyBars, AroundTodayChart, MiniBars, tempColor } from "../components/charts.jsx";
import { WeatherIcon } from "../components/icons.jsx";
import { useUnits } from "../lib/units.jsx";

const ORD = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const deg = (v) => `${Math.round(v)}°`;

function Hero({ forecast, status, error, onRetry }) {
  const u = useUnits();

  if (status === "loading" && !forecast) {
    return (
      <p className="skeleton" style={{ margin: 0 }}>
        <span className="spinner" aria-hidden="true" />
        Reading the current conditions for this place…
      </p>
    );
  }

  if (status === "error" && !forecast) {
    return (
      <div>
        <div className="error-box">
          We could not load the forecast, so only the historical figures below are shown. {error}
        </div>
        <button className="ghost-btn" style={{ marginTop: 12 }} onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (!forecast) return null;
  const { current, daily } = forecast;
  const today = daily[0];

  return (
    <>
      <div className="hero">
        <div>
          <p className="hero-temp tnum">
            {u.t0(current.temp)}
            <sup>°</sup>
          </p>
          <p className="hero-condition">{current.text}</p>
          <p className="hero-hl tnum">
            H {deg(u.t(today.max))} · L {deg(u.t(today.min))}
          </p>
        </div>
        <div className="hero-icon">
          <WeatherIcon kind={current.kind} size={62} title={current.text} />
        </div>
      </div>
      <div className="hero-meta tnum">
        <span>
          Feels like<b>{deg(u.t(current.feels))}</b>
        </span>
        <span>
          Humidity<b>{Math.round(current.humidity)}%</b>
        </span>
        <span>
          Wind<b>{Math.round(current.wind)} km/h</b>
        </span>
      </div>
    </>
  );
}

function ForecastWeek({ daily }) {
  const u = useUnits();
  const maxes = daily.map((d) => d.max);
  const mins = daily.map((d) => d.min);
  const hi = Math.max(...maxes);
  const lo = Math.min(...mins);
  const span = Math.max(hi - lo, 1);

  return (
    <div className="forecast">
      {daily.map((d, i) => {
        const day = new Date(`${d.date}T12:00:00`);
        const name = i === 0 ? "Today" : day.toLocaleDateString("en-US", { weekday: "short" });
        const left = ((d.min - lo) / span) * 100;
        const width = Math.max(((d.max - d.min) / span) * 100, 6);
        return (
          <div
            className="forecast-row"
            key={d.date}
            title={`${d.text}, high ${Math.round(u.t(d.max))} low ${Math.round(u.t(d.min))}${
              d.rain !== null ? `, ${d.rain}% chance of precipitation` : ""
            }`}
          >
            <span className="forecast-day">{name}</span>
            <WeatherIcon kind={d.kind} size={20} title={d.text} />
            <span className="forecast-track">
              <span
                className="forecast-bar"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  background: tempColor((d.max + d.min) / 2),
                }}
              />
            </span>
            <span className="forecast-hl tnum">
              <b>{deg(u.t(d.max))}</b> / {deg(u.t(d.min))}
            </span>
            <span className="forecast-rain tnum">
              {d.rain !== null && d.rain >= 20 ? `${d.rain}%` : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Today({
  city,
  model,
  forecast,
  status,
  error,
  onRefresh,
  onOpenPicker,
  around,
  unit,
  onUnitChange,
}) {
  const u = useUnits();
  const { lastDay, mtd, sameDay, history, monthName } = model;

  const dayLabel = new Date(
    Date.UTC(lastDay.year, lastDay.month - 1, lastDay.day),
  ).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const warmer = mtd.anomaly >= 0;
  const rank = sameDay.rank;
  const todayRow = around.find((r) => r.isToday);
  const hasForecast = around.some((r) => r.forecast !== null && r.forecast !== undefined);

  return (
    <>
      <header className="topbar">
        <div>
          <button
            className="place-btn"
            onClick={onOpenPicker}
            title="Choose another place, or use your location"
            aria-label={`Change location. Now showing ${city.name}`}
          >
            <h1 className="place">{city.name}</h1>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p className="place-sub">
            {[city.region, city.country].filter(Boolean).join(", ") || dayLabel}
            {city.region || city.country ? ` · ${dayLabel}` : ""}
          </p>
        </div>

        <div className="topbar-actions">
          <div className="unit-toggle" role="group" aria-label="Temperature unit">
            <button
              aria-pressed={unit === "c"}
              onClick={() => onUnitChange("c")}
              title="Show temperatures in degrees Celsius"
            >
              °C
            </button>
            <button
              aria-pressed={unit === "f"}
              onClick={() => onUnitChange("f")}
              title="Show temperatures in degrees Fahrenheit"
            >
              °F
            </button>
          </div>
          <button
            className="ghost-btn refresh-btn"
            onClick={onRefresh}
            disabled={status === "loading"}
            title={
              status === "loading"
                ? "Updating the current conditions and the seven day forecast"
                : "Reload the current conditions and the seven day forecast"
            }
            aria-label="Reload the forecast"
          >
            <svg
              className="refresh-icon"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 11a8 8 0 1 0-2.3 6.3" />
              <path d="M20 5v6h-6" />
            </svg>
            <span className="refresh-label">
              {status === "loading" ? "Updating…" : "Refresh"}
            </span>
          </button>
        </div>
      </header>

      <section className="card" aria-label="Current conditions">
        <Hero forecast={forecast} status={status} error={error} onRetry={onRefresh} />
      </section>

      <section className="card" aria-label="Around today">
        <h2 className="section-title">Around today</h2>
        <p className="section-note">
          Fifteen days either side of today, as one continuous line. Green is this year, red is the
          1991–2020 normal, blue is the 1950s.
        </p>

        <AroundTodayChart rows={around} />

        <div className="legend">
          <span>
            <i className="swatch" style={{ background: "#2f7d5c" }} />
            {lastDay.year}
          </span>
          <span>
            <i className="swatch" style={{ background: "#b5462f" }} />
            {model.baseline.label.replace("-", "–")} normal
          </span>
          <span>
            <i className="swatch" style={{ background: "#2f74b5" }} />
            {model.era.label.replace("-", "–")}
          </span>
          <span>
            <i className="swatch" style={{ background: "#eceae3" }} />
            Middle 80%
          </span>
          {hasForecast && (
            <span>
              <i className="swatch swatch-dashed" />
              Forecast
            </span>
          )}
        </div>

        {todayRow && (
          <p className="chart-caption tnum">
            Today: {u.t1(todayRow.current)} {u.label}, {u.dSigned(todayRow.current - todayRow.baseline)}{" "}
            {u.label} against the {model.baseline.label.replace("-", "–")} normal for {monthName}{" "}
            {lastDay.day}
            {todayRow.era !== null && (
              <>
                , and {u.dSigned(todayRow.current - todayRow.era)} {u.label} against the{" "}
                {model.era.label.replace("-", "–")} average
              </>
            )}
            . The band is the range in which 8 years out of 10 fell.
          </p>
        )}
      </section>

      <section className="card" aria-label="This month against the baseline">
        <div className="delta-head">
          <span className="delta-label">{monthName} so far</span>
          <span className="delta-label" style={{ textTransform: "none", letterSpacing: 0 }}>
            vs 1991–2020
          </span>
        </div>

        <p className={`delta-value tnum ${warmer ? "warm" : "cold"}`}>
          {u.dSigned(mtd.anomaly)}
          <small> {u.label}</small>
        </p>

        <p className="delta-text">
          {warmer ? "Warmer" : "Cooler"} than the 1991–2020 average for the first {mtd.day} days of{" "}
          {monthName}.
        </p>

        <div style={{ marginTop: 16 }}>
          <MiniBars
            rows={history.rows.map((r) => ({ key: r.year, value: r.value }))}
            highlightKey={lastDay.year}
            maxAbs={Math.max(...history.rows.map((r) => Math.abs(r.value)), 2)}
            height={46}
          />
          <p className="delta-foot">
            <span>
              Each bar is one {monthName}, same {mtd.day} days.
            </span>
            <span className="tnum">
              {u.t1(mtd.current)} {u.label} vs {u.t1(mtd.baseline)} {u.label}
            </span>
          </p>
        </div>
      </section>

      <section className="card" aria-label="This day in history">
        <span className="delta-label">This day in history</span>

        <div className="rank-line" style={{ marginTop: 10 }}>
          <span className="rank-num tnum">{ORD(rank)}</span>
          <span>
            warmest {monthName} {lastDay.day} since 1940
          </span>
        </div>

        <p className="delta-text tnum" style={{ marginTop: 8 }}>
          Mean temperature {u.t1(sameDay.value)} {u.label}. The warmest was {sameDay.warmest.year},
          at {u.t1(sameDay.warmest.mean)} {u.label}.
        </p>

        <div style={{ marginTop: 14 }}>
          <AnomalyBars
            rows={sameDay.rows.map((r) => ({ key: r.year, label: r.year, value: r.value }))}
            highlightKey={lastDay.year}
            height={128}
            labelEvery={10}
            ariaLabel={`Daily mean temperature on ${lastDay.day} ${monthName}, every year since 1940, as an anomaly against the 1991 to 2020 average`}
          />
          <p className="chart-caption">
            Each bar is {monthName} {lastDay.day} in one year, compared with its own 1991–2020
            average. One day is weather, not climate: the long trend is in History.
          </p>
        </div>
      </section>

      {forecast?.daily?.length > 1 && (
        <section aria-label="Seven day forecast" style={{ marginTop: 26 }}>
          <h2 className="section-title">Next 7 days</h2>
          <p className="section-note">
            Forecast for {city.name}. The bar shows each day's range within the week.
          </p>
          <ForecastWeek daily={forecast.daily.slice(0, 7)} />
        </section>
      )}

      <p className="stale">
        History from ERA5, through{" "}
        {new Date(Date.UTC(lastDay.year, lastDay.month - 1, lastDay.day)).toLocaleDateString(
          "en-US",
          { day: "numeric", month: "long", year: "numeric" },
        )}
        . Forecast from Open-Meteo
        {forecast?.fetchedAt
          ? `, read at ${forecast.fetchedAt.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : ""}
        .
      </p>
    </>
  );
}

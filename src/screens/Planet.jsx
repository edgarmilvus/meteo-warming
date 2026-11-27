import { AnomalyBars } from "../components/charts.jsx";
import { useUnits } from "../lib/units.jsx";

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const signed = (v, digits = 2) =>
  `${v > 0 ? "+" : v < 0 ? "\u2212" : ""}${Math.abs(v).toFixed(digits)}`;

export default function Planet({ global, city }) {
  const u = useUnits();
  const rows = global.years.map((y) => ({ key: y.year, label: y.year, value: y.anomaly }));

  const inRange = (from, to) =>
    mean(global.years.filter((y) => y.year >= from && y.year <= to).map((y) => y.anomaly));

  const d1880 = inRange(1880, 1889);
  const d1991 = inRange(1991, 2020);
  const d2020 = inRange(2020, global.years.at(-1).year);

  const top10 = [...global.years].sort((a, b) => b.anomaly - a.anomaly).slice(0, 10);
  const allSince2015 = top10.every((y) => y.year >= 2015);

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="place">The planet</h1>
          <p className="place-sub">
            Global land and ocean, {global.years[0].year}–{global.years.at(-1).year}
          </p>
        </div>
      </header>

      <p className="lede" style={{ marginTop: 0 }}>
        {city.name} is one city, and a city can have a cold year while the planet warms. This is the
        global average, the number no single station can contradict.
      </p>

      <section className="card">
        <h2 className="section-title">Global temperature</h2>
        <p className="section-note">
          Each bar is one year, against the 1951–1980 average. This is NASA's own baseline, the one
          the dataset is published with.
        </p>
        <AnomalyBars
          rows={rows}
          highlightKey={global.years.at(-1).year}
          height={180}
          labelEvery={20}
          ariaLabel="Global annual temperature anomaly, 1880 to present"
        />
        <p className="chart-caption tnum">
          Warmest year on record: {top10[0].year}, {u.dSigned(top10[0].anomaly, 2)} {u.label}.
        </p>
      </section>

      <dl className="stats3">
        <div>
          <dt>1880s</dt>
          <dd className="down tnum">{u.dSigned(d1880, 2)}</dd>
          <small>{u.label} vs 1951–1980</small>
        </div>
        <div>
          <dt>1991–2020</dt>
          <dd className="tnum">{u.dSigned(d1991, 2)}</dd>
          <small>{u.label} vs 1951–1980</small>
        </div>
        <div>
          <dt>Since 2020</dt>
          <dd className="up tnum">{u.dSigned(d2020, 2)}</dd>
          <small>{u.label} vs 1951–1980</small>
        </div>
      </dl>

      {allSince2015 && (
        <p className="note" style={{ marginTop: 14 }}>
          The ten warmest years in this record are all since 2015. No year before 2005 appears in
          the top twenty.
        </p>
      )}

      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="section-title">Read the two charts together</h2>
        <p className="section-note" style={{ marginBottom: 0 }}>
          NASA measures against 1951–1980, which is about {u.d1(Math.abs(d1991))} {u.label} cooler
          than the 1991–2020 baseline used for {city.name}. Subtract that difference before
          comparing the city's numbers with the planet's, or the city will look warmer than it is.
        </p>
      </section>

      <p className="note">
        Source: {global.series}, {global.baseline} baseline.{" "}
        <a href={global.url} target="_blank" rel="noreferrer">
          data.giss.nasa.gov/gistemp
        </a>
        . Downloaded {global.fetched}.
      </p>
    </>
  );
}

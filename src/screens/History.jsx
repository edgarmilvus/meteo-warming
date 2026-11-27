import { AnomalyBars, PeriodBars, Stripes } from "../components/charts.jsx";
import { useUnits } from "../lib/units.jsx";

const signed = (v, digits = 1) =>
  `${v > 0 ? "+" : v < 0 ? "\u2212" : ""}${Math.abs(v).toFixed(digits)}`;

export default function History({ model, city }) {
  const u = useUnits();
  const { anomalies, periods, records, yearMonths, periodTable, monthlyBase, monthName, lastDay } =
    model;

  const yearRows = anomalies.map((a) => ({ key: a.year, label: a.year, value: a.anomaly }));
  const stripeRows = yearRows.map((r) => ({ key: r.key, value: r.value }));

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="place">History</h1>
          <p className="place-sub">
            {city.name}, {anomalies[0].year}–{anomalies.at(-1).year}
          </p>
        </div>
      </header>

      <p className="lede" style={{ marginTop: 0 }}>
        Every figure below comes from the same daily record, compared with the 1991–2020 average.
        Daily mean temperature, complete years only.
      </p>

      <section className="card">
        <h2 className="section-title">Annual average</h2>
        <p className="section-note">
          Each bar is one year. Above the line was warmer than 1991–2020, below was cooler. The
          baseline year group itself sits at zero by definition.
        </p>
        <AnomalyBars
          rows={yearRows}
          highlightKey={records.warmest.year}
          height={168}
          labelEvery={10}
          ariaLabel="Annual temperature anomaly for New York, 1940 to 2025"
        />
        <p className="chart-caption tnum">
          Warmest year: {records.warmest.year}, {u.dSigned(records.warmest.anomaly)} {u.label}.
          Coldest: {records.coldest.year}, {u.dSigned(records.coldest.anomaly)} {u.label}. Baseline
          average: {u.t1(model.annualBaseline)} {u.label}.
        </p>
      </section>

      <section className="card">
        <h2 className="section-title">Warming stripes</h2>
        <p className="section-note">One band per year, 1940 to {anomalies.at(-1).year}. No axes: just read left to right.</p>
        <Stripes rows={stripeRows} />
        <p className="chart-caption">
          Blue years were cooler than 1991–2020, red years warmer. The shift is in the second half
          of the record.
        </p>
      </section>

      <section className="card">
        <h2 className="section-title">Periods compared</h2>
        <p className="section-note">
          Averaging over decades removes the year-to-year noise. A single year can be cold in a
          warming climate, a decade cannot.
        </p>

        <PeriodBars rows={model.decadeRows.map((p) => ({ label: p.short, value: p.anomaly }))} />

        <table className="table" style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Period</th>
              <th style={{ textAlign: "right" }}>Mean</th>
              <th>vs 1991–2020</th>
            </tr>
          </thead>
          <tbody>
            {periodTable.map((p) => (
              <tr key={p.label} className={p.baseline ? "now" : undefined}>
                <td>
                  {p.label}
                  {p.note && (
                    <span style={{ color: "var(--muted)", fontSize: 11.5 }}> · {p.note}</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  {u.t1(p.mean)} {u.label}
                </td>
                <td style={{ textAlign: "right" }} className={p.anomaly >= 0 ? "up" : "down"}>
                  {u.dSigned(p.anomaly)} {u.label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="chart-caption">
          The 1991–2020 row is the reference every anomaly in the app is measured against, so it
          reads zero by construction.
        </p>
      </section>

      <section className="card">
        <h2 className="section-title">This year, month by month</h2>
        <p className="section-note">
          {lastDay.year} so far, each month against the same month of 1991–2020. Months after{" "}
          {monthName} have not happened yet.
        </p>
        <AnomalyBars
          rows={yearMonths.map((m) => ({ key: m.month, label: m.label, value: m.anomaly }))}
          highlightKey={lastDay.month}
          height={150}
          labelEvery={1}
          ariaLabel={`Monthly temperature anomaly for ${lastDay.year}`}
        />
        <p className="chart-caption tnum">
          {lastDay.year} to date: {u.t1(model.yearToDate.current)} {u.label},{" "}
          {u.dSigned(model.yearToDate.anomaly)} {u.label} against the baseline. Baseline for July,
          the warmest month: {u.t1(monthlyBase[7])} {u.label}.
        </p>
      </section>

      <section className="card">
        <h2 className="section-title">The ten warmest years</h2>
        <p className="section-note">
          Of the {anomalies.length} complete years in the record. Where they sit in the 20th century
          is the whole argument.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Year</th>
              <th>Mean</th>
              <th>vs 1991–2020</th>
            </tr>
          </thead>
          <tbody>
            {records.warmestYears.map((r, i) => (
              <tr key={r.year}>
                <td style={{ color: "var(--muted)" }}>{i + 1}</td>
                <td>
                  {r.year}
                  {r.year >= 2015 && <span style={{ color: "var(--muted)" }}> · since 2015</span>}
                </td>
                <td>
                  {u.t1(r.mean)} {u.label}
                </td>
                <td style={{ textAlign: "right" }} className="up">
                  {u.dSigned(r.anomaly)} {u.label}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="note">
        A decade here means the years 1940–1949, 1950–1959 and so on up to 2020–{lastDay.year}, the
        last one incomplete. The 5-year and 10-year figures use the most recent complete years.
      </p>
    </>
  );
}

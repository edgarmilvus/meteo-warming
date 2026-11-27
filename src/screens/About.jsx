export default function About({ city, data, global, model }) {
  const { lastDay } = model;

  return (
    <>
      <header className="topbar">
        <div>
          <h1 className="place">About</h1>
          <p className="place-sub">What the numbers mean and where they come from</p>
        </div>
      </header>

      <section className="card">
        <h2 className="section-title">What this app is</h2>
        <p className="note" style={{ marginBottom: 10 }}>
          A weather app that also keeps the history. The forecast is the part you open it for; the
          comparison below it is the part most apps leave out.
        </p>
        <p className="note">
          Every historical figure is computed on the device from one daily record — no server, no
          aggregation by hand, so anyone can check it against the source.
        </p>
      </section>

      <section className="card">
        <h2 className="section-title">The record for {city.name}</h2>
        <p className="note">
          Daily maximum and minimum temperature for the grid cell containing{" "}
          {city.lat.toFixed(2)}, {city.lon.toFixed(2)}, from {data.start} to {data.end},{" "}
          {data.days.toLocaleString("en-US")} days. Source: {data.source.name},{" "}
          {data.source.licence}. Downloaded {data.source.fetched}.
        </p>
        <p className="note">
          <a href={data.source.url} target="_blank" rel="noreferrer">
            open-meteo.com/en/docs/historical-weather-api
          </a>
        </p>
      </section>

      <section className="card">
        <h2 className="section-title">The global record</h2>
        <p className="note">
          {global.series}, annual means, {global.baseline} baseline, {global.years.length} years
          from {global.years[0].year} to {global.years.at(-1).year}. Downloaded {global.fetched}.
        </p>
        <p className="note">
          <a href={global.url} target="_blank" rel="noreferrer">
            data.giss.nasa.gov/gistemp
          </a>
        </p>
      </section>

      <section className="card">
        <h2 className="section-title">Method</h2>
        <p className="note">
          <strong>Daily mean</strong> is the average of the daily maximum and minimum. It is a
          close approximation of the true daily mean and is used consistently, so the comparisons
          hold.
        </p>
        <p className="note">
          <strong>Baseline</strong> is 1991–2020: the 30-year average the World Meteorological
          Organization uses for climate normals. An anomaly is a value minus that average.
        </p>
        <p className="note">
          <strong>Month so far</strong> compares the same calendar days — the first {model.mtd.day}{" "}
          days of {model.monthName} — in every baseline year, so a month in progress is not
          compared with a whole month.
        </p>
        <p className="note">
          <strong>Ranks and records</strong> use every year with data for that exact day. A year is
          counted in annual figures only with at least 360 days of records; {lastDay.year} is
          excluded until it is complete.
        </p>
      </section>

      <section className="card">
        <h2 className="section-title">What it cannot tell you</h2>
        <p className="note">
          The record is a reanalysis grid cell about 25 km across, not a single weather station, so
          it can differ from what a thermometer in one park measured.
        </p>
        <p className="note">
          Reanalysis is revised as models and observations improve; figures can move by a few
          tenths of a degree between releases.
        </p>
        <p className="note">
          One month, or one day, is weather. Comparisons only carry the signal of climate over
          decades — which is why the History tab averages as it does.
        </p>
        <p className="note">
          One city is not the planet. The Planet tab exists for exactly that reason.
        </p>
      </section>
    </>
  );
}

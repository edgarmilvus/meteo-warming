// All the numbers the app shows are computed here, from the baked daily series.
// Nothing in this file talks to the network: the series is already local, so the
// app works offline and the historical figures are reproducible.

export const BASELINE = { from: 1991, to: 2020, label: "1991-2020" };

/** An older decade, drawn as a third line on the "around today" chart. */
export const ERA = { from: 1951, to: 1960, label: "1951-1960" };

const DAY = 86400000;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const monthName = (m) => MONTHS[m - 1]; // m is 1-12
export const monthShort = (m) => MONTHS[m - 1].slice(0, 3);
export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

function toDate(startISO, i) {
  const [y, m, d] = startISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + i * DAY);
}

const dailyMean = (max, min) => (max === null || min === null ? null : (max + min) / 2);

/**
 * Turns the flat baked arrays into lookup tables:
 *  - months: "2024-07" -> { year, month, mean, n }
 *  - years:  2024       -> { year, mean, n, complete }
 *  - days:   "07-14"    -> [{ year, mean }]  (same calendar day, every year)
 */
export function buildSeries(data) {
  const months = new Map();
  const years = new Map();
  const days = new Map();

  for (let i = 0; i < data.days; i++) {
    const d = toDate(data.start, i);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const t = dailyMean(data.tmax[i], data.tmin[i]);
    if (t === null) continue;

    const mk = `${y}-${String(m).padStart(2, "0")}`;
    let mo = months.get(mk);
    if (!mo) months.set(mk, (mo = { year: y, month: m, sum: 0, n: 0 }));
    mo.sum += t;
    mo.n += 1;

    let yr = years.get(y);
    if (!yr) years.set(y, (yr = { year: y, sum: 0, n: 0 }));
    yr.sum += t;
    yr.n += 1;

    const dk = `${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    let arr = days.get(dk);
    if (!arr) days.set(dk, (arr = []));
    arr.push({ year: y, mean: t });
  }

  for (const mo of months.values()) mo.mean = mo.sum / mo.n;
  for (const yr of years.values()) {
    yr.mean = yr.sum / yr.n;
    yr.complete = yr.n >= 360;
  }

  return { months, years, days };
}

/** Average monthly means over the baseline period, one per calendar month. */
export function monthlyBaseline(series) {
  const out = [];
  for (let m = 1; m <= 12; m++) {
    const vals = [];
    for (let y = BASELINE.from; y <= BASELINE.to; y++) {
      const mo = series.months.get(`${y}-${String(m).padStart(2, "0")}`);
      if (mo) vals.push(mo.mean);
    }
    out[m] = vals.length >= 25 ? mean(vals) : null;
  }
  return out;
}

/** Average annual mean over the baseline period. */
export function annualBaseline(series) {
  const vals = [];
  for (let y = BASELINE.from; y <= BASELINE.to; y++) {
    const yr = series.years.get(y);
    if (yr && yr.complete) vals.push(yr.mean);
  }
  return mean(vals);
}

/** Every complete year, oldest first, with its anomaly. */
export function annualAnomalies(series) {
  const base = annualBaseline(series);
  const rows = [];
  for (const yr of [...series.years.values()].sort((a, b) => a.year - b.year)) {
    if (!yr.complete) continue;
    rows.push({ year: yr.year, mean: yr.mean, anomaly: yr.mean - base });
  }
  return rows;
}

/**
 * Month-to-date: the first `day` days of a month in a given year, against the
 * same first `day` days of every baseline year. Comparing like with like is the
 * only honest way to say "this month so far".
 */
export function monthToDate(series, year, month, day) {
  const mm = String(month).padStart(2, "0");

  const dayMeans = (y) => {
    const out = [];
    for (let d = 1; d <= day; d++) {
      const key = `${mm}-${String(d).padStart(2, "0")}`;
      const hit = series.days.get(key)?.find((r) => r.year === y);
      if (hit) out.push(hit.mean);
    }
    return out;
  };

  const current = mean(dayMeans(year));

  const baseVals = [];
  for (let y = BASELINE.from; y <= BASELINE.to; y++) {
    const vals = dayMeans(y);
    if (vals.length === day) baseVals.push(mean(vals));
  }
  const baseline = mean(baseVals);

  return {
    year,
    month,
    day,
    current,
    baseline,
    anomaly: current !== null && baseline !== null ? current - baseline : null,
    baselineYears: baseVals.length,
  };
}

/** Every year that has this calendar day, with the same-day rank of the newest. */export function sameDayRank(series, month, day, uptoYear = 9999) {
  const key = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const rows = (series.days.get(key) || [])
    .filter((r) => r.year <= uptoYear)
    .sort((a, b) => b.mean - a.mean);
  return rows;
}

/** Decade averages of complete years, plus rolling 5-year means for the chart. */
export function periodAverages(series) {
  const rows = annualAnomalies(series);
  const byDecade = new Map();
  for (const r of rows) {
    const d = Math.floor(r.year / 10) * 10;
    if (!byDecade.has(d)) byDecade.set(d, []);
    byDecade.get(d).push(r.mean);
  }
  const decades = [...byDecade.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([decade, vals]) => ({ decade, mean: mean(vals), n: vals.length, full: vals.length >= 8 }));

  const last = (k) => mean(rows.slice(-k).map((r) => r.mean));

  return { decades, rows, last5: last(5), last10: last(10), first10: mean(rows.slice(0, 10).map((r) => r.mean)) };
}

/** Highest / lowest year on record, and the warmest N years. */
export function records(series) {
  const rows = annualAnomalies(series);
  const sorted = [...rows].sort((a, b) => b.anomaly - a.anomaly);
  return {
    warmest: sorted[0],
    coldest: sorted[sorted.length - 1],
    warmestYears: sorted.slice(0, 10),
    span: [rows[0].year, rows[rows.length - 1].year],
    rows,
  };
}

export { MONTHS, dailyMean, toDate };

/** The most recent day in the baked series. */
export function lastDay(data) {
  const d = toDate(data.start, data.days - 1);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Mean of a fixed window (first `day` days of a month) in one year. */
function windowMean(series, year, month, day) {
  const mm = String(month).padStart(2, "0");
  let sum = 0;
  let n = 0;
  for (let d = 1; d <= day; d++) {
    const hit = series.days
      .get(`${mm}-${String(d).padStart(2, "0")}`)
      ?.find((r) => r.year === year);
    if (hit) {
      sum += hit.mean;
      n += 1;
    }
  }
  return n === day ? sum / n : null;
}

/** The same window averaged over the baseline years, so the comparison is like for like. */
export function windowBaseline(series, month, day) {
  const vals = [];
  for (let y = BASELINE.from; y <= BASELINE.to; y++) {
    const v = windowMean(series, y, month, day);
    if (v !== null) vals.push(v);
  }
  return { mean: mean(vals), years: vals.length };
}

/** Year by year, the same window's anomaly. Used for the small strip on Today. */
export function windowHistory(series, month, day, count = 20) {
  const base = windowBaseline(series, month, day);
  const lastYear = Math.max(...series.years.keys());
  const rows = [];
  for (let y = lastYear - count + 1; y <= lastYear; y++) {
    const v = windowMean(series, y, month, day);
    if (v !== null) rows.push({ year: y, value: v - base.mean, mean: v });
  }
  return { rows, baseline: base.mean, baselineYears: base.years };
}

/**
 * A window of days centred on the last day in the record, with the same
 * calendar days averaged over the baseline years. Used by the "around today"
 * chart: the present in the middle, 15 days either side.
 */
export function aroundToday(series, last, radius = 15) {
  const pad2 = (n) => String(n).padStart(2, "0");
  const base = new Date(Date.UTC(last.year, last.month - 1, last.day));
  const rows = [];

  for (let i = -radius; i <= radius; i++) {
    const d = new Date(base.getTime() + i * DAY);
    const y = d.getUTCFullYear();
    const mo = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const key = `${pad2(mo)}-${pad2(day)}`;

    const all = series.days.get(key) || [];
    const current = all.find((r) => r.year === y)?.mean ?? null;

    const inRange = (from, to) =>
      all.filter((r) => r.year >= from && r.year <= to).map((r) => r.mean);

    const baseVals = inRange(BASELINE.from, BASELINE.to).sort((a, b) => a - b);
    const quant = (p) =>
      baseVals.length ? baseVals[Math.min(baseVals.length - 1, Math.floor(p * (baseVals.length - 1)))] : null;

    rows.push({
      iso: d.toISOString().slice(0, 10),
      label: `${monthShort(mo)} ${day}`,
      month: mo,
      day,
      offset: i,
      isToday: i === 0,
      current,
      baseline: mean(baseVals),
      lo: quant(0.1),
      hi: quant(0.9),
      era: mean(inRange(ERA.from, ERA.to)),
    });
  }

  return rows;
}

/** Same calendar day across the years, as anomalies against its own 1991-2020 mean. */
export function sameDaySeries(series, month, day) {
  const all = series.days.get(`${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`) || [];
  const baseVals = all.filter((r) => r.year >= BASELINE.from && r.year <= BASELINE.to).map((r) => r.mean);
  const base = mean(baseVals);
  const rows = [...all]
    .sort((a, b) => a.year - b.year)
    .map((r) => ({ year: r.year, mean: r.mean, value: r.mean - base }));
  const warmest = [...all].sort((a, b) => b.mean - a.mean)[0];
  return { rows, baseline: base, warmest };
}

/**
 * January 1 to a given day, against the same window in every baseline year.
 * A partial year must never be compared with a whole-year average: the seasons
 * in the window decide the number.
 */
export function yearToDate(series, year, month, day) {
  const pad2 = (n) => String(n).padStart(2, "0");
  const collect = (y) => {
    const vals = [];
    for (let m = 1; m <= month; m++) {
      const lastD = m === month ? day : new Date(Date.UTC(y, m, 0)).getUTCDate();
      for (let d = 1; d <= lastD; d++) {
        const hit = series.days.get(`${pad2(m)}-${pad2(d)}`)?.find((r) => r.year === y);
        if (hit) vals.push(hit.mean);
      }
    }
    return vals;
  };

  const cur = collect(year);
  const baseVals = [];
  for (let y = BASELINE.from; y <= BASELINE.to; y++) {
    const v = collect(y);
    if (v.length === cur.length) baseVals.push(mean(v));
  }

  return {
    current: mean(cur),
    baseline: mean(baseVals),
    anomaly: mean(cur) - mean(baseVals),
    days: cur.length,
    baselineYears: baseVals.length,
  };
}

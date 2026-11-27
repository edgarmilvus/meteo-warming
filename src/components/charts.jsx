import { useEffect, useRef, useState } from "react";
import { useUnits } from "../lib/units.jsx";

/** Tracks the rendered width of a container so charts draw at real pixels. */
export function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}

const WARM = [181, 70, 47];
const WARM_LIGHT = [246, 227, 220];
const COLD = [47, 107, 147];
const COLD_LIGHT = [223, 233, 240];
const NEUTRAL = [238, 237, 233];

const mix = (a, b, t) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(" ")})`;

/** Diverging colour for an anomaly: blue below zero, terracotta above. */
export function colorFor(value, maxAbs) {
  if (value === null || value === undefined) return `rgb(${NEUTRAL.join(" ")})`;
  const m = Math.max(maxAbs || 1, 0.1);
  const t = Math.min(1, Math.pow(Math.abs(value) / m, 0.75));
  return value >= 0 ? mix(WARM_LIGHT, WARM, t) : mix(COLD_LIGHT, COLD, t);
}

/** Sequential colour for an absolute temperature, so ranges read as warm and cold. */
export function tempColor(t) {
  const stops = [
    [-10, [109, 143, 176]],
    [0, [143, 176, 199]],
    [10, [201, 160, 106]],
    [20, [194, 106, 82]],
    [30, [168, 62, 44]],
  ];
  if (t <= stops[0][0]) return mix(stops[0][1], stops[0][1], 0);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      return mix(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return mix(stops.at(-1)[1], stops.at(-1)[1], 0);
}

const fmt = (v, digits = 1) =>
  `${v > 0 ? "+" : v < 0 ? "\u2212" : ""}${Math.abs(v).toFixed(digits)}`;

/** Axis ticks: no "+0.0", no trailing zeros, two decimals only below 1. */
function tickLabel(t) {
  if (t === 0) return "0";
  const abs = Math.abs(t);
  const s = abs.toFixed(abs < 1 ? 2 : 1).replace(/\.?0+$/, "");
  return `${t > 0 ? "+" : "\u2212"}${s}`;
}

/**
 * Vertical bars around a zero line. Used for annual anomalies, monthly
 * anomalies and same-day comparisons.
 */
export function AnomalyBars({
  rows,
  height = 150,
  maxAbs,
  labelEvery = 10,
  highlightKey,
  valueLabels = false,
  formatValue,
  ariaLabel,
}) {
  const u = useUnits();
  const [ref, width] = useWidth();
  const m = { l: 34, r: 8, t: 16, b: 20 };
  const innerW = Math.max(40, width - m.l - m.r);
  const innerH = Math.max(40, height - m.t - m.b);

  const values = rows.map((r) => r.value).filter((v) => v !== null && !Number.isNaN(v));
  const autoMax = Math.max(
    ...values.map((v) => Math.abs(v)),
    0.4,
  );
  const M = maxAbs || Math.max(1, Math.ceil(autoMax));
  const y = (v) => m.t + innerH * (1 - (v + M) / (2 * M));
  const zero = y(0);

  const n = rows.length || 1;
  const slot = innerW / n;
  const bw = Math.max(1.2, slot * 0.68);

  const ticks = [M, M / 2, 0, -M / 2, -M];

  return (
    <div ref={ref}>
      <svg
        className="chart"
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel || "Bar chart"}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={m.l}
              x2={m.l + innerW}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? "#c9c5bc" : "#efede8"}
              strokeWidth={t === 0 ? 1 : 1}
            />
            <text
              x={m.l - 7}
              y={y(t) + 3.2}
              textAnchor="end"
              fontSize="9.5"
              fill="#8d9098"
              className="tnum"
            >
              {t === 0 ? "0" : tickLabel(u.d(t))}
            </text>
          </g>
        ))}

        {rows.map((r, i) => {
          if (r.value === null || Number.isNaN(r.value)) return null;
          const hot = r.key === highlightKey;
          const x = m.l + slot * i + (slot - bw) / 2;
          const top = Math.min(y(r.value), zero);
          const h = Math.max(1, Math.abs(y(r.value) - zero));
          return (
            <g key={r.key ?? i}>
              <rect
                x={x}
                y={top}
                width={bw}
                height={h}
                rx={bw > 4 ? 1.5 : 0.6}
                fill={colorFor(r.value, M)}
                opacity={highlightKey === undefined || hot ? 1 : 0.82}
              />
              {hot && (
                <rect
                  x={x - 1}
                  y={top - 1}
                  width={bw + 2}
                  height={h + 2}
                  rx={2.5}
                  fill="none"
                  stroke="#15181d"
                  strokeWidth="1.1"
                />
              )}
              {valueLabels && slot > 22 && (
                <text
                  x={m.l + slot * i + slot / 2}
                  y={r.value >= 0 ? top - 4 : top + h + 10}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#6f747c"
                  className="tnum"
                >
                  {formatValue ? formatValue(r.value) : u.dSigned(r.value)}
                </text>
              )}
            </g>
          );
        })}

        {rows.map((r, i) =>
          i % labelEvery === 0 ||
          (i === rows.length - 1 && (rows.length - 1) % labelEvery > labelEvery / 2) ? (
            <text
              key={`l-${r.key ?? i}`}
              x={m.l + slot * i + slot / 2}
              y={height - 5}
              textAnchor="middle"
              fontSize="9.5"
              fill="#8d9098"
              className="tnum"
            >
              {r.label ?? r.key}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

/** Compact bar strip with no axes, one emphasised bar. */
export function MiniBars({ rows, height = 44, highlightKey, maxAbs }) {
  const [ref, width] = useWidth();
  const values = rows.map((r) => r.value).filter((v) => v !== null);
  const M = maxAbs || Math.max(...values.map((v) => Math.abs(v)), 0.4);
  const n = rows.length || 1;
  const slot = width / n;
  const bw = Math.max(1.4, slot * 0.66);
  const mid = height * 0.55;
  const amp = height * 0.42;

  return (
    <div ref={ref} style={{ lineHeight: 0 }}>
      <svg className="chart" width={width} height={height} aria-hidden="true">
        <line x1="0" x2={width} y1={mid} y2={mid} stroke="#e5e3dd" strokeWidth="1" />
        {rows.map((r, i) => {
          if (r.value === null) return null;
          const h = Math.max(1, (Math.abs(r.value) / M) * amp);
          const hot = r.key === highlightKey;
          return (
            <rect
              key={r.key ?? i}
              x={slot * i + (slot - bw) / 2}
              y={r.value >= 0 ? mid - h : mid}
              width={bw}
              height={h}
              rx={Math.min(1.4, bw / 3)}
              fill={colorFor(r.value, M)}
              opacity={hot ? 1 : 0.5}
              stroke={hot ? "#15181d" : "none"}
              strokeWidth={hot ? 1.2 : 0}
            />
          );
        })}
      </svg>
    </div>
  );
}

/** Horizontal bars for period averages. Pure HTML so labels stay crisp. */
export function PeriodBars({ rows: rawRows }) {
  const u = useUnits();
  const rows = rawRows.map((r) => ({ ...r, value: u.d(r.value) }));
  const values = rows.map((r) => r.value);
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  const span = hi - lo || 1;
  const zeroPct = ((0 - lo) / span) * 100;

  return (
    <div className="periods">
      {rows.map((r) => {
        const left = ((Math.min(r.value, 0) - lo) / span) * 100;
        const w = (Math.abs(r.value) / span) * 100;
        return (
          <div className="period" key={r.label}>
            <span className="period-label">{r.label}</span>
            <span className="period-track">
              <span className="period-zero" style={{ left: `${zeroPct}%` }} />
              <span
                className="period-fill"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(w, 0.8)}%`,
                  background: r.value >= 0 ? "#c26a52" : "#5d8bab",
                }}
              />
            </span>
            <span className="period-value tnum">
              {fmt(r.value)} {u.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A window of days centred on today, as a continuous line: this year, the
 * 1991-2020 average for the same calendar days, the middle 80% of those years
 * as a band, and the forecast continuing to the right.
 */
export function AroundTodayChart({ rows: rawRows, height = 214, ariaLabel }) {
  const u = useUnits();
  const conv = (v) => (v === null || v === undefined ? null : u.t(v));
  const rows = rawRows.map((r) => ({
    ...r,
    current: conv(r.current),
    forecast: conv(r.forecast),
    baseline: conv(r.baseline),
    era: conv(r.era),
    lo: conv(r.lo),
    hi: conv(r.hi),
  }));
  const [ref, width] = useWidth();
  const m = { l: 30, r: 12, t: 18, b: 22 };
  const innerW = Math.max(60, width - m.l - m.r);
  const innerH = Math.max(60, height - m.t - m.b);
  const n = rows.length;

  if (!n) return <div ref={ref} />;

  const values = rows
    .flatMap((r) => [r.current, r.forecast, r.baseline, r.era, r.lo, r.hi])
    .filter((v) => v !== null && v !== undefined);
  if (!values.length) return <div ref={ref} />;

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const lo = Math.floor(rawMin - 1);
  const hi = Math.ceil(rawMax + 1);
  const span = hi - lo || 1;

  // Round tick values inside the domain, so the axis reads 0°, 5°, 10°.
  const rawStep = span / 4;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10]
    .map((k) => k * mag)
    .sort((a, b) => Math.abs(span / a - 4) - Math.abs(span / b - 4))[0];
  const ticks = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(Math.round(v * 100) / 100);

  const y = (v) => m.t + innerH * (1 - (v - lo) / span);
  const x = (i) => m.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);

  const path = (pick) => {
    let d = "";
    let pen = false;
    rows.forEach((r, i) => {
      const v = pick(r);
      if (v === null || v === undefined) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  // The band is drawn only over runs of consecutive days that have a range.
  const segments = [];
  let run = [];
  rows.forEach((r, i) => {
    if (r.lo !== null && r.hi !== null) run.push(i);
    else if (run.length) {
      segments.push(run);
      run = [];
    }
  });
  if (run.length) segments.push(run);

  const bandPath = segments
    .filter((s) => s.length > 1)
    .map((s) => {
      const up = s.map((i, k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(rows[i].hi).toFixed(1)}`).join("");
      const down = [...s].reverse().map((i) => `L${x(i).toFixed(1)},${y(rows[i].lo).toFixed(1)}`).join("");
      return `${up}${down}Z`;
    })
    .join(" ");

  const todayIndex = rows.findIndex((r) => r.isToday);

  const labelIdx = [];
  for (let i = 0; i < n; i += 7) labelIdx.push(i);
  if (!labelIdx.includes(n - 1) && n - 1 - labelIdx.at(-1) >= 3) labelIdx.push(n - 1);

  return (
    <div ref={ref}>
      <svg
        className="chart"
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel || "Temperature around today compared with the 1991 to 2020 average"}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={m.l}
              x2={m.l + innerW}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? "#ddd9d0" : "#efede8"}
            />
            <text
              x={m.l - 6}
              y={y(t) + 3.2}
              textAnchor="end"
              fontSize="9.5"
              fill="#8d9098"
              className="tnum"
            >
              {`${t}°`}
            </text>
          </g>
        ))}

        {bandPath && <path d={bandPath} fill="#eceae3" />}

        {todayIndex >= 0 && (
          <>
            <line
              x1={x(todayIndex)}
              x2={x(todayIndex)}
              y1={m.t - 4}
              y2={m.t + innerH}
              stroke="#c8c4bb"
              strokeDasharray="2 3"
            />
            <text
              x={x(todayIndex)}
              y={m.t - 7}
              textAnchor="middle"
              fontSize="9.5"
              fill="#8d9098"
            >
              today
            </text>
          </>
        )}

        <path d={path((r) => r.baseline)} fill="none" stroke="#b5462f" strokeWidth="1.7" />
        <path d={path((r) => r.era)} fill="none" stroke="#2f74b5" strokeWidth="1.7" />
        <path
          d={path((r) => r.forecast)}
          fill="none"
          stroke="#2f7d5c"
          strokeWidth="2"
          strokeDasharray="4 3"
          opacity="0.5"
        />
        <path
          d={path((r) => r.current)}
          fill="none"
          stroke="#2f7d5c"
          strokeWidth="2.3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {todayIndex >= 0 && rows[todayIndex].current !== null && (
          <circle
            cx={x(todayIndex)}
            cy={y(rows[todayIndex].current)}
            r="3.4"
            fill="#2f7d5c"
            stroke="#fff"
            strokeWidth="1.6"
          />
        )}

        {labelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 5}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            fontSize="9.5"
            fill="#8d9098"
          >
            {rows[i].label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** The warming stripes: one band per year, no axes, no legend. */export function Stripes({ rows, maxAbs }) {
  const u = useUnits();
  const M = maxAbs || Math.max(...rows.map((r) => Math.abs(r.value)), 0.5);
  return (
    <div>
      <div className="stripes" role="img" aria-label="Warming stripes, one band per year">
        {rows.map((r) => (
          <i key={r.key} style={{ background: colorFor(r.value, M) }} title={`${r.key}: ${u.dSigned(r.value)} ${u.label}`} />
        ))}
      </div>
      <div className="stripe-years">
        <span>{rows[0]?.key}</span>
        <span>{rows.at(-1)?.key}</span>
      </div>
    </div>
  );
}

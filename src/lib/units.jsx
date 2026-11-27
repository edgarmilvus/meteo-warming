import { createContext, useContext, useMemo } from "react";

// Temperatures live in Celsius everywhere inside the app: the record, the
// baseline, every calculation. Only the display converts, so switching units
// never changes a single figure, just how it is written.

const toF = (c) => (c * 9) / 5 + 32;

const signed = (v, digits) =>
  `${v > 0 ? "+" : v < 0 ? "\u2212" : ""}${Math.abs(v).toFixed(digits)}`;

const UnitsContext = createContext(null);

export function UnitsProvider({ unit, children }) {
  const value = useMemo(() => {
    const f = unit === "f";

    // Absolute temperature, e.g. 12 °C -> 54 °F
    const t = (c) => (c === null || c === undefined ? null : f ? toF(c) : c);
    // A difference, e.g. an anomaly of +1.3 °C -> +2.3 °F. No 32 offset.
    const d = (c) => (c === null || c === undefined ? null : f ? c * 1.8 : c);

    return {
      unit,
      label: f ? "°F" : "°C",
      t,
      d,
      t0: (c) => (t(c) === null ? "—" : String(Math.round(t(c)))),
      t1: (c) => (t(c) === null ? "—" : t(c).toFixed(1)),
      d1: (c) => (d(c) === null ? "—" : d(c).toFixed(1)),
      dSigned: (c, digits = 1) => (d(c) === null ? "—" : signed(d(c), digits)),
    };
  }, [unit]);

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  return useContext(UnitsContext);
}

/** Chart colours are assigned from the Celsius value; the scale is in °C by design. */
export const isFahrenheit = (u) => u.unit === "f";

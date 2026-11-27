import { useEffect, useRef, useState } from "react";
import { currentPosition, reversePlace, searchPlaces } from "../lib/geocode.js";

export default function LocationPicker({ open, city, onClose, onChoose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [state, setState] = useState("idle"); // idle | searching | done | empty | error | locating
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setState("idle");
    setError(null);
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setState("idle");
      return;
    }

    const controller = new AbortController();
    setState("searching");
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const places = await searchPlaces(q, { signal: controller.signal });
        setResults(places);
        setState(places.length ? "done" : "empty");
      } catch (err) {
        if (err.name === "AbortError") return;
        setError(err.message || "The place search failed.");
        setState("error");
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  async function useHere() {
    setState("locating");
    setError(null);
    try {
      const { lat, lon } = await currentPosition();
      const place = await reversePlace(lat, lon);
      onChoose(place);
    } catch (err) {
      setError(err.message || "Your location could not be read.");
      setState("error");
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <div className="sheet-head">
          <div>
            <h2 id="picker-title" className="sheet-title">
              Choose a place
            </h2>
            <p className="sheet-sub">
              The whole history from 1940 is read for the place you pick, and kept on this device.
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close the place picker" aria-label="Close">
            ×
          </button>
        </div>

        <input
          ref={inputRef}
          className="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a city or town"
          aria-label="Search a city or town"
          autoComplete="off"
        />

        <button className="here-btn" onClick={useHere} disabled={state === "locating"}>
          {state === "locating" ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Reading your location…
            </>
          ) : (
            "Use my location"
          )}
        </button>
        <p className="hint">
          {city.name} is showing now. Your location is used only to pick the coordinates of the
          record; it is not sent anywhere else.
        </p>

        {state === "searching" && (
          <p className="skeleton" style={{ marginTop: 14 }}>
            <span className="spinner" aria-hidden="true" />
            Searching for “{query.trim()}”…
          </p>
        )}

        {error && (
          <div className="error-box" style={{ marginTop: 14 }}>
            {error}
          </div>
        )}

        {state === "empty" && (
          <p className="empty" style={{ marginTop: 14 }}>
            No place matches “{query.trim()}”. Try a larger town nearby.
          </p>
        )}

        {results.length > 0 && (
          <>
            <p className="list-count">
              {results.length} {results.length === 1 ? "place" : "places"}
            </p>
            <ul className="places">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    className="place-item"
                    onClick={() => onChoose(p)}
                    title={`Show the record for ${p.name}`}
                  >
                    <span className="place-name">{p.name}</span>
                    <span className="place-meta">
                      {[p.region, p.country].filter(Boolean).join(", ") || "—"}
                    </span>
                    <span className="place-coords tnum">
                      {p.lat.toFixed(2)}, {p.lon.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

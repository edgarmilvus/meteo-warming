# Climate — a weather app that keeps the history

A weather app for any city, with the part other weather apps leave out: every
figure can be read against the 1991–2020 normal, and the whole record since 1940
is one tab away.

Default place: **New York**. The interface is in English.

---

## Run it

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview    # serve the build
```

Node 20+. No API keys, no environment variables, no backend.

---

## What is on each tab

**Today** — current conditions and the seven day forecast, then:

- *Around today*: a continuous line for the 15 days either side of today.
  Green is this year, red is the 1991–2020 normal for the same calendar days,
  blue is the 1951–1960 average, the grey band is the middle 80% of the
  baseline years, the dashed green is the forecast.
- *This month so far*: the month to date against the same calendar days in every
  baseline year, plus the last 20 years as a strip.
- *This day in history*: the rank of today among every year since 1940 that has
  the same calendar day.
- *Next 7 days*.

**History** — annual anomalies 1940–today, warming stripes, period averages
(decades, last 10 years, last 5, year to date), the current year month by month,
and the ten warmest years.

**The planet** — NASA GISTEMP global land-ocean annual means, 1880 to the last
complete year, with the note on how its 1951–1980 baseline differs from the
city's 1991–2020 one.

**About** — sources, method, limits.

---

## Places

The city name in the header opens the picker: type a name, pick a result, or use
**Use my location** (browser geolocation, reverse geocoded to a name).

- The choice is saved in `localStorage` under `climate.city` and restored on the
  next visit.
- New York ships with the app (`src/data/nyc.json`), so it opens instantly and
  works offline.
- Any other place is fetched once from the Open-Meteo archive (1940 → today) and
  kept in `localStorage`, at most three places, oldest evicted first. The first
  fetch for a place can take up to a minute; after that it is instant.

---

## Data

| Layer | Source | Baseline | Licence |
| --- | --- | --- | --- |
| Daily max/min, per city | ERA5 via [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) | 1991–2020, computed in the app | CC BY 4.0 |
| Forecast | [Open-Meteo Forecast API](https://open-meteo.com/en/docs) | — | CC BY 4.0 |
| Place search | Open-Meteo Geocoding API | — | CC BY 4.0 |
| Reverse geocoding | BigDataCloud client API | — | free client-side |
| Global annual | [NASA GISTEMP v4](https://data.giss.nasa.gov/gistemp/) | 1951–1980, as published | public domain |

Refresh the bundled data once a month:

```bash
npm run data      # rewrites src/data/nyc.json and src/data/global.json
```

The script writes `src/data/nyc.json` (about 280 KB, one value per day) and
`src/data/global.json`. NASA sometimes drops the TLS connection; the script then
falls back to `scripts/gistemp-fallback.csv`.

> **Licence note.** Open-Meteo's free tier is for non-commercial use, and the
> Historical Weather API is only in the paid Professional plan. A free app with
> no ads or purchases is fine today; before monetising, either subscribe or
> precompute the history from ERA5/Copernicus in bulk.

---

## How the numbers are computed

All in `src/lib/stats.js`, from the daily series, on the device:

- **Daily mean** = (daily max + daily min) / 2, used consistently everywhere.
- **Baseline** = 1991–2020, the WMO climate-normal window.
- **Month to date** compares the first *n* days of the month with the first *n*
  days of the same month in every baseline year — never a partial month against
  a whole one.
- **Year to date** does the same from January 1, and only against baseline years
  with the same window length.
- **Annual figures** use years with at least 360 days of records.
- **Ranks** use every year that has the exact calendar day.
- **Decades** are 1940–1949 … 2020–2025, the last one marked incomplete.

---

## Layout

```
App.js                  the original React Native prototype (unchanged)
app/
  scripts/fetch-data.mjs  bakes the static datasets
  src/data/               baked series (nyc.json, global.json)
  src/lib/stats.js        every historical figure
  src/lib/live.js         forecast fetch + WMO weather codes
  src/lib/geocode.js      place search, geolocation, reverse geocode
  src/lib/series.js       bundled / cached / fetched daily records
  src/components/         charts (hand drawn SVG), icons, place picker
  src/screens/            Today, History, Planet, About
  src/styles.css          the whole design system
```

Charts are plain SVG drawn at measured pixel width, no chart library: the same
components port to `react-native-svg` almost line for line when the app moves to
Expo for the iOS and Android builds.

---

## Limits worth stating in the app

- The record is a reanalysis grid cell about 25 km across, not a station
  thermometer.
- Reanalysis is revised as models improve; values can move by a few tenths.
- One day or one month is weather. Only decades carry the climate signal.
- One city is not the planet, which is why the Planet tab exists.

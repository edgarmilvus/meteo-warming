# Meteo and Global Warming — a weather app that keeps the history and shows global warming

A weather app for any city, with the part other weather apps leave out: every
figure can be read against the 1991–2020 normal, and the whole record since 1940
is one tab away.

Runs as a web app, an installable PWA, and an Android APK. Default place:
**New York**. The interface is in English.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview    # serve the build
```

Node 22+. No API keys, no environment variables, no backend.

Refresh the bundled datasets (New York + NASA, once a month):

```bash
npm run data
```

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

### Units

A °C / °F switch sits in the header, next to the refresh button. It changes
every temperature and every anomaly in the app, charts included, and is
remembered in `localStorage` under `climate.unit` (default °C).

Internally everything is Celsius; only the display converts. An absolute
temperature converts as `c * 9/5 + 32`, an anomaly (a difference) as `c * 1.8`,
because a difference has no offset.

---

## Places

The city name in the header opens the picker: type a name, pick a result, or use
**Use my location**.

- Search is Open-Meteo's geocoder, sorted with exact name matches first and then
  by population, so "Bologna" returns Bologna and not a village with the same
  name.
- **Use my location** asks the system permission through
  `@capacitor/geolocation` inside the Android/iOS shell (a bare WebView never
  shows the prompt) and through `navigator.geolocation` in a browser. It asks for
  low accuracy on purpose: a 25 km grid cell does not need GPS, and low accuracy
  returns in seconds.
- The choice is saved in `localStorage` under `climate.city` and restored on the
  next visit.
- New York ships with the app (`src/data/nyc.json`), so it opens instantly and
  works offline.
- Any other place is fetched once from the Open-Meteo archive (1940 → today) and
  kept in `localStorage`, at most three places, oldest evicted first. The first
  fetch for a place can take up to a minute (the archive builds the series on the
  fly); after that it is instant and offline.

---

## Data

| Layer | Source | Baseline | Licence |
| --- | --- | --- | --- |
| Daily max/min, per city | ERA5 via [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api) | 1991–2020, computed in the app | CC BY 4.0 |
| Forecast | [Open-Meteo Forecast API](https://open-meteo.com/en/docs) | — | CC BY 4.0 |
| Place search | Open-Meteo Geocoding API | — | CC BY 4.0 |
| Reverse geocoding | BigDataCloud client API | — | free client-side |
| Global annual | [NASA GISTEMP v4](https://data.giss.nasa.gov/gistemp/) | 1951–1980, as published | public domain |

`npm run data` writes `src/data/nyc.json` (about 280 KB, one value per day) and
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

## Android

Capacitor wraps the built web app. The native project is generated in CI, not
committed.

**Build without installing anything:** the `Android APK` workflow
(`.github/workflows/android.yml`) runs on `ubuntu-latest`, which already has the
JDK and the Android SDK, and uploads `app-debug.apk` as an artifact.

```bash
gh workflow run android.yml      # or: Actions → Android APK → Run workflow
```

**Build locally** (needs a JDK and the Android SDK, ~1.3 GB):

```bash
npm run cap:sync            # build + copy into the native project
npx cap add android        # once
cd android && ./gradlew assembleDebug
```

Current build: `com.edgarmilvus.climate`, versionCode 1, minSdk 24 (Android 7),
targetSdk 36, about 4.8 MB.

**Installing:** sideload the APK (`adb install app-debug.apk`, AirDrop, or a
local HTTP server). Debug builds from CI are signed with the runner's throwaway
debug key, so **uninstall the previous version before installing a new one** —
Android refuses an update signed with a different key.

**Permissions:** `INTERNET`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`.
The workflow adds the two location entries after generating the project.

---

## iOS

Same project, same command; only the signing differs.

`.github/workflows/ios.yml` runs on `macos-15` (Xcode 16.4 preinstalled), adds
`NSLocationWhenInUseUsageDescription` to `Info.plist`, and compiles an
**unsigned** simulator build to prove nothing is iOS-specific broken.

An installable `.ipa` needs an Apple Developer Program membership (99 $/year),
an Apple Distribution certificate (`.p12` + password), a provisioning profile and
the Team ID. Those go in GitHub secrets and the job switches to
`xcodebuild archive` + `exportArchive` with an `ExportOptions.plist`
(`development` for your own iPhone, `app-store` for TestFlight). A free Apple ID
cannot do this in CI: it only provisions a 7-day build from Xcode with the device
plugged in.

---

## Layout

```
scripts/fetch-data.mjs    bakes the static datasets
scripts/make-icons.py     draws the PWA icons (needs PIL)
src/data/                 baked series (nyc.json, global.json)
src/lib/stats.js          every historical figure
src/lib/live.js           forecast fetch + WMO weather codes
src/lib/geocode.js        place search, geolocation, reverse geocode
src/lib/series.js         bundled / cached / fetched daily records
src/lib/units.jsx         Celsius to Fahrenheit at the display edge only
src/components/           charts (hand drawn SVG), icons, place picker
src/screens/              Today, History, Planet, About
src/styles.css            the whole design system
public/                   manifest, service worker, icons
capacitor.config.json     appId, appName, webDir
.github/workflows/        android.yml, ios.yml
```

The charts are plain SVG drawn at a measured pixel width, with no chart library,
so they render identically in the browser and in the WebView.

---

## Known gaps

- **Launcher icons** are still Capacitor's defaults on Android and iOS. The PWA
  icons in `public/icons` are the real ones; the native mipmaps and AppIcon set
  are not generated yet (`npx @capacitor/assets generate` is the intended tool).
- **No release build** yet: no keystore, no AAB, no Play listing.
- **No widget, no notifications**, which is what makes a weather app sticky.

---

## Limits worth stating in the app

- The record is a reanalysis grid cell about 25 km across, not a station
  thermometer.
- Reanalysis is revised as models improve; values can move by a few tenths.
- One day or one month is weather. Only decades carry the climate signal.
- One city is not the planet, which is why the Planet tab exists.

---

## Licence

The code is **MIT** — see [LICENSE](LICENSE). Use it, fork it, ship it, teach
with it.

The data is not mine to relicense:

- ERA5 through Open-Meteo is **CC BY 4.0**, attribution required.
- NASA GISTEMP is public domain, attribution appreciated.
- Reverse geocoding by BigDataCloud, under their free client-side terms.

If you reuse the app, keep the source lines in the About tab and the
attribution in the footer: the whole argument rests on the data being
checkable.`

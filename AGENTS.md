# AGENTS.md: handoff for agents working on Kentucky Explorer

Owner: Bill Weathersbee. Live: https://unclebill-spec.github.io/kentucky-explorer/ (repo `unclebill-spec/kentucky-explorer`, GitHub Pages from `main`).
Everything below lives on the shared work box under `/workspace/kentucky/`. Times are US Eastern.

## Current state (Oct 1, 2026)
A static Leaflet map of Kentucky for Bill, a travel RN looking for a homestead. It is phone-first.
- **Pins:** land listings (5+ ac), 1-acre homes, near-hospital homes, bargains, businesses and odd buildings for sale, hospitals and trauma centers, travel-RN jobs, schools, colleges, attractions, history, airports, and the 5 largest cities.
- **Counties:** colored by the Appeal score.
- **Lists and cards:** Top 10 lists, county lists, and cards with a Back stack.
- **Controls:** profiles P1–P4, solo layer buttons, double-tap zoom toggle.
- See `CHANGELOG.md` for what shipped when.

## Source vs. published files
- **Source:** `/workspace/kentucky/explorer/`. Edit only here.
  - `app.js` (main app), `style.css`, `index.html`.
  - `profiles.js` (lazy profile panel).
  - `build.py` (builds `data/core.js`, `data/d/<county>.js` shards, `data/pf.js`, `data/data.js`, and `share/*.html`).
  - `README.md`, `CHANGELOG.md`, this file.
- **Inputs:**
  - `/workspace/kentucky/listings.json` (the homes).
  - `/workspace/kentucky/data/` (hospitals, schools, travel_jobs.json, metrics, attractions, airports, for-sale, drive times, caches).
  - `/workspace/kentucky/listing-photos/`.
- **Scripts:** `/workspace/kentucky/scripts/`.
  - `travel_filters.py`: job exclusions.
  - `travel_jobs_collect.py`, `top_lists.py`, `zdetail.py` / `cb_scrape.py` (listing scrapers).
  - `*_drives.py`: OSRM free-flow drive times.
  - `schools_*`, `appeal_build.py`, `bargains.py`, etc.
- **Published:** `/workspace/kentucky/publish/`.
  - `site/` is a throwaway copy where the hosted build runs.
  - `dist/` is the git repo that gets pushed. It holds minified `app.js` / `profiles.js`, `data/core.js`, `data/d/`, `data/pf.js`, `img/` (photos downsized, EXIF/GPS stripped), `share/`, `vendor/`, `CHANGELOG.md`, `AGENTS.md`.
  - Never edit `dist/` by hand.
- **Backups** from each feature round: `/workspace/kentucky/backup_2026-10-01_*`. Back up files before editing them.

## Build, test, publish
```
cd /workspace/kentucky/explorer && /usr/bin/python3 build.py        # ~4 s; local build (use /usr/bin first on PATH)
cd /workspace/kentucky/publish && ./publish.sh -m "What changed"    # ~2 min; commit message + CHANGELOG entry
/usr/bin/python3 /workspace/kentucky/publish/verify.py https://unclebill-spec.github.io/kentucky-explorer/
```
- **publish.sh behavior:**
  - Takes a lock, so only one publish runs at a time.
  - Fast-forwards `dist/` from origin before work and checks again before the push. It never force-pushes.
  - Runs `secscan.sh` on the files and the full history, and aborts the push on any token, key, password or `.env`.
  - Minifies JS with terser, pushes, and waits for Pages to go live.
  - With no message, it writes an auto commit message: "Listings refresh: +N new, -M sold, K price changes".
- **Tests** (Playwright, phone 412×915, touch): `/workspace/kentucky/perf/`, run as `/usr/bin/python3 <test>.py BASE_URL TAG`.
  - `test_all.py`: layers, Top 10s, tiers.
  - `test_tap.py`: tap tolerance.
  - `test_back.py`: Back stack.
  - `test_prof.py`: profiles.
  - `test_solo.py`: layer buttons and county fit.
  - `test_dbl.py`: double tap.
  - `test_phone.py`: phone features. `test_focus.py`: county focus (closing a county card). `test_areas.py`: climate lines + Compare areas.
  - Each prints `ALL PASS`. Screenshots go to `perf/shots/`.
- **Speed:** `profile.py URL LABEL` (4× CPU throttle) and `summ.py a.json b.json`. The box load average is often around 10, so profile alone and repeat runs.
- **Local servers:** http://127.0.0.1:8765/ serves `explorer/`. Don't `pkill -f http.server`; it kills your own shell and other agents' servers.

## Listings refresh routine (twice daily, e.g. the run that started 5:49 PM on Oct 1)
1. Re-checks every listing in `listings.json` (Zillow via `scripts/zdetail.py`, Coldwell Banker via `scripts/cb_scrape.py`, others by hand).
2. Updates status and price, and drops sold or off-market listings.
3. Runs `build.py`, then `publish.sh` with no message.

What this means for other work:
- The source must always build and work, because the routine can publish at any time. Develop risky changes in a copy (e.g. `/workspace/kentucky/work/`), then copy them in.
- Don't edit listing data in feature work.
- publish.sh's lock and pull steps keep the routine and agents from overwriting each other.

## Bill's standing preferences
- **Homes:**
  - Budget $300k–$500k, with bargains under $300k flagged ⭐. Ideal is 2+ bd / 2 ba on 10+ acres. Land layer is 5+ acres.
  - Homes layer: 1+ acre, 3 bd / 2 ba, under $425k.
  - Near-hospital homes: 1,600+ sq ft, 3 bd / 2 ba, under $325k, within 10 min free-flow of a hospital.
  - Drive times are free-flow (OSRM), with no traffic data. Say so.
- **Jobs (travel RN):**
  - Excluded: OR (CVOR, circulator, scrub, RNFA, perioperative) and cardiac cath lab. Kept: PACU / recovery / pre-op / endo, and CVICU / step-down / IR. See `scripts/travel_filters.py`.
  - Profiles can also leave out mom-baby / L&D / OB / NICU and peds (on for Bill's P1).
  - Pay shown is gross weekly as posted. The high end of a range is used for ranking.
- **Icons:**
  - Nurse cap with pay in $k on job pins.
  - Blue star dot for bargains; green star for odd buildings; "$" for businesses.
  - Skyscraper plus population for cities.
  - Small, readable, and not covering each other. Tap tolerance: nearest pin within 30 px, plus a chooser popup.
- **Zoom rules:**
  - Statewide start view: Kentucky fills the phone width (z ≈ 6.2).
  - Level I/II trauma centers, bargains, airports, cities and standouts show at every zoom. Other layers appear at their tier (`FULL` in app.js: z9 to z11).
  - Solo buttons show their layer at all zooms.
- **Back behavior:** every card or list change is a history entry. "‹ Back" goes to the previous card. X goes to the list the card came from, or to the map with the earlier view restored. The phone Back button behaves the same, including map view and scroll. Double-tap zooms are Back steps too.
- **Defaults stay exactly as they are** unless Bill asks. New filters, profiles and buttons only apply when chosen, and "All" restores the default map.
- **Fast load:** ready ≈ 1.1 s on a throttled phone (412×915, 4× CPU). Lazy-load anything that isn't needed for the first view. Measure before and after.
- **Phone-first:** test at 412×915 with touch. Thumb-sized controls (≥ 32 px), clear of each other.
- Bill gets short, plain reports with before/after numbers and screenshot paths.

## Phone features (shipped Oct 1, 2026 evening)
- **Bottom sheet:** cards opened from a pin or county tap start as a 150 px peek bar (title). Tap it or swipe up for the full card; swipe down goes full → peek → closed. Deep links and lists open full. County taps now fit the county above the peek bar.
- **Favorites:** ♡ in the card header on homes, travel jobs, buildings and businesses. Saved in localStorage `kyx_favs`. List at `#favs`; share link `#favs=<base64url>`, which offers "Add all".
- **Near me** (📍 button above Top 10s): `#near`. Uses browser geolocation; shows a blue dot and the nearest 3 of each kind, by straight-line distance. The location is never stored or sent anywhere.
- **Directions** (🧭) on every item card opens Google Maps directions to the item (counties by name).
- **"New" / "↓ Price" badges** since the last visit: `kyx_seen` snapshot of ids and prices. A visit starts after 30+ minutes away; the first visit only records the baseline. Shown on cards and list rows, in a load toast, and at `#new`.
- **Compare:** "⚖ Compare" on home cards (up to 3, `kyx_cmp`). `#compare` or `#compare=id,id,id` shows a side-by-side table with the best value in each row highlighted.
- **PWA:** `manifest.webmanifest` plus `img/icon-192/512/maskable-512.png`.
- **Offline:** `sw.js?v=<build stamp>` caches the app shell, data, viewed tiles (3000 max) and photos (400 max). Each publish's stamp creates a new worker that deletes the old shell and data caches; `index.html` is network-first, so updates arrive.
- **Lazy loading:** the pages live in `extras.js` (lazy); only small hooks are in `app.js`. Test: `perf/test_phone.py`.

## County focus (shipped Oct 1, 2026, ~7 PM)
- Closing a county card (X, or swiping peek → closed) keeps the map on the county: `focusClose()` pushes `#cmap=<County>` (history.state `fz`), refits it to the whole screen (`fitCounty` keeps clear of the pills, search bar, button stack and the bottom chip), and outlines it.
- While `FOCUS` is set, `refreshPoints` shows every pin inside the county (point-in-polygon on the county rings, or the item's `county` field) as a full icon, ignoring zoom tiers, never clustered. Solo buttons and profiles still decide which layers are on; otherwise all pin layers turn on and are restored on exit.
- Bottom chip "‹ <County> County ✕": ‹ (or Back / ‹ Back) reopens the county card; ✕ leaves. A tap outside the county, a double tap to statewide, or zooming out more than 1.5 levels clears the focus. Cards opened from the focus return to it on X.

## Climate + Compare areas (shipped Oct 1, 2026 evening)
- **Climate line** on every card with a location (homes, hospitals, schools, colleges, businesses, buildings, attractions, jobs, activities, history, cities, counties): Summer avg (Jun–Aug) + July high/low, Winter avg (Dec–Feb) + January high/low. Homes and county cards add rainy days/yr (≥0.01 in), snow days (≥0.1 in), annual snowfall and precipitation.
  - Source: NOAA NCEI U.S. Climate Normals 1991–2020 (station normals, tarballs in `climate/raw/`). Never estimated: stations whose value carries NOAA's "E" (estimated) completeness flag are skipped.
  - Counties use the station inside the county nearest its Census internal point (else the nearest one); points use the nearest station, found in the browser.
  - Rebuild: `/usr/bin/python3 climate/parse.py && /usr/bin/python3 climate/build_clim.py` → `data/clim.json` (41 KB; build.py copies it to `explorer/data/`).
- **Compare areas** (`#areas`; 🏙 Areas button above Near me; entry in the Top 10s menu): the 5 KY cities (Louisville, Lexington, Bowling Green, Owensboro, Covington) with their county/metro, side by side, best value per row in green, pros & cons generated from the numbers, then 5 KY-vs-TN pair tables and a sources footnote.
  - TN pairs are by Census Vintage 2025 population, among TN cities that anchor their own metro/micro area: Louisville↔Memphis, Lexington↔Knoxville, Bowling Green↔Johnson City, Owensboro↔Kingsport, Covington↔Cookeville.
  - The same KY-vs-TN block shows on those 5 county cards, and as a compact "vs <TN city>" block on home cards within 30 mi of a city or in its metro (OMB 2023 CBSA counties).
  - Data: `compare/build_areas.py` (run with `/workspace/kentucky/.venv/bin/python`) → `data/areas.json`. Inputs: Census population + Gazetteer; BLS OEWS May 2025 RN medians (KY TSV in `data/statewide/raw/`, TN from the OEWS query system in `compare/raw/`); Realtor.com county median listing price + $/sq ft; Zillow for-sale lots ≥5 ac (`compare/land.py`); SEDA 2025.1 county districts; OSRM drive to the nearest adult Level I/II trauma center (KY list + TN Dept. of Health list); NOAA normals; FBI CDE 2025 crime (`compare/crime.py`; the api.usa.gov DEMO_KEY allows only 10 calls/hour).
  - Owensboro's RN wage is suppressed by BLS, so it shows as "not published" (no substitute). Permanent RN job counts show "coming soon" until `data/perm_jobs.json` lands.
  - **To add a state or city:** add rows to `AREAS` in `compare/build_areas.py` (plus its land/crime inputs). `areas.js` renders whatever `areas.json` holds, so the page needs no code change.
- **Lazy loading:** `areas.js`, `data/clim.json` and `data/areas.json` load on the first card open or `#areas`, never on the first load. publish.sh stages and minifies `areas.js` and copies both JSON files.

## Known issues / next steps
- **Missing data:** no Walmart/grocery distances; no HOA fee amounts (only "no HOA" text). Commute filters use free-flow times.
- **Near me** distances are straight-line, not drive times.
- **Badges** are per phone and browser (localStorage); clearing site data resets the baseline.
- **Next big step, after everything else is finished: the Tennessee port.** Build a Tennessee map from this codebase. Start from the TN rows already in `data/areas.json`, the TN trauma list (`data/tn_trauma_jul2026.xlsx`), the TN OEWS areas and the NOAA stations in `climate/stations.json`.

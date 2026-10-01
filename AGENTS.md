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

## Known issues / next steps
- **Card height:** on phones the card is 72 % of the screen, so a county opened from the map fits only a ~106 px strip above it. The bottom-sheet peek (below) fixes this.
- **Missing data:** no Walmart/grocery distances; no HOA fee amounts (only "no HOA" text). Commute filters use free-flow times.
- **Queued phone features (approved by Bill, Oct 1):**
  1. Bottom-sheet cards that open as a small peek bar and swipe up.
  2. Favorites: heart on homes, jobs, buildings and businesses, plus a list and a share link.
  3. "Near me" GPS button.
  4. Directions button (Google Maps) on every card.
  5. "New" and "↓ Price" badges since the last visit, tracked in localStorage.
  6. Compare 2–3 homes side by side.
  7. Installable PWA: manifest and icons.
  8. Offline service worker caching the shell, data and viewed tiles, with the cache version bumped on each publish.
- **Rules for that work:** keep the 1.1 s load (lazy-load extras), keep the defaults and the Back stack, and test at 412×915.

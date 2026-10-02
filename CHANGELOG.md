# Changelog: Kentucky Explorer

Live site: https://unclebill-spec.github.io/kentucky-explorer/. Times are US Eastern.
Entries before Oct 1, 2026 ~6 PM were reconstructed from the git history (which used generic "Publish <date>" messages) and from the
dated backups and publish logs on the work box. Newer entries are added by `publish.sh -m "message"`.

## 2026-10-02
- 02:08 ET: Faster load and smoother zoom, same look: one county canvas until the first zoom-in or idle time (borders + faint dots on it), the dot canvas no longer redraws twice per zoom/pan, fade updates at most once per frame. Map credit: Leaflet link and flag removed, the linked OpenStreetMap credit is a tiny line at the bottom left above the scale (clear of the pills and side buttons)
- 00:29 ET: AGENTS.md: zoom-reveal test notes (pin-free-point test helpers now avoid groups)

## 2026-10-01
- 23:54 ET: Zoom reveal: county colors fade smoothly as you zoom in (full statewide, about 0.1 at town zoom; county lines stay); statewide only trauma I/II, airports, businesses, odd buildings, bargains and cities are icons and everything else is a faint dot that turns into its icon a few kinds per zoom step (7.5 standouts to 11 minor history); close pins of one kind group into a bigger copy of their icon with a count (tap to zoom in, a Back step; all split from zoom 13)
- 22:47 ET: KY | TN state switcher on: the new Tennessee Explorer is live (switcher inside the Search panel next to Layers, plus 'Switch to the Tennessee map' in the Top 10s menu)
- 22:31 ET: More map space: the map key and the search bar + Layers now start collapsed as two small pills, 'Map key' (top left) and '🔍 Search' (top right); tap to expand, tap again, tap outside, Esc or the phone's Back to collapse; profile pills move up (into the top row in landscape); app code now shared with the upcoming Tennessee Explorer (state switcher hidden until it's live)
- 21:25 ET: Top 10 bubbles moved off the map into a bottom row of pills (Deals, Odd Bldgs, Biz, ER Travel, Other Travel, Bonuses, Perm ER, Perm SD/MS, Perm ICU): a looping sideways carousel with momentum and snap, hidden while a card is open; landscape phones get the right-hand buttons as a looping vertical wheel; full-screen button (⛶) with an Add to Home Screen hint on iPhone
- 20:46 ET: Permanent RN jobs layer: blue nurse hats per hospital (top listed pay or count; travel hats now red), hospital job lists, county 'Permanent RN jobs' tile + list, specialty/FT-PT-PRN/shift/pay/role/bonus filters in Layers and profiles (Bill's default leaves out OR, cath lab, women's, NICU, peds), Top 10 bubbles: Sign-on Bonuses, Perm ER, Perm Step-down + Med-surg, Perm ICU (general); routine refresh runs the collector
- 19:50 ET: Climate + Compare areas: NOAA 1991-2020 summer/winter averages on every location card (homes and counties also show rainy days, snow days, snowfall, precip); new #areas page (🏙 Areas button + Top 10s menu) comparing Louisville, Lexington, Bowling Green, Owensboro, Covington side by side with best-value highlights and pros/cons, plus KY-vs-TN pairs (Memphis, Knoxville, Johnson City, Kingsport, Cookeville) on the page, on those 5 county cards and on nearby home cards; all lazy-loaded. FBI crime rows pending (API rate limit)
- 19:14 ET: County focus: closing a county card keeps the map zoomed on that county (refit to the full screen) and shows every pin inside it as a full icon; #cmap= Back step reopens the card; chip ‹ County / ✕; clears on tap outside, double tap or zooming out
- 18:32 ET: Phone features: peek-bar bottom sheet (fixes the small county-fit strip), Favorites with share link, Near me (GPS), Directions on every card, New / ↓ Price badges since the last visit, Compare 2–3 homes, installable PWA, offline service worker. Repo: CHANGELOG.md + AGENTS.md; publish.sh takes a commit message, adds CHANGELOG entries, pulls before work and push, and scans for secrets before every push
- 17:50: **Double tap toggles zoom.** Leaflet's double-click zoom is off. Zoomed in → flies out to the statewide start view; at or near the start view → zooms in on the tapped spot (fits the county under it, else zoom 10). Mouse double-click does the same. Single taps wait 250 ms, so a double tap never opens a card. Each double-tap zoom is its own Back step.
- 17:04: **Profiles P1–P4.** "All / Bill / P2–P4" pills top-left. Each has a settings panel with Housing, Jobs, Area/commute and Layers filters. Profiles are saved in the browser and filter pins, Top 10s, county counts and lists. Share link: `#profile=`. Lazy-loaded (`profiles.js` + `data/pf.js`).
- 17:04: **Solo layer buttons** (right-hand stack): Jobs, 5+ ac, 1+ ac, Near-hospital, Bargain, Biz, Odd buildings, Sights, School, All. Each shows only that kind at every zoom (trauma centers, airports and cities stay). Grid clusters appear when more than 250 are in view while zoomed out.
- 17:04: **County tap zoom.** Tapping a county or sweet-spot zone fits the county into the map area the card doesn't cover. Back / X restore the earlier view.
- 16:11: **Back stack.** Header "‹ Back"; X returns to the list the card came from, or to the map. The phone Back button restores the map view and scroll position. In-page links go through history.
- 15:47: **Tap tolerance.** The nearest pin within 30 px wins (1.5× rule), with a chooser popup for close calls and 44 px invisible hit areas. **Expand / full-screen card** (⤢, `&full=1` deep links). **5 largest cities** (Census V2025) with skyscraper icon and population label, `#city=` links.
- 14:51: **Phone speed-up.** Ready time 6.1 s → 1.1 s on a throttled phone (412×915, 4× CPU). Changes: lazy point layers, `data/core.js` + per-county detail shards (`data/d/`), terser-minified app.js, start view set before layers, smaller transfer (925 → 511 KB).
- 13:39, 14:07: **Top 10 lists.** Deals of the Week, Odd Buildings, Businesses for Sale, ER Travel Jobs, Non-ER Travel Jobs. Five bubbles south of Kentucky, a "🏆 Top 10s" menu and share pages. Cath-lab jobs are excluded.
- 12:50 – 13:12: Map icon refresh (nurse caps for pay, star dots for bargains/buildings, house icons) and bargain flags.
- 10:42 – 10:50: **More layers.** Airports (KY + nearby hubs), businesses for sale (< $1M), interesting buildings for sale (< $600k), attractions (amusement / water parks, aquariums, museums, campgrounds), Kentucky standouts. Zoom tiers (level of detail).
- 09:49: **Near-hospital homes layer** (blue house pins): 1,600+ sq ft, 3 bd / 2 ba, under $325k, ≤ 10 min free-flow drive to a hospital, with price / drive / type filters.
- 08:03: Listings refresh plus more home photos and thumbnails.
- 04:04: Listings refresh and share pages for every item.

## 2026-09-30
- 23:08 – 23:19: **Travel-nurse assignments layer** (weekly pay, agency, shift, ranked list `#travel=all`) and **Homes layer** (1+ acre, 3 bd / 2 ba, under $425k) with filters.
- 22:23 – 22:27: **County Appeal score** (0–100 ranking of the 120 counties) as the default county coloring, with "How this score works".
- 21:59: Card thumbnails / photos for items.
- 21:24: **Initial map.** Notable land listings (5+ acres), hospitals and trauma centers, KDE school ratings, colleges, outdoor activities, history (historic sites, coal camps, ghost towns, mines), county metrics, sweet-spot counties, search, Layers panel, per-item share pages, GitHub Pages hosting.

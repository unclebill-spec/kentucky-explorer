# Changelog: Kentucky Explorer

Live site: https://unclebill-spec.github.io/kentucky-explorer/. Times are US Eastern.
Entries before Oct 1, 2026 ~6 PM were reconstructed from the git history (which used generic "Publish <date>" messages) and from the
dated backups and publish logs on the work box. Newer entries are added by `publish.sh -m "message"`.

## 2026-10-01
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

/* State Explorer (Kentucky / Tennessee: the same app, configured by K.meta.state) — one map, many layers, deep links (#type=id), share cards. Static; no server needed. */
(function () {
  "use strict";
  const K = window.KYX || {};
  // per-state settings (build.py writes K.meta.state; the defaults below are Kentucky's)
  const ST = Object.assign({ name: "Kentucky", ab: "KY", n: 120, app: "Kentucky Explorer", ls: "kyx_",
    bp: [[36.49, -89.57], [39.15, -81.96]], bd: [[36.5, -89.55], [39.15, -81.95]], c0: [37.75, -85.7],
    sch: "KDE", schLab: "KDE 2025 rating", schSrc: "KDE School Report Card, 2024-25 accountability", rlab: null,
    traumaList: "Kentucky Trauma System list", licSrc: "KY hospital directory, Sep 2026",
    jobHosp: "Kentucky's CMS acute-care hospitals (incl. the 2 VA medical centers), Norton Children's, and the 5 border Level I/II centers",
    schoolScore: "county district reading+math vs. Kentucky and the U.S. (KDE 2024-25, SEDA 2025.1)",
    cityNote: "(Census July 2025 estimate; Louisville = all of Jefferson County, Lexington = all of Fayette)", topCity: "795k",
    apt: "✈ Airports (KY + nearby hubs)", aptOos: "Nearby out-of-state airport (BNA, TYS, HTS, EVV, TRI)",
    feat: "★ Kentucky standouts (Red River Gorge, Mammoth Cave, Cumberland Gap…)", areas: "Compare areas (KY vs TN)", areasAria: "Compare areas: Kentucky cities vs Tennessee",
    cu: "County", cus: " County", cup: "counties", cuP: "Counties",  // map block words (Massachusetts: Town / "" / towns / Towns)
    other: { name: "Tennessee", ab: "TN", url: "https://unclebill-spec.github.io/tennessee-explorer/", live: true },
    others: null,
    caps: { p5: 500000, p1: 425000, nh: 325000 },  // home-search price caps (Massachusetts: $650k on all three; Maine: $550k on all four)
    cabin: null }, (K.meta && K.meta.state) || {});  // optional 4th home category, per state: { acres: 25, label: "Cabin", cat: "cabin-home" } (Maine); off = null
  // state switcher: this state + every other live state map, alphabetical (build.py STATE["others"]; Kentucky's list is here)
  if (!ST.others) ST.others = ST.ab === "KY" ? [{ name: "Tennessee", ab: "TN", url: "https://unclebill-spec.github.io/tennessee-explorer/" }, { name: "Massachusetts", ab: "MA", url: "https://unclebill-spec.github.io/massachusetts-explorer/" }, { name: "Maine", ab: "ME", url: "https://unclebill-spec.github.io/maine-explorer/" }, { name: "Vermont", ab: "VT", url: "https://unclebill-spec.github.io/vermont-explorer/" }, { name: "Montana", ab: "MT", url: "https://unclebill-spec.github.io/montana-explorer/" }, { name: "Wyoming", ab: "WY", url: "https://unclebill-spec.github.io/wyoming-explorer/" }, { name: "Idaho", ab: "ID", url: "https://unclebill-spec.github.io/idaho-explorer/" }, { name: "Utah", ab: "UT", url: "https://unclebill-spec.github.io/utah-explorer/" }, { name: "New Hampshire", ab: "NH", url: "https://unclebill-spec.github.io/new-hampshire-explorer/" }, { name: "North Carolina", ab: "NC", url: "https://unclebill-spec.github.io/north-carolina-explorer/" }] : [ST.other];  // other.live: false would hide the state switcher
  window.KYX_ST = ST;
  const CAPK = k => "$" + Math.round(ST.caps[k] / 1000) + "k";
  const CAPOPTS = (k, base) => { const o = base.filter(v => v < ST.caps[k]); for (let v = base[base.length - 1] + 50000; v < ST.caps[k]; v += 50000) o.push(v); return o; };  // Max price menu steps (above the old list: every $50k under the cap)
  // state switcher (KY | TN) in the top bar, next to Layers
  { const lb = document.getElementById("layersBtn"), sw = document.createElement("nav"); sw.className = "stsw2"; sw.setAttribute("aria-label", "Switch state map");
    const all = [{ ab: ST.ab, me: 1 }].concat(ST.others.filter(o => o.live !== false)).sort((a, b) => a.ab < b.ab ? -1 : 1);
    sw.innerHTML = all.map(o => o.me ? `<span class="on" aria-current="page">${ST.ab}</span>` : `<a href="${o.url}" title="Open the ${o.name} map" aria-label="Open the ${o.name} map">${o.ab}</a>`).join("");
    if (lb && ST.other.live !== false && all.length > 1) lb.before(sw); }
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = s => (String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "x");
  const money = v => v == null ? "—" : "$" + Math.round(v).toLocaleString();
  const fmt1 = v => v == null ? "—" : (Math.round(v * 10) / 10).toLocaleString();
  const sign = (v, d = 0) => v == null ? "—" : (v > 0 ? "+" : "") + v.toFixed(d);
  const rbadge = r => r ? `<span class="r ${esc(r)}">${esc(ST.rlab && ST.rlab[r] || r)}</span>` : "—";
  const toast = (msg, html, ms) => { const t = $("#toast"); if (html) t.innerHTML = html; else t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, ms || 2200); };

  // ------------------------------------------------------------------ map + base layers
  // viewport size read once up front (and on resize): reading innerWidth later, after DOM changes, forces a synchronous layout
  let PHONE = window.innerWidth < 800, VH = window.innerHeight;
  window.addEventListener("resize", () => { PHONE = window.innerWidth < 800; VH = window.innerHeight; });
  const map = L.map("map", { zoomControl: false, doubleClickZoom: false, preferCanvas: true, minZoom: 6, maxZoom: 18, zoomSnap: 0.25 });
  // final start view before any layer is added (no second re-projection, no wasted zoom-7 tile requests)
  function homeView(anim) {
    if (PHONE) { map.options.zoomSnap = 0.05; map.fitBounds(ST.bp, { padding: [2, 2], animate: !!anim }); map.options.zoomSnap = 0.25; }  // phone: Kentucky fills the width
    else map.fitBounds(ST.bd, { paddingTopLeft: [325, 50], paddingBottomRight: [8, 8], animate: !!anim });  // keep the map key from covering the Purchase
  }
  // ST.cityPage = { "<block name>": "city.html#<city>" }: tapping that mega-block opens the state's city sub-map (MA Boston; TN Davidson / Shelby).
  // Leaving saves the view in sessionStorage; coming Back (browser or the city page's back link, a back_forward load when the page is not in the bfcache) restores it.
  const CITYPG = ST.cityPage || {}, CRET = (() => { try { const n = performance.getEntriesByType && performance.getEntriesByType("navigation")[0], r = JSON.parse(sessionStorage.getItem(ST.ls + "cityret") || "null");
    return Object.keys(CITYPG).length && n && n.type === "back_forward" && r && !location.hash && Date.now() - r.t < 864e5 ? r : null; } catch (e) { return null; } })();
  if (CRET) map.setView([CRET.lat, CRET.lon], CRET.z, { animate: false }); else if (location.hash) map.setView(ST.c0, 7); else homeView(false);
  L.control.zoom({ position: "bottomleft" }).addTo(map);
  L.control.scale({ position: "bottomleft", imperial: true, metric: false }).addTo(map);
  // map credit: no Leaflet link / flag; the tile credit (OSM license: visible + linked) is a tiny line above the scale, clear of the
  // bottom pills and the right-side buttons (style.css .leaflet-control-attribution)
  map.attributionControl.setPrefix(false); map.attributionControl.setPosition("bottomleft");
  const bases = {
    Streets: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' }),
    Topo: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, SRTM | © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)' }),
    Satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" }),
  };
  let curBase = localStorage.getItem(ST.ls + "base") || "Streets";
  if (!bases[curBase]) curBase = "Streets";
  bases[curBase].addTo(map);
  const baseList = $("#baseList");
  Object.keys(bases).forEach(n => {
    const b = document.createElement("button"); b.textContent = n; b.className = n === curBase ? "on" : "";
    b.onclick = () => { map.removeLayer(bases[curBase]); curBase = n; bases[n].addTo(map); bases[n].bringToBack(); localStorage.setItem(ST.ls + "base", n);
      baseList.querySelectorAll("button").forEach(x => x.className = x.textContent === n ? "on" : ""); };
    baseList.appendChild(b);
  });

  // ------------------------------------------------------------------ indexes
  const IDX = { property: {}, hospital: {}, school: {}, college: {}, activity: {}, history: {}, county: {}, travel: {} };
  const MARK = {};  // "type:id" -> marker/layer
  (K.properties || []).forEach(x => IDX.property[x.id] = x);
  (K.hospitals || []).forEach(x => IDX.hospital[x.id] = x);
  (K.schools || []).forEach(x => IDX.school[x.id] = x);
  (K.colleges || []).forEach(x => IDX.college[x.id] = x);
  (K.activities || []).forEach(x => IDX.activity[x.id] = x);
  (K.history || []).forEach(x => IDX.history[x.id] = x);
  (K.counties || []).forEach(x => IDX.county[x.name] = x);
  // ---- Anna profile (5th top button; anna.js + data/anna.js load only when it is turned on, and only on maps whose build wrote K.meta.anna).
  // While it is on: no hospital / nurse layers, buttons, lists or card sections; engineering jobs, spouse jobs and 2bd/2ba homes instead.
  var ANNAX = null, ANNA_ON = false;
  const ANNA_HK = new Set(["trauma", "hosp", "travel", "perm", "nh"]);  // hospital / nurse layers: never on while Anna is on
  const ANNA_RX = /^#(eng|spj)=|^#top-(eng-pay|eng-bonus|reloc|eng-best|ah-job|ah-school|ah-balance)$|^#property=[a-z]{2}-an-/;  // links that need the Anna data
  function annaBlk(d) { return ANNA_ON ? ANNA_HK.has(d.key) : !!d.anna; }  // layer blocked in the current mode

  const icon = (cls, html, size = 26) => L.divIcon({ className: "", html: `<div class="mk ${cls}" style="width:${size}px;height:${size}px">${html}</div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  // ---- small SVG pin glyphs (phone-legible); G.* return <svg>, sicon() wraps one as a marker, ksv() as a map-key symbol
  const SVGI = (w, h, body) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${body}</svg>`;
  const RED_HOUSE = "#d32f2f";
  const DIPLOMA = `<path d="M3.5 5.5h13v8h-13z" fill="#f6ead0" stroke="#7a5a2b" stroke-width="1.1"/><ellipse cx="3.5" cy="9.5" rx="1.7" ry="4" fill="#e8d3a6" stroke="#7a5a2b" stroke-width="1"/><ellipse cx="16.5" cy="9.5" rx="1.7" ry="4" fill="#e8d3a6" stroke="#7a5a2b" stroke-width="1"/><path d="M9 5.5v8M11 5.5v8" stroke="#c62828" stroke-width="1.7"/><path d="M10 13.2l-2.2 4.3 2.2-1.1 2.2 1.1z" fill="#c62828"/>`;
  const CAP = (fill, dx = 0) => `<g transform="translate(${dx},0)"><path d="M11 1.5 21.5 6 11 10.5.5 6z" fill="${fill}" stroke="#222" stroke-width="1.1" stroke-linejoin="round"/><path d="M5 8.2v4.3c0 1.6 2.7 2.9 6 2.9s6-1.3 6-2.9V8.2L11 10.8z" fill="${fill}" stroke="#222" stroke-width="1.1"/><path d="M19.5 6.9v5.4" stroke="#222" stroke-width="1.1"/><circle cx="19.5" cy="13" r="1.4" fill="#ffd600" stroke="#222" stroke-width=".7"/></g>`;
  const G = {
    skier: (sz = 22) => `<svg width="${sz}" height="${sz}" viewBox="0 0 22 22" aria-hidden="true"><rect x="1" y="1" width="20" height="20" rx="4.5" fill="#0277bd" stroke="#fff" stroke-width="1.5"/><circle cx="13.6" cy="4.9" r="1.85" fill="#fff"/><path d="M12.6 7.3 9.4 10.6l3.3 1.9-1.6 3.6M9.4 10.6 6.6 9.3M12.6 7.3l2.6 2.6 2.4-.4" fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.6 15.4l13.6 3.9" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    peak: (sz = 22) => `<svg width="${sz}" height="${sz}" viewBox="0 0 22 22" aria-hidden="true"><path d="M.9 20.2 8.6 4.6l3.9 6.4 2.7-3.9 5.9 13.1z" fill="#546e7a" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M8.6 4.6l2.75 4.5-1.45-.75-1.2 1.25-1.15-1.15-1.7.7z" fill="#fff"/><path d="M15.2 7.1l1.75 3.85-.95-.5-.8.7-.75-.6-1 .35z" fill="#fff"/></svg>`,
    tgt: (sz = 18) => `<svg width="${sz}" height="${sz}" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#cc0000" stroke="#fff" stroke-width="1.3"/><circle cx="10" cy="10" r="5.6" fill="#fff"/><circle cx="10" cy="10" r="3" fill="#cc0000"/></svg>`,
    tower: () => SVGI(12, 16, `<path d="M1.5 15.5V6.5h3V2.2L7 .8l2.5 1.4v13.3z" fill="#37474f" stroke="#fff" stroke-width="1"/><path d="M5.9 4.2h2.2M5.9 6.4h2.2M5.9 8.6h2.2M5.9 10.8h2.2M2.6 8.6h1M2.6 10.8h1" stroke="#ffe082" stroke-width="1"/>`),
    // log cabin (Maine 4th home category): same 24px outline, white stroke and size as the red house; brown logs, dark roof, chimney
    cabin: (sz = 24) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" aria-hidden="true"><path d="M16.2 3.2h2.6v5.6h-2.6z" fill="#5d4037" stroke="#fff" stroke-width="1.2"/><path d="M12 1.8 23 11.6h-2.4V22.4H3.4V11.6H1z" fill="#8d5524" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 3.9 20.3 11.3H3.7z" fill="#4e342e"/><path d="M4.6 14h14.8M4.6 16.8h14.8M4.6 19.6h14.8" stroke="#e8c49a" stroke-width="1.1" stroke-linecap="round"/><rect x="10.2" y="15.6" width="3.6" height="6.8" fill="#3e2723" stroke="#e8c49a" stroke-width=".7"/></svg>`,
    house: cross => SVGI(24, 24, `<path d="M12 1.8 23 11.6h-3V22.4H4V11.6H1z" fill="${RED_HOUSE}" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/>` + (cross
      ? `<rect x="6.6" y="13.2" width="10.8" height="4" rx=".5" fill="#fff"/><rect x="10" y="9.8" width="4" height="10.8" rx=".5" fill="#fff"/>`
      : `<rect x="10" y="15.4" width="4" height="7" fill="#fff" opacity=".9"/>`)),
    // black star: 50+ acre lots under $250k (Bill, Oct 4 2026: "it can get a small black star")
    // flying bat (wings spread) = a cave on the property; small waterfall = a waterfall on the property (Bill, Oct 4 2026 2:12 PM)
    bat: (sz = 24) => `<svg width="${sz}" height="${Math.round(sz * 0.46)}" viewBox="-2 2 104 46" aria-hidden="true"><path d="M50 15L46.5 7.5 45 16C40 14 32 6 24 5C16 5 7 9 1 15Q8 15 11 22Q17 19 22 26Q29 23 34 32Q40 28 44 33Q47 40 50 42Q53 40 56 33Q60 28 66 32Q71 23 78 26Q83 19 89 22Q92 15 99 15C93 9 84 5 76 5C68 6 60 14 55 16L53.5 7.5Z" fill="#1d1d1f" stroke="#fff" stroke-width="4.5" stroke-linejoin="round"/></svg>`,
    fall: (sz = 20) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="6" fill="#fff" stroke="#0d47a1" stroke-width="1.6"/><path d="M6.5 8.6C7.2 12.5 6.8 15.6 5.6 18.6h12.8c-1.2-3-1.6-6.1-.9-10z" fill="#4fa3f0"/><path d="M9.3 9.5c.4 3 .2 5.6-.6 8.2M12 9.5v8.6M14.7 9.5c-.4 3-.2 5.6.6 8.2" stroke="#0d5bb5" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M2.8 5.4c3-1.2 5-.9 6.3-.3 1.8-1 4.3-1.1 6.2-.1 1.6-.7 3.8-.6 5.9.4v3.3c-1.8.5-3.3.2-4.4-.2-2.6.8-5.2.8-7.6.1-1.9.6-4 .6-6.4.2z" fill="#6d4c41"/><path d="M3.6 19.4c2.2-1.5 4.2.9 6.4-.1 1.7-.8 2.6-.9 4 0 2.2 1 4.2-1.4 6.4.1" stroke="#1e88e5" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="6.3" cy="17" r=".9" fill="#bbdefb"/><circle cx="17.8" cy="16.8" r=".9" fill="#bbdefb"/></svg>`,
    bigStar: (sz = 18) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2L12 17.9l-6.5 3.5 1.3-7.2-5.3-5.1 7.3-1z" fill="#111" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/></svg>`,
    starDot: fill => SVGI(24, 24, `<circle cx="12" cy="12" r="10.6" fill="${fill}" stroke="#fff" stroke-width="1.8"/><path d="M12 4.4l2.3 4.7 5.2.7-3.8 3.6.9 5.1L12 16l-4.6 2.5.9-5.1-3.8-3.6 5.2-.7z" fill="#ffd600"/>`),
    cap: fill => SVGI(22, 18, CAP(fill)),
    diploma: () => SVGI(20, 18, DIPLOMA),
    univ: () => SVGI(40, 18, DIPLOMA + CAP("#7b1fa2", 18)),
    tree: () => SVGI(22, 22, `<path d="M11 1 3 12h4l-3 5h14l-3-5h4z" fill="#2e7d32" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><rect x="9.6" y="17" width="2.8" height="4" fill="#5d4037"/>`),
    mountain: () => SVGI(22, 22, `<path d="M1 20 8.5 5.5l4 6 3-4.5L21 20z" fill="#8d6e63" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M8.5 5.5l2.4 3.6-1.5-.5-.9 1-1-1-1.4.4z" fill="#fff"/>`),
    lake: () => SVGI(22, 22, `<circle cx="11" cy="11" r="9.8" fill="#1e88e5" stroke="#fff" stroke-width="1.6"/><path d="M4.8 9.3q1.55-1.5 3.1 0t3.1 0 3.1 0 3.1 0M4.8 13.7q1.55-1.5 3.1 0t3.1 0 3.1 0 3.1 0" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`),
    cave: () => SVGI(22, 22, `<path d="M1 20 9 5l3.5 5 2.5-3.5L21 20z" fill="#9e9e9e" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M7.3 20v-3.4a3.7 3.7 0 0 1 7.4 0V20z" fill="#1b1b1b"/>`),
    park: () => SVGI(22, 22, `<rect x="1" y="1" width="20" height="20" rx="4" fill="#5d4037" stroke="#fff" stroke-width="1.5"/><path d="M7 3.6 3.4 9.4h2.1l-1.7 2.7h6.4L8.5 9.4h2.1z" fill="#fff"/><rect x="6.4" y="12" width="1.3" height="2.6" fill="#fff"/><path d="M10.8 12.4h7.4M10.4 15.3h8.2M12.6 12.4l-1.7 5.7M16.4 12.4l1.7 5.7" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>`),
    tent: () => SVGI(22, 22, `<rect x="1" y="1" width="20" height="20" rx="4" fill="#558b2f" stroke="#fff" stroke-width="1.5"/><path d="M11 4.2 3.6 17.6h14.8z" fill="#fff"/><path d="M11 9.6 8.3 17.6h5.4z" fill="#558b2f"/>`),
    nurse: () => SVGI(20, 20, `<rect x="1" y="1" width="18" height="18" rx="4.5" fill="#fff" stroke="#c62828" stroke-width="1.6"/><path d="M8 4.3h4v3.7h3.7v4H12v3.7H8V12H4.3V8H8z" fill="#d32f2f"/>`),
    nurseCap: (txt, ring, fill = "#fff", tc = "#1a1a1a") => SVGI(36, 22, `<path d="M2.5 20 5.6 5.2Q18 .6 30.4 5.2L33.5 20z" fill="${fill}" stroke="${ring}" stroke-width="2.2" stroke-linejoin="round"/><text x="18" y="16.4" text-anchor="middle" font-size="${String(txt).length > 3 ? 9.5 : 11}" font-weight="800" fill="${tc}" font-family="system-ui,-apple-system,Segoe UI,sans-serif">${txt}</text>`),
  };
  const sicon = (cls, svg, w, h) => L.divIcon({ className: "", html: `<div class="mk sv ${cls}" style="width:${w}px;height:${h}px">${svg}</div>`, iconSize: [w, h], iconAnchor: [w / 2, h / 2] });
  const ksv = svg => `<span class="mk sv">${svg}</span>`;
  // outdoor glyph: campground > cave > park sign > lake / mountain / tree keyword heuristic; non-outdoor kinds keep their emoji
  function outdoorGlyph(a) {
    const n = a.name || "", k = a.kind || "";
    if (k === "Distillery" || k === "Attraction") return null;
    if (/campground|\brv\b|camp ?site/i.test(n)) return "tent";
    if (k === "Cave" || /\bcaves?\b|cavern/i.test(n)) return "cave";
    if (/^Park/.test(k) && /\bpark\b|recreation area/i.test(n) && !/wildlife management|forest/i.test(n)) return "park";
    if (k === "Waterfall") return "lake";
    if (k === "Natural arch") return "mountain";
    if (/lake|river|falls|spring|creek|pond|reservoir|\bfork\b|branch|\bdam\b|marina|landing/i.test(n)) return "lake";
    if (/gorge|peak|mountain|\bmtn\b|knob|overlook|ridge|bluff|\brock|cliff|arch|bridge|summit|pinnacle|\bgap\b|\btop\b|point|breaks|hollow/i.test(n)) return "mountain";
    return "tree";
  }

  // ------------------------------------------------------------------ county choropleth
  const metrics = (K.meta && K.meta.metrics) || [];
  const sweetKey = K.meta && K.meta.sweet;
  var keyReady = false;  // var (not let): drawCounties() runs before the key section below is initialised
  const appealKey = K.meta && K.meta.appeal;
  const AM = (K.meta && K.meta.appeal_method) || null;
  // one ramp for every metric, best (top) -> worst (bottom); lower-is-better metrics are inverted so green is always the better choice
  const RAMP = ["#1a7d3a", "#7cc46a", "#f3d64a", "#f08a3a", "#c62f2c"];
  const BANDS = ["Most appealing", "Very good", "Good", "Fair", "Least appealing"];
  // metrics with no better/worse direction (population, land area, farm size…) use a neutral blue ramp, highest -> lowest
  const NEUTRAL = ["#0b3c78", "#2f73b8", "#6aaed6", "#b0d2ea", "#e4eff8"];
  const NLABELS = ["Highest", "High", "Middle", "Low", "Lowest"];
  const NODATA = "#c9c9c9";
  const scaleCache = {};
  function scaleFor(key) {
    if (scaleCache[key]) return scaleCache[key];
    const m = metrics.find(x => x.key === key); if (!m) return null;
    const cs = (K.counties || []).filter(c => c.m[key] != null);
    if (!cs.length) return null;
    const n = cs.length;
    const better = m.lower_better && !m.neutral ? (a, b) => a - b : (a, b) => b - a;
    const sorted = cs.map(c => c.m[key]).sort(better);
    const clsOf = {};
    if (key === appealKey) cs.forEach(c => { clsOf[c.name] = Math.max(0, BANDS.indexOf(c.appeal && c.appeal.band)); });
    else cs.forEach(c => { clsOf[c.name] = Math.min(4, Math.floor(sorted.indexOf(c.m[key]) * 5 / n)); });  // quintiles by rank; tied values share the better class
    const pal = m.neutral ? NEUTRAL : RAMP, labels = m.neutral ? NLABELS : BANDS;
    const classes = labels.map((label, k) => {
      const v = cs.filter(c => clsOf[c.name] === k).map(c => c.m[key]);
      return { label, color: pal[k], n: v.length, lo: v.length ? Math.min(...v) : null, hi: v.length ? Math.max(...v) : null };
    });
    const missing = (K.counties || []).length - n;
    const cls = c => c.m[key] == null ? -1 : clsOf[c.name];
    const sc = { m, classes, missing, cls, color: c => { const k = cls(c); return k < 0 ? NODATA : pal[k]; }, labelOf: c => { const k = cls(c); return k < 0 ? "no data" : labels[k]; } };
    return (scaleCache[key] = sc);
  }
  function fmtMetric(m, v) {
    if (v == null) return "—";
    if (m.fmt === "pp") return sign(v, 1) + " pp";
    if (m.fmt === "gl") return sign(v, 2) + " grade lvls";
    if (m.fmt === "usd") return money(v);
    if (m.fmt === "int") return Math.round(v).toString();
    if (m.fmt === "score") return fmt1(v);
    if (m.fmt === "min") return Math.round(v) + " min";
    if (m.fmt === "mi") return fmt1(v) + " mi";
    if (m.fmt === "pct") return fmt1(v) + "%";
    return Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : fmt1(v);
  }
  const defMetric = (K.meta && K.meta.default_metric) || (metrics[0] && metrics[0].key) || "";
  let curMetric = localStorage.getItem(ST.ls + "metric2") || defMetric;  // new storage key so everyone starts on the Appeal score
  if (!metrics.find(m => m.key === curMetric)) curMetric = defMetric;
  const countyLayer = L.layerGroup(), sweetLayer = L.layerGroup();
  const countyPolys = {};
  // county outlines arrive delta-encoded (data/core.js "rz", 1e-4 degree steps) -> [[lon, lat], ...] rings
  const MK = (K.meta && K.meta.mkeys) || [];  // county metric values arrive as arrays ("mv") in this key order
  (K.counties || []).forEach(c => { if (c.mv && !c.m) { c.m = {}; c.mv.forEach((v, i) => { if (v != null) c.m[MK[i]] = v; }); } });
  (K.counties || []).forEach(c => { if (c.rz && !c.rings) c.rings = c.rz.map(r => { const o = []; let x = 0, y = 0; for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; o.push([x / 1e4, y / 1e4]); } return o; }); });
  const cLL = c => c._ll || (c._ll = c.rings.map(r => r.map(([x, y]) => [y, x])));
  function countyStyle(c, sc) { return { renderer: R_FILL, stroke: false, fillColor: sc ? sc.color(c) : "#000", fillOpacity: sc ? 0.55 : 0.02 }; }  // borders: R_LINE (below)
  function tipFor(c, sc) {
    if (!sc) return esc(c.name);
    if (ANNA_ON && ANNAX) { const t = ANNAX.tip(c, sc); if (t) return t; }
    const v = c.m[sc.m.key];
    const a = c.appeal;
    if (sc.m.key === appealKey && a) return `<b>${esc(c.name)}</b> · Appeal ${esc(fmt1(a.score))} · #${a.rank} of ${ST.n}<br>${esc(a.band)}`;
    return `<b>${esc(c.name)}</b>: ${esc(fmtMetric(sc.m, v))} <span class="small">(${esc(sc.labelOf(c))})</span>${a ? `<br>Appeal ${esc(fmt1(a.score))} · #${a.rank}` : ""}`;
  }
  let ctyMetric = null;  // metric the county polygons are styled for; null = not built yet (built the first time the layer is shown)
  // ---- county colors fade as you zoom in (full at the statewide view -> about 0.1 at town zoom); the county lines stay.
  // The fills (counties + sweet spots) sit on their own canvas in pane "ctyFill", whose CSS opacity follows the zoom: no redraw while
  // pinching or flying. The borders are stroked from the same projected rings on a second canvas just above (pane "ctyLine", never
  // faded, no pointer events), which also carries the faint pin dots and the orange selection outline. Taps and tooltips still go to
  // the fill canvas.
  // Load/zoom cost: until the first zoom-in (or idle time after load) there is only the fill canvas, and it draws the borders and
  // dots itself (same pixels: at the start view the fills are at full strength). ensureLines() then moves them to their own canvas.
  let DOTS = [], R_LINE = null, ptsOn = false;  // DOTS: faint dots of the last refreshPoints (KYXApp.dots); the canvas finds its own
  const mkPane = (n, zi, pe) => { const el = map.createPane(n); el.style.zIndex = zi; if (pe === false) el.style.pointerEvents = "none"; return el; };
  const fillPane = mkPane("ctyFill", 401); mkPane("ctyLine", 402, false);
  function drawOvl(ctx, b) {  // county borders + faint dots, clipped to a partial redraw
    ctx.save(); if (b) { const sz = b.getSize(); ctx.beginPath(); ctx.rect(b.min.x, b.min.y, sz.x, sz.y); ctx.clip(); }
    if (ctyMetric !== null && map.hasLayer(countyLayer)) {
      ctx.beginPath();
      for (const n in countyPolys) { const ps = countyPolys[n]._parts; if (ps) ps.forEach(r => { if (!r.length) return; ctx.moveTo(r[0].x, r[0].y); for (let i = 1; i < r.length; i++) ctx.lineTo(r[i].x, r[i].y); ctx.closePath(); }); }
      ctx.globalAlpha = 0.7; ctx.strokeStyle = "#123642"; ctx.lineWidth = 0.8; ctx.lineJoin = ctx.lineCap = "round"; ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (ptsOn) drawDots(ctx);  // faint dots for pins below their zoom tier (same canvas: one less full-screen layer to clear and composite)
    ctx.restore();
  }
  const DrawR = L.Canvas.extend({
    _redraw() { if (this._full) { this._full = false; this._redrawBounds = null; } L.Canvas.prototype._redraw.call(this); },
    _draw() {
      const top = this === R_LINE;  // the line canvas: borders/dots under its own layers (selection outline); the fill canvas: over them
      if (!top) L.Canvas.prototype._draw.call(this);
      if (this._ovl) drawOvl(this._ctx, this._redrawBounds);
      if (top) L.Canvas.prototype._draw.call(this);
    } });
  const R_FILL = new DrawR({ pane: "ctyFill" }); R_FILL._ovl = true; R_FILL.addTo(map);
  const ovlR = () => R_LINE || R_FILL;
  const fullDraw = r => { if (!r._map) return; r._full = true; if (!r._redrawRequest) r._redrawRequest = L.Util.requestAnimFrame(r._redraw, r); };  // one pass with any pending one
  const lineDirty = () => fullDraw(ovlR());
  function ensureLines() {
    if (R_LINE) return R_LINE;
    R_LINE = new DrawR({ pane: "ctyLine" }); R_LINE._ovl = true; R_LINE.addTo(map);  // after R_FILL: fills re-project first on moveend
    R_FILL._ovl = false; fullDraw(R_FILL);
    return R_LINE;
  }
  countyLayer.on("add remove", lineDirty);
  let homeZ = null; window.addEventListener("resize", () => { homeZ = null; setFade(map.getZoom()); });
  const FADE_LO = 0.1, FADE_Z1 = 12.5;  // fill opacity at town zoom (12.5+); full (0.55) at the start view
  function fadeAt(z) {
    if (homeZ == null) try { homeZ = homeTarget().zoom; } catch (e) { homeZ = 6.2; }
    const z0 = homeZ + 0.2, t = Math.max(0, Math.min(1, (z - z0) / (FADE_Z1 - z0))), s = t * t * (3 - 2 * t);
    return 1 - s * (1 - FADE_LO / 0.55);  // pane opacity; the fills are drawn at 0.55 (sweet spots 0.6)
  }
  // -1: never set (start view, full strength). Steps of 0.005 during a pinch: fewer layer restyles, no visible banding.
  let fadeV = -1; function setFade(z) { const v = Math.round(fadeAt(z) * 200) / 200; if (v !== fadeV) { if (v < 1) ensureLines(); fadeV = v; fillPane.style.opacity = v; } }
  let fadeQ = null, fadeZ = 0; const fadeSoon = z => { fadeZ = z; if (!fadeQ) fadeQ = L.Util.requestAnimFrame(() => { fadeQ = null; setFade(fadeZ); }); };  // once per frame
  map.on("zoom", () => fadeSoon(map.getZoom())); map.on("zoomanim", e => setFade(e.zoom)); map.on("zoomend", () => setFade(map.getZoom()));
  if (location.hash) setFade(map.getZoom());  // otherwise the start view: full strength, nothing to compute yet
  { const go = () => setTimeout(() => (window.requestIdleCallback || (f => setTimeout(f, 1)))(() => ensureLines(), { timeout: 3000 }), 1500);  // idle time after load
    if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true }); }
  function buildCounties() {
    const sc = scaleFor(curMetric);
    if (ctyMetric === null) (K.counties || []).forEach(c => {
      const p = L.polygon(cLL(c), countyStyle(c, sc));
      p.bindTooltip(() => tipFor(c, scaleFor(curMetric)), { sticky: true });
      p.on("click", polyTap(c));
      countyLayer.addLayer(p); countyPolys[c.name] = p;
    });
    else if (ctyMetric !== curMetric) (K.counties || []).forEach(c => countyPolys[c.name].setStyle(countyStyle(c, sc)));
    ctyMetric = curMetric; lineDirty(); if (fadeV !== -1) setFade(map.getZoom());
  }
  function drawCounties() {
    if (ctyMetric !== null) buildCounties();
    legend(scaleFor(curMetric), "#legend");
    if (keyReady) renderKey();
  }
  let sweetDrawn = false;
  function drawSweet() {  // built the first time the Sweet-spot layer is turned on
    if (sweetDrawn) return; sweetDrawn = true;
    const sc = sweetKey && scaleFor(sweetKey);
    if (!sc) return;
    (K.counties || []).forEach(c => {
      const p = L.polygon(cLL(c), { renderer: R_FILL, color: "#3d2a00", weight: sc.cls(c) === 0 ? 2.5 : 0.6, fillColor: sc.color(c), fillOpacity: 0.6 });
      p.bindTooltip(`${esc(c.name)} — sweet spot: ${esc(fmtMetric(sc.m, c.m[sweetKey]))} (${esc(sc.labelOf(c))})`, { sticky: true });
      p.on("click", polyTap(c));
      sweetLayer.addLayer(p);
    });
  }
  function legend(sc, sel) {
    const el = $(sel); if (!sc) { el.innerHTML = metrics.length ? "" : '<span class="small">County metrics will appear when data CSVs are available.</span>'; return; }
    el.innerHTML = `<div class="bar">${sc.classes.map(c => `<span style="background:${c.color}"></span>`).join("")}</div>
      <div class="ends"><span>${sc.m.neutral ? "highest" : "best"}</span><span>${sc.m.neutral ? "lowest" : "worst"}</span></div>
      <div class="small">${esc(sc.m.desc)}<br>Source: ${esc(sc.m.src)}</div>`;
  }
  const msel = $("#metricSel");
  if (!metrics.length) msel.innerHTML = "<option>(no county metrics yet)</option>";
  const groups = {};
  metrics.forEach(m => (groups[m.group] = groups[m.group] || []).push(m));
  Object.entries(groups).forEach(([g, ms]) => {
    const og = document.createElement("optgroup"); og.label = g;
    ms.forEach(m => { const o = document.createElement("option"); o.value = m.key; o.textContent = m.label; if (m.key === curMetric) o.selected = true; og.appendChild(o); });
    msel.appendChild(og);
  });
  msel.onchange = () => { curMetric = msel.value; localStorage.setItem(ST.ls + "metric2", curMetric); drawCounties(); };
  drawCounties();  // legend only; polygons are built when the layer is first shown (LAYERS prep)

  // ------------------------------------------------------------------ point layers (lazy)
  // Each layer is a PL holding cheap entries {type, id, it, lat, lon, ic(), z, tip}. A real L.marker is made only when its point is in
  // the padded viewport AND the layer's zoom tier is reached (or the item is on the always-shown KEEP list); it is then cached and
  // reused. One debounced refresh (after zoomend / moveend / layer or filter changes) adds and removes markers by diff.
  const PLS = new Set();
  let refreshT = null;
  const sched = now => { if (refreshT) { if (!now) return; clearTimeout(refreshT); } refreshT = setTimeout(() => { refreshT = null; refreshPoints(); }, now ? 0 : 90); };
  const PL = L.Layer.extend({
    initialize(key) { this.key = key; this.ents = new Set(); this.shown = new Set(); },
    addLayer(e) { this.ents.add(e); if (this._map) sched(); return this; },
    removeLayer(e) { if (this.ents.delete(e) && this.shown.has(e)) this._hide(e); return this; },
    hasLayer(e) { return this.ents.has(e); },
    eachLayer(f) { this.ents.forEach(f); return this; },
    getLayers() { return [...this.ents]; },
    onAdd() { PLS.add(this); sched(true); },
    onRemove() { PLS.delete(this); this.shown.forEach(e => this._hide(e)); sched(true); },  // sched: its groups and dots go too
    _show(e) { e._lk = this.key; if (e.mk) syncF(e); map.addLayer(mkFor(e)); this.shown.add(e); },
    _hide(e) { if (e.mk) map.removeLayer(e.mk); this.shown.delete(e); },
  });
  const ICN = {}, ICK = new Map(); const icOnce = (k, f) => ICN[k] || (ICN[k] = f(), ICK.set(ICN[k], k), ICN[k]);  // ICK: icon -> its key (cluster groups)
  const STOUT = new Map();  // featured standouts: same icon + gold glow class
  const stoutOf = ic => { if (!STOUT.has(ic)) STOUT.set(ic, L.divIcon(Object.assign({}, ic.options, { html: ic.options.html.replace('class="mk ', 'class="mk stout ') }))); return STOUT.get(ic); };
  let lifted = null;  // zoomed out (< 10): always-icon pins sit above everything else
  const zOf = e => lifted && e.zh ? e.zh : e.z || 0;
  // ---- kyxFoc (Bill, Oct 7 2026): whatever filter is active (a right-side solo button, incl. Anna's, or an open Top 10 list) draws its
  // pins / groups LARGEST (x1.4, groups x1.15) and TOPMOST (zIndexOffset +20000); every other pin still on the map (trauma centers,
  // airports, cities, schools...) is drawn smaller (x0.72) and a bit faint underneath. No filter: icons exactly as before.
  var TOPF = null;  // open Top 10 list: { k, ty (pin type), ll: Set of "lat,lon" }
  let FOCK = "", FOC_ON = false;
  const FOC_TR = 15000;  // kyxHosp: a filtered trauma center (Hospitals button) sits above every other filtered pin / group
  const FOC_UP = 20000, FOC_BIG = 1.4, FOC_CL = 1.15, FOC_SM = 0.72;
  const llk = e => e._llk || (e._llk = (+e.lat).toFixed(5) + "," + (+e.lon).toFixed(5));
  const isFoc = e => !!((SOLO_ON && SOLO_ON.has(e._lk) && (!soloF || soloF(e))) || (TOPF && e.type === TOPF.ty && TOPF.ll.has(llk(e))));
  const focM = e => FOC_ON ? (isFoc(e) ? 1 : -1) : 0;
  const zOfF = e => zOf(e) + (e._fm === 1 ? FOC_UP + (e._lk === "trauma" ? FOC_TR : 0) : 0);
  function focIc(ic, m, cl) {  // the same icon scaled around its anchor (inner wrapper: Leaflet owns the outer element's transform)
    if (!m || !ic || !ic.options || ic.options.html == null) return ic;
    const o = ic.options, sz = L.point(o.iconSize || [12, 12]), a = o.iconAnchor ? L.point(o.iconAnchor) : sz.divideBy(2), sc = m === 1 ? (cl ? FOC_CL : FOC_BIG) : FOC_SM;
    return L.divIcon(Object.assign({}, o, { html: `<div class="${m === 1 ? "kfz" : "kdim"}" style="width:${sz.x}px;height:${sz.y}px;transform:scale(${sc});transform-origin:${a.x}px ${a.y}px">${o.html}</div>` }));
  }
  const iconOf = (e, ic) => { ic = ic || e.ic(); return focIc(e.stout ? stoutOf(ic) : ic, e._fm); };
  function syncF(e) { const m = focM(e); if (e.mk && e._fm !== m) { e._fm = m; e.mk.setIcon(iconOf(e)); e.mk.setZIndexOffset(zOfF(e)); } }
  function topFoc(t) {  // the pins of an open Top 10 list (by type + spot: hats, homes, buildings, Anna jobs / homes)
    let pts = [];
    try { pts = t.ext ? ANNAX.topPts(t) : t.perm ? PJX.topPts(t) : topRows(t).map(([, x]) => [x.lat, x.lon]); } catch (er) { pts = []; }
    const ll = new Set(pts.filter(q => q && q[0] != null).map(q => (+q[0]).toFixed(5) + "," + (+q[1]).toFixed(5)));
    return ll.size ? { k: t.k, ty: t.perm ? "perm" : t.type === "ahome" ? "property" : t.type, ll } : null;
  }
  const MADE = [];
  function mkFor(e) {
    if (e.mk) return e.mk;
    const ic = e.ic(); e._fm = focM(e);
    const m = e.mk = L.marker([e.lat, e.lon], { icon: iconOf(e, ic), zIndexOffset: zOfF(e), title: e.title || "", opacity: e.op || 1 });
    if (e.tip) m.bindTooltip(e.tip);
    m.on("click", ev => { const oe = ev.originalEvent; if (oe) { if (oe._kyxHandled) return; oe._kyxHandled = true; }
      const real = oe && oe.detail > 0 && (oe.clientX || oe.clientY), pt = real ? map.mouseEventToContainerPoint(oe) : map.latLngToContainerPoint(m.getLatLng());
      // tap landed in the invisible padding (not on the drawn icon): let the nearest-pin rule decide, so a neighbour that is closer wins
      tapGate(pt, () => { if (real && pt.distanceTo(map.latLngToContainerPoint(m.getLatLng())) > 12 && tapAt(pt)) return; openPin(e); }, oe); });
    MADE.push(e); return m;
  }
  // ---- forgiving taps (phones): a tap near a pin opens that pin instead of the county under it
  // Nearest shown marker in screen pixels across every visible point layer (only markers that exist = in view and in the zoom tier).
  // Within TAP_R and clearly nearest (second one >= 1.5x as far, or outside TAP_R) -> open it; two or more about equally close -> a small
  // chooser list; nothing within TAP_R -> fallback (the county card).
  const TAP_R = 30;
  const TLAB = { cluster: "Group: tap to zoom in", property: "Property / home", hospital: "Hospital", school: "School", college: "College", activity: "Activity", history: "History", travel: "Travel RN jobs", perm: "Permanent RN jobs", airport: "Airport", business: "Business for sale", building: "Building for sale", attraction: "Attraction", city: "City", ski: "Ski area", peak: "Mountain peak", target: "Target store" };
  function nearPins(pt) {
    const out = [];
    PLS.forEach(pl => pl.shown.forEach(e => { const m = e.mk; if (!m || !m._icon) return;
      const d = map.latLngToContainerPoint(m.getLatLng()).distanceTo(pt); if (d <= TAP_R) out.push({ e, d }); }));
    CLS.forEach(c => { if (!c.mk._icon) return; const d = map.latLngToContainerPoint(c.mk.getLatLng()).distanceTo(pt) - 6; if (d <= TAP_R) out.push({ e: c, d: Math.max(0, d) }); });  // groups are bigger
    return out.sort((a, b) => a.d - b.d);
  }
  const openPin = e => e.cl ? zoomCl(e) : openItem(e.type, e.id, { fly: false, peek: true });
  function tapAt(pt, fallback) {
    const near = nearPins(pt);
    if (!near.length) { if (fallback) fallback(); return false; }
    if (near.length === 1 || near[1].d >= near[0].d * 1.5) { openPin(near[0].e); return true; }
    chooser(pt, near.filter(x => x.d < near[0].d * 1.5 + 8).slice(0, 6));
    return true;
  }
  function chooser(pt, list) {
    const html = `<div class="tapch"><div class="tapch-h">${list.length} places here</div>${list.map((x, i) => { const ic = x.e.ic().options.html.replace(/<b class="plab[^]*?<\/b>/, "");
      return `<button type="button" data-tc="${i}"><span class="tcico">${ic}</span><span class="tct">${esc(x.e.title || x.e.id)}<small>${esc(TLAB[x.e.type] || x.e.type)}</small></span></button>`; }).join("")}</div>`;
    const pop = L.popup({ className: "tappop", closeButton: true, autoPan: true, maxWidth: 270, minWidth: 200, offset: [0, -6] }).setLatLng(map.containerPointToLatLng(pt)).setContent(html).openOn(map);
    pop.getElement().addEventListener("click", ev => { const b = ev.target.closest("[data-tc]"); if (!b) return; map.closePopup(pop); openPin(list[+b.dataset.tc].e); });
  }
  map.on("click", e => { const oe = e.originalEvent; if (!oe || oe._kyxHandled || oe._kyxTap) return; oe._kyxTap = true; const pt = e.containerPoint; tapGate(pt, () => tapAt(pt), oe); });
  const goCity = u => { try { const c = map.getCenter(); sessionStorage.setItem(ST.ls + "cityret", JSON.stringify({ lat: c.lat, lon: c.lng, z: map.getZoom(), t: Date.now() })); } catch (e) { /* private mode: Back still works, at the start view */ } location.href = u; };
  const blockTap = c => CITYPG[c.name] && !(FOCUS && FOCUS.name === c.name) ? goCity(CITYPG[c.name]) : openItem("county", c.name, { peek: true });  // pins on top still open first (tapAt); a focused mega-block keeps its card
  const polyTap = c => e => { const oe = e.originalEvent; if (oe && (oe._kyxHandled || oe._kyxTap)) return; if (oe) oe._kyxTap = true; const pt = e.containerPoint; tapGate(pt, () => tapAt(pt, () => blockTap(c)), oe); };
  // ---- double tap / double click toggles the zoom (Leaflet's own double-click zoom is off): zoomed in -> all the way out to the
  // statewide start view; at or near the start view -> in on the tapped spot (fits the county under it, else zoom 10). It is its own
  // Back step. Single taps wait DT_MS for a possible second tap, so a double tap never opens a pin or county card.
  const DT_MS = 250; let tapT = null, tapP = null;
  function tapGate(pt, fn, oe) {
    if (oe && oe.detail === 0 && !oe.clientX && !oe.clientY) { fn(); return; }  // keyboard (Enter on a focused pin): no wait
    if (tapT && tapP && pt.distanceTo(tapP.pt) < 40) { clearTimeout(tapT); tapT = null; const p0 = tapP.pt; tapP = null; dblTap(p0); return; }
    if (tapT) { clearTimeout(tapT); tapT = null; const f = tapP.fn; tapP = null; f(); }  // a tap somewhere else: the first one runs now
    const fn0 = fn; fn = () => { if (FOCUS) { const ll = map.containerPointToLatLng(pt); if (!pipC(FOCUS.c, ll.lng, ll.lat)) clearFocus(); } fn0(); };
    tapP = { pt, fn }; tapT = setTimeout(() => { tapT = null; const f = tapP && tapP.fn; tapP = null; if (f) f(); }, DT_MS);
  }
  function homeTarget() {
    const so = map.options.zoomSnap; if (PHONE) map.options.zoomSnap = 0.05;
    const r = PHONE ? map._getBoundsCenterZoom(L.latLngBounds(ST.bp), { padding: [2, 2] })
      : map._getBoundsCenterZoom(L.latLngBounds(ST.bd), { paddingTopLeft: [325, 50], paddingBottomRight: [8, 8] });
    map.options.zoomSnap = so; return r;
  }
  function countyAt(ll) {  // even-odd test over every ring of the county outlines
    const x = ll.lng, y = ll.lat;
    return (K.counties || []).find(c => { const b = c.bbox; if (b && (x < b[0] || x > b[2] || y < b[1] || y > b[3])) return false;
      let inside = false; (c.rings || []).forEach(r => { for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } }); return inside; }) || null;
  }
  function dblTap(pt) {
    map.closePopup();
    const H = homeTarget(), out = map.getZoom() > H.zoom + 0.75;
    nav(location.hash, false, snap(), { kyxZoom: 1 });  // Back returns to the view from before the double tap
    if (out) { clearFocus(); const so = map.options.zoomSnap; map.options.zoomSnap = 0.05; map.flyTo(H.center, H.zoom, { duration: 0.9 }); map.options.zoomSnap = so; return; }
    const ll = map.containerPointToLatLng(pt), c = countyAt(ll);
    if (c && c.bbox) fitCounty(c); else map.flyTo(ll, 10, { duration: 0.8 });
  }
  // zoom tiers: full icons from this zoom (layers not listed: every zoom); KEEP = always icons even when zoomed out.
  // Statewide (the start view is z 6.2 on a phone in portrait, about 7.3 in landscape) only the always-shown pins are icons: Level I/II
  // trauma centers, airports, businesses and odd buildings for sale, bargain homes and the 5 cities; every other pin of a layer that is
  // on is a faint dot (drawDots, on the county-line canvas). Each zoom step then turns a few more kinds of dots into icons, from the standouts at 7.5 to
  // coal camps, ghost towns and mines at 11 (it used to be nearly everything at once at 10).
  const FULL = { feat: 7.5, trauma: 8, hosp: 8, props: 8.5, nh: 8.5, cab: 8.5, big: 8, cvf: 8, homes: 9, travel: 9, perm: 9, a_museum: 9.5, a_aqua: 9.5, col: 9.5,
    a_park: 10, a_water: 10, act: 10, a_camp: 10, h_hist: 10.5, sch: 10.5, h_coal: 11, h_ghost: 11, h_mine: 11, ski: 8, peak: 9.5, tgt: 9 };
  const FULLE = { peak: e => e.it.tier === 1 ? 8 : 9.5 };  // per-pin tier inside a layer: the best-known peaks (tier 1) from zoom 8
  const top12 = h => /^Level (I|II)(\s|$)/.test(h.trauma || ""), barg = p => !!p.bargain;
  const KEEP = { trauma: top12, props: barg, homes: barg, nh: barg, cab: barg, big: () => true, cvf: () => true };  // cvf: cave / waterfall pins show at every zoom (grouped statewide)  // big: 50+ ac black stars show at every zoom (grouped statewide)
  // ---- faint dots: one small canvas, redrawn in a single pass (no Leaflet object per dot); colors by kind
  const DOTC = { props: "#c62828", homes: "#c62828", nh: "#c62828", cab: "#6d4c41", big: "#111", cvf: "#1d1d1f", trauma: "#8b0000", hosp: "#d32f2f", travel: "#c62828", perm: "#1565c0", sch: "#5e35b1", col: "#6a1b9a",
    act: "#2e7d32", feat: "#b8860b", h_hist: "#b8860b", h_coal: "#37474f", h_ghost: "#7e57c2", h_mine: "#5d4037", a_park: "#ef6c00", a_water: "#0288d1", a_aqua: "#0288d1", a_museum: "#8d6e63", a_camp: "#2e7d32", ski: "#0277bd", peak: "#546e7a", tgt: "#cc0000" };
  ptsOn = true;  // the dot tables above exist now (a canvas may draw before this line)
  const hk = e => { let h = e._hk; if (h === undefined) { h = 0; const t = String(e.id); for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; e._hk = h; } return h; };
  const isDot = (pl, e, full, keep, solo, s, n, w, ea) => !(e.px || !(e.lat >= s && e.lat <= n && e.lon >= w && e.lon <= ea) || (solo && soloF && !soloF(e)))
    && !(full || (FOCUS && inFocus(e)) || (keep && keep(e.it)) || (TOPF && isFoc(e)));
  function scanDots(z) {  // the dots for the current view (same test as refreshPoints), with a content key
    const b = map.getBounds().pad(0.3), s = b.getSouth(), n = b.getNorth(), w = b.getWest(), ea = b.getEast(), ds = []; let h = 0;
    PLS.forEach(pl => {
      const solo = SOLO_ON && SOLO_ON.has(pl.key), full = solo || !(pl.key in FULL) || z >= FULL[pl.key], keep = KEEP[pl.key];
      if (full) return;
      const dc = DOTC[pl.key] || "#546e7a", fe = FULLE[pl.key];
      pl.ents.forEach(e => { e._lk = pl.key; if (isDot(pl, e, !!(fe && z >= fe(e)), keep, solo, s, n, w, ea)) { ds.push({ lat: e.lat, lon: e.lon, c: dc, id: e.id }); h = (h * 33 + hk(e)) | 0; } });
    });
    return { ds, k: ds.length + ":" + h };
  }
  let drawnKey = "";
  function drawDots(ctx) {  // the canvas works out the dots itself, so its own moveend redraw is already right (no second pass after refreshPoints)
    const z = map.getZoom(), sd = scanDots(z); drawnKey = sd.k;
    if (!sd.ds.length) return;
    const r = Math.max(1.8, Math.min(3.4, 1.8 + (z - 6.2) * 0.4)), by = new Map();
    sd.ds.forEach(d => { const q = map.latLngToLayerPoint([d.lat, d.lon]); let a = by.get(d.c); if (!a) by.set(d.c, a = []); a.push(q); });
    ctx.save(); ctx.lineWidth = 0.8; ctx.strokeStyle = "rgba(255,255,255,.75)";
    by.forEach((qs, c) => { ctx.beginPath(); qs.forEach(q => { ctx.moveTo(q.x + r, q.y); ctx.arc(q.x, q.y, r, 0, 6.2832); }); ctx.globalAlpha = 0.6; ctx.fillStyle = c; ctx.fill(); ctx.globalAlpha = 0.5; ctx.stroke(); });
    ctx.restore();
  }
  function setDots(ds, k) { DOTS = ds; if (k !== drawnKey) lineDirty(); }  // usually the canvas already drew these
  function refreshPoints() {
    const z = map.getZoom(), b = map.getBounds().pad(0.3), s = b.getSouth(), n = b.getNorth(), w = b.getWest(), ea = b.getEast();
    const low = z < 10, clOn = z < CL_OFF;
    if (low !== lifted) { lifted = low; MADE.forEach(e => { if (e.zh && e.mk) e.mk.setZIndexOffset(zOfF(e)); }); }
    const fk = (SOLO || "") + "|" + (TOPF ? TOPF.k : "");  // kyxFoc: the filter changed -> resize / restack the pins already on the map
    if (fk !== FOCK) { FOCK = fk; FOC_ON = !!(SOLO_ON || TOPF); PLS.forEach(pl => pl.shown.forEach(syncF)); document.documentElement.classList.toggle("kfoc", FOC_ON); }
    const dots = [], cand = new Map(); let dh = 0;  // cand: cluster group -> [[pl, e], ...] (pins that may be grouped)
    PLS.forEach(pl => {
      const solo = SOLO_ON && SOLO_ON.has(pl.key);
      const full0 = solo || !(pl.key in FULL) || z >= FULL[pl.key], keep = KEEP[pl.key], dc = DOTC[pl.key] || "#546e7a", nocl = NOCL.has(pl.key), fe = !full0 && FULLE[pl.key];
      pl.ents.forEach(e => {
        e._lk = pl.key; const full = full0 || !!(fe && z >= fe(e));
        const inv = e.lat >= s && e.lat <= n && e.lon >= w && e.lon <= ea;
        if (e.px || !inv || (solo && soloF && !soloF(e))) { if (pl.shown.has(e)) pl._hide(e); return; }
        const inF = FOCUS && inFocus(e);
        if (!(full || inF || (keep && keep(e.it)) || (TOPF && isFoc(e)))) { if (pl.shown.has(e)) pl._hide(e); dots.push({ lat: e.lat, lon: e.lon, c: dc, id: e.id }); dh = (dh * 33 + hk(e)) | 0; return; }
        if (inF || nocl || !clOn) { if (!pl.shown.has(e)) pl._show(e); return; }  // county focus: every pin, never grouped
        const g = grpOf(pl, e) + (FOC_ON && isFoc(e) ? "*" : "");  /* kyxFoc: filtered pins group only with filtered pins */ let a = cand.get(g); if (!a) cand.set(g, a = []); a.push([pl, e]);
      });
    });
    clusterize(cand, z);
    setDots(dots, dots.length + ":" + dh);
  }
  // ---- county focus (closing a county card): the map stays on the county and shows every pin inside it as a full icon
  var FOCUS = null, POPPING = false;  // { name, c (county), z (zoom after the fit) }
  function pipC(c, x, y) { const b = c.bbox; if (b && (x < b[0] || x > b[2] || y < b[1] || y > b[3])) return false;
    let inside = false; (c.rings || []).forEach(r => { for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } }); return inside; }
  // inside the county line, or listed in the county (a pin just over the border)
  const inFocus = e => { if (e._fz !== FOCUS.name) { e._fz = FOCUS.name; e._fin = pipC(FOCUS.c, e.lon, e.lat) || (!!e.it && typeof e.it.county === "string" && e.it.county.replace(/ County$/i, "").toLowerCase() === FOCUS.name.toLowerCase()); } return e._fin; };
  // ---- grouping (clusters), one kind at a time: pins with the SAME icon type (red houses, ⭐ bargains, blue hats, tents, caves, …) closer
  // than CL_R px merge into one bigger copy of that icon with a count badge; never mixed kinds. Tap = zoom in until it splits (a Back
  // step, like a double tap). Below zoom CL_OFF only; from CL_OFF up every pin is its own icon. Cities and airports never group.
  const CL_OFF = 13, NOCL = new Set(["city", "apt"]), CLC = { biz: "#1b5e20", bldg: "#2e7d32", trauma: "#8b0000" };  // CLC: count badge colors (else DOTC)
  const GRP_ALIAS = k => /^hosp/.test(k) ? "hosp" : /^sch/.test(k) ? "sch" : /^col_/.test(k) ? "col" : k;  // near-identical icons: one group
  const grpOf = (pl, e) => e._g || (e._g = (() => { const k = ICK.get(e.ic()); return k ? "i:" + GRP_ALIAS(k) : "l:" + pl.key; })());
  const CLMK = new Map(); let CLS = [];  // key -> cluster {mk, ll, n, xs, g}; CLS = the ones on the map now
  function clIcon(c) {
    const top = c.xs[0][1], ic = top.stout ? stoutOf(top.ic()) : top.ic(), o = ic.options, w = o.iconSize[0], h = o.iconSize[1], n = c.n;
    const sc = n >= 50 ? 1.75 : n >= 10 ? 1.6 : 1.45, W = Math.round(w * sc), H = Math.round(h * sc), col = /^i:barg\*?$/.test(c.g) ? "#8e24aa" : CLC[c.xs[0][0].key] || DOTC[c.xs[0][0].key] || "#37474f";
    const html = o.html.replace(/<b class="plab[^]*?<\/b>/g, "");
    return L.divIcon({ className: "kclw", html: `<div class="kcg" style="width:${W}px;height:${H}px"><div class="kcgi" style="width:${w}px;height:${h}px;transform:scale(${sc})">${html}</div><b class="kcn" style="background:${col}">${n}</b></div>`,
      iconSize: [W, H], iconAnchor: [W / 2, H / 2] });
  }
  function zoomCl(c) {
    map.closePopup();
    const bb = L.latLngBounds(c.xs.map(([, e]) => [e.lat, e.lon])), z = map.getZoom();
    const so = map.options.zoomSnap; map.options.zoomSnap = 0.25;
    let tz = bb.getNorthEast().equals(bb.getSouthWest()) ? CL_OFF : map.getBoundsZoom(bb, false, L.point(110, 160));
    map.options.zoomSnap = so;
    tz = Math.min(Math.max(tz, z + 1), Math.max(CL_OFF, z + 1), map.getMaxZoom());
    nav(location.hash, false, snap(), { kyxZoom: 1 });  // Back returns to the view from before the tap
    map.flyTo(bb.getCenter(), tz, { duration: 0.6 });
  }
  function clusterize(cand, z) {
    const CL_R = z < 7 ? 44 : z < 9 ? 40 : 36;  // px; a little wider statewide
    const show = ([pl, e]) => { if (!pl.shown.has(e)) pl._show(e); };
    const live = new Map();
    cand.forEach((xs, g) => {
      if (xs.length === 1) { show(xs[0]); return; }
      const pts = xs.map(x => { const q = map.project([x[1].lat, x[1].lon], z); return { x, px: q.x, py: q.y, k: zOf(x[1]), t: false }; });
      pts.sort((a, b) => b.k - a.k || a.py - b.py || a.px - b.px);  // the most important pin of the kind (bargain, top pay, standout) seeds its group and shows on it; ties: north first (same groups every time)
      const grid = new Map(), cell = (i, j) => i + ":" + j;
      pts.forEach(p => { const k = cell(Math.floor(p.px / CL_R), Math.floor(p.py / CL_R)); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(p); });
      pts.forEach(p => {
        if (p.t) return; p.t = true;
        const ms = [p], ci = Math.floor(p.px / CL_R), cj = Math.floor(p.py / CL_R);
        for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) (grid.get(cell(i, j)) || []).forEach(q => {
          if (!q.t && (q.px - p.px) ** 2 + (q.py - p.py) ** 2 <= CL_R * CL_R) { q.t = true; ms.push(q); } });
        if (ms.length === 1) { show(p.x); return; }
        ms.forEach(m => { const [pl, e] = m.x; if (pl.shown.has(e)) pl._hide(e); });
        const top = ms[0].x[1], key = g + "|" + ms.map(m => m.x[1].type + ":" + m.x[1].id).sort().join(",") + "|" + (lifted ? 1 : 0) + (FOC_ON ? "f" : "") + (top._txt || top.it && top.it.ptop || "");
        let c = CLMK.get(key);
        if (!c) {
          let la = 0, lo = 0; ms.forEach(m => { la += m.x[1].lat; lo += m.x[1].lon; });
          c = { cl: true, type: "cluster", g, n: ms.length, xs: ms.map(m => m.x), ll: L.latLng(la / ms.length, lo / ms.length), key };
          const lab = TLAB[c.xs[0][1].type] || c.xs[0][1].type; c.id = key; c.title = `${c.n} × ${lab}`; c.ic = () => clIcon(c);
          c.f = FOC_ON ? (g.endsWith("*") ? 1 : -1) : 0;
          c.mk = L.marker(c.ll, { icon: focIc(clIcon(c), c.f, true), zIndexOffset: Math.min(9900, ms[0].k + 300) + (c.f === 1 ? FOC_UP + (ms[0].x[0].key === "trauma" ? FOC_TR : 0) : 0), title: c.title + " (tap to zoom in)", keyboard: true });
          c.mk.on("click", ev => { const oe = ev.originalEvent; if (oe) { if (oe._kyxHandled) return; oe._kyxHandled = true; }
            const real = oe && oe.detail > 0 && (oe.clientX || oe.clientY);
            tapGate(real ? map.mouseEventToContainerPoint(oe) : map.latLngToContainerPoint(c.mk.getLatLng()), () => zoomCl(c), oe); });
          CLMK.set(key, c);
        }
        live.set(key, c);
      });
    });
    CLS.forEach(c => { if (!live.has(c.key)) map.removeLayer(c.mk); });
    CLS = [...live.values()];
    // groups of different kinds in one town would pile up on the same spot: the bigger / more important group keeps its place, the
    // next one moves to the first free slot on a ring around it (screen space, this zoom only; the tap still zooms to its own pins)
    const placed = [], D = 30, RING = [[0, 0]];
    [24, 32].forEach((r, i) => { for (let a = 0; a < 8; a++) { const t = (a + i / 2) * Math.PI / 4 - Math.PI / 2; RING.push([r * Math.cos(t), r * Math.sin(t)]); } });  // small nudges only (no slot free: stays put)
    CLS.map(c => ({ c, q: map.project(c.ll, z), k: (c.mk.options.zIndexOffset || 0) + Math.min(c.n, 99) }))
      .sort((a, b) => b.k - a.k).forEach(({ c, q }) => {
        let at = q; for (const [dx, dy] of RING) { const t = L.point(q.x + dx, q.y + dy); if (placed.every(o => (o.x - t.x) ** 2 + (o.y - t.y) ** 2 >= D * D)) { at = t; break; } }
        placed.push(at); const ll = at === q ? c.ll : map.unproject(at, z); if (!c.mk.getLatLng().equals(ll)) c.mk.setLatLng(ll);
      });
    CLS.forEach(c => { if (!c.mk._map) map.addLayer(c.mk); });
    if (CLMK.size > 600) CLMK.forEach((c, k) => { if (!live.has(k)) CLMK.delete(k); });  // keep the cache small
  }
  map.on("zoomend moveend", () => sched());
  const ent = (type, it, ic, o = {}) => { const e = Object.assign({ type, id: it.id, it, lat: it.lat, lon: it.lon, ic, title: it.title || it.name }, o); MARK[type + ":" + it.id] = e; return e; };
  const FEAT = [];  // featured standouts (activities, history, attractions) -> their own always-on layer (filled in kyxMoreLayers)
  const PL_ = k => new PL(k);
  const L_props = PL_("props"), L_homes = PL_("homes"), L_nh = PL_("nh"), L_cab = PL_("cab"), L_big = PL_("big"), L_cvf = PL_("cvf"), L_hosp = PL_("hosp"), L_trauma = PL_("trauma"), L_sch = PL_("sch"), L_col = PL_("col"), L_act = PL_("act");
  const L_hist = { mine: PL_("h_mine"), coal_camp: PL_("h_coal"), ghost_town: PL_("h_ghost"), historic: PL_("h_hist") };
  const HIST = { mine: ["⛏", "Old mine (USGS MRDS)"], coal_camp: ["🏚", "Historic coal camp"], ghost_town: ["👻", "Ghost town"], historic: ["🏛", "Historic site"] };
  const SCOLOR = { Blue: "#1e5bd8", Green: "#2e9a4b", Yellow: "#e6c229", Orange: "#ef7d1a", Red: "#d33a2c" };
  const ACTI = { "Park": "🌲", "Park / public land": "🏞", "Waterfall": "💧", "Cave": "🕳", "Distillery": "🥃", "Natural arch": "🌉", "Attraction": "🎡", "Hiking trail": "🥾" };

  const isHome = p => p.cat === "1-acre-home";
  const isNH = p => p.cat === "near-hospital-home";  // near-hospital homes (blue pins)
  const CABC = ST.cabin ? ST.cabin.cat || "cabin-home" : null, isCab = p => !!CABC && p.cat === CABC;  // optional cabin category (ST.cabin; Maine)
  const BIGC = "big-land", isBig = p => p.cat === BIGC, BIGL = "50+ acres under $250k (land or home)";  // 50+ acre lots / homes under $250k, every map (Bill, Oct 4 2026)
  // caves / waterfalls ON the property (all maps, Bill Oct 4 2026): p.cf = ["cave"] / ["falls"] / both; a listing of another category keeps
  // its category (lists, counts, profiles) but its pin is the bat / waterfall (one pin; a cave + waterfall = the bat); cat "cave" / "falls" = only this
  const isCF = p => !!(p.cf && p.cf.length), isCFo = p => p.cat === "cave" || p.cat === "falls", hasCave = p => isCF(p) && p.cf.includes("cave"), hasFalls = p => isCF(p) && p.cf.includes("falls");
  const cfLab = p => hasCave(p) && hasFalls(p) ? "🦇 Cave + waterfall on the property" : hasCave(p) ? "🦇 Cave on the property" : "💧 Waterfall on the property";
  const CFS = (K.properties || []).filter(isCF);
  const HOMES = (K.properties || []).filter(isHome), NHOMES = (K.properties || []).filter(isNH), CABS = (K.properties || []).filter(isCab), BIGS = (K.properties || []).filter(isBig), LANDS = (K.properties || []).filter(p => !isHome(p) && !isNH(p) && !isCab(p) && !isBig(p) && !isCFo(p));
  const CABL = ST.cabin ? `${ST.cabin.label || "Cabin"}s (more than ${ST.cabin.acres || 25} acres, 1+ bd / 1+ ba, under ${CAPK("cab")})` : "";
  const nhMk = {};
  let nf = { maxp: 0, maxm: 0, typ: "" }; try { nf = Object.assign(nf, JSON.parse(localStorage.getItem(ST.ls + "nhfilter") || "{}")); } catch (e) { }
  const sqft = v => v ? Math.round(v).toLocaleString() : "—";
  const IC_BARG = () => icOnce("barg", () => sicon("barg", G.starDot("#8e24aa"), 24, 24)), IC_HS = () => icOnce("hs", () => sicon("hs", G.house(false), 22, 22));
  NHOMES.forEach(p => {
    if (p.lat == null || p.lon == null) return; if (isCF(p)) return;
    const e = ent("property", p, p.bargain ? IC_BARG : () => icOnce("nhh", () => sicon("hs nhh", G.house(true), 24, 24)), { z: p.bargain ? 3500 : 1600, zh: p.bargain ? 6500 : 0,
      tip: () => `🏥 ${esc(p.title)}${p.price ? " · " + money(p.price) : ""} · ${sqft(p.sqft)} sq ft · ${esc(p.beds)} bd/${esc(p.baths)} ba${p.nh ? ` · ~${esc(p.nh.minutes_free_flow)} min to ${esc(p.nh.name)}` : ""}` });
    nhMk[p.id] = e; L_nh.addLayer(e);
  });
  const homeMk = {};
  let hf = { maxp: 0, mina: 0 }; try { hf = Object.assign(hf, JSON.parse(localStorage.getItem(ST.ls + "homefilter") || "{}")); } catch (e) { }
  HOMES.forEach(p => {
    if (p.lat == null || p.lon == null) return; if (isCF(p)) return;
    const e = ent("property", p, p.bargain ? IC_BARG : IC_HS, { z: p.bargain ? 3500 : 1500, zh: p.bargain ? 6500 : 0,
      tip: () => `🏠 ${esc(p.title)}${p.price ? " · " + money(p.price) : ""}${p.acres ? " · " + p.acres + " ac" : ""}${p.beds ? " · " + esc(p.beds) + " bd/" + esc(p.baths) + " ba" : ""}` });
    homeMk[p.id] = e; L_homes.addLayer(e);
  });
  CABS.forEach(p => {
    if (p.lat == null || p.lon == null) return; if (isCF(p)) return;
    L_cab.addLayer(ent("property", p, p.bargain ? IC_BARG : () => icOnce("cab", () => sicon("hs cab", G.cabin(24), 24, 24)), { z: p.bargain ? 3500 : 1400, zh: p.bargain ? 6500 : 0,
      tip: () => `${esc(ST.cabin.label || "Cabin")} · ${esc(p.title)}${p.price ? " · " + money(p.price) : ""}${p.acres ? " · " + p.acres + " ac" : ""}${p.beds ? " · " + esc(p.beds) + " bd/" + esc(p.baths) + " ba" : ""}` }));
  });
  const IC_BIG = () => icOnce("big", () => sicon("big", G.bigStar(18), 18, 18));
  BIGS.forEach(p => {  // never the purple bargain star: a 50+ ac listing always shows as a black star
    if (p.lat == null || p.lon == null) return; if (isCF(p)) return;
    L_big.addLayer(ent("property", p, IC_BIG, { z: 3000, zh: 6000,
      tip: () => `★ 50+ ac · ${esc(p.title)}${p.price ? " · " + money(p.price) : ""}${p.acres ? " · " + Math.round(p.acres) + " ac" : ""}${p.price && p.acres ? " · " + money(p.price / p.acres) + "/ac" : ""}` }));
  });
  const IC_CAVE = () => icOnce("cave", () => sicon("cvf", G.bat(24), 24, 11)), IC_FALL = () => icOnce("fall", () => sicon("cvf", G.fall(19), 19, 19));
  CFS.forEach(p => {  // one pin per listing: the bat if it has a cave (cave + waterfall too), else the waterfall
    if (p.lat == null || p.lon == null) return;
    L_cvf.addLayer(ent("property", p, hasCave(p) ? IC_CAVE : IC_FALL, { cfl: true, z: 3200, zh: 6200,
      tip: () => `${hasCave(p) ? "🦇 Cave" : ""}${hasCave(p) && hasFalls(p) ? " + " : ""}${hasFalls(p) ? "💧 Waterfall" : ""} · ${esc(p.title)}${p.price ? " · " + money(p.price) : ""}${p.acres ? " · " + (+p.acres).toLocaleString(undefined, { maximumFractionDigits: 1 }) + " ac" : ""}` }));
  });
  LANDS.forEach(p => {
    if (p.lat == null || p.lon == null) return; if (isCF(p)) return;
    const star = p.standout && p.standout.length;
    L_props.addLayer(ent("property", p, p.bargain ? IC_BARG : IC_HS, { z: p.bargain ? 3500 : star ? 2000 : 1000, zh: p.bargain ? 6500 : 0,
      tip: () => `${esc(p.title)}${p.price ? " · " + money(p.price) : ""}${p.acres ? " · " + p.acres + " ac" : ""}${star ? " ★ " + esc(p.standout.join(", ")) : ""}` }));
  });
  (K.hospitals || []).forEach(h => {
    const tr = h.trauma, gen = h.kind === "general";
    const lv = tr ? (tr.match(/Level (I{1,3}V?|IV)/) || [0, ""])[1] + (/Pediatric/.test(tr) ? "P" : "") : "";
    const ic = tr ? () => icOnce("tr" + lv, () => icon("trauma", lv, 28)) : gen ? () => icOnce("hosp", () => sicon("hosp", G.nurse(), 20, 20)) : () => icOnce("hosp_s", () => sicon("hosp spec", G.nurse(), 17, 17));
    (tr ? L_trauma : L_hosp).addLayer(ent("hospital", h, ic, { z: tr ? 500 : 0, zh: tr ? 9000 : 8000, op: gen ? 1 : 0.75,
      tip: () => esc(h.name) + (tr ? " — Trauma " + esc(tr) : !gen ? " (specialty)" : "") }));
  });
  (K.schools || []).forEach(s => L_sch.addLayer(ent("school", s, () => icOnce("sch" + s.rating, () => sicon("sch", G.cap(SCOLOR[s.rating] || "#9e9e9e"), 22, 18)), { tip: () => `${esc(s.name)}${s.rating ? " — " + esc(s.rating) : ""}` })));
  (K.colleges || []).forEach(c => {
    const cc = /community|technical|trade|beauty/i.test(c.kind || "");
    L_col.addLayer(ent("college", c, cc ? () => icOnce("col_c", () => sicon("col", G.diploma(), 20, 18)) : () => icOnce("col_u", () => sicon("col", G.univ(), 40, 18)), { tip: () => esc(c.name) }));
  });
  (K.activities || []).forEach(a => {
    const og = outdoorGlyph(a);
    const e = ent("activity", a, og ? () => icOnce("og" + og, () => sicon("act og-" + og, G[og](), 22, 22)) : () => icOnce("act" + a.kind, () => icon("act", ACTI[a.kind] || "★", 24)), { tip: () => `${esc(a.name)} (${esc(a.kind)})` });
    if (a.featured) { e.stout = true; e.z = 2500; e.zh = 6000; FEAT.push(e); } else L_act.addLayer(e);
  });
  (K.history || []).forEach(h => {
    const t = HIST[h.type] || ["•", h.type];
    const e = ent("history", h, () => icOnce("h" + h.type, () => icon("hist h-" + h.type, t[0], h.type === "mine" ? 22 : 26)), { tip: () => `${esc(h.name)} — ${esc(t[1])}` });
    if (h.featured) { e.stout = true; e.z = 2500; e.zh = 6000; FEAT.push(e); } else (L_hist[h.type] || L_hist.historic).addLayer(e);
  });

  // ------------------------------------------------------------------ travel-nurse assignments (../data/travel_jobs.json -> build.py -> K.travel)
  const TJ = K.travel || { meta: {}, hospitals: [] }, TJM = TJ.meta || {};
  const TJB = TJM.bands || [];
  const L_travel = PL_("travel"), L_perm = PL_("perm");  // perm: permanent RN jobs (blue hats, filled by perm.js after the first paint)
  window.KYXPJM = d => { window.KYXPJM_D = d; }; window.KYXPJD = d => { window.KYXPJD_D = d; };
  const tjPay = j => j.lo != null && j.lo !== j.hi ? `${money(j.lo)}–${money(j.hi).slice(1)}` : money(j.hi);
  const tjK = v => "$" + (v / 1000).toFixed(1) + "k";
  const capK = v => (Math.round(v / 100) / 10).toFixed(1);  // $1,180 -> 1.2 (thousands, nearest $100)
  const tjIcon = h => L.divIcon({ className: "", html: `<div class="mk sv tjc" style="width:36px;height:22px">${G.nurseCap(capK(h.ptop != null ? h.ptop : h.top), "#fff", "#c62828", "#fff")}</div>`, iconSize: [36, 22], iconAnchor: [18, 11] });
  TJ.hospitals.forEach(h => {
    IDX.travel[h.id] = h;
    L_travel.addLayer(ent("travel", h, () => tjIcon(h), { z: 2500 + Math.round(h.top / 10), tip: () => `💼 ${esc(h.name)} · top ${money(h.top)}/wk · ${h.n} travel RN job${h.n > 1 ? "s" : ""}` }));
  });
  const TJ_ALL = TJ.hospitals.flatMap(h => h.jobs.map(j => Object.assign({ h }, j))).sort((a, b) => b.hi - a.hi || (b.lo || 0) - (a.lo || 0));
  if (TJ.hospitals.length) IDX.travel.all = { id: "all", name: "All travel nurse assignments (ranked by weekly pay)", city: `${TJ_ALL.length} jobs` };
  const TJ_NOTE = () => `<div class="small tjnote">💵 Pay is <b>gross weekly pay as posted</b> by the agency (taxable wage + stipends, before taxes); a range is shown when the posting gives one, and the high end is used for ranking. Travel postings change often (seen ${esc(TJM.date_seen || "")}); confirm on the source.</div>`;
  const tjJob = (j, withHosp) => `<div class="tjrow"><div class="tjtop">${bChip("job", j.id)}<b class="tjpay">${tjPay(j)}/wk</b> <span>${esc(j.u || j.sp)}</span>${withHosp ? ` · ${link("travel", j.h.id, j.h.name)}<span class="small"> (${esc(j.h.city || "")})</span>` : ""}</div>
      <div class="small">${esc(j.sh || "—")} · ${esc(j.len || "length n/a")} · start ${esc(j.st || "n/a")} · ${esc(j.ag || "")}${j.na > 1 ? ` <span title="${esc(j.pn || "")}">(+${j.na - 1} more agenc${j.na > 2 ? "ies" : "y"})</span>` : ""}</div>
      <div class="small">${j.fac ? `Posted as “${esc(j.fac)}” · ` : ""}${esc(j.src || "")}${j.po ? " · posted " + esc(j.po) : ""} · <a href="${esc(j.url)}" target="_blank" rel="noopener">Apply / view ↗</a></div></div>`;
  const pJobs = (js, h) => PROF ? PROF.jobs(js, h) : js;
  function travelCard(h) {
    if (h.id === "all") return `<div class="kicker">💼 Travel nurse assignments</div><h2>All ${TJ_ALL.length} jobs, ranked by weekly pay</h2>
      <div class="sub">${TJ.hospitals.length} ${ST.name} hospitals · tap a hospital name for its card</div>${TJ_NOTE()}${PROF ? PROF.note("jobs") : ""}${pJobs(TJ_ALL).map(j => tjJob(j, true)).join("")}${travelExcl()}`;
    const b = TJB[h.band] || {};
    return `${thumb("travel", h)}<div class="kicker">💼 Travel nurse assignments</div><h2>${esc(h.name)}</h2>
      <div class="sub">${esc([h.city, h.county && h.county + ST.cus].filter(Boolean).join(", "))}</div>
      <div class="badges"><span class="badge" style="background:${RAMP[h.band]};color:${h.band === 2 ? "#222" : "#fff"}">Top pay ${money(h.top)}/wk · ${esc(b.label || "")}</span></div>
      <div class="stats">${stat(money(h.top), "top weekly pay")}${stat(h.n, "travel RN jobs")}${stat(money(h.jobs[h.jobs.length - 1].hi), "lowest (high end)")}</div>
      ${TJ_NOTE()}${PROF ? PROF.note("jobs") : ""}<div class="kicker">Jobs, highest weekly pay first</div>${pJobs(h.jobs, h).map(j => tjJob(j, false)).join("")}
      <table class="kv">${row("Hospital", h.hospital_id ? link("hospital", h.hospital_id, "Hospital details (trauma level, ER, website)") : null)}${row(ST.cu, h.county ? link("county", h.county, h.county + ST.cus) : null)}${row("All jobs", '<a href="#travel=all">Every Kentucky travel job, ranked by pay</a>')}</table>${nearbyProps(h)}`;
  }
  function travelExcl() {
    const ex = TJM.excluded || {}; const n = Object.values(ex).reduce((a, b) => a + b, 0);
    return n ? `<details class="small"><summary>Left out: ${n} postings</summary>${Object.entries(ex).map(([k, v]) => `${v} · ${esc(k)}`).join("<br>")}${TJM.dups ? `<br>${TJM.dups} · duplicate postings` : ""}<br>Sources: ${Object.entries(TJM.sources || {}).map(([k, v]) => `${esc(k)} — ${esc(v)}`).join("; ")}</details>` : "";
  }

  // ------------------------------------------------------------------ Kentucky's 5 largest cities (tiny skyscraper + population label, every zoom)
  // U.S. Census Bureau, Vintage 2025 population estimates (July 1, 2025). Louisville = Louisville/Jefferson County consolidated
  // city-county (all of Jefferson County); Lexington = Lexington-Fayette urban county (all of Fayette County); the rest = city proper.
  // z-order: zoomed in, under every other pin; zoomed out (< 10), above the lifted $ / star pins but still under airports and hospitals.
  const CITIES = ST.cities || [
    { id: "louisville", name: "Louisville", full: "Louisville/Jefferson County", county: "Jefferson", pop: 795222, lat: 38.2527, lon: -85.7585, rank: 1,
      note: "Louisville/Jefferson County Metro: the consolidated city-county (all of Jefferson County)" },
    { id: "lexington", name: "Lexington", full: "Lexington-Fayette", county: "Fayette", pop: 329751, lat: 38.0406, lon: -84.5037, rank: 2,
      note: "Lexington-Fayette Urban County: the merged city-county (all of Fayette County)" },
    { id: "bowling-green", name: "Bowling Green", county: "Warren", pop: 78505, lat: 36.9685, lon: -86.4808, rank: 3, note: "City limits" },
    { id: "owensboro", name: "Owensboro", county: "Daviess", pop: 60892, lat: 37.7719, lon: -87.1112, rank: 4, note: "City limits" },
    { id: "covington", name: "Covington", county: "Kenton", pop: 41847, lat: 39.0837, lon: -84.5086, rank: 5, note: "City limits (Northern Kentucky, across the Ohio River from Cincinnati)" },
  ];
  const popK = n => n >= 1e6 ? (Math.round(n / 1e5) / 10) + "m" : Math.round(n / 1000) + "k";
  IDX.city = {}; CITIES.forEach(c => IDX.city[c.id] = c);
  const L_city = PL_("city");
  CITIES.forEach(c => L_city.addLayer(ent("city", c, () => L.divIcon({ className: "", html: `<div class="mk sv city">${G.tower()}</div><b class="plab city">${popK(c.pop)}</b>`, iconSize: [12, 16], iconAnchor: [6, 9] }),
    { z: -3000, zh: 6600, tip: () => `🏙 ${esc(c.full || c.name)} · ${c.pop.toLocaleString()} people (2025 est.)` })));

  // ------------------------------------------------------------------ layer panel
  const nHist = t => (K.history || []).filter(h => h.type === t).length;
  const LAYERS = [
    { key: "props", label: "★ Notable Properties (5+ acres)", layer: L_props, on: true, n: LANDS.length },
    { key: "homes", label: "🏠 Homes (1+ acre, 3bd/2ba, under " + CAPK("p1") + ")", layer: L_homes, on: true, n: HOMES.length, filter: true },
    { key: "nh", label: "🏥 Near-hospital homes (1,600+ sq ft, 3bd/2ba, under " + CAPK("nh") + ")", layer: L_nh, on: true, n: NHOMES.length, nfilter: true },
    ...(ST.cabin ? [{ key: "cab", ic: G.cabin(16), label: CABL, layer: L_cab, on: true, n: CABS.length }] : []),
    ...(BIGS.length ? [{ key: "big", ic: G.bigStar(16), label: BIGL, layer: L_big, on: true, n: BIGS.length }] : []),
    ...(CFS.length ? [{ key: "cvf", ic: `<span class="cfic">${G.bat(18)}${G.fall(14)}</span>`, label: "Caves & waterfalls on the property", layer: L_cvf, on: true, n: CFS.length }] : []),
    { key: "city", label: "🏙 5 largest cities (population)", layer: L_city, on: true, n: CITIES.length },
    { key: "trauma", label: "Trauma centers", layer: L_trauma, on: true, n: (K.hospitals || []).filter(h => h.trauma).length },
    { key: "hosp", label: "Other hospitals", layer: L_hosp, on: true, n: (K.hospitals || []).filter(h => !h.trauma).length },
    { key: "travel", label: "💼 Travel nurse assignments (by weekly pay)", layer: L_travel, on: false, n: TJ_ALL.length || null, disabled: !TJ.hospitals.length, note: TJ.hospitals.length ? "" : " (no data)" },
    { key: "perm", label: "🩺 Permanent RN jobs (staff, at each hospital)", layer: L_perm, on: true, n: null, pfilter: true, disabled: !(K.meta && K.meta.pj), note: K.meta && K.meta.pj ? "" : " (no data)" },
    { key: "sch", label: `Schools (${ST.sch} ${ST.rlab ? "A–F grade" : "color rating"})`, layer: L_sch, on: false, n: (K.schools || []).length },
    { key: "col", label: "Colleges & universities", layer: L_col, on: true, n: (K.colleges || []).length },
    { key: "act", label: "Activities & outdoors", layer: L_act, on: false, n: (K.activities || []).length },
    { key: "hist", label: "History", group: true },
    { key: "h_hist", label: "🏛 Historic sites & landmarks", layer: L_hist.historic, on: false, n: nHist("historic"), sub: true },
    { key: "h_coal", label: "🏚 Coal camps", layer: L_hist.coal_camp, on: false, n: nHist("coal_camp"), sub: true },
    { key: "h_ghost", label: "👻 Ghost towns", layer: L_hist.ghost_town, on: false, n: nHist("ghost_town"), sub: true },
    { key: "h_mine", label: "⛏ Old mines (USGS MRDS)", layer: L_hist.mine, on: false, n: nHist("mine"), sub: true },
    { key: "cty", label: `${ST.cuP} (colored by metric below)`, layer: countyLayer, on: true, prep: buildCounties },
    { key: "sweet", label: `Sweet-spot ${ST.cup}`, layer: sweetLayer, prep: drawSweet, on: false, disabled: !sweetKey, note: sweetKey ? "" : " (data pending)" },
  ];
  kyxMoreLayers(LAYERS);
  kyxMtn(LAYERS);
  kyxTarget(LAYERS);  // Target stores (K.targets from target_build.py; see the "Target stores" block near the end)  // ski areas + notable peaks (K.ski / K.peaks from mtn_build.py; see the "ski areas & peaks" block near the end)  // airports, businesses/buildings for sale, attractions (see "more layers" block near the end)
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(ST.ls + "layers") || "{}"); } catch (e) { }
  const ll = $("#layerList");
  function mkRow(d, put) {  // one Layers-panel row (anna.js adds its rows with this too)
    if (d.group) { const g = document.createElement("div"); g.innerHTML = `<b>${esc(d.label)}</b>`; g.style.marginTop = "6px"; d.lab = g; put(g); return; }
    const on = d.disabled || annaBlk(d) ? false : (d.key in saved ? saved[d.key] : d.on);
    const lab = document.createElement("label"); if (d.sub) lab.className = "sub"; if (d.disabled) lab.classList.add("dis");
    lab.innerHTML = `<input type="checkbox" ${on ? "checked" : ""} ${d.disabled ? "disabled" : ""}> ${d.ic ? `<span class="lic">${d.ic}</span> ` : ""}${esc(d.label)}${esc(d.note || "")}<span class="cnt">${d.n != null ? d.n : ""}</span>`;
    const cb = lab.querySelector("input");
    cb.onchange = () => { setLayer(d, cb.checked); saved[d.key] = cb.checked; localStorage.setItem(ST.ls + "layers", JSON.stringify(saved)); };
    d.cb = cb; d.lab = lab; put(lab);
    if (d.filter) { d.cnt = lab.querySelector(".cnt"); put(homeFilterEl()); }
    if (d.nfilter) { d.cnt = lab.querySelector(".cnt"); put(nhFilterEl()); }
    if (d.pfilter && !d.disabled) { const w = document.createElement("div"); w.className = "hfilter sub pjfilter"; w.id = "pjFilter"; w.innerHTML = '<span class="small">Filters load in a moment…</span>'; put(w); }
    if (on) { if (d.prep) d.prep(); d.layer.addTo(map); }
  }
  LAYERS.forEach(d => mkRow(d, x => ll.appendChild(x)));
  applyHomeFilter(); applyNHFilter();
  // filter for the Near-hospital homes layer (max price, max drive minutes, house vs townhome/condo); remembered in localStorage
  function nhFilterEl() {
    const w = document.createElement("div"); w.className = "hfilter sub"; w.id = "nhFilter";
    const opt = (vals, cur, f) => vals.map(v => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${f(v)}</option>`).join("");
    w.innerHTML = `<label class="hf">Max price <select id="nfPrice">${opt([0].concat(CAPOPTS("nh", [200000, 250000, 275000, 300000])), nf.maxp, v => v ? "$" + v / 1000 + "k" : "Any (<" + CAPK("nh") + ")")}</select></label>
      <label class="hf">Drive ≤ <select id="nfMin">${opt([0, 5, 7], nf.maxm, v => v ? v + " min" : "10 min")}</select></label>
      <label class="hf">Type <select id="nfType">${opt(["", "House", "Townhome"], nf.typ, v => v === "Townhome" ? "Townhome/condo" : v || "Any")}</select></label>`;
    w.querySelectorAll("select").forEach(s => s.onchange = () => { nf = { maxp: +$("#nfPrice").value, maxm: +$("#nfMin").value, typ: $("#nfType").value }; localStorage.setItem(ST.ls + "nhfilter", JSON.stringify(nf)); applyNHFilter(); });
    return w;
  }
  function nhPass(p) { return (!nf.maxp || (p.price != null && p.price <= nf.maxp)) && (!nf.maxm || (p.nh && p.nh.minutes_free_flow <= nf.maxm)) && (!nf.typ || (nf.typ === "House" ? p.ptype === "House" : p.ptype !== "House")); }
  function applyNHFilter() {
    let n = 0;
    NHOMES.forEach(p => { const mk = nhMk[p.id]; if (!mk) return; const ok = nhPass(p) || (current && current.id === p.id); if (ok) { n++; if (!L_nh.hasLayer(mk)) L_nh.addLayer(mk); } else if (L_nh.hasLayer(mk)) L_nh.removeLayer(mk); });
    const d = LAYERS.find(x => x.key === "nh"); if (d && d.cnt) d.cnt.textContent = n === NHOMES.length ? String(n) : `${n} of ${NHOMES.length}`;
    if (keyReady) renderKey();
  }
  function nfText() { return [nf.maxp && "≤ " + money(nf.maxp), nf.maxm && "≤ " + nf.maxm + " min drive", nf.typ && (nf.typ === "House" ? "houses only" : "townhomes/condos only")].filter(Boolean).join(", "); }
  // simple filter for the Homes layer (max price, min acres); remembered in localStorage
  function homeFilterEl() {
    const w = document.createElement("div"); w.className = "hfilter sub"; w.id = "homeFilter";
    const opt = (vals, cur, f) => vals.map(v => `<option value="${v}" ${+cur === v ? "selected" : ""}>${f(v)}</option>`).join("");
    w.innerHTML = `<label class="hf">Max price <select id="hfPrice">${opt([0].concat(CAPOPTS("p1", [200000, 250000, 300000, 350000, 400000])), hf.maxp, v => v ? "$" + v / 1000 + "k" : "Any (≤" + CAPK("p1") + ")")}</select></label>
      <label class="hf">Min acres <select id="hfAcres">${opt([0, 2, 5, 10, 20], hf.mina, v => v ? v + "+ ac" : "Any (1+)")}</select></label>`;
    w.querySelectorAll("select").forEach(s => s.onchange = () => { hf = { maxp: +$("#hfPrice").value, mina: +$("#hfAcres").value }; localStorage.setItem(ST.ls + "homefilter", JSON.stringify(hf)); applyHomeFilter(); });
    return w;
  }
  function homePass(p) { return (!hf.maxp || (p.price != null && p.price <= hf.maxp)) && (!hf.mina || (p.acres != null && p.acres >= hf.mina)); }
  function applyHomeFilter() {
    let n = 0;
    HOMES.forEach(p => { const mk = homeMk[p.id]; if (!mk) return; const ok = homePass(p) || (current && current.id === p.id); if (ok) { n++; if (!L_homes.hasLayer(mk)) L_homes.addLayer(mk); } else if (L_homes.hasLayer(mk)) L_homes.removeLayer(mk); });
    const d = LAYERS.find(x => x.key === "homes"); if (d && d.cnt) d.cnt.textContent = n === HOMES.length ? String(n) : `${n} of ${HOMES.length}`;
    if (keyReady) renderKey();
  }
  function setLayer(d, on) { if (on && annaBlk(d)) on = false; if (on && d.key === "perm") try { loadPerm(); } catch (e) { } if (on) { if (d.prep) d.prep(); d.layer.addTo(map); if (d.key === "cty" || d.key === "sweet") d.layer.eachLayer(l => l.bringToBack && l.bringToBack()); } else map.removeLayer(d.layer); if (d.cb) d.cb.checked = on; renderKey(); }
  function ensureLayerFor(type, item) {
    const k = (type === "property" && item && item.anna ? "ahome" : null) || (MORE_LAYER_FOR && MORE_LAYER_FOR._feat(item)) || { property: isCF(item) ? "cvf" : isNH(item) ? "nh" : isHome(item) ? "homes" : isCab(item) ? "cab" : isBig(item) ? "big" : "props", school: "sch", college: "col", activity: "act", travel: "travel", perm: "perm", city: "city" }[type]
      || (type === "hospital" ? (item.trauma ? "trauma" : "hosp") : null)
      || (type === "history" ? { mine: "h_mine", coal_camp: "h_coal", ghost_town: "h_ghost", historic: "h_hist" }[item.type] : null)
      || (MORE_LAYER_FOR && MORE_LAYER_FOR[type] ? MORE_LAYER_FOR[type](item) : null);
    const d = LAYERS.find(x => x.key === k); if (d && !map.hasLayer(d.layer)) setLayer(d, true);
  }
  const lb = $("#layersBtn"), lp = $("#layersPanel");
  lb.onclick = () => { lp.hidden = !lp.hidden; lb.setAttribute("aria-expanded", !lp.hidden); };
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { $("#" + b.dataset.close).hidden = true; });
  const S = K.meta && K.meta.sources || {};
  $("#srcNote").innerHTML = "Sources: " + Object.entries(S).map(([k, v]) => `<b>${esc(k)}</b>: ${esc(v)}`).join("; ") + (K.meta ? `<br>Built ${esc(K.meta.built)}` : "");

  // ------------------------------------------------------------------ map key (always visible; collapsible on phones)
  const keyEl = $("#mapKey"), keyBody = $("#keyBody"), keyTog = $("#keyToggle");
  const isPhone = () => PHONE;
  // top pills: "Map key" (top left) and "Search" (top right) start collapsed and expand into the key panel / the search bar + Layers.
  // Tap the pill again, tap outside, Esc or the phone's Back collapses them (an open panel is one history step: Back closes it first).
  const tBar = $("#topbar"), sPill = document.createElement("button");
  sPill.type = "button"; sPill.id = "srchPill"; sPill.className = "tpill2"; sPill.setAttribute("aria-controls", "search");
  tBar.appendChild(sPill);
  var PNL = null; let pnlEat = 0;  // var: nav() reads it
  function showPnl(name) {
    PNL = name || null;
    keyEl.classList.toggle("collapsed", PNL !== "key"); keyTog.setAttribute("aria-expanded", PNL === "key");
    const so = PNL === "search"; tBar.classList.toggle("collapsed", !so); sPill.setAttribute("aria-expanded", so);
    sPill.innerHTML = so ? '<span aria-hidden="true">✕</span>' : '<span aria-hidden="true">🔍</span> Search';
    sPill.setAttribute("aria-label", so ? "Close search and layers" : "Open search and layers"); sPill.title = so ? "Close search & layers" : "Search & layers";
    if (!so) { lp.hidden = true; lb.setAttribute("aria-expanded", false); const r = $("#results"), si = $("#search"); if (r) r.hidden = true; if (si && document.activeElement === si) si.blur(); }
    document.documentElement.classList.toggle("pnlopen", !!PNL); document.documentElement.classList.toggle("srchopen", so);
  }
  function setPanel(name) {  // "key" | "search" | null
    name = name || null; if (name === PNL) return;
    const st = history.state || {};
    if (name) {
      if (PNL && st.pnl) history.replaceState(Object.assign({}, st, { pnl: name }), "", location.href);  // switching panels: still one Back step
      else { history.replaceState(Object.assign({}, st, { v: snap() }), "", location.href); history.pushState(Object.assign({}, st, { pnl: name }), "", location.href); }
      showPnl(name);
    } else if (st.pnl) history.back();  // the popstate handler below collapses
    else showPnl(null);
  }
  window.addEventListener("popstate", e => {  // registered before the router's handler: a panel step never re-routes
    const st = history.state || {}, want = st.pnl || null;
    if (want === PNL) return;
    showPnl(want); e.stopImmediatePropagation();
  });
  const inPnl = (el, n) => n === "key" ? !!el.closest("#mapKey, #infoPop") : !!el.closest("#topbar, #layersPanel");
  document.addEventListener("pointerdown", e => {  // tap outside collapses; a tap on the map that only closed a panel doesn't also open a card
    if (!PNL || !e.target.closest || inPnl(e.target, PNL) || e.target.closest("#srchPill, #keyToggle")) return;
    pnlEat = e.target.closest("#map") ? Date.now() : 0; setPanel(null);
  }, true);
  document.addEventListener("click", e => { if (pnlEat && Date.now() - pnlEat < 900 && e.target.closest && e.target.closest("#map")) { pnlEat = 0; e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && PNL && !(e.target && e.target.id === "search" && $("#results") && !$("#results").hidden)) setPanel(null); });
  showPnl(null);
  keyTog.onclick = () => setPanel(PNL === "key" ? null : "key");
  sPill.onclick = () => setPanel(PNL === "search" ? null : "search");
  const openLayersPanel = () => { setPanel("search"); lp.hidden = false; lb.setAttribute("aria-expanded", true); };
  const mk = (cls, html, size, extra = "") => `<span class="mk ${cls}" style="width:${size}px;height:${size}px;${extra}">${html}</span>`;
  const krow = (sym, label, note) => `<div class="krow"><span class="ksym">${sym}</span><span>${label}${note ? `<span class="small"> ${note}</span>` : ""}</span></div>`;
  const PIN_KEY = {
    props: () => `<div class="ksec"><b>Home + 5 acres or more</b> <span class="small">(5+ acres, 2+ bd / 2+ ba, up to ${CAPK("p5")})</span>${krow(ksv(G.house(false)), "Red house = home on land", "(5-acre and 1-acre searches)")}</div>`,
    cab: () => `<div class="ksec"><b>${esc(ST.cabin.label || "Cabin")}s</b> <span class="small">(remote cabins and homes on more than ${ST.cabin.acres || 25} acres, 1+ bd / 1+ ba, under ${CAPK("cab")}, active)</span>${krow(ksv(G.cabin(24)), "Log cabin = cabin / home on " + (ST.cabin.acres || 25) + "+ acres", "(25+ acre homes with 1–2 bedrooms are always listed here)")}</div>`,
    cvf: () => `<div class="ksec"><b><span class="cfic">${G.bat(18)}${G.fall(15)}</span> Caves & waterfalls on the property</b> <span class="small">(the listing says so; land or homes, any size, up to this map's highest home cap; active)</span>${krow(ksv(G.bat(24)), "Flying bat = a cave on the property", "· a cave + waterfall shows as the bat (and under both buttons)")}${krow(ksv(G.fall(19)), "Small waterfall = a waterfall on the property", "· shown at every zoom; close ones group with a count")}</div>`,
    big: () => `<div class="ksec"><b><span class="bkstar">${G.bigStar(16)}</span> 50+ acres under $250k</b> <span class="small">(raw land or with a home, any size; same cap on every map; active)</span>${krow(ksv(G.bigStar(18)), "Black star = 50+ acre lot or home under $250k", "· shown at every zoom; close ones group into a bigger star with a count")}</div>`,
    bargain: () => `<div class="ksec"><b><span class="bstar">${G.starDot("#8e24aa")}</span> Bargain homes</b>${krow(ksv(G.starDot("#8e24aa")), "Meets every criterion and is priced well below nearby listings", "· shown at every zoom; the card says why")}</div>`,
    homes: () => `<div class="ksec"><b>🏠 Homes</b> <span class="small">(1+ acre, 3+ bd, 2+ full ba, ≤ ${CAPK("p1")}, active)</span>
      ${krow(ksv(G.house(false)), "Home on 1+ acre", "(red house)")}
      ${hf.maxp || hf.mina ? `<div class="small">Filter on: ${hf.maxp ? "≤ " + money(hf.maxp) : ""}${hf.maxp && hf.mina ? ", " : ""}${hf.mina ? hf.mina + "+ acres" : ""} · <button type="button" class="linkbtn" data-openlayers="1">change</button></div>` : ""}</div>`,
    nh: () => `<div class="ksec"><b>🏥 Near-hospital homes</b> <span class="small">(1,600+ sq ft, 3+ bd, 2+ full ba, under ${CAPK("nh")}, active, good condition, ≤ 10 min free-flow to a hospital with a 24/7 ER of 10+ beds)</span>
      ${krow(ksv(G.house(true)), "Near-hospital home", "(red house with a white nursing cross; houses, townhomes, condos)")}
      ${nfText() ? `<div class="small">Filter on: ${esc(nfText())} · <button type="button" class="linkbtn" data-openlayers="1">change</button></div>` : ""}</div>`,
    trauma: () => `<div class="ksec"><b>Trauma centers</b> <span class="small">(KYHA Jan 2026 + border centers)</span>
      ${krow(mk("trauma", "I", 22), "Level I", "(highest: UK, UofL, Cincinnati, Vanderbilt, Knoxville)")}${krow(mk("trauma", "II", 22), "Level II", "(Pikeville, Evansville, Huntington)")}
      ${krow(mk("trauma", "III", 22), "Level III")}${krow(mk("trauma", "IV", 22), "Level IV", "(stabilize & transfer)")}${krow(mk("trauma", "IP", 22), "Pediatric Level I", "(Norton Children's)")}</div>`,
    travel: () => `<div class="ksec"><b>💼 Travel nurse assignments</b> <span class="small">(red nurse's hat at the hospital = its top weekly pay in $1,000s, e.g. 2.4 = $2,400/wk)</span>${krow(ksv(G.nurseCap("2.4", "#fff", "#c62828", "#fff")), "Top pay $2,400/week")}
      ${TJ_NOTE()}<div class="kbtns"><a class="linkbtn" href="#travel=all">📋 All ${TJ_ALL.length} jobs ranked by pay</a></div></div>`,
    perm: () => `<div class="ksec"><b>🩺 Permanent RN jobs</b> <span class="small">(blue nurse's hat at the hospital = top listed hourly pay, e.g. $45; a plain number = how many jobs pass your filters when none lists pay)</span>${krow(ksv(G.nurseCap("$45", "#fff", "#1565c0", "#fff")), "Top listed pay $45/hr")}${krow(ksv(G.nurseCap("12", "#fff", "#1565c0", "#fff")), "12 jobs, pay not listed")}
      <div class="small">Only about 19% of postings list pay. Filters (specialty, FT/PT/PRN, shift, pay, roles, bonus): Layers → Permanent RN jobs. · <button type="button" class="linkbtn" data-pjedit="1">change</button></div>
      <div class="kbtns"><a class="linkbtn" href="#top-perm-er">🏆 Perm ER</a> <a class="linkbtn" href="#top-perm-sdms">🏆 Step-down + Med-surg</a> <a class="linkbtn" href="#top-perm-icu">🏆 ICU</a> <a class="linkbtn" href="#top-bonus">💰 Sign-on bonuses</a></div></div>`,
    city: () => `<div class="ksec"><b>🏙 Largest cities</b>${krow(`<span class="kcity">${ksv(G.tower())}<b class="plab city">${ST.topCity}</b></span>`, `${ST.name}'s 5 largest cities, with population`, ST.cityNote)}</div>`,
    hosp: () => `<div class="ksec"><b>Other hospitals</b>${krow(ksv(G.nurse()), "Hospital (not a trauma center)", `· nursing cross; icon from zoom ${FULL.hosp}`)}</div>`,
    sch: () => `<div class="ksec"><b>Schools</b> <span class="small">(${ST.schLab}, best → lowest)</span>
      <div class="kgrid">${["Blue", "Green", "Yellow", "Orange", "Red"].map(r => krow(ksv(G.cap(SCOLOR[r])), ST.rlab ? ST.rlab[r] : r)).join("")}${krow(ksv(G.cap("#9e9e9e")), "Not rated")}</div></div>`,
    col: () => `<div class="ksec"><b>Colleges</b> <span class="small">(NCES)</span>${krow(ksv(G.univ()), "College or university")}${krow(ksv(G.diploma()), "Community / technical college or trade school", "(KCTCS etc.)")}</div>`,
    act: () => `<div class="ksec"><b>Activities & outdoors</b><div class="kgrid">${krow(ksv(G.park()), "Park (state, national, city, county)")}${krow(ksv(G.tent()), "Campground")}${krow(ksv(G.cave()), "Cave")}${krow(ksv(G.mountain()), "Gorge, peak, arch, overlook")}${krow(ksv(G.lake()), "Lake, river, waterfall, spring")}${krow(ksv(G.tree()), "Forest, trail, wildlife area")}${krow(mk("act", ACTI.Distillery, 20), "Distillery")}${krow(mk("act", ACTI.Attraction, 20), "Zoo / attraction")}</div></div>`,
    h_hist: () => krow(mk("hist h-historic", HIST.historic[0], 20), "Historic site / National Historic Landmark"),
    h_coal: () => krow(mk("hist h-coal_camp", HIST.coal_camp[0], 20), "Historic coal camp"),
    h_ghost: () => krow(mk("hist h-ghost_town", HIST.ghost_town[0], 20), "Ghost town"),
    h_mine: () => krow(mk("hist h-mine", HIST.mine[0], 20), "Old mine (USGS MRDS)"),
  };
  kyxMorePinKey(PIN_KEY);
  kyxMtnPinKey(PIN_KEY); kyxTargetPinKey(PIN_KEY);
  function countyKey(sc, title) {
    if (!sc) return "";
    const m = sc.m, ap = m.key === appealKey;
    const rng = c => c.n ? (c.lo === c.hi ? esc(fmtMetric(m, c.lo)) : `${esc(fmtMetric(m, c.lo))} – ${esc(fmtMetric(m, c.hi))}`) : "—";
    const dir = m.neutral ? "No better/worse direction: blue = highest → lowest." : m.lower_better ? "Lower is better here, so the lowest values are green." : "Higher is better here.";
    return `<div class="ksec"><div class="ktitle">${esc(title)}</div><div class="kmetric">${esc(m.label)}</div>
      ${sc.classes.map(c => `<div class="kband"><span class="sw" style="background:${c.color}"></span><span class="kl">${esc(c.label)}</span><span class="kr">${rng(c)}</span><span class="kn">${c.n}</span></div>`).join("")}
      ${sc.missing ? `<div class="kband"><span class="sw" style="background:${NODATA}"></span><span class="kl">No data</span><span class="kr"></span><span class="kn">${sc.missing}</span></div>` : ""}
      <div class="small">${ap ? `Bands are fifths of the ${ST.n} ${ST.cup} by rank (${Math.round(ST.n / 5)} each). ` : `Fifths of the ${ST.cup} by rank; last column = number of ${ST.cup}. `}${dir}</div>
      <div class="kbtns">${AM && /appeal/.test(m.key) ? '<button type="button" class="linkbtn" data-info="appeal">ⓘ How this score works</button>' : ""}${ANNAX && /^anna-/.test(m.key) ? '<button type="button" class="linkbtn" data-annainfo="1">ⓘ How the Anna score works</button>' : ""}<button type="button" class="linkbtn" data-openlayers="1">Change metric</button></div></div>`;
  }
  function renderKey() {
    const on = k => { const d = LAYERS.find(x => x.key === k); return d && d.layer && map.hasLayer(d.layer); };
    let h = "";
    if (on("cty")) h += countyKey(scaleFor(curMetric), "Counties colored by");
    if (on("sweet")) h += countyKey(scaleFor(sweetKey), "Sweet-spot layer");
    if (!on("cty") && !on("sweet")) h += `<div class="ksec small">${ST.cu} coloring is off. Turn on “${ST.cuP}” in Layers to color by the ${ANNA_ON ? "Anna" : "Appeal"} score.</div>`;
    const pinKeys = ["eng", "spj", "ahome", "props", "homes", "nh", "cab", "big", "cvf", "bargain", "biz", "bldg", "travel", "perm", "trauma", "hosp", "apt", "city", "feat", "ski", "peak", "tgt", "sch", "col", "act"].filter(k => !annaBlk({ key: k, anna: /^(eng|spj|ahome)$/.test(k) }) && (k === "cab" ? !!ST.cabin : k === "big" ? BIGS.length > 0 : k === "cvf" ? CFS.length > 0 : k === "bargain" ? (K.properties || []).some(p => p.bargain) : PIN_KEY[k])), histKeys = ["h_hist", "h_coal", "h_ghost", "h_mine"];
    const atKeys = (MORE_ATT_KEYS || []).filter(k => PIN_KEY[k]), aOn = atKeys.filter(on), aOff = atKeys.filter(k => !on(k));
    const onK = k => k === "bargain" ? on("homes") || on("nh") || on("props") || (ST.cabin && on("cab")) : k === "cab" ? !!ST.cabin && on(k) : on(k);
    const active = pinKeys.filter(onK), off = pinKeys.filter(k => !onK(k));
    h += active.map(k => PIN_KEY[k]()).join("");
    const hOn = histKeys.filter(on), hOff = histKeys.filter(k => !on(k));
    if (hOn.length) h += `<div class="ksec"><b>History</b>${hOn.map(k => PIN_KEY[k]()).join("")}</div>`;
    if (aOn.length) h += `<div class="ksec"><b>Attractions</b>${aOn.map(k => PIN_KEY[k]()).join("")}</div>`;
    h += krow('<span class="ksel"></span>', "Selected item", "(orange ring)");
    if (PIN_KEY._lod) h += PIN_KEY._lod();
    if (PIN_KEY._border) h += PIN_KEY._border();
    if (off.length || hOff.length || aOff.length) h += `<details class="ksec koff"><summary>Symbols for layers that are off</summary>${off.map(k => PIN_KEY[k]()).join("")}${hOff.length ? `<div class="ksec"><b>History</b>${hOff.map(k => PIN_KEY[k]()).join("")}</div>` : ""}${aOff.length ? `<div class="ksec"><b>Attractions</b>${aOff.map(k => PIN_KEY[k]()).join("")}</div>` : ""}</details>`;
    const wasOpen = keyBody.querySelector("details.koff[open]");
    keyBody.innerHTML = h;
    if (wasOpen) { const d = keyBody.querySelector("details.koff"); if (d) d.open = true; }
    const sc = on("cty") ? scaleFor(curMetric) : on("sweet") ? scaleFor(sweetKey) : null;
    $("#keyMini").innerHTML = sc ? sc.classes.map(c => `<span style="background:${c.color}"></span>`).join("") : "";
    $("#keyMetric").textContent = sc ? sc.m.label.replace(/^★\s*/, "") : "";
  }
  keyEl.addEventListener("click", e => {
    if (e.target.closest("[data-pjedit]")) { openLayersPanel();
      loadPerm().then(() => { const b = $("#pjEdit"), f = $("#pjForm"); if (b && f && f.hidden) b.click(); const w = $("#pjFilter"); if (w) w.scrollIntoView({ block: "start" }); }); return; }
    if (e.target.closest("[data-openlayers]")) { openLayersPanel(); msel.focus(); }
  });
  keyReady = true; renderKey();

  // ------------------------------------------------------------------ "How this score works" popover
  const info = $("#infoPop"), infoBody = $("#infoBody");
  function appealInfoHtml() {
    if (!AM) return "<p>The Appeal score method file (ky_county_appeal_method.json) was not available when this map was built.</p>";
    const w = AM.weights, br = AM.band_ranges || [];
    const r = (pts, name, how) => `<tr><td class="n"><b>${pts}</b></td><td><b>${name}</b><br><span class="small">${how}</span></td></tr>`;
    return `<h2>How the Appeal score works</h2>
      <p>A 0–100 score built for a <b>two-nurse household</b>: most of the weight is on what a nurse's pay buys, given where the jobs are. Every input is a published data set; every county is scored against ${ST.name}'s other ${ST.n - 1}.</p>
      <div class="kicker">Nurse financial value · ${w.afford + w.hosp + w.l12} points</div>
      <table class="tbl wtbl">
      ${r(w.afford, "RN pay vs. home price", `Area RN median annual wage (BLS OEWS, May 2025) ÷ county median home value (ACS 2020–24). Scored as a percentile: 100 = the wage buys the most house in ${ST.ab}. Two RN incomes double the ratio but don't change the ranking.`)}
      ${r(w.hosp, "Drive to the nearest acute-care hospital", `Where the nurse jobs are: ${AM.job_hospitals} hospitals = ${ST.jobHosp}. Critical-access (≤25 beds), rural emergency, psychiatric and military hospitals are left out. 100 at ≤${AM.hosp_min[0]} min, falling to 0 at ${AM.hosp_min[1]} min.`)}
      ${r(w.l12, "Drive to the nearest Level I/II trauma center", `The big teaching/tertiary employers (${esc(AM.l12_centers.join("; "))}). 100 at ≤${AM.l12_min[0]} min, 0 at ${AM.l12_min[1]} min.`)}
      </table>
      <div class="kicker">Everything else · ${w.land + w.school + w.trauma} points</div>
      <table class="tbl wtbl">
      ${r(w.land, "Land suitability", "Existing land score: % of land in farms, rainfall, number of farms, cropland share, dry-summer risk, surface water (NASS 2022, NOAA).")}
      ${r(w.school, "Schools", `Existing school score: ${ST.schoolScore}.`)}
      ${r(w.trauma, "Trauma access for the family", `Drive to the nearest adult trauma center of any level (I–IV, ${AM.trauma_centers} centers). 100 at ≤${AM.trauma_min[0]} min, 0 at ${AM.trauma_min[1]} min.`)}
      </table>
      <p class="small"><b>Score</b> = Σ (component 0–100 × points) ÷ 100. The county card shows each county's breakdown.</p>
      <div class="kicker">Bands on the map</div>
      <table class="tbl">${AM.bands.map((b, i) => `<tr><td><span class="sw" style="background:${RAMP[i]}"></span> ${esc(b)}</td><td class="n">${br[i] ? fmt1(br[i][0]) + " – " + fmt1(br[i][1]) : ""}</td><td class="n small">ranks ${i * 24 + 1}–${i * 24 + 24}</td></tr>`).join("")}</table>
      <div class="kicker">Caveats</div>
      <ul class="small">
        <li>Drive times: ${esc(AM.drive_source)}, from each county's 2020 Census population centroid, fetched ${esc(AM.drive_fetched)}. No traffic: real rush-hour times are longer.</li>
        <li>RN wages are BLS area medians (all settings), shared by every county in an area. ${esc(AM.owensboro_note)}</li>
        <li>Out-of-state hospitals are included only if they are Level I/II trauma centers, so border counties (e.g. near Clarksville, Union City, Huntington's other hospitals) may be under-credited.</li>
        <li>Hospital size beyond the critical-access cut-off isn't in the data; a few "acute-care" hospitals are small.</li>
      </ul>
      <p class="small">Data: <code>data/statewide/ky_county_appeal.csv</code> · method: <code>maps/statewide/notes.md</code> · code: <code>scripts/appeal_build.py</code></p>`;
  }
  function openInfo() { infoBody.innerHTML = appealInfoHtml(); info.hidden = false; $("#infoClose").focus(); }
  $("#infoClose").onclick = () => { info.hidden = true; };
  info.addEventListener("click", e => { if (e.target === info) info.hidden = true; });
  document.addEventListener("click", e => { if (e.target.closest("[data-info]")) { e.preventDefault(); openInfo(); } });

  // ------------------------------------------------------------------ card rendering
  const link = (type, id, text) => `<a class="inl" data-go="${esc(type)}" data-id="${esc(id)}">${esc(text)}</a>`;
  const ext = (url, text) => url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(text || url)}</a>` : "—";
  const row = (k, v) => v == null || v === "" ? "" : `<tr><td>${esc(k)}</td><td>${v}</td></tr>`;
  const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${esc(l)}</span></div>`;

  function schoolBlock(c) {
    if (!c) return "";
    const cs = IDX.county[c] && IDX.county[c].school; const m = IDX.county[c] ? IDX.county[c].m : {};
    if (!cs && m.sch_pp_ky == null) return "";
    const rat = cs && cs.letters ? esc(cs.letters).replace(/([ABCDF])(\d+)/g, "<b>$1</b>&nbsp;$2").replace(/ (?=<b>)/g, " · ") : cs && cs.ratings ? cs.ratings.split("/").map(r => rbadge(r)).join(" ") : "—";
    return `<table class="kv">${row(ST.cu === "County" ? "County district" : "Districts", esc(cs && cs.district || c + ST.cus))}
      ${row(`Schools vs ${ST.ab}`, `${esc(sign(m.sch_pp_ky, 1))} pp ${cs && cs.band_ky ? "(" + esc(cs.band_ky) + ")" : ""}`)}
      ${row("Schools vs US", `${esc(sign(m.sch_gl_us, 2))} grade levels ${cs && cs.band_us ? "(" + esc(cs.band_us) + ")" : ""}`)}
      ${row(ST.rlab ? "Schools graded A–F" : "KDE rating ES/MS/HS", rat)}${row(`Rank in ${ST.ab}`, m.sch_rank != null ? "#" + Math.round(m.sch_rank) + " of " + ST.n : null)}
      ${cs && cs.independents ? row(ST.rlab ? "Other districts here" : "Independent districts", esc(cs.independents)) : ""}</table>`;
  }
  // thumbnail at the top of each card (data/thumbs.json via build.py -> item.th)
  const THUMB_TITLE = { travel: h => h.name, hospital: h => h.name, school: s => s.name, college: c => c.name, activity: a => a.name, history: h => h.name, county: c => c.name + ST.cus + ", " + ST.name, property: p => p.title };
  const SAT = { c: "Imagery: Esri, Maxar, Earthstar Geographics", s: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" };
  function thumb(type, it) {
    let t = it.th; if (!t || !t.u) return "";
    const sat = t.k === "satellite";
    if (sat) t = Object.assign({}, SAT, t);
    const name = THUMB_TITLE[type] ? THUMB_TITLE[type](it) : "";
    const alt = sat ? `Satellite view of ${name}` : `Photo of ${name}`;
    const src = t.s ? ` · <a href="${esc(t.s)}" target="_blank" rel="noopener">${sat ? "about" : "source"}</a>` : "";
    return `<figure class="thumb${sat ? " sat" : ""}"><button type="button" class="thumbbtn" data-thumb="1" aria-label="Enlarge ${esc(alt)}">
      <img src="${esc(t.u)}" alt="${esc(alt)}" loading="lazy" decoding="async" width="400" height="260">${sat ? '<span class="thtag">🛰 Satellite view</span>' : ""}</button>
      <figcaption class="attr">${sat ? "Satellite view · " : ""}${esc(t.c || "")}${src}</figcaption></figure>`;
  }
  const R = {};
  function nearbyBlock(nb) {
    if (!nb) return "";
    const H = h => h ? `${link("hospital", h.id, h.n)} · ${h.min != null ? `<b>~${esc(h.min)} min</b> <span class="small">drive (${esc(h.src || "OSRM")})</span>` : `<b>~${fmt1(h.rd)} road mi</b> <span class="small">approx (${fmt1(h.mi)} mi straight-line × 1.3)</span>`}${h.tr ? " · " + esc(h.tr) : ""}${h.er ? ` · ${esc(h.er)} ER beds` : h.erl ? ` · ER ${esc(h.erl)}` : ""}` : null;
    const TGN = t => `${link("target", t.id, t.n)}${t.st ? ` <span class="small">(${esc(t.st)})</span>` : ""} · ${t.min != null ? `<b>~${esc(t.min)} min</b> <span class="small">drive (OSRM, free-flow)</span>` : `<b>~${fmt1(t.rd)} road mi</b> <span class="small">approx (${fmt1(t.mi)} mi straight-line × 1.3)</span>`}`;
    const P = (nb.poi || []).map(q => `${link(q.t, q.id, q.n)} <span class="small">${fmt1(q.mi)} mi</span>`).join("<br>");
    const S = lv => { const x = (nb.s || {})[lv]; return x ? `${link("school", x.id, x.n)} ${rbadge(x.r)}${x.d != null ? ` <span class="small">${x.d >= 0 ? "+" : ""}${fmt1(x.d)} pts vs ${ST.ab} avg</span>` : ""} <span class="small">· ${fmt1(x.mi)} mi</span>` : null; };
    return `<div class="kicker">Nearby</div><table class="kv nb">${row("🏥 Hospital", H(nb.h))}${nb.t && (!nb.h || nb.t.id !== nb.h.id) ? row("🚑 Level I/II", H(nb.t)) : ""}${nb.tg ? row("🎯 Target", TGN(nb.tg)) : ""}${row("📍 Places", P || null)}${row("🎓 Elementary", S("ES"))}${row("🎓 Middle", S("MS"))}${row("🎓 High", S("HS"))}</table>`;
  }
  const dealNote = p => p.bargain ? `<div class="note deal"><span class="bstar">${G.starDot("#8e24aa")}</span> <b>Bargain:</b> ${esc(p.deal || "")}</div>` : "";
  R.property = p => {
    const photos = p.photos || [];
    const gal = photos.length ? `<div class="gal" id="gal">${photos.map((u, i) => `<img src="${esc(u)}" data-i="${i}" loading="${i < 2 ? "eager" : "lazy"}" alt="Photo ${i + 1} of ${esc(p.title)}">`).join("")}</div><div class="galcount">${photos.length} photo${photos.length > 1 ? "s" : ""} · swipe or tap to enlarge</div>` : "";
    const ppa = p.price && p.acres ? money(p.price / p.acres) + "/ac" : null;
    const drives = (p.drives || []).length ? `<div class="kicker">Hospital drive times</div>
      <table class="tbl"><tr><th>Hospital</th><th class="n">Miles</th><th class="n">7 AM</th><th class="n">7 PM</th></tr>
      ${p.drives.map(d => `<tr><td>${esc(d.hospital)}${d.role ? `<br><span class="small"><b>${esc(d.role)}</b></span>` : ""}${d.traffic_aware ? "" : (d.source && /free-flow/.test(d.source) ? "" : '<br><span class="small">free-flow, no traffic data</span>')}${d.source ? `<br><span class="small">${esc(d.source)}</span>` : ""}</td>
        <td class="n">${fmt1(d.miles)}</td>${d.min_7am == null && d.min_7pm == null && !d.range_7am && d.minutes_free_flow != null ? `<td class="n" colspan="2">~${Math.round(d.minutes_free_flow)} min<br><span class="small">no traffic</span></td></tr>` : `<td class="n">${d.range_7am ? esc(d.range_7am) + " min" : (d.min_7am != null ? Math.round(d.min_7am) + " min" : "—")}</td><td class="n">${d.range_7pm ? esc(d.range_7pm) + " min" : (d.min_7pm != null ? Math.round(d.min_7pm) + " min" : "—")}</td></tr>`}`).join("")}</table>` : "";
    const ns = p.near_schools || {};
    if (isCF(p)) return cfCard(p, gal, ns);
    if (isNH(p)) return nhCard(p, gal, drives, ns);
    if (isBig(p)) return bigCard(p, gal, ns);
    const home = isHome(p);
    return `<div class="kicker">${isCab(p) ? `<span class="lic">${G.cabin(16)}</span> ${esc(ST.cabin.label || "Cabin")} · over ${ST.cabin.acres || 25} ac · under ${CAPK("cab")}` : home ? "🏠 Home · 1+ acre, 3bd/2ba, under " + CAPK("p1") + (p.standout && p.standout.length ? " · ★ standout" : "") : p.standout && p.standout.length ? "★ Standout property" : "Property"}</div><h2>${esc(p.title)}</h2>
      <div class="sub">${esc([p.town, p.county && p.county + ST.cus].filter(Boolean).join(", "))}</div>
      ${gal || thumb("property", p)}
      ${p.standout && p.standout.length ? `<div class="badges">${p.standout.map(s => `<span class="badge gold">★ ${esc(s)}</span>`).join("")}</div>` : ""}
      ${p.precision === "town" ? `<div class="note">📍 Approximate pin: placed at the town center (${esc(p.town || "town")}); the exact parcel location wasn't published.</div>` : ""}
      ${p.pending ? '<div class="note">Listing details are still being collected (listings.json not ready when this map was built). Re-run build.py to fill in price, acreage and the exact location.</div>' : ""}
      <div class="stats">${stat(money(p.price), "price")}${stat(p.acres != null ? fmt1(p.acres) : "—", "acres")}${stat(ppa || "—", "per acre")}
        ${stat(`${p.beds != null ? esc(p.beds) : "—"} / ${p.baths != null ? esc(p.baths) : "—"}`, "bed / bath")}${home ? stat(p.sqft ? Math.round(p.sqft).toLocaleString() : "—", "sq ft") + stat(p.year_built ? esc(p.year_built) : "—", "built") : stat(p.dwellings != null ? esc(p.dwellings) : "—", "dwellings")}${stat(esc(p.seen || "—"), "date seen")}</div>
      ${dealNote(p)}${nearbyBlock(p.nearby)}
      ${home ? `<table class="kv">${row("Address", p.address ? esc(p.address) : null)}${row("Baths", p.bath_detail ? esc(p.bath_detail) : null)}${row("Dwellings", p.dwellings ? esc(p.dwellings) : null)}</table>` : ""}
      ${p.notes ? `<div class="note">⚠️ ${esc(p.notes)}</div>` : ""}
      ${p.water && p.water.length ? `<div class="kicker">Water & cave features</div><div class="badges">${p.water.map(w => `<span class="badge">💧 ${esc(w)}</span>`).join("")}</div>` : ""}
      ${p.features && p.features.length ? `<div class="kicker">Features</div><div class="badges">${p.features.map(w => `<span class="badge">${esc(w)}</span>`).join("")}</div>` : ""}
      <div class="kicker">Health care</div><table class="kv">
        ${row("Nearest hospital", p.near_hosp ? `${link("hospital", p.near_hosp.id, p.near_hosp.name)} · ${p.near_hosp.miles} mi straight-line${p.near_hosp.trauma ? " · " + esc(p.near_hosp.trauma) : ""}` : null)}
        ${row("Nearest trauma center", p.near_trauma ? `${link("hospital", p.near_trauma.id, p.near_trauma.name)} · ${esc(p.near_trauma.trauma)} · ${p.near_trauma.miles} mi straight-line` : null)}</table>
      ${drives}
      <div class="kicker">Schools</div>${schoolBlock(p.county)}
      ${p.school_ind ? `<table class="kv">${row(p.school_ind.name, `${esc(sign(p.school_ind.pp_vs_ky, 1))} pp vs ${ST.ab} · ${esc(sign(p.school_ind.gl_vs_us, 2))} GL vs US · ${rbadge(p.school_ind.es)} ${rbadge(p.school_ind.ms)} ${rbadge(p.school_ind.hs)}`)}</table>` : ""}
      <table class="kv">${row("Nearest elementary", ns.ES ? `${link("school", ns.ES.id, ns.ES.name)} ${rbadge(ns.ES.rating)} · ${ns.ES.miles} mi` : null)}
        ${row("Nearest high school", ns.HS ? `${link("school", ns.HS.id, ns.HS.name)} ${rbadge(ns.HS.rating)} · ${ns.HS.miles} mi` : null)}</table>
      <table class="kv">${row(ST.cu, p.county ? link("county", p.county, p.county + ST.cus) : null)}${row("Listing", ext(p.url, "Open original listing ↗"))}${row("Date seen", esc(p.seen))}${row("Listing updated", p.updated ? esc(p.updated) : null)}${row("Status", p.status ? esc(p.status) : null)}</table>
      ${p.desc ? `<div class="kicker">Description</div><div class="desc">${esc(p.desc)}</div>` : ""}`;
  };
  function cfCard(p, gal, ns) {  // cave / waterfall on the property: what the listing says (short quote), price, acres, Nearby
    const q = p.cfq || {}, also = isBig(p) ? "50+ acres under $250k" : isNH(p) ? "near-hospital home" : isHome(p) ? "1-acre home" : isCab(p) ? (ST.cabin.label || "Cabin").toLowerCase() : isCFo(p) ? "" : "5+ acre land";
    const ppa = p.price && p.acres >= 1 ? money(p.price / p.acres) : null, home = p.dwell ? p.dwell === "yes" : p.beds != null;
    return `<div class="kicker"><span class="cfic">${hasCave(p) ? G.bat(20) : ""}${hasFalls(p) ? G.fall(15) : ""}</span> ${hasCave(p) && hasFalls(p) ? "Cave + waterfall" : hasCave(p) ? "Cave" : "Waterfall"} on the property${also ? " · also " + esc(also) : ""}</div><h2>${esc(p.title)}</h2>
      <div class="sub">${esc(p.address || [p.town, p.county && p.county + ST.cus].filter(Boolean).join(", "))}</div>
      ${gal || thumb("property", p)}
      ${["cave", "falls"].filter(k => q[k]).map(k => `<div class="note good cfq">${k === "cave" ? "🦇" : "💧"} <b>The listing says:</b> “${esc(q[k])}”</div>`).join("")}
      <div class="stats">${stat(money(p.price), "price")}${stat(p.acres != null ? (+p.acres).toLocaleString(undefined, { maximumFractionDigits: p.acres < 10 ? 2 : 0 }) : "—", "acres")}${ppa ? stat(ppa, "per acre") : ""}
        ${home ? stat(`${p.beds != null ? esc(p.beds) : "—"} / ${p.baths != null ? esc(p.baths) : "—"}`, "bed / bath") + stat(p.sqft ? Math.round(p.sqft).toLocaleString() : "—", "sq ft") : stat(p.dwell === "maybe" ? "Maybe" : "No", "dwelling")}${stat(esc(p.seen || "—"), "date seen")}</div>
      ${p.bargain ? `<div class="note">⭐ Also flagged as a bargain on this map.</div>` : ""}
      ${p.dwn ? `<div class="note">${p.dwell === "yes" ? "🏠" : p.dwell === "maybe" ? "❔" : "🌲"} <b>Dwelling:</b> ${esc(p.dwn)}</div>` : ""}
      ${nearbyBlock(p.nearby)}
      ${p.features && p.features.length ? `<div class="kicker">Features</div><div class="badges">${p.features.map(w => `<span class="badge">${esc(w)}</span>`).join("")}</div>` : ""}
      <div class="kicker">Health care</div><table class="kv">
        ${row("Nearest hospital", p.near_hosp ? `${link("hospital", p.near_hosp.id, p.near_hosp.name)} · ${p.near_hosp.miles} mi straight-line${p.near_hosp.trauma ? " · " + esc(p.near_hosp.trauma) : ""}` : null)}
        ${row("Nearest trauma center", p.near_trauma ? `${link("hospital", p.near_trauma.id, p.near_trauma.name)} · ${esc(p.near_trauma.trauma)} · ${p.near_trauma.miles} mi straight-line` : null)}</table>
      <div class="kicker">Schools</div>${schoolBlock(p.county)}
      <table class="kv">${row("Nearest elementary", ns.ES ? `${link("school", ns.ES.id, ns.ES.name)} ${rbadge(ns.ES.rating)} · ${ns.ES.miles} mi` : null)}
        ${row("Nearest high school", ns.HS ? `${link("school", ns.HS.id, ns.HS.name)} ${rbadge(ns.HS.rating)} · ${ns.HS.miles} mi` : null)}</table>
      <table class="kv">${row(ST.cu, p.county ? link("county", p.county, p.county + ST.cus) : null)}${row("Listing", ext(p.url, "Open original listing ↗"))}${row("Source", p.source ? esc(p.source) : null)}${row("Date seen", esc(p.seen))}${row("Status", p.status ? esc(p.status) : null)}</table>
      <div class="note">Cave / waterfall: from the listing text (checked so place names like “Cave City” or “Falls Rd” don't count). Confirm with the seller or agent before you go.</div>
      ${p.desc ? `<div class="kicker">Description</div><div class="desc">${esc(p.desc)}</div>` : ""}`;
  }
  function bigCard(p, gal, ns) {  // 50+ acres under $250k: acreage, $/acre, dwelling yes / no, Nearby
    const ppa = p.price && p.acres ? money(p.price / p.acres) : "—", dw = p.dwell === "yes" ? "Yes" : p.dwell === "maybe" ? "Maybe" : "No";
    return `<div class="kicker"><span class="bkstar">${G.bigStar(16)}</span> 50+ acres under $250k · ${p.dwell === "yes" ? "with a home" : "land"}</div><h2>${esc(p.title)}</h2>
      <div class="sub">${esc(p.address || [p.town, p.county && p.county + ST.cus].filter(Boolean).join(", "))}</div>
      ${gal || thumb("property", p)}
      <div class="stats">${stat(money(p.price), "price")}${stat(p.acres != null ? Math.round(p.acres).toLocaleString() : "—", "acres")}${stat(ppa, "per acre")}${stat(dw, "dwelling")}
        ${p.dwell === "yes" ? stat(`${p.beds != null ? esc(p.beds) : "—"} / ${p.baths != null ? esc(p.baths) : "—"}`, "bed / bath") + stat(p.sqft ? Math.round(p.sqft).toLocaleString() : "—", "sq ft") : ""}${stat(esc(p.seen || "—"), "date seen")}</div>
      ${p.dwn ? `<div class="note${p.dwell === "yes" ? " good" : ""}">${p.dwell === "yes" ? "🏠" : p.dwell === "maybe" ? "❔" : "🌲"} <b>Dwelling:</b> ${esc(p.dwn)}</div>` : ""}
      ${nearbyBlock(p.nearby)}
      ${p.features && p.features.length ? `<div class="kicker">Features</div><div class="badges">${p.features.map(w => `<span class="badge">${esc(w)}</span>`).join("")}</div>` : ""}
      ${p.water && p.water.length ? `<div class="kicker">Water features</div><div class="badges">${p.water.map(w => `<span class="badge">💧 ${esc(w)}</span>`).join("")}</div>` : ""}
      <div class="kicker">Health care</div><table class="kv">
        ${row("Nearest hospital", p.near_hosp ? `${link("hospital", p.near_hosp.id, p.near_hosp.name)} · ${p.near_hosp.miles} mi straight-line${p.near_hosp.trauma ? " · " + esc(p.near_hosp.trauma) : ""}` : null)}
        ${row("Nearest trauma center", p.near_trauma ? `${link("hospital", p.near_trauma.id, p.near_trauma.name)} · ${esc(p.near_trauma.trauma)} · ${p.near_trauma.miles} mi straight-line` : null)}</table>
      <div class="kicker">Schools</div>${schoolBlock(p.county)}
      <table class="kv">${row("Nearest elementary", ns.ES ? `${link("school", ns.ES.id, ns.ES.name)} ${rbadge(ns.ES.rating)} · ${ns.ES.miles} mi` : null)}
        ${row("Nearest high school", ns.HS ? `${link("school", ns.HS.id, ns.HS.name)} ${rbadge(ns.HS.rating)} · ${ns.HS.miles} mi` : null)}</table>
      <table class="kv">${row(ST.cu, p.county ? link("county", p.county, p.county + ST.cus) : null)}${row("Listing", ext(p.url, "Open original listing ↗"))}${row("Source", p.source ? esc(p.source) : null)}${row("Date seen", esc(p.seen))}${row("Status", p.status ? esc(p.status) : null)}</table>
      ${p.notes ? `<div class="note">${esc(p.notes)}</div>` : ""}
      ${p.desc ? `<div class="kicker">Description</div><div class="desc">${esc(p.desc)}</div>` : ""}`;
  }
  function nhCard(p, gal, drives, ns) {
    const nh = p.nh || {};
    const er = nh.er_beds ? `${esc(nh.er_beds)} ER beds/bays${nh.er_beds_label ? ` <span class="small">(${esc(nh.er_beds_label)})</span>` : ""}` : nh.estimate ? "Likely 10+ ER beds <b>(estimate</b>: 100+ licensed beds, 24/7 ER; no published count)" : esc(nh.er_beds_label || "—");
    return `<div class="kicker">🏥 Near-hospital home · ${esc(p.ptype || "House")} · 1,600+ sq ft, 3bd/2ba, under ${CAPK("nh")}</div><h2>${esc(p.title)}</h2>
      <div class="sub">${esc(p.address || [p.town, p.county && p.county + ST.cus].filter(Boolean).join(", "))}</div>
      ${gal || thumb("property", p)}
      ${nh.name ? `<div class="nhbox"><div class="nhmin"><b>~${esc(Math.round(nh.minutes_free_flow))}</b><span>min</span></div><div><b>${nh.hospital_id ? link("hospital", nh.hospital_id, nh.name) : esc(nh.name)}</b>${nh.city ? ` <span class="small">(${esc(nh.city)})</span>` : ""}
        <br><span class="small">${esc(fmt1(nh.miles))} mi · free-flow drive, no traffic (OSRM)${nh.gmaps_check ? " · " + esc(nh.gmaps_check) : ""}</span><br>🚑 ${er}${nh.source_url ? ` · <a href="${esc(nh.source_url)}" target="_blank" rel="noopener">ER source ↗</a>` : ""}</div></div>` : ""}
      <div class="stats">${stat(money(p.price), "price")}${stat(sqft(p.sqft), "sq ft")}${stat(`${p.beds != null ? esc(p.beds) : "—"} / ${p.baths != null ? esc(p.baths) : "—"}`, "bed / bath")}
        ${stat(esc(p.ptype || "—"), "type")}${stat(p.year_built ? esc(p.year_built) : "—", "built")}${stat(esc(p.seen || "—"), "date seen")}</div>
      ${dealNote(p)}${p.condition ? `<div class="note good">✅ <b>Condition:</b> ${esc(p.condition)}</div>` : ""}${nearbyBlock(p.nearby)}
      ${p.notes ? `<div class="note">⚠️ ${esc(p.notes)}</div>` : ""}
      <table class="kv">${row("Address", p.address ? esc(p.address) : null)}${row("Type", esc(p.ptype || "House"))}${row("Baths", p.bath_detail ? esc(p.bath_detail) : null)}${row("Lot", p.acres ? fmt1(p.acres) + " acres" : null)}${row("MLS #", p.mls ? esc(p.mls) : null)}</table>
      ${p.features && p.features.length ? `<div class="kicker">Features</div><div class="badges">${p.features.map(w => `<span class="badge">${esc(w)}</span>`).join("")}</div>` : ""}
      ${drives}
      <div class="kicker">Schools</div>${schoolBlock(p.county)}
      <table class="kv">${row("Nearest elementary", ns.ES ? `${link("school", ns.ES.id, ns.ES.name)} ${rbadge(ns.ES.rating)} · ${ns.ES.miles} mi` : null)}
        ${row("Nearest high school", ns.HS ? `${link("school", ns.HS.id, ns.HS.name)} ${rbadge(ns.HS.rating)} · ${ns.HS.miles} mi` : null)}</table>
      <table class="kv">${row(ST.cu, p.county ? link("county", p.county, p.county + ST.cus) : null)}${row("Listing", ext(p.url, "Open original listing ↗"))}${row("Source", p.source ? esc(p.source) : null)}${row("Date seen", esc(p.seen))}${row("Status", p.status ? esc(p.status) : null)}</table>
      ${p.desc ? `<div class="kicker">Description</div><div class="desc">${esc(p.desc)}</div>` : ""}`;
  }
  R.hospital = h => `${thumb("hospital", h)}<div class="kicker">${h.trauma ? "Trauma center" : h.kind === "general" ? "Hospital" : "Specialty hospital"}</div><h2>${esc(h.name)}</h2>
    <div class="sub">${esc([h.addr, h.city, h.state].filter(Boolean).join(", "))}</div>
    ${h.trauma ? `<div class="badges"><span class="badge gold">🚑 Trauma ${esc(h.trauma)}</span></div>` : ""}
    <table class="kv">${row("Trauma designation", h.trauma ? `${esc(h.trauma)}${h.trauma_name ? " — listed as “" + esc(h.trauma_name) + "”" : ""}<br><span class="small">${esc(h.trauma_src)}</span>` : `Not on the ${ST.traumaList}`)}
    ${row("Emergency dept.", h.emergency === "yes" ? "Yes (per OpenStreetMap)" : h.emergency === "no" ? "No (per OpenStreetMap)" : null)}
    ${row("Type", h.kind === "general" ? "General / acute care" : "Specialty (psychiatric, rehab, long-term, etc.)")}
    ${row("ER beds", h.er ? (h.er.beds ? `${esc(h.er.beds)} <span class="small">(${esc(h.er.label || "")})</span>` : h.er.ok ? 'Likely 10+ <span class="small">(estimate: 100+ licensed beds, 24/7 ER)</span>' : 'Unknown <span class="small">(no published count; not used for near-hospital homes)</span>') + (h.er.src ? ` · <a href="${esc(h.er.src)}" target="_blank" rel="noopener">source</a>` : "") : null)}
    ${row("Licensed beds", h.lic_beds ? `${esc(h.lic_beds)}${h.lic_type ? " · " + esc(h.lic_type) : ""}<br><span class="small">${ST.licSrc}${h.lic_name ? ` · licensed as “${esc(h.lic_name)}”` : ""}</span>` : h.beds ? `${esc(h.beds)} <span class="small">(OpenStreetMap)</span>` : null)}
    ${row("CMS star rating", h.cms_rating ? `${"★".repeat(Math.round(h.cms_rating))}${"☆".repeat(5 - Math.round(h.cms_rating))} ${esc(h.cms_rating)}/5 <span class="small">(CMS overall rating)</span>` : null)}
    ${row(ST.cu, h.county ? link("county", h.county, h.county + ST.cus) : esc(h.state || "out of state"))}
    ${row("Phone", h.phone ? `<a href="tel:${esc(h.phone)}">${esc(h.phone)}</a>` : null)}${row("Website", h.web ? ext(h.web, "Website ↗") : null)}
    ${row("Map data", h.osm ? ext(h.osm, "OpenStreetMap ↗") : esc(h.note || ""))}</table>${nearbyProps(h)}`;
  R.travel = travelCard;
  R.perm = h => PJX ? PJX.card(h) : "";  // permanent RN jobs at one hospital (perm.js)
  R.city = c => `<div class="kicker">🏙 ${ST.name}'s #${c.rank} largest city</div><h2>${esc(c.full || c.name)}</h2><div class="sub">${esc(c.county)}${ST.cus}, ${ST.name}</div>
    <div class="stats">${stat(c.pop.toLocaleString(), "people (July 1, 2025 estimate)")}${stat(popK(c.pop), "on the map")}</div>
    <table class="kv">${row("Counted as", esc(c.note))}${row(ST.cu, link("county", c.county, c.county + ST.cus))}${row("Source", "U.S. Census Bureau, Vintage 2025 population estimates")}</table>`;
  const _hospCard = R.hospital;  // hospital card: link to its travel jobs
  R.hospital = h => { const t = TJ.hospitals.find(x => x.hospital_id === h.id); return _hospCard(h) + (t ? `<div class="kicker">💼 Travel nurse assignments</div><table class="kv">${row("Travel RN jobs", `${link("travel", t.id, t.n + " job" + (t.n > 1 ? "s" : "") + ", top " + money(t.top) + "/wk")}`)}</table>` : ""); };
  R.school = s => {
    const lv = Object.entries(s.levels || {});
    const dr = s.drank || {};
    return `${thumb("school", s)}<div class="kicker">School</div><h2>${esc(s.name)}</h2><div class="sub">${esc(s.district)} · grades ${esc(s.grades)}</div>
    ${s.letter ? `<table class="kv">${row(ST.schLab, `${rbadge(s.rating)}${s.lg_score != null ? ` &nbsp;<b>${fmt1(s.lg_score)}</b>${ST.schOf || " of 5"}` : ""}`)}
      ${row("Success rate (TCAP/EOC on track + mastered)", s.success != null ? esc(fmt1(s.success)) + "%" : null)}
      ${row("Achievement · growth · college & career", [["Ach", s.ach], ["Growth", s.growth], ["CCR", s.ccr]].filter(x => x[1]).map(x => `${x[0]} <b>${esc(x[1])}</b>`).join(" · ") || null)}</table>`
    : lv.length ? `<table class="tbl"><tr><th>Level</th><th>${ST.schLab}</th><th class="n">Score</th></tr>${lv.map(([L, v]) => `<tr><td>${esc(L)}</td><td>${rbadge(v.rating)}${v.fed ? `<br><span class="small">${esc(v.fed)}</span>` : ""}</td><td class="n">${v.score != null ? fmt1(v.score) : "—"}</td></tr>`).join("")}</table>` : `<div class="note">${ST.schNone || (ST.rlab ? "No 2024-25 TDOE letter grade for this school/program" : "No 2025 accountability rating for this school/program")}.</div>`}
    <table class="kv">${row("ACT composite (2024-25)", s.act != null ? esc(s.act) : null)}
    ${Object.entries(dr).map(([L, r]) => row(`District rank (${L})`, `#${esc(r.rank)} of ${esc(r.of)} districts`)).join("")}
    ${row("Address", esc([s.addr, s.city].filter(Boolean).join(", ")))}${row("Phone", s.phone ? `<a href="tel:${esc(s.phone)}">${esc(s.phone)}</a>` : null)}
    ${row(ST.cu, link("county", s.county, s.county + ST.cus))}</table>
    <div class="kicker">${ST.cu === "County" ? "County district" : ST.cu + " school"} context</div>${schoolBlock(s.county)}
    <div class="small">${ST.rlab ? "Letter grades F &lt; D &lt; C &lt; B &lt; A" : "KDE colors: Red &lt; Orange &lt; Yellow &lt; Green &lt; Blue"} (${ST.schSrc}).</div>`;
  };
  R.college = c => `${thumb("college", c)}<div class="kicker">${esc(c.kind)}</div><h2>${esc(c.name)}</h2><div class="sub">${esc([c.addr, c.city].join(", "))}</div>
    <table class="kv">${row(ST.cu, link("county", c.county, c.county + ST.cus))}${row("Details", ext(c.src, "NCES College Navigator ↗"))}</table>`;
  R.activity = a => `${thumb("activity", a)}<div class="kicker">${esc(a.kind)}</div><h2>${esc(a.name)}</h2>
    ${a.desc ? `<div class="desc">${esc(a.desc)}</div>` : ""}
    <table class="kv">${row(ST.cu, link("county", a.county, a.county + ST.cus))}${row("Website", a.web ? ext(a.web, "Website ↗") : null)}
    ${row("Wikipedia", a.wiki ? ext("https://en.wikipedia.org/wiki/" + encodeURIComponent((a.wiki.split(":")[1] || a.wiki).replace(/ /g, "_")), (a.wiki.split(":")[1] || a.wiki) + " ↗") : null)}
    ${row("Map data", ext(a.src, "OpenStreetMap ↗"))}</table>${nearbyProps(a)}`;
  R.history = h => {
    const t = HIST[h.type] || ["", h.type];
    return `${h.th ? thumb("history", h) : ""}<div class="kicker">${t[0]} ${esc(t[1])}${h.nhl ? " · National Historic Landmark" : ""}</div><h2>${esc(h.name)}</h2>
    ${!h.th && h.img ? `<figure class="thumb"><img src="${esc(h.img.thumb)}" alt="${esc(h.name)}" loading="lazy"><figcaption class="attr">Photo: ${esc(h.img.artist)} · ${esc(h.img.license)} · <a href="${esc(h.img.page)}" target="_blank" rel="noopener">Wikimedia Commons</a></figcaption></figure>` : ""}
    <div class="desc">${esc(h.desc)}</div>
    <table class="kv">${row(ST.cu, h.county ? link("county", h.county, h.county + ST.cus) : null)}${row("Source", ext(h.src, (h.src_name || "Source") + " ↗"))}</table>`;
  };
  function appealBlock(c) {
    const a = c.appeal; if (!a || !a.jh) return "";
    const k = Math.max(0, BANDS.indexOf(a.band)), w = (AM && AM.weights) || {};
    const comp = [["RN pay vs. home price", a.afford, w.afford, `${money(a.wage)} RN median${a.wage_flag ? "†" : ""} ÷ ${money(a.home)} home = ${a.ratio != null ? a.ratio.toFixed(2) : "—"}`],
      ["Drive to acute-care hospital", a.hosp, w.hosp, `${esc(a.jh.name)} · ${Math.round(a.jh.min)} min / ${fmt1(a.jh.mi)} mi`],
      ["Drive to Level I/II trauma", a.l12, w.l12, `${esc(a.l12h.name)} (Level ${esc(a.l12h.level)}) · ${Math.round(a.l12h.min)} min / ${fmt1(a.l12h.mi)} mi`],
      ["Land suitability", a.land, w.land, "land score"], ["Schools", a.school, w.school, "school score"],
      ["Trauma access (any level)", a.trauma, w.trauma, `${esc(a.trh.name)} (Level ${esc(a.trh.level)}) · ${Math.round(a.trh.min)} min`]];
    return `<div class="appeal" style="--band:${RAMP[k]}"><div class="ascore"><b>${fmt1(a.score)}</b><span>/100</span></div>
      <div class="ameta"><div class="kicker" style="margin-top:0">Appeal score</div><div class="arank">#${a.rank} of ${ST.n} · <span class="aband">${esc(a.band)}</span></div>
      <div class="small">Nurse financial value ${fmt1(a.nfv)}/100 · <button type="button" class="linkbtn" data-info="appeal">ⓘ How this score works</button></div></div></div>
      <details class="abreak"><summary>Score breakdown</summary><table class="tbl"><tr><th>Component</th><th class="n">0–100</th><th class="n">pts</th></tr>
      ${comp.map(([n, v, wt, d]) => `<tr><td>${n}<br><span class="small">${d}</span></td><td class="n">${fmt1(v)}</td><td class="n">${v != null && wt ? fmt1(v * wt / 100) : "—"}<span class="small">/${wt}</span></td></tr>`).join("")}</table>
      ${a.wage_flag ? `<div class="small">† ${esc(a.wage_flag)}.</div>` : ""}<div class="small">RN wage area: ${esc(a.area)}. Drive times are free-flow (no traffic) from the county's population center.</div></details>`;
  }
  R.county = c => {
    const mrows = metrics.map(m => { const v = c.m[m.key]; if (v == null) return ""; const all = K.counties.map(x => x.m[m.key]).filter(x => x != null).sort((a, b) => m.lower_better ? a - b : b - a); return `<tr><td>${esc(m.label)}</td><td class="n">${esc(fmtMetric(m, v))}</td><td class="n small">#${all.indexOf(v) + 1}/${all.length}</td></tr>`; }).join("");
    const props = (K.properties || []).filter(p => p.county === c.name);
    const ds = c.districts || [];
    const txt = c.text ? Object.entries(c.text).map(([k, v]) => row(k, esc(v))).join("") : "";
    return `${thumb("county", c)}<div class="kicker">${ST.cu}</div><h2>${esc(c.name)}${ST.cus}, ${ST.name}</h2>
      ${appealBlock(c)}
      <div class="stats gtiles">${GCATS.map(g => groupTile(c, g)).join("")}</div><div class="small gtip">Tap a tile to list them · tap a row to fly to its pin</div>
      ${sweetKey && c.m[sweetKey] != null ? `<div class="badges"><span class="badge gold">Sweet-spot: ${esc(fmtMetric(metrics.find(m => m.key === sweetKey), c.m[sweetKey]))}</span></div>` : ""}
      ${mrows ? `<div class="kicker">${ST.cu} metrics</div><table class="tbl"><tr><th>Metric</th><th class="n">Value</th><th class="n">Rank</th></tr>${mrows}</table>` : ""}
      ${txt ? `<table class="kv">${txt}</table>` : ""}
      <div class="kicker">Health care</div><table class="kv">${row("Trauma centers in " + ST.cu.toLowerCase(), c.n.trauma.length ? esc(c.n.trauma.join("; ")) : "None")}
      ${row("Nearest trauma center", c.near_trauma ? `${link("hospital", c.near_trauma.id, c.near_trauma.name)} · ${esc(c.near_trauma.trauma)} · ~${c.near_trauma.miles} mi from county center` : null)}</table>
      <div class="kicker">Schools</div>${schoolBlock(c.name)}
      ${ds.length ? `<table class="tbl"><tr><th>District</th><th class="n">vs ${ST.ab}</th><th class="n">vs US</th><th>${ST.rlab ? "A/B/C/D/F" : "ES/MS/HS"}</th></tr>${ds.map(d => `<tr><td>${esc(d.name)}</td><td class="n">${esc(sign(d.pp_vs_ky, 0))}</td><td class="n">${esc(sign(d.gl_vs_us, 1))}</td><td>${d.lg ? esc(d.lg) : `${rbadge(d.es)} ${rbadge(d.ms)} ${rbadge(d.hs)}`}</td></tr>`).join("")}</table>` : ""}
      ${props.length ? `<div class="kicker">Properties here</div><table class="kv">${props.map(p => row(isCF(p) ? (hasCave(p) ? G.bat(20) : G.fall(16)) : isNH(p) ? "🏥" : isHome(p) ? "🏠" : isCab(p) ? G.cabin(16) : isBig(p) ? G.bigStar(16) : p.standout && p.standout.length ? "★" : "⌂", link("property", p.id, p.title) + (p.price ? " · " + money(p.price) : ""))).join("")}</table>` : ""}`;
  };
  function nearbyProps(pt) {
    const near = (K.properties || []).filter(p => p.lat != null).map(p => [p, hav(pt.lat, pt.lon, p.lat, p.lon)]).filter(x => x[1] < 25).sort((a, b) => a[1] - b[1]).slice(0, 5);
    return near.length ? `<div class="kicker">Properties within 25 mi</div><table class="kv">${near.map(([p, d]) => row(d.toFixed(1) + " mi", link("property", p.id, p.title))).join("")}</table>` : "";
  }
  function hav(a, b, c, d) { const R = 3958.8, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }


  // ------------------------------------------------------------------ county grouping pages (#county=<slug>&cat=<cat>)
  // Each county-card count tile opens a compact, sorted list of that county's items; each row opens the item's own card and flies to its pin.
  const GCATS = [
    { k: "listings", n: "props", label: "listings", one: "listing", title: "Listings", icon: "🏡", layers: ["props", "homes", "nh", "cab", "big", "cvf"] },
    { k: "hospitals", n: "hosp", label: "hospitals", title: "Hospitals", icon: "🏥", layers: ["trauma", "hosp"] },
    { k: "travel", n: "travel", label: "travel jobs", one: "travel job", title: "Travel nurse jobs", icon: "💼", layers: ["travel"] },
    { k: "perm", n: "perm", label: "permanent RN jobs", one: "permanent RN job", title: "Permanent RN jobs", icon: "🩺", layers: ["perm"] },
    { k: "schools", n: "schools", label: "schools", title: "Schools", icon: "🏫", layers: ["sch"] },
    { k: "colleges", n: "colleges", label: "colleges", title: "Colleges", icon: "🎓", layers: ["col"] },
    { k: "activities", n: "acts", label: "activities", one: "activity", title: "Activities & outdoors", icon: "🌲", layers: ["act"] },
    { k: "history", n: "hist", label: "history", h2: "history sites", title: "History", icon: "🏛", layers: ["h_hist", "h_coal", "h_ghost", "h_mine"] },
  ];
  const GC = {}; GCATS.forEach(g => GC[g.k] = g);
  const groupHash = (name, cat) => `#county=${slug(name)}&cat=${cat}`;
  const gItems = {
    listings: n => (K.properties || []).filter(p => p.county === n && (!PROF || PROF.prop(p))),
    hospitals: n => (K.hospitals || []).filter(h => h.county === n),
    travel: n => TJ_ALL.filter(j => j.h.county === n && (!PROF || PROF.job(j, j.h))),
    perm: n => PJX ? PJX.countyJobs(n) : [],
    schools: n => (K.schools || []).filter(s => s.county === n && (!PROF || PROF.school(s))),
    colleges: n => (K.colleges || []).filter(x => x.county === n),
    activities: n => (K.activities || []).filter(x => x.county === n),
    history: n => (K.history || []).filter(x => x.county === n),
  };
  function gCount(c, g) {
    if (g.k === "perm") return PJX ? gItems.perm(c.name).length : K.meta && K.meta.pj ? null : 0;
    if (PROF && /^(listings|travel|schools)$/.test(g.k)) return gItems[g.k](c.name).length;
    if (g.k === "travel") return c.n.travel != null ? c.n.travel : gItems.travel(c.name).length;
    return c.n[g.n] || 0;
  }
  function groupTile(c, g) {
    const n = gCount(c, g);
    if (n == null) return `<a class="stat gt tap" href="${groupHash(c.name, g.k)}" data-grp="${g.k}" aria-label="${esc(g.label)}: open the list"><b data-pjn="${esc(c.name)}">…</b><span>${esc(g.label)}</span><i class="gchev" aria-hidden="true">›</i></a>`;
    if (!n) return `<div class="stat gt zero" aria-label="No ${esc(g.label)}"><b>0</b><span>${esc(g.label)}</span></div>`;
    return `<a class="stat gt tap" href="${groupHash(c.name, g.k)}" data-grp="${g.k}" aria-label="${n} ${esc(g.label)}: open the list"><b>${n}</b><span>${esc(g.label)}</span><i class="gchev" aria-hidden="true">›</i></a>`;
  }
  const gImg = (src, ph) => src ? `<img class="gth" src="${esc(src)}" alt="" loading="lazy" decoding="async" width="60" height="60">` : `<span class="gth ph" aria-hidden="true">${ph}</span>`;
  const gRow = (type, id, from, img, l1, l2, l3, wrap2) => `<a class="grow" href="#${type}=${esc(encodeURIComponent(id))}" data-go="${type}" data-id="${esc(id)}" data-from="${esc(from)}">${img}
    <span class="gtx"><span class="g1">${bChip(type, id)}${l1}</span>${l2 ? `<span class="g2${wrap2 ? " wrap" : ""}">${l2}</span>` : ""}${l3 ? `<span class="g3">${l3}</span>` : ""}</span><i class="gchev" aria-hidden="true">›</i></a>`;
  const dot = parts => parts.filter(x => x != null && x !== "" && x !== false).join(" · ");
  const shortHosp = s => String(s || "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+-\s+.*$/, "").trim();
  function nearestDrive(p) {
    const ds = (p.drives || []).map(d => ({ d, m: d.min_7am != null ? d.min_7am : d.minutes_free_flow })).filter(x => x.m != null);
    if (!ds.length) return null;
    const pick = ds.find(x => /nearest acute/i.test(x.d.role || "")) || ds.sort((a, b) => a.m - b.m)[0];
    return `🏥 ${Math.round(pick.m)} min to ${esc(shortHosp(pick.d.hospital))}`;
  }
  const TRANK = t => !t ? 9 : /Level I\b(?! ?I)/.test(t) && !/II|IV/.test(t) ? 1 : /Level II\b/.test(t) && !/III/.test(t) ? 2 : /III/.test(t) ? 3 : /IV/.test(t) ? 4 : 5;
  const hospBeds = h => h.lic_beds || (h.beds && +h.beds) || null;
  const LVLNAME = { HS: "High", MS: "Middle", ES: "Elementary" };
  const SKY = (K.meta && K.meta.school_ky) || {};
  const topLevel = s => ["HS", "MS", "ES"].find(L => s.levels && s.levels[L]) || null;
  const KIND_ORDER = ["University / college", "Community & technical college", "Other", "Seminary", "Beauty / trade school"];
  const HIST_ORDER = ["historic", "ghost_town", "coal_camp", "mine"];
  const HIST_SEC = { historic: "🏛 Historic sites & landmarks", ghost_town: "👻 Ghost towns", coal_camp: "🏚 Coal camps", mine: "⛏ Old mines (USGS MRDS)" };
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };
  const firstSentence = (t, n = 140) => { t = String(t || "").replace(/\s+/g, " ").trim(); const m = t.match(/^(.{20,}?[.!?])\s/); t = m ? m[1] : t; return t.length > n ? t.slice(0, n - 1) + "…" : t; };
  // section = [title, rows-html[]]
  const GB = {};
  GB.listings = (c, xs, from) => {
    const byPrice = (a, b) => (a.price == null) - (b.price == null) || (a.price || 0) - (b.price || 0);
    const r = p => gRow("property", p.id, from, gImg(p.rt || (p.th && p.th.u), isHome(p) ? "🏠" : isCab(p) ? "🪵" : isBig(p) ? "★" : isCFo(p) ? (hasCave(p) ? "🦇" : "💧") : "⌂"),
      `<b>${p.price != null ? money(p.price) : "Price n/a"}</b>${p.beds != null ? ` · ${esc(p.beds)} bd${p.baths != null ? " / " + esc(p.baths) + " ba" : ""}` : ""}${p.acres != null ? ` · ${esc((+p.acres).toLocaleString(undefined, { maximumFractionDigits: 2 }))} ac` : ""}`,
      `${p.standout && p.standout.length ? `<span class="gstar">★ ${esc(p.standout.join(", "))}</span> · ` : ""}${esc(p.title)}`,
      dot([p.town && esc(p.town), nearestDrive(p)]));
    const rn = p => gRow("property", p.id, from, gImg(p.rt || (p.th && p.th.u), "🏥"),
      `<b>${p.price != null ? money(p.price) : "Price n/a"}</b> · ${esc(p.beds)} bd / ${esc(p.baths)} ba · ${sqft(p.sqft)} sq ft`,
      `${esc(p.ptype || "House")} · ${esc(p.title)}`,
      dot([p.town && esc(p.town), p.nh && `🏥 ${Math.round(p.nh.minutes_free_flow)} min to ${esc(shortHosp(p.nh.name))}${p.nh.er_beds ? ` (${esc(p.nh.er_beds)} ER beds)` : p.nh.estimate ? " (10+ ER beds, est.)" : ""}`]));
    const land = xs.filter(p => !isHome(p) && !isNH(p) && !isCab(p) && !isBig(p) && !isCFo(p)).sort(byPrice), cfs = xs.filter(isCF).sort(byPrice), homes = xs.filter(isHome).sort(byPrice), nhs = xs.filter(isNH).sort(byPrice), cabs = xs.filter(isCab).sort(byPrice), bigs = xs.filter(isBig).sort(byPrice);
    return { sub: "Sorted by price, lowest first", secs: [["⌂ 5+ acre land", land.map(r), "No 5+ acre land listings here right now."], ["🏠 1-acre homes", homes.map(r), "No 1-acre home listings here right now."],
      ["🏥 Near-hospital homes", nhs.map(rn), "No near-hospital homes here right now."]].concat(ST.cabin ? [[(ST.cabin.label || "Cabin") + "s (" + (ST.cabin.acres || 25) + "+ acres)", cabs.map(r), "No cabins here right now.", G.cabin(16)]] : []).concat(bigs.length ? [["★ 50+ acres under $250k", bigs.map(r), "None here right now.", G.bigStar(16)]] : []).concat(cfs.length ? [["Caves & waterfalls on the property", cfs.map(r), "None here right now.", G.bat(20) + G.fall(14)]] : []) };
  };
  GB.hospitals = (c, xs, from) => {
    const tj = h => TJ.hospitals.find(t => t.hospital_id === h.id);
    const sort = (a, b) => TRANK(a.trauma) - TRANK(b.trauma) || (hospBeds(b) || 0) - (hospBeds(a) || 0) || a.name.localeCompare(b.name);
    const r = h => { const t = tj(h), beds = hospBeds(h);
      return gRow("hospital", h.id, from, gImg(h.th && h.th.u, "🏥"), `<b>${esc(h.name)}</b>`,
        dot([h.trauma && `<span class="gtag tr">🚑 Trauma ${esc(h.trauma.replace(/^Level /, "Lvl "))}</span>`, beds && `${esc(beds)} beds${h.lic_name && /\//.test(h.lic_name) ? " (shared license)" : ""}`,
          h.lic_type && h.lic_type !== "Acute care" && esc(h.lic_type), h.cms_rating && `CMS ${esc(h.cms_rating)}★/5`, h.emergency === "yes" && "ER"]),
        dot([h.city && esc(h.city), t && `<span class="gpay">💼 top ${money(t.top)}/wk</span> (${t.n} job${t.n > 1 ? "s" : ""})`]), true); };
    const gen = xs.filter(h => h.kind === "general").sort(sort), spec = xs.filter(h => h.kind !== "general").sort(sort);
    return { sub: "Trauma centers first, then by size · beds = state licensed beds", secs: [["Hospitals", gen.map(r), "No general hospitals in this " + ST.cu.toLowerCase() + "."], ...(spec.length ? [["Specialty (psychiatric, rehab, long-term)", spec.map(r)]] : [])] };
  };
  GB.perm = (c, xs, from) => PJX.group(c, xs, from);
  GB.travel = (c, xs, from) => ({ sub: "Highest weekly pay first · gross pay as posted", note: TJ_NOTE(), secs: [["Travel RN assignments", xs.map(j => gRow("travel", j.h.id, from, gImg(j.h.th && j.h.th.u, "💼"),
    `<b class="gpay">${tjPay(j)}/wk</b> · ${esc(j.u || j.sp || "RN")}`, dot([j.sh && esc(j.sh), j.len && esc(j.len), j.st && "start " + esc(j.st)]), dot([esc(j.h.name), j.ag && esc(j.ag)])))]] });
  GB.schools = (c, xs, from) => {
    const lv = s => Object.entries(s.levels || {}).sort((a, b) => ["HS", "MS", "ES"].indexOf(a[0]) - ["HS", "MS", "ES"].indexOf(b[0])).map(([L, v]) => {
      const d = v.score != null && SKY[L] != null ? v.score - SKY[L] : null;
      return `<span class="glv">${v.rating ? `<span class="r ${esc(v.rating)}">${L}${s.letter ? " " + esc(s.letter) : ""}</span>` : `<span class="r nr">${L}</span>`}${v.score != null ? ` ${fmt1(v.score)}` : ""}${d != null ? ` <span class="${d >= 0 ? "up" : "dn"}">${d >= 0 ? "+" : "−"}${fmt1(Math.abs(d))} vs ${ST.ab}</span>` : ""}</span>`; }).join(" ");
    const score = s => { const L = topLevel(s); return L && s.levels[L].score != null ? s.levels[L].score : -1; };
    const r = s => gRow("school", s.id, from, gImg(s.th && s.th.u, "🏫"), `<b>${esc(s.name)}</b>`, lv(s) || "Not rated in 2025", dot([s.grades && "Grades " + esc(s.grades), esc(s.district), s.city && esc(s.city)]), true);
    const secs = ["HS", "MS", "ES"].map(L => [`${LVLNAME[L]} schools`, xs.filter(s => topLevel(s) === L).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name)).map(r)]);
    const other = xs.filter(s => !topLevel(s)).sort((a, b) => a.name.localeCompare(b.name)).map(r);
    if (other.length) secs.push(["Other / not rated", other]);
    return { sub: ST.schSub ? ST.schSub : ST.rlab ? "TDOE 2024-25 letter grade (A–F) and score (1–5) · best first" : `KDE 2025 overall score by level vs the KY average (ES ${fmt1(SKY.ES)}, MS ${fmt1(SKY.MS)}, HS ${fmt1(SKY.HS)}) · best first`, secs: secs.filter(x => x[1].length), jump: true };
  };
  GB.colleges = (c, xs, from) => ({ sub: "Universities first, then community & technical, other", secs: [["Colleges & schools", xs.slice().sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name)).map(x =>
    gRow("college", x.id, from, gImg(x.th && x.th.u, "🎓"), `<b>${esc(x.name)}</b>`, dot([esc(x.kind), /nurs/i.test(x.name) && '<span class="gtag">🩺 Nursing</span>']), dot([x.city && esc(x.city)])))]] });
  GB.activities = (c, xs, from) => ({ sub: "Grouped by type", secs: [["Activities & outdoors", xs.slice().sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)).map(a =>
    gRow("activity", a.id, from, gImg(a.th && a.th.u, ACTI[a.kind] || "★"), `<b>${esc(a.name)}</b>`, `${ACTI[a.kind] || "★"} ${esc(a.kind)}`,
      a.desc ? esc(firstSentence(a.desc)) : a.wiki ? "Wikipedia: " + esc(a.wiki.split(":").pop()) : a.web ? esc(host(a.web)) : ""))]] });
  GB.history = (c, xs, from) => {
    const one = h => { if (h.type === "mine") { const m = (h.desc || "").match(/recorded as a (.+?) of (.+?)\. /); return m ? `${m[1][0].toUpperCase() + m[1].slice(1)} of ${m[2]}` : ""; } return firstSentence(h.desc); };
    const r = h => gRow("history", h.id, from, gImg((h.th && h.th.u) || (h.img && h.img.thumb), (HIST[h.type] || ["•"])[0]), `<b>${esc(h.name)}</b>`,
      `${esc((HIST[h.type] || ["", h.type])[1])}${h.nhl ? " · National Historic Landmark" : ""}`, esc(one(h)));
    return { sub: "Grouped by type", secs: HIST_ORDER.map(t => [HIST_SEC[t], xs.filter(h => h.type === t).sort((a, b) => a.name.localeCompare(b.name)).map(r)]).filter(x => x[1].length), jump: true };
  };
  function groupHtml(c, g) {
    const xs = gItems[g.k](c.name), from = c.name + "|" + g.k, n = gCount(c, g);
    const out = GB[g.k](c, xs, from);
    const secs = out.secs, multi = secs.length > 1;
    const jump = out.jump && secs.length > 2 ? `<nav class="gjump" aria-label="Jump to section">${secs.map((s, i) => `<button type="button" data-jump="gs${i}">${esc(s[0].replace(/^\S+\s(?=[A-Z])/u, ""))} <b>${s[1].length}</b></button>`).join("")}</nav>` : "";
    const body = secs.map((s, i) => `${multi ? `<div class="gsec" id="gs${i}">${s[3] ? `<span class="lic">${s[3]}</span> ` : ""}${esc(s[0])} <span>${s[1].length}</span></div>` : ""}${s[1].length ? s[1].join("") : `<div class="gempty">${esc(s[2] || "None here.")}</div>`}`).join("");
    return `<div class="gbar"><button type="button" class="gback" id="gBack" aria-label="Back to ${esc(c.name)}${ST.cus} card">‹ ${esc(c.name)}${ST.cus}</button>
        <button type="button" class="gshare" id="gShare" aria-label="Share this list">${navigator.share ? "Share" : "Copy link"}</button></div>
      <div class="kicker">${g.icon} ${esc(g.title)}</div><h2>${n} ${esc(n === 1 ? (g.one || (g.h2 || g.label).replace(/s$/, "")) : (g.h2 || g.label))} in ${esc(c.name)}${ST.cus}</h2>
      <div class="sub">${esc(out.sub)}${xs.length ? " · tap a row to open it on the map" : ""}</div>${out.note || ""}${PROF && /^(listings|travel|schools)$/.test(g.k) ? PROF.note(g.label) : ""}${jump}
      <div class="glist">${xs.length || secs.some(s => s[2]) ? body : `<div class="gempty">No ${esc(g.label)} recorded in ${esc(c.name)}${ST.cus}.</div>`}</div>
      <div class="actions"><button class="btn" id="shareBtn">${navigator.share ? "Share…" : "Share"}</button><button class="btn ghost" id="copyBtn">Copy link</button><button class="btn ghost" id="zoomBtn">Zoom to ${ST.cu.toLowerCase()}</button></div>
      <div class="small" style="word-break:break-all">Link: <a href="${groupHash(c.name, g.k)}">${groupHash(c.name, g.k)}</a></div>`;
  }
  const groupShareUrl = (name, cat) => location.protocol === "file:" || cat === "perm" ? new URL("index.html" + groupHash(name, cat), location.href).href : new URL("share/county-" + slug(name + "-" + cat) + ".html", location.href).href;
  async function shareGroup(name, cat) {
    const g = GC[cat], title = `${g.title} in ${name}${ST.cus}, ${ST.ab}`, url = fullUrl(groupShareUrl(name, cat));
    if (navigator.share) { try { await navigator.share({ title: title + " — " + ST.app, text: title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    copy(url);
  }
  let gBackHist = false, gScroll = null;  // gBackHist: the county card is the previous history entry (opened from its tile)
  function openGroup(name, cat, opts = {}) {
    const c = IDX.county[name], g = GC[cat];
    if (!c || !g) { toast("List not found"); return false; }
    const sv = snap(), sk = shardOf("county", c);
    if (cat === "perm" && !(PJX && PJX.hasD())) {
      const tok = { type: "group", id: name, cat, loading: true, prev: current };
      cardLoading(tok, groupHash(name, cat), opts, sv);
      loadPermD().then(() => { if (current === tok) { current = tok.prev; openGroup(name, cat, Object.assign({}, opts, { replace: true })); } });
      return true;
    }
    if (!shardReady(sk)) {
      const tok = { type: "group", id: name, cat, loading: true, prev: current };
      cardLoading(tok, groupHash(name, cat), opts, sv);
      loadShard(sk).then(() => { if (current === tok) { current = tok.prev; openGroup(name, cat, Object.assign({}, opts, { replace: true })); } });
      return true;
    }
    const prev = current;
    current = { type: "group", id: name, cat };
    gBackHist = !!opts.fromCounty;
    body.innerHTML = annaCard("group", { c, g }, groupHtml(c, g));
    card.hidden = false; setPeek(false); card.classList.add("tall");
    card.scrollTop = takeScroll(gScroll && gScroll.key === name + "|" + cat ? gScroll.top : 0); gScroll = null;
    if (PNL) showPnl(null);
    $("#gBack").onclick = () => { if (hasBack()) history.back(); else openItem("county", name, { fly: false }); };
    $("#gShare").onclick = $("#shareBtn").onclick = () => shareGroup(name, cat);
    $("#copyBtn").onclick = () => copy(fullUrl(groupShareUrl(name, cat)));
    $("#zoomBtn").onclick = () => zoomTo("county", c, true);
    body.querySelectorAll("[data-jump]").forEach(b => b.onclick = () => { const t = $("#" + b.dataset.jump); if (t) card.scrollTo({ top: t.offsetTop - $(".gbar").offsetHeight - 4, behavior: "smooth" }); });
    nav(fh(groupHash(name, cat)), opts.replace, sv);
    document.title = `${g.title} in ${name}${ST.cus}, ${ST.ab} — ${ST.app}`;
    g.layers.forEach(k => { const d = LAYERS.find(x => x.key === k); if (d && !d.disabled && !map.hasLayer(d.layer)) setLayer(d, true); });
    if (opts.fly !== false && !(prev && (prev.type === "county" || prev.type === "group") && prev.id === name)) zoomTo("county", c, false);
    highlight("county", c);
    return true;
  }

  // ------------------------------------------------------------------ share
  const TITLE = { city: c => (c.full || c.name) + ", " + ST.ab, travel: h => h.id === "all" ? ST.name + " travel nurse assignments" : h.name + " — travel RN jobs", property: p => p.title, hospital: h => h.name, school: s => s.name, college: c => c.name, activity: a => a.name, history: h => h.name, county: c => c.name + ST.cus + ", " + ST.ab, perm: h => h.name + " — permanent RN jobs" };
  function itemUrl(type, id) { return new URL("index.html" + (ANNA_ON ? "?anna=1" : "") + "#" + type + "=" + encodeURIComponent(id), location.href).href; }
  function shareUrl(type, id) { return new URL("share/" + type + "-" + slug(id) + ".html", location.href).href; }
  function shareUrlBest(type, id) { return location.protocol === "file:" || ANNA_ON || type === "city" || type === "perm" || type === "ski" || type === "peak" || type === "target" || (IDX[type] && IDX[type][id] && IDX[type][id].bst) ? itemUrl(type, id) : shareUrl(type, id); }  // border items: no share page  // cities have no share page
  async function doShare(type, id) {
    const it = IDX[type][id]; const title = TITLE[type](it); const url = fullUrl(shareUrlBest(type, id));
    if (navigator.share) { try { await navigator.share({ title: title + " — " + ST.app, text: title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    copy(url);
  }
  function copy(text) {
    const done = () => toast("Link copied");
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, () => legacy());
    else legacy();
    function legacy() { const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { prompt("Copy this link:", text); } ta.remove(); }
  }

  // ------------------------------------------------------------------ open / close + deep links
  const card = $("#card"), body = $("#cardBody");
  // ---- page stack = browser history. Each entry's state: d = depth (0 = map, no card), L = depth of the nearest Top 10 / county list
  // at or below it, nob = the chain began with a deep link (no map entry under it), v = {c, z, s} map center / zoom / card scroll saved
  // when the page was left. ‹ Back (header) and the phone's Back step one entry back and restore v; X jumps back to the list the card
  // came from (or the map). Every card / list open goes through nav().
  const isListH = h => /^#(county=[^&]+&cat=|deals$|top-|cmap=)/.test(h.replace(/&full=1$/, ""));  // cmap = county map view: X on a card opened from it comes back to it
  const snap = () => { const c = map.getCenter(); return { c: [c.lat, c.lng], z: map.getZoom(), s: card.hidden ? 0 : card.scrollTop }; };
  const depth = () => (history.state && history.state.d) || 0;
  const hasBack = () => depth() >= 2;
  function nav(h, replace, sv, extra) {
    const url = h || location.pathname + location.search;
    if ((h || "") === location.hash && !extra) { if (PNL) setPanel(null); updBack(); return; }
    if (replace) { history.replaceState(history.state, "", url); updBack(); return; }
    const st = history.state || { d: 0 }, fromPnl = !!st.pnl;
    if (PNL) showPnl(null);
    if (!fromPnl) history.replaceState(Object.assign({}, st, { v: sv || snap() }), "", location.href);  // (an open panel's entry already saved v below it)
    const d = h ? (st.d || 0) + 1 : 0;
    history[fromPnl ? "replaceState" : "pushState"](h ? Object.assign({ d, L: isListH(h) ? d : st.L, nob: st.nob ? 1 : 0, fz: FOCUS ? FOCUS.name : null }, extra || {}) : { d: 0 }, "", url);
    updBack();
  }
  let pendScroll = null;  // scroll position to restore when the page being returned to finishes rendering
  const takeScroll = def => { if (pendScroll != null) { const s = pendScroll; pendScroll = null; return s; } return def; };
  function updBack() {
    const has = hasBack(); card.classList.toggle("hasback", has); updFav();
    const gb = $("#gBack"); if (gb) { if (!gb.dataset.base) gb.dataset.base = gb.textContent; gb.textContent = has ? "‹ Back" : gb.dataset.base; }
  }
  $("#cardBack").onclick = () => history.back();
  function exitCard() {  // X: to the Top 10 / county list this card came from, else to the map (zoomed out)
    if (current && current.type === "county" && !current.loading && IDX.county[current.id]) { focusClose(current.id); return; }  // county card -> county map view
    const st = history.state || {}, d = st.d || 0, isList = current && (current.type === "group" || current.type === "top");
    const tgt = !isList && st.L != null && st.L < d ? st.L : 0;
    if (d > tgt && (tgt > 0 || !st.nob)) { history.go(tgt - d); return; }
    closeCard(); homeView(true);
  }
  // ---- full-screen view (⤢ in the card header): same card, whole screen, big gallery. Own history entry + deep link (&full=1),
  // so the phone's Back button collapses it and shared links can open full screen (share pages pass #full through).
  let FULL_ON = false;
  const expB = $("#cardExp");
  const fh = h => FULL_ON ? h + "&full=1" : h;
  const fullUrl = u => !FULL_ON ? u : u.includes("#") ? u + "&full=1" : u + "#full";
  const baseHash = () => location.hash.replace(/&full=1$/, "");
  function setFull(on) {
    FULL_ON = !!on; card.classList.toggle("full", FULL_ON); document.documentElement.classList.toggle("cardfull", FULL_ON);
    expB.textContent = FULL_ON ? "⤡" : "⤢"; expB.setAttribute("aria-label", FULL_ON ? "Collapse to the preview" : "Expand to full screen"); expB.setAttribute("aria-pressed", FULL_ON);
    expB.title = FULL_ON ? "Collapse" : "Expand";
  }
  function expandCard() { if (FULL_ON || card.hidden) return; const sv = snap(); setFull(true); card.scrollTop = 0; nav(baseHash() + "&full=1", false, sv, { kyxFull: 1 }); }
  function collapseCard() { if (!FULL_ON) return; if (history.state && history.state.kyxFull) history.back(); else { setFull(false); history.replaceState(Object.assign({}, history.state, { kyxFull: 0 }), "", baseHash()); updBack(); } }
  expB.onclick = () => FULL_ON ? collapseCard() : expandCard();
  $("#cardShare").onclick = () => { const b = $("#shareBtn"); if (b) b.click(); };
  $("#cardMap").onclick = () => { const z = $("#zoomBtn"); collapseCard(); if (z) setTimeout(() => z.click(), 80); };
  var current = null; let hl = null;  // var: applyHomeFilter() reads it before this line runs
  // ------------------------------------------------------------------ card details (data/d/<county>.js; build.py write_split)
  // data/core.js has only what pins, search, filters and lists need; a card's details, photos and Nearby section load with its county's file.
  const SHARDS = new Set((K.meta && K.meta.shards) || []), SH = {};
  const shardOf = (type, it) => { if (it && it.anna) return SHARDS.has("_anna") ? "_anna" : null; if (type === "eng" || type === "spj" || type === "target") return null; if (type === "ski" || type === "peak") return K.mtnd ? "_mtn" : null; if ((type === "travel" && it.id === "all") || type === "city" || type === "perm") return null; const k = type === "county" ? slug(it.name) : it.county ? slug(it.county) : it.bst ? "_b-" + slug(it.bco || it.bst) : "_other"; return SHARDS.has(k) ? k : null; };
  window.KYXD = (key, d) => {
    Object.keys(d).forEach(t => { const ix = IDX[t]; if (!ix) return; const o = d[t]; Object.keys(o).forEach(id => { if (ix[id]) Object.assign(ix[id], o[id]); }); });
    (SH[key] = SH[key] || {}).done = true;
  };
  function loadShard(key) {
    const s0 = SH[key]; if (s0 && (s0.done || s0.p)) return s0.p || Promise.resolve();
    const s = SH[key] = {};
    return s.p = new Promise(res => { const el = document.createElement("script"); el.async = true;
      el.src = "data/d/" + encodeURIComponent(key) + ".js" + (K.meta && K.meta.stamp ? "?v=" + K.meta.stamp : "");
      el.onload = () => { s.done = true; res(); }; el.onerror = () => { s.done = true; s.failed = true; res(); }; document.head.appendChild(el); });
  }
  const shardReady = k => !k || !!(SH[k] && SH[k].done);
  function cardLoading(tok, hash, opts, sv) {
    current = tok; card.classList.toggle("tall", tok.type === "group"); body.innerHTML = '<div class="cardload" role="status">Loading…</div>'; card.hidden = false; setPeek(!!opts.peek && PHONE); card.scrollTop = 0;
    if (PNL) showPnl(null);
    nav(fh(hash), opts.replace, sv);
  }
  function openItem(type, id, opts = {}) {
    if (type === "perm" && !(PJX && PJX.hasD())) {  // perm.js + data/pjm.js + data/pjd.js first
      const tok = { type, id, loading: true }, sv = snap();
      cardLoading(tok, "#perm=" + encodeURIComponent(id), opts, sv);
      loadPermD().then(() => { if (current === tok) { if (!IDX.perm || !IDX.perm[id]) { const k = IDX.perm && Object.keys(IDX.perm).find(k => slug(k) === slug(id)); if (k) id = k; } openItem(type, id, Object.assign({}, opts, { replace: true })); } });
      return true;
    }
    const it = IDX[type] && IDX[type][id]; if (!it) { toast("Item not found"); return false; }
    const sv = snap(), sk = shardOf(type, it);
    if (!shardReady(sk)) {  // first open in this county: show the card shell, load data/d/<county>.js, then render
      const tok = { type, id, loading: true };
      cardLoading(tok, "#" + type + "=" + encodeURIComponent(id), opts, sv);
      loadShard(sk).then(() => { if (current === tok) openItem(type, id, Object.assign({}, opts, { replace: true })); });
      return true;
    }
    const from = opts.from && (GC[opts.from.cat] || (opts.from.top && TOPK[opts.from.top])) ? opts.from : null;
    current = { type, id };
    card.classList.remove("tall");
    body.innerHTML = badgeLine(type, id) + annaCard(type, it, kyxBorderCard(type, it)) + `<div class="actions">
        <button class="btn" id="shareBtn">${navigator.share ? "Share…" : "Share"}</button>
        <button class="btn ghost" id="copyBtn">Copy link</button>
        ${it.lat != null || type === "county" ? '<button class="btn ghost" id="zoomBtn">Zoom here</button>' : ""}
        ${dirUrl(type, it) ? `<a class="btn ghost" id="dirBtn" href="${esc(dirUrl(type, it))}" target="_blank" rel="noopener">🧭 Directions</a>` : ""}
        ${type === "property" ? `<button class="btn ghost" id="cmpBtn">${cmpLabel(id)}</button>` : ""}</div>
        <div class="small" style="word-break:break-all">Link: <a href="#${esc(type)}=${esc(encodeURIComponent(id))}">#${esc(type)}=${esc(id)}</a></div>`;
    if ((it.lat != null && type !== "peak") || type === "county") { const cb = document.createElement("div"); cb.id = "climBox"; const ac = body.querySelector(".actions"); if (ac) ac.before(cb); loadAreas().then(() => KYXA.card(type, id, it, cb)).then(() => { if (ANNA_ON && ANNAX) ANNAX.clean(cb); }); }  // climate + KY-vs-TN (lazy areas.js)
    if (ANNA_ON) { /* no permanent-RN-job links on Anna cards */ } else if (PJX) PJX.hook(type, it, body); else if (type === "hospital" || type === "travel" || body.querySelector("[data-pjn]")) loadPerm().then(() => { if (current && current.type === type && current.id === id) { PJX.hook(type, it, body); PJX.apply(); } });
    card.hidden = false; setPeek(!!opts.peek && PHONE); card.scrollTop = takeScroll(0);
    if (PNL) showPnl(null);
    $("#shareBtn").onclick = () => doShare(type, id);
    $("#copyBtn").onclick = () => copy(fullUrl(shareUrlBest(type, id)));
    const zb = $("#zoomBtn"); if (zb) zb.onclick = () => zoomTo(type, it, true);
    const cb = $("#cmpBtn"); if (cb) cb.onclick = () => cmpToggle(id, cb);
    const gf = $("#gFrom"); if (gf) gf.onclick = () => history.back();  // the list is the previous history entry
    const g = $("#gal"); if (g) g.querySelectorAll("img").forEach(img => img.onclick = () => openLB(it.photos, +img.dataset.i));
    const tb = body.querySelector("[data-thumb]");
    if (tb && it.th) tb.onclick = () => openLB([it.th.b || it.th.u], 0, [it.th.k === "satellite" ? "Satellite view · " + SAT.c : (it.th.c || "")], [it.th.u]);
    nav(fh("#" + type + "=" + encodeURIComponent(id)), opts.replace, sv);
    document.title = TITLE[type](it) + " — " + ST.app;
    ensureLayerFor(type, it);
    if (type === "property" && isHome(it)) applyHomeFilter();
    if (type === "property" && isNH(it)) applyNHFilter();  // a home hidden by the Homes filter still shows its pin while open
    if (opts.fly !== false) zoomTo(type, it, false);
    highlight(type, it);
    return true;
  }
  const annaCard = (type, it, h) => ANNA_ON && ANNAX ? ANNAX.card(type, it, h) : h;  // Anna on: hospital sections out, engineering-job sections in
  function showPage(tok, html, hash, opts = {}) {  // a non-item page in the card (profiles.js): same Back / X / expand behaviour
    const sv = snap(); current = tok; card.classList.toggle("tall", !!opts.tall);
    body.innerHTML = html; card.hidden = false; setPeek(false); card.scrollTop = takeScroll(0);
    if (PNL) showPnl(null);
    if (hl) { map.removeLayer(hl); hl = null; }
    nav(fh(hash), opts.replace, sv); document.title = (opts.title || "Profile") + " — " + ST.app;
  }
  function refreshCard() {
    const c = current; if (!c || card.hidden || c.loading) return;
    if (c.type === "group") { current = null; openGroup(c.id, c.cat, { replace: true, fly: false }); }
    else if (c.type === "top") { current = null; openTop(c.id, { replace: true }); }
    else if (c.type !== "profile" && R[c.type]) { current = null; openItem(c.type, c.id, { replace: true, fly: false }); }
  }
  // the county's bounding box fills the part of the map nothing covers: below the search bar / key / profile pills, above the card
  // (phone) or left of it (desktop), clear of the layer buttons when they overlap that strip. Back / X restore the view from before.
  function fitCounty(it) {
    const b = it.bbox, VW = window.innerWidth, VHh = window.innerHeight;
    let top = 6, bot = 6, left = 6, right = 6;
    const box = el => el && !el.hidden && el.offsetWidth ? { l: el.offsetLeft, t: el.offsetTop, r: el.offsetLeft + el.offsetWidth, b: el.offsetTop + el.offsetHeight } : null;
    const tb = $("#topbar"); if (tb) top = Math.max(top, tb.getBoundingClientRect().bottom + 6);
    const top0 = top;
    [$("#mapKey"), pBar].forEach(el => { const q = box(el); if (!q) return; if (q.b - q.t > VHh * 0.3) left = Math.max(left, q.r + 8); else top = Math.max(top, q.b + 6); });
    const c = box(card);
    if (c) { if (c.r - c.l >= VW * 0.9) bot = Math.max(bot, VHh - c.t + 6); else right = Math.max(right, VW - c.l + 8); }
    const fq = box($("#focusChip")); if (fq && card.hidden) bot = Math.max(bot, VHh - fq.t + 6);
    const st = box(lStack);
    if (st && st.b > top && st.t < VHh - bot && st.l > VW - right - 120) right = Math.max(right, VW - st.l + 6);
    if (VHh - bot - top < 90) top = top0;  // tiny strip: let the small pills overlap rather than shrink the county to nothing
    const so = map.options.zoomSnap; map.options.zoomSnap = 0.05;
    const bb = [[b[1], b[0]], [b[3], b[2]]], tz = Math.min(12, map.getBoundsZoom(bb, false, L.point(left + right, top + bot)));
    map.flyToBounds(bb, { duration: 0.8, paddingTopLeft: [left, top], paddingBottomRight: [right, bot], maxZoom: 12 });
    map.options.zoomSnap = so; return tz;
  }
  function zoomTo(type, it, force) {
    if ((type === "travel" || type === "perm") && it.lat == null) return;  // the ranked list / unmapped clinic sites have no single location
    const pad = !PHONE ? { paddingBottomRight: [440, 0] } : { paddingBottomRight: [0, Math.round(VH * 0.55)] };
    if (FULL_ON && !force) { if (type === "county") { const b = it.bbox; map.fitBounds([[b[1], b[0]], [b[3], b[2]]], { animate: false }); } else map.setView([it.lat, it.lon], Math.max(map.getZoom(), type === "property" ? 13 : 12), { animate: false }); return; }
    if (type === "county") { fitCounty(it); return; }
    const z = type === "property" ? 13 : 14;
    const ll = L.latLng(it.lat, it.lon);
    const target = Math.max(map.getZoom(), force ? z : Math.min(z, 12));
    // shift center so the pin isn't hidden behind the card
    const p = map.project(ll, target);
    if (!PHONE) p.x += 210; else p.y += Math.round(VH * 0.27);
    map.flyTo(map.unproject(p, target), target, { duration: 0.8 });
  }
  function highlight(type, it) {
    if (hl) { map.removeLayer(hl); hl = null; }
    if (type === "county") { hl = L.polygon(cLL(it), { renderer: ensureLines(), color: "#e8a317", weight: 4, fill: false, interactive: false }).addTo(map); }
    else if (it.lat != null) { hl = L.circleMarker([it.lat, it.lon], { renderer: ensureLines(), color: "#e8a317", weight: 3, fill: false, interactive: false }).addTo(map); }
  }
  function closeCard(push = true) {
    card.hidden = true; card.classList.remove("tall"); setPeek(false); setFull(false); current = null; if (TOPF) { TOPF = null; sched(true); } if (hl) { map.removeLayer(hl); hl = null; }
    document.title = ST.app;
    if (push && location.hash) nav("", false);
  }
  $("#cardClose").onclick = () => exitCard();
  body.addEventListener("click", e => {
    const t = e.target.closest("[data-grp]");
    if (t && current && current.type === "county") { e.preventDefault(); openGroup(current.id, t.dataset.grp, { fromCounty: true }); return; }
    const a = e.target.closest("[data-go]"); if (!a) return;
    e.preventDefault();
    let from = null;
    if (a.dataset.from && current && current.type === "group") { const [county, cat] = a.dataset.from.split("|"); from = { county, cat }; gScroll = { key: a.dataset.from, top: card.scrollTop }; }
    else if (a.dataset.from && current && current.type === "top") { from = { top: a.dataset.from.split("|")[1] }; gScroll = { key: a.dataset.from, top: card.scrollTop }; }
    openItem(a.dataset.go, a.dataset.id, from ? { from } : {});
  });
  // bottom sheet (phones): a card opened from the map starts as a peek bar (title only). Tap it or swipe up -> full card;
  // swipe down: full card -> peek bar (item cards) or closed (lists); peek bar -> closed. The map stays usable above the peek bar.
  function setPeek(on) { card.classList.toggle("peek", !!on); if (on) card.scrollTop = 0; }
  card.addEventListener("click", e => { if (!card.classList.contains("peek") || e.target.closest(".cardtools")) return; e.preventDefault(); e.stopPropagation(); setPeek(false); }, true);
  (function () { let y0 = null; card.addEventListener("touchstart", e => { y0 = card.scrollTop <= 0 || card.classList.contains("peek") ? e.touches[0].clientY : null; }, { passive: true });
    card.addEventListener("touchend", e => { if (y0 == null || FULL_ON) { y0 = null; return; } const dy = e.changedTouches[0].clientY - y0, pk = card.classList.contains("peek"); y0 = null;
      if (pk) { if (dy < -30) setPeek(false); else if (dy > 50) exitCard(); }
      else if (dy > 90) { if (PHONE && current && !current.loading && R[current.type] && current.type !== "travel") setPeek(true); else exitCard(); } }, { passive: true }); })();
  function countyId(id) {
    if (IDX.county[id]) return id;
    return Object.keys(IDX.county).find(k => k.toLowerCase() === id.toLowerCase().replace(/\s*county$/, "")) || Object.keys(IDX.county).find(k => slug(k) === slug(id.replace(/\s*county$/i, ""))) || id;
  }
  function route(replace, rs) {
    const ro = rs ? { replace: true, fly: false } : { replace: true };
    const full = /&full=1$/.test(location.hash), hs = location.hash.replace(/&full=1$/, "");
    if (!ANNA_ON && ANNA_RX.test(hs) && K.meta && K.meta.anna) { annaSet(true, { quiet: true }).then(ok => { if (ok) route(replace, rs); else toast("Couldn't load the Anna data"); }); return; }  // shared Anna link: Anna on first
    if (full !== FULL_ON && (full ? hs.length > 1 : true)) setFull(full);
    const gm = hs.replace(/&amp;/g, "&").match(/^#county=([^&]+)&cat=([a-z]+)$/);
    if (gm) {
      const id = countyId(decodeURIComponent(gm[1]));
      if (current && current.type === "group" && current.id === id && current.cat === gm[2]) return;
      openGroup(id, gm[2], ro); return;
    }
    if (hs === "#areas") { if (current && current.hash === hs) return; loadAreas().then(() => KYXA.route(hs, ro)); return; }
    if (/^#(favs|compare|new|near)(=|$)/.test(hs)) { if (current && current.hash === hs) return; loadExtras().then(() => KYXE.route(hs, ro)); return; }
    if (/^#(profile|pedit|pmatch)=/.test(hs)) { if (current && current.hash === hs) return; loadProfiles().then(() => KYXP.route(hs, ro)); return; }
    const tm = hs.match(/^#(deals|top-buildings|top-businesses|top-er-jobs|top-other-jobs|top-bonus|top-perm-er|top-perm-sdms|top-perm-icu)$/) || (/^#top-/.test(hs) && TOPH[hs.slice(1)] ? [hs, hs.slice(1)] : null);
    if (tm) { const t = TOPH[tm[1]]; if (current && current.type === "top" && t && current.id === t.k) return; if (t) { openTop(t.k, { replace: true }); return; } }
    const m = hs.match(/^#(property|hospital|school|college|activity|history|county|travel|perm|airport|business|building|attraction|city|ski|peak|target|eng|spj)=(.+)$/);
    const fm = hs.match(/^#cmap=(.+)$/);
    if (fm) { if (!card.hidden) closeCard(false); if (!rs) setFocus(countyId(decodeURIComponent(fm[1])), true); return; }  // popstate sets the focus from history.state.fz
    if (!m) { if (!card.hidden) closeCard(false); return; }
    const type = m[1]; let id = decodeURIComponent(m[2]);
    if (!IDX[type]) { toast("Item not found"); return; }
    if (type === "perm" && !(PJX && PJX.hasD())) { if (!(current && current.loading && current.id === id)) openItem(type, id, ro); return; }
    if (!IDX[type][id] && type === "county") { id = Object.keys(IDX.county).find(k => k.toLowerCase() === id.toLowerCase().replace(/\s*county$/, "")) || id; }
    if (!IDX[type][id]) { id = Object.keys(IDX[type]).find(k => slug(k) === slug(id)) || id; }
    if (current && current.type === type && current.id === id) return;
    openItem(type, id, ro);
  }
  window.addEventListener("hashchange", () => {  // typed / pasted hash: a fresh entry with no state
    if (!history.state || history.state.d == null) history.replaceState({ d: 1, nob: 1, L: isListH(location.hash) ? 1 : undefined }, "", location.href);
    route(true);
  });
  window.addEventListener("popstate", () => {
    const st = history.state || {};
    pendScroll = st.v ? st.v.s : null;
    POPPING = true; try {
    route(true, !!st.v);
    if (st.v) { const zs = map.options.zoomSnap; map.options.zoomSnap = 0; map.setView(st.v.c, st.v.z, { animate: false }); map.options.zoomSnap = zs; }  // exact zoom (the start view is 6.2)
    } finally { POPPING = false; }
    if (st.fz && IDX.county[st.fz]) setFocus(st.fz, false); else if (FOCUS) clearFocus(true);
    if (card.hidden) pendScroll = null;
    else if (pendScroll != null && current && !current.loading) { card.scrollTop = pendScroll; pendScroll = null; }
    updBack();
  });
  // in-page links (#travel=all, Top 10 chips, map-key buttons…) open through the stack too
  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || a.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    const h = a.getAttribute("href"); if (h.length < 2 || h === location.hash) return;
    e.preventDefault(); nav(h, false); route(true);
  });

  // ------------------------------------------------------------------ lightbox (swipe, keys)
  const lbx = $("#lightbox"), lbImg = $("#lbImg");
  let lbList = [], lbI = 0, lbCap = null, lbFallback = null;
  function openLB(list, i, caps, fallback) { lbList = list; lbI = i; lbCap = caps || null; lbFallback = fallback || null; lbx.hidden = false; lbx.classList.toggle("single", list.length < 2); showLB(); }
  function showLB() {
    const fb = lbFallback && lbFallback[lbI];
    lbImg.onerror = fb ? () => { lbImg.onerror = null; lbImg.src = fb; } : null;  // larger remote image unavailable -> local thumb
    lbImg.src = lbList[lbI]; lbImg.style.transform = "";
    $("#lbCount").textContent = (lbCap && lbCap[lbI]) || (lbList.length > 1 ? `${lbI + 1} / ${lbList.length}` : "");
  }
  function step(d) { if (!lbList.length) return; lbI = (lbI + d + lbList.length) % lbList.length; showLB(); }
  $("#lbPrev").onclick = () => step(-1); $("#lbNext").onclick = () => step(1); $("#lbClose").onclick = () => lbx.hidden = true;
  lbx.addEventListener("click", e => { if (e.target === lbx || e.target.classList.contains("lbstage")) lbx.hidden = true; });
  let tx = null, ty = null;
  lbx.addEventListener("touchstart", e => { if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } }, { passive: true });
  lbx.addEventListener("touchmove", e => { if (tx != null) lbImg.style.transform = `translateX(${e.touches[0].clientX - tx}px)`; }, { passive: true });
  lbx.addEventListener("touchend", e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1); else if (dy > 120) lbx.hidden = true; else lbImg.style.transform = ""; tx = null; });
  document.addEventListener("keydown", e => {
    if (!lbx.hidden) { if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1); else if (e.key === "Escape") lbx.hidden = true; return; }
    if (e.key === "Escape") { if (!info.hidden) info.hidden = true; else if (!lp.hidden) lp.hidden = true; else if (FULL_ON) collapseCard(); else if (!card.hidden) exitCard(); }
  });

  // ------------------------------------------------------------------ search
  const all = [];
  Object.entries(IDX).forEach(([type, o]) => Object.values(o).forEach(it => all.push({ type, id: type === "county" ? it.name : it.id, name: type === "county" ? it.name + ST.cus : (it.title || it.name), sub: type === "property" ? [isNH(it) ? "🏥 Near-hospital home" + (it.ptype && it.ptype !== "House" ? " (" + it.ptype.toLowerCase() + ")" : "") : isHome(it) ? "🏠 1-acre home" : isCab(it) ? "🪵 " + (ST.cabin.label || "Cabin") + " (" + (ST.cabin.acres || 25) + "+ acres)" : isBig(it) ? "★ 50+ acres under $250k" + (it.dwell === "yes" ? " (with a home)" : "") : isCF(it) ? cfLab(it) : null, isCF(it) && !isCFo(it) ? cfLab(it) : null, it.town, it.county].filter(Boolean).join(", ") : type === "history" ? (HIST[it.type] || [, ""])[1] : (it.kind || it.district || it.city || ""), extra: type === "property" ? [it.address, isNH(it) ? "near hospital home " + (it.nh ? it.nh.name : "") : ""].filter(Boolean).join(" ").toLowerCase() : "" })));
  const LABEL = { city: "City", travel: "Travel RN jobs", property: "Property / home", hospital: "Hospital", school: "School", college: "College", activity: "Activity", history: "History", county: ST.cu };
  const si = $("#search"), res = $("#results"); let hits = [], sel = 0;
  const annaSee = x => ANNA_ON ? !(x.type === "hospital" || x.type === "travel" || x.type === "perm" || (x.type === "property" && IDX.property[x.id] && isNH(IDX.property[x.id]))) : !x.anna;
  si.addEventListener("input", () => {
    const q = si.value.trim().toLowerCase(); if (q.length < 2) { res.hidden = true; return; }
    const pri = { eng: 1, spj: 2, city: 0, county: 0, property: 1, business: 1, building: 1, travel: 2, hospital: 2, airport: 2, history: 3, activity: 4, attraction: 4, ski: 3, peak: 4, target: 3, college: 5, school: 6 };
    hits = all.filter(x => annaSee(x) && (x.name.toLowerCase().includes(q) || (x.sub || "").toLowerCase().includes(q) || (x.extra || "").includes(q))).sort((a, b) => (a.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.name.toLowerCase().startsWith(q) ? 0 : 1) || pri[a.type] - pri[b.type]).slice(0, 30);
    sel = 0; res.innerHTML = hits.map((h, i) => `<div data-i="${i}" class="${i === 0 ? "sel" : ""}">${esc(h.name)}<br><small>${LABEL[h.type]}${h.sub ? " · " + esc(h.sub) : ""}</small></div>`).join("") || "<div><small>No matches</small></div>";
    res.hidden = false;
  });
  si.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { sel = Math.max(0, Math.min(hits.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))); res.querySelectorAll("div").forEach((d, i) => d.classList.toggle("sel", i === sel)); e.preventDefault(); }
    if (e.key === "Enter" && hits[sel]) pick(hits[sel]);
    if (e.key === "Escape") { res.hidden = true; si.blur(); }
  });
  res.addEventListener("click", e => { const d = e.target.closest("[data-i]"); if (d) pick(hits[+d.dataset.i]); });
  function pick(h) { res.hidden = true; si.value = ""; si.blur(); openItem(h.type, h.id); }
  document.addEventListener("click", e => { if (!e.target.closest(".searchwrap")) res.hidden = true; });

  // ================================================================ more layers: airports, businesses & buildings for sale, attractions, zoom-level de-clutter
  // Function declarations are hoisted; hooks call them from the layer panel, map key and start sections.
  var MORE_PIN, MORE_LAYER_FOR, MORE_ATT, MORE_ATT_KEYS;  // var (no initialiser): filled by kyxMoreLayers() before renderKey()/ensureLayerFor() use them
  function kyxMoreLayers(LAYERS) {
    const A = K.airports || [], BZ = K.businesses || [], BD = K.buildings || [], AT = K.attractions || [];
    IDX.airport = {}; IDX.business = {}; IDX.building = {}; IDX.attraction = {};
    A.forEach(x => IDX.airport[x.id] = x); BZ.forEach(x => IDX.business[x.id] = x); BD.forEach(x => IDX.building[x.id] = x); AT.forEach(x => IDX.attraction[x.id] = x);
    // type -> [icon, layer label, layer key, short name]
    MORE_ATT = { amusement: ["🎢", "Amusement & theme parks", "a_park", "Amusement park"], water: ["🌊", "Water parks", "a_water", "Water park"],
      aquarium: ["🐟", "Aquariums", "a_aqua", "Aquarium"], museum: ["🏛", "Museums", "a_museum", "Museum"], camp: ["⛺", "Campgrounds (state park, Corps, national forest, private)", "a_camp", "Campground"] };
    MORE_ATT_KEYS = Object.values(MORE_ATT).map(v => v[2]);
    const priceK = v => v == null ? "" : v >= 1e6 ? "$" + (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : "$" + Math.round(v / 1000) + "k";
    const L_apt = PL_("apt"), L_biz = PL_("biz"), L_bldg = PL_("bldg"), L_at = {};
    Object.keys(MORE_ATT).forEach(t => L_at[t] = PL_(MORE_ATT[t][2]));
    A.forEach(a => L_apt.addLayer(ent("airport", a, () => L.divIcon({ className: "", html: `<div class="mk apt${a.oos ? " oos" : ""}${a.nonstops ? "" : " ga"}" style="width:28px;height:28px">✈</div><b class="plab apt">${esc(a.code)}</b>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
      { z: 3000, zh: 7000, tip: () => `✈ ${esc(a.name)} (${esc(a.code)}) · ${a.nonstops ? a.nonstops + " nonstop destinations" : "no scheduled airline service"}` })));
    const saleIcon = (cls, sym, x) => L.divIcon({ className: "", html: `<div class="mk ${cls}" style="width:22px;height:22px">${sym}</div>${x.price ? `<b class="plab ${cls.split(" ")[0]}">${priceK(x.price)}</b>` : ""}`, iconSize: [22, 22], iconAnchor: [11, 11] });
    BZ.forEach(x => L_biz.addLayer(ent("business", x, () => saleIcon("biz", "$", x), { z: 1200, zh: 5500,
      tip: () => `🏪 ${esc(x.title)}${x.price ? " · " + money(x.price) : ""} · ${esc(x.kind)}${x.town ? " · " + esc(x.town) : ""}` })));
    BD.forEach(x => L_bldg.addLayer(ent("building", x, () => saleIcon("bldg sv", G.starDot("#2e7d32"), x), { z: 1200, zh: 5500,
      tip: () => `🔔 ${esc(x.title)}${x.price ? " · " + money(x.price) : ""}${x.was ? " · was: " + esc(x.was) : ""}${x.town ? " · " + esc(x.town) : ""}` })));
    AT.forEach(x => { const t = MORE_ATT[x.type]; if (!t) return;
      const e = ent("attraction", x, x.type === "camp" ? () => icOnce("at_camp", () => sicon("att at-camp", G.tent(), 22, 22)) : () => icOnce("at_" + x.type, () => icon("att at-" + x.type, t[0], 24)),
        { z: 100, zh: x.type === "museum" || x.type === "aquarium" ? 5000 : 0, tip: () => `${t[0]} ${esc(x.name)} (${esc(t[3])})` });
      if (x.featured) { e.stout = true; e.z = 2500; e.zh = 6000; FEAT.push(e); } else L_at[x.type].addLayer(e); });
    const ins = (after, rows) => { const i = LAYERS.findIndex(d => d.key === after); LAYERS.splice(i < 0 ? LAYERS.length : i + 1, 0, ...rows); };
    ins("nh", [{ key: "biz", label: "🏪 Businesses for sale (under $1M)", layer: L_biz, on: true, n: BZ.length, disabled: !BZ.length },
      { key: "bldg", label: "🔔 Interesting buildings for sale (under $600k)", layer: L_bldg, on: true, n: BD.length, disabled: !BD.length }]);
    ins("hosp", [{ key: "apt", label: ST.apt, layer: L_apt, on: true, n: A.length, disabled: !A.length }]);
    ins("act", [{ key: "attr", label: "Attractions", group: true }, ...Object.entries(MORE_ATT).map(([t, v]) => ({ key: v[2], label: v[0] + " " + v[1], layer: L_at[t],
      on: t !== "camp", n: AT.filter(x => x.type === t).length, sub: true, disabled: !AT.some(x => x.type === t) }))]);
    // featured standouts: curated outdoor + history sites + attractions (featured flag from data/featured.json) live in their own always-on layer
    const L_feat = PL_("feat"); FEAT.forEach(e => L_feat.addLayer(e)); const nFeat = FEAT.length;
    ins("apt", [{ key: "feat", label: ST.feat, layer: L_feat, on: true, n: nFeat, disabled: !nFeat }]);
    MORE_PIN = ["biz", "bldg", "apt", "feat"];
    MORE_LAYER_FOR = { _feat: it => it && it.featured ? "feat" : null, airport: () => "apt", business: () => "biz", building: () => "bldg", attraction: it => MORE_ATT[it.type] && MORE_ATT[it.type][2] };
  }
  function kyxMorePinKey(PIN_KEY) {
    const mk = (cls, html, size) => `<span class="mk ${cls}" style="width:${size}px;height:${size}px">${html}</span>`;
    const krow = (sym, label, note) => `<div class="krow"><span class="ksym">${sym}</span><span>${label}${note ? `<span class="small"> ${note}</span>` : ""}</span></div>`;
    PIN_KEY.biz = () => `<div class="ksec"><b>🏪 Businesses for sale</b> <span class="small">(under $1M asking; Crexi &amp; Zillow, seen ${esc((K.businesses || [])[0] ? K.businesses[0].seen : "")})</span>${krow(mk("biz", "$", 20), "Business for sale", "(green $) · tag beside the pin = asking price")}</div>`;
    PIN_KEY.bldg = () => `<div class="ksec"><b>🔔 Interesting buildings for sale</b> <span class="small">(under $600k: old churches, banks, schools, stores…)</span>${krow(ksv(G.starDot("#2e7d32")), "Unusual building for sale", "(green circle, yellow star) · tag = asking price")}</div>`;
    PIN_KEY.apt = () => `<div class="ksec"><b>✈ Airports</b>${krow(mk("apt", "✈", 20), ST.name + " airport with airline service", "· code beside the pin")}${krow(mk("apt oos", "✈", 20), ST.aptOos)}${krow(mk("apt ga", "✈", 20), "No scheduled flights right now")}</div>`;
    Object.values(MORE_ATT || {}).forEach(([e, label, key]) => { const t = Object.keys(MORE_ATT).find(k => MORE_ATT[k][2] === key); PIN_KEY[key] = () => krow(t === "camp" ? ksv(G.tent()) : mk("att at-" + t, e, 20), esc(label)); });
    PIN_KEY.feat = () => `<div class="ksec"><b>★ ${ST.name} standouts</b> <span class="small">(a short hand-picked list: big parks, gorges, caves, battlefields, landmark homes, plus the famous museums, Newport Aquarium and Ark Encounter)</span>${krow(`<span class="mk sv stout">${G.mountain()}</span>`, "Standout site", `· gold glow; icon from zoom ${FULL.feat}`)}</div>`;
    PIN_KEY._lod = () => { const T = { feat: "★ standouts", trauma: "other trauma centers", hosp: "hospitals", props: "5+ acre homes", nh: "near-hospital homes", cab: "cabins", big: "50+ acre lots", cvf: "caves & waterfalls", homes: "1+ acre homes", travel: "travel jobs", perm: "permanent jobs",
        a_museum: "museums", a_aqua: "aquariums", col: "colleges", a_park: "amusement parks", a_water: "water parks", act: "outdoors", a_camp: "campgrounds", h_hist: "historic sites", sch: "schools", h_coal: "coal camps", h_ghost: "ghost towns", h_mine: "mines", ski: "ski areas + top peaks", peak: "other peaks", tgt: "Target stores" };
      const by = {}; Object.entries(FULL).forEach(([k, z]) => { if (T[k]) (by[z] = by[z] || []).push(T[k]); });
      const steps = Object.keys(by).sort((a, b) => a - b).map(z => `<b>${z}</b> ${by[z].join(", ")}`).join(" · ");
      return `<div class="ksec small"><b>Zoomed out?</b> Statewide the map shows only Level I/II trauma centers, airports, businesses and unusual buildings for sale, ⭐ bargain homes and the 5 largest cities; every other pin is a faint dot. Zooming in turns the dots into icons a few kinds at a time (zoom ${steps}). Pins of one kind that sit close together show as one bigger icon with a count: tap it to zoom in; from zoom ${CL_OFF} every pin stands alone. The county colors fade as you zoom in; the county lines stay.</div>`; };
  }
  function kyxMoreLate() {
    const A = K.airports || [], BZ = K.businesses || [], BD = K.buildings || [], AT = K.attractions || [];
    const ATT = MORE_ATT;
    Object.assign(THUMB_TITLE, { airport: a => `${a.name} (${a.code})`, business: x => x.title, building: x => x.title, attraction: x => x.name });
    Object.assign(TITLE, { airport: a => `${a.name} (${a.code})`, business: x => x.title + " — business for sale", building: x => x.title + " — building for sale", attraction: x => x.name });
    Object.assign(LABEL, { airport: "Airport", business: "Business for sale", building: "Building for sale", attraction: "Attraction" });
    const sqft = v => v ? Math.round(v).toLocaleString() : "—";
    const wikiUrl = t => "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(t).replace(/ /g, "_"));
    R.airport = a => `${thumb("airport", a)}<div class="kicker">✈ ${a.oos ? "Airport · out of state, near " + ST.name : ST.name + " airport"}</div><h2>${esc(a.name)} (${esc(a.code)})</h2>
      <div class="sub">${esc(a.city)}, ${esc(a.state)}</div>${a.note ? `<div class="note">ℹ️ ${esc(a.note)}</div>` : ""}
      <div class="stats">${stat(a.nonstops != null ? a.nonstops : "—", "nonstop destinations")}${stat((a.airlines || []).length, "airlines")}${stat(esc(a.code), "airport code")}</div>
      ${(a.airlines || []).length ? `<div class="kicker">Airlines</div><div class="badges">${a.airlines.map(x => `<span class="badge">${esc(x)}</span>`).join("")}</div>` : ""}
      ${(a.dests || []).length ? `<div class="kicker">Some nonstop destinations</div><div class="desc">${esc(a.dests.join(" · "))}${a.nonstops > a.dests.length ? " …" : ""}</div>` : ""}
      <table class="kv">${row(ST.cu, a.county ? link("county", a.county, a.county + ST.cus) : esc(a.state))}${row("Wikipedia", a.wiki ? ext(a.wiki, "Airlines & destinations ↗") : null)}</table>
      <div class="small">Nonstop count = destinations in Wikipedia's airlines &amp; destinations table (seasonal routes included), checked Oct 2026.</div>${nearbyProps(a)}`;
    function saleCard(x, kind) {
      const photos = x.photos || [];
      const gal = photos.length ? `<div class="gal" id="gal">${photos.map((u, i) => `<img src="${esc(u)}" data-i="${i}" loading="${i < 2 ? "eager" : "lazy"}" alt="Photo ${i + 1} of ${esc(x.title)}">`).join("")}</div><div class="galcount">${photos.length} photo${photos.length > 1 ? "s" : ""} · swipe or tap to enlarge</div>` : "";
      const ppsf = x.price && x.sqft ? "$" + Math.round(x.price / x.sqft).toLocaleString() : "—";
      return `<div class="kicker">${kind === "business" ? "🏪 Business for sale · " + esc(x.kind) : "🔔 Interesting building for sale" + (x.was ? " · was: " + esc(x.was) : "")}</div><h2>${esc(x.title)}</h2>
        <div class="sub">${esc(x.address || [x.town, x.county && x.county + ST.cus].filter(Boolean).join(", "))}</div>${gal}
        <div class="badges">${x.biz_only ? '<span class="badge">Business only · no real estate</span>' : kind === "business" ? '<span class="badge">Real estate included</span>' : ""}${x.auction ? '<span class="badge gold">Auction</span>' : ""}</div>
        ${x.note ? `<div class="note">⚠️ ${esc(x.note)}</div>` : ""}
        <div class="stats">${stat(money(x.price), "asking price")}${stat(sqft(x.sqft), "sq ft")}${stat(x.acres ? fmt1(x.acres) : "—", "acres")}${stat(ppsf, "per sq ft")}${stat(x.year_built ? esc(x.year_built) : "—", "built")}${stat(esc(x.seen || "—"), "date seen")}</div>${nearbyBlock(x.nearby)}
        <table class="kv">${row(kind === "business" ? "Business" : "What it was", esc(kind === "business" ? x.kind : (x.was || x.kind)))}${row("Address", x.address ? esc(x.address) : null)}
        ${row(ST.cu, x.county ? link("county", x.county, x.county + ST.cus) : null)}
        ${row("Nearest hospital", x.near_hosp ? `${link("hospital", x.near_hosp.id, x.near_hosp.name)} · ${x.near_hosp.miles} mi straight-line` : null)}
        ${row("Listing", ext(x.url, "Open on " + (x.source || "source") + " ↗"))}${row("Broker", x.broker ? esc(x.broker) : null)}${row("Status", x.status ? esc(String(x.status).replace(/_/g, " ").toLowerCase()) : null)}
        ${row("Listed", x.listed ? esc(x.listed) : null)}${row("Updated", x.updated ? esc(x.updated) : null)}${row("Date seen", esc(x.seen))}</table>
        ${x.headline ? `<div class="small">${esc(x.headline)}</div>` : ""}${x.desc ? `<div class="kicker">Description</div><div class="desc">${esc(x.desc)}</div>` : ""}
        <div class="small">Asking price as posted; listings change, so confirm on the source.</div>`;
    }
    R.business = x => saleCard(x, "business");
    R.building = x => saleCard(x, "building");
    R.attraction = a => { const t = ATT[a.type] || ["★", a.kind, "", a.kind];
      const isRec = /recreation\.gov|reserveamerica/.test(a.web || "");
      return `${thumb("attraction", a)}<div class="kicker">${t[0]} ${esc(t[3])}${a.sub && a.sub.toLowerCase() !== t[3].toLowerCase() ? " · " + esc(a.sub) : ""}</div><h2>${esc(a.name)}</h2>
      <div class="sub">${esc(a.county ? a.county + ST.cus + ", " + ST.ab : ST.name)}</div>${a.desc ? `<div class="desc">${esc(a.desc)}</div>` : ""}
      <table class="kv">${row("Campsites", a.sites ? esc(a.sites) : null)}${row("Run by", a.operator ? esc(a.operator) : null)}${row("Lake / area", a.area ? esc(a.area) : null)}${row("Nightly fee", a.price ? esc(a.price) : null)}
      ${row(ST.cu, a.county ? link("county", a.county, a.county + ST.cus) : null)}${row(isRec ? "Reserve" : "Website", a.web ? ext(a.web, isRec ? "Reservations & details ↗" : (host(a.web) || "Website") + " ↗") : null)}
      ${row("Wikipedia", a.wp ? ext(wikiUrl(a.wp), a.wp + " ↗") : null)}${row("Map data", a.osm ? ext(a.osm, "OpenStreetMap ↗") : a.wd ? ext("https://www.wikidata.org/wiki/" + a.wd, "Wikidata ↗") : null)}</table>${nearbyProps(a)}`; };
    // county grouping pages
    const at_order = ["amusement", "water", "aquarium", "museum", "camp"];
    GCATS.push({ k: "business", n: "biz", label: "businesses for sale", one: "business for sale", title: "Businesses for sale", icon: "🏪", layers: ["biz"] },
      { k: "buildings", n: "bldg", label: "buildings for sale", one: "building for sale", title: "Interesting buildings for sale", icon: "🔔", layers: ["bldg"] },
      { k: "attractions", n: "attr", label: "attractions", one: "attraction", title: "Attractions", icon: "🎢", layers: MORE_ATT_KEYS.slice() });
    GCATS.slice(-3).forEach(g => GC[g.k] = g);
    gItems.business = n => BZ.filter(x => x.county === n);
    gItems.buildings = n => BD.filter(x => x.county === n);
    gItems.attractions = n => AT.filter(x => x.county === n);
    const byPrice = (a, b) => (a.price == null) - (b.price == null) || (a.price || 0) - (b.price || 0);
    GB.business = (c, xs, from) => ({ sub: "Sorted by asking price, lowest first", secs: [["Businesses for sale", xs.slice().sort(byPrice).map(x => gRow("business", x.id, from, gImg(x.rt, "🏪"),
      `<b>${x.price != null ? money(x.price) : "Price n/a"}</b> · ${esc(x.kind)}`, esc(x.title), dot([x.town && esc(x.town), x.sqft && sqft(x.sqft) + " sq ft", x.biz_only && "business only"])))]] });
    GB.buildings = (c, xs, from) => ({ sub: "Sorted by asking price, lowest first", secs: [["Buildings for sale", xs.slice().sort(byPrice).map(x => gRow("building", x.id, from, gImg(x.rt, "🔔"),
      `<b>${x.price != null ? money(x.price) : "Price n/a"}</b>${x.was ? " · was: " + esc(x.was) : ""}`, esc(x.title), dot([x.town && esc(x.town), x.sqft && sqft(x.sqft) + " sq ft"])))]] });
    GB.attractions = (c, xs, from) => ({ sub: "Grouped by type", jump: true, secs: at_order.map(t => [ATT[t][0] + " " + ATT[t][1].replace(/ \(.*\)$/, ""), xs.filter(x => x.type === t).sort((a, b) => a.name.localeCompare(b.name)).map(x =>
      gRow("attraction", x.id, from, gImg(x.th && x.th.u, ATT[t][0]), `<b>${esc(x.name)}</b>`, `${ATT[t][0]} ${esc(ATT[t][3])}${x.sub ? " · " + esc(x.sub) : ""}${x.sites ? " · " + x.sites + " sites" : ""}`,
        x.desc ? esc(firstSentence(x.desc)) : x.web ? esc(host(x.web)) : ""))]).filter(s => s[1].length) });
    kyxLOD();
  }
  // ---------------------------------------------------------------- zoom-level de-clutter (LOD)
  // Below each layer's tier its pins are faint dots (Bill, Oct 1 late: "the more you zoom in, the more you see"); icons come back a few
  // kinds per zoom step (FULL: 7.5 standouts ... 11 minor history). Level I/II trauma centers, airports, businesses / buildings for sale,
  // bargain homes and cities always show. Close pins of one icon type are grouped (clusterize); county colors fade with zoom (setFade).
  // The tiers (FULL / KEEP), the viewport culling and the zoomed-out z-order live in the lazy point-layer code near the top (refreshPoints).
  function kyxLOD() { if (keyReady) renderKey(); }
  // ================================================================ ski areas & notable peaks (Oct 3, 2026)
  // Data: K.ski / K.peaks (slim pins in core.js) + data/d/_mtn.js (card details, lazy) from mtn_build.py + explorer/mtn.json.
  // Generic for every state: no data -> no layer rows, no solo buttons, no key rows. Ski areas show as icons from zoom 8, tier-1
  // peaks from zoom 8 (FULLE), the rest from 9.5; dots below. Grouping is automatic (one icon key per kind). Share: #ski=<id>, #peak=<id>.
  // ================================================================ border items (Oct 3, 2026)
  // Pins within ~15 mi OUTSIDE the state line that meet this map's criteria (build.py + border_build.py, explorer/border.json).
  // They are ordinary items (same icons, layers, filters, Top 10s, share links) with county=null, bst=<state>, bco=<their county/town>,
  // bmi=<miles outside>; card details sit in data/d/_b-<st>.js. Their cards get a state tag; school grades use their own state's labels.
  const BST_NAME = { AL: "Alabama", AR: "Arkansas", CT: "Connecticut", GA: "Georgia", IL: "Illinois", IN: "Indiana", KY: "Kentucky", MA: "Massachusetts", ME: "Maine",
    MO: "Missouri", MS: "Mississippi", NC: "North Carolina", NH: "New Hampshire", NY: "New York", OH: "Ohio", RI: "Rhode Island", SC: "South Carolina", TN: "Tennessee",
    VA: "Virginia", VT: "Vermont", WV: "West Virginia", QC: "Québec", NB: "New Brunswick", ON: "Ontario" };
  function kyxBorderCard(type, it) {
    if (!it || !it.bst) return R[type](it);
    const sv = {}, bs = it.bsch;
    if (type === "school") ["sch", "schLab", "schSrc", "rlab", "schOf"].forEach(k => { sv[k] = ST[k]; if (bs) ST[k] = bs[k] == null ? (k === "rlab" ? null : ST[k]) : bs[k]; });
    if (type === "school" && !bs) { ST.schLab = "State grade"; ST.schSrc = "no grades loaded for " + (BST_NAME[it.bst] || it.bst) + " schools";
      ST.schNone = "No grade shown: this map has no school grades for " + (BST_NAME[it.bst] || it.bst) + " (school directory listing from NCES only)"; }
    let h; try { h = R[type](it); } finally { Object.assign(ST, sv); if (type === "school") ST.schNone = sv.schNone; }
    const bco = it.bco && it.bco !== it.bst ? it.bco : null, loc = esc(bco || BST_NAME[it.bst] || it.bst);
    h = h.replace(/<a class="inl" data-go="county" data-id="(?:null|undefined|)">[^<]*<\/a>/g, loc);
    h = h.replace(/<a class="inl" data-go="([a-z]+)" data-id="([^"]*)">([^<]*)<\/a>/g, (m, t, id, tx) => {  // links to things that are not on this map -> plain text
      if (t === "county") return IDX.county[id] ? m : tx;
      return !IDX[t] || IDX[t][id] ? m : tx; });
    const cuRow = new RegExp(`<tr><td>${esc(ST.cu)}</td><td>(?:${loc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${esc(it.bst)}|${esc(it.state || it.bst)}|out of state)</td></tr>`);
    h = h.replace(cuRow, `<tr><td>${/County|Parish/.test(loc) ? "County" : "Location"}</td><td>${loc}</td></tr>`);
    if (type === "hospital" || type === "travel") {
      h = h.replace(`Not on the ${ST.traumaList}`, `Not known: this map has no ${esc(BST_NAME[it.bst] || it.bst)} trauma list`);
      if (/CMS/.test(it.src || "")) h = h.replace(/\(per OpenStreetMap\)/g, "(per CMS Care Compare)");
    }
    if (type === "school") {  // the home-state district context block does not apply over the line
      h = h.replace(/<div class="kicker">[^<]*context<\/div>/, bs ? '<div class="kicker">Grades</div>' : "");
      if (!bs) h = h.replace(/<div class="small">(?:Letter grades|KDE colors)[\s\S]*?\)\.<\/div>/, "");
    }
    const tag = `<div class="btag">🧭 Just over the state line in <b>${esc(BST_NAME[it.bst] || it.bst)}</b> <span class="bst">${esc(it.bst)}</span>${bco ? " · " + esc(bco) : ""}${it.bmi != null ? ` · ${esc(it.bmi)} mi outside ${esc(ST.name)}` : ""}</div>`;
    const i = h.indexOf('<div class="kicker">');
    if (i >= 0) { const j = h.indexOf("</div>", i) + 6; return h.slice(0, j) + tag + h.slice(j); }
    return tag + h;
  }
  function kyxBorderLate() {
    const B = K.meta && K.meta.border; if (!B) return;
    PIN_KEY._border = () => `<div class="ksec small"><b>🧭 Just over the state line:</b> pins up to ~${esc(B.miles)} mi outside ${esc(ST.name)} that meet this map's own criteria (homes, jobs, hospitals, schools, colleges, parks and more) use the same icons; their cards say which state they are in. They don't change any ${esc(ST.cu.toLowerCase())} colors, scores or counts.</div>`;
  }
  // ================================================================ Target stores (Oct 7, 2026)
  // Data: K.targets (whole rows in core.js) + K.meta.target from target_build.py + explorer/target.json (Target's own store directory
  // and store pages). Every store in the state plus stores within ~15 mi outside the state line (bst/bco/bmi: border rule, no county
  // field, so never in county stats). Layer key tgt (red bullseye, icons from zoom FULL.tgt, faint dots below, grouped like the others),
  // right-stack button "Target", Map key row, search, card (name, address, hours, phone, services), share #target=<store number>.
  // Shown in every profile (Bill's and Anna's): profiles only filter homes / jobs / schools / county items. No data -> no layer, no button.
  function kyxTarget(LAYERS) {
    const TG = K.targets || [];
    IDX.target = {}; TG.forEach(x => IDX.target[x.id] = x);
    if (!TG.length) return;
    const L_tgt = PL_("tgt");
    TG.forEach(x => L_tgt.addLayer(ent("target", x, () => icOnce("tgt", () => sicon("tgt", G.tgt(18), 18, 18)), { z: 500, zh: 1200,
      tip: () => `🎯 ${esc(x.name)} · ${esc(x.city || "")}${x.st ? ", " + esc(x.st) : ""}` })));
    const nIn = TG.filter(x => !x.bst).length, nB = TG.length - nIn;
    let i = LAYERS.findIndex(d => d.key === "peak"); if (i < 0) i = LAYERS.findIndex(d => d.key === "ski"); if (i < 0) i = LAYERS.findIndex(d => d.key === "act");
    LAYERS.splice(i < 0 ? LAYERS.length : i + 1, 0, { key: "tgt", ic: G.tgt(16), label: `Target stores (${nIn} in ${ST.name}${nB ? ` + ${nB} just over the line` : ""})`, layer: L_tgt, on: true, n: TG.length });
    if (MORE_LAYER_FOR) MORE_LAYER_FOR.target = () => "tgt";
  }
  function kyxTargetPinKey(PIN_KEY) {
    if (!(K.targets || []).length) return;
    const m = (K.meta && K.meta.target) || {};
    PIN_KEY.tgt = () => `<div class="ksec"><b>🎯 Target stores</b> <span class="small">(every Target in ${esc(ST.name)}${m.n_in != null ? ` (${m.n_in})` : ""}${m.n_border ? ` plus ${m.n_border} within ~${esc(m.miles || 15)} mi over the state line` : ""}; card: address, hours, phone; from Target's store directory, checked ${esc(m.checked || "")})</span>${krow(ksv(G.tgt(18)), "Target store", `· icon from zoom ${FULL.tgt}`)}</div>`;
  }
  function kyxTargetLate() {
    if (!(K.targets || []).length) return;
    Object.entries({ AZ: "Arizona", CO: "Colorado", DE: "Delaware", ID: "Idaho", MT: "Montana", ND: "North Dakota", NE: "Nebraska", NM: "New Mexico", NV: "Nevada",
      OR: "Oregon", PA: "Pennsylvania", SD: "South Dakota", UT: "Utah", WA: "Washington", WY: "Wyoming", MD: "Maryland", NJ: "New Jersey", MI: "Michigan" }).forEach(([k, v]) => { if (!BST_NAME[k]) BST_NAME[k] = v; });
    const m = (K.meta && K.meta.target) || {};
    Object.assign(TITLE, { target: x => x.name + (x.city ? " — " + x.city + ", " + x.st : "") });
    Object.assign(LABEL, { target: "Target store" });
    const SVC = ["CVS pharmacy", "Starbucks Cafe", "Drive Up", "Order Pickup", "Target Optical", "Wine, Beer & Spirits Available", "Fresh Grocery", "Ulta Beauty at Target", "Apple Experience", "Disney store at Target", "Baby Boutique", "Target Mobile", "Target Beauty Studio"];
    R.target = x => {
      const a2 = [x.city, [x.st, x.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      const hrs = (x.hrs || []).map(h => row(h[0], esc(h[1]))).join("");
      const caps = (x.caps || []).filter(c => SVC.includes(c)).sort((a, b) => SVC.indexOf(a) - SVC.indexOf(b));
      const tel = x.ph ? `<a href="tel:${esc(String(x.ph).replace(/[^0-9+]/g, ""))}">${esc(x.ph)}</a>` : null;
      return `<div class="kicker">🎯 Target store${x.bst ? "" : " · " + esc(ST.name)}</div><h2>${esc(x.name)}</h2>
      <div class="sub">${esc(x.addr || "")}${x.addr ? ", " : ""}${esc(a2)}</div>
      <table class="kv">${row("Address", esc([x.addr, a2].filter(Boolean).join(", ")))}${row("Phone", tel)}${!x.bst && x.cty ? row("County", esc(/County|Parish|Borough/.test(x.cty) ? x.cty : x.cty + " County")) : ""}${row("Store number", esc(x.id))}</table>
      <div class="kicker">Store hours</div>${hrs ? `<table class="kv">${hrs}</table>` : '<div class="small">— not listed; check target.com.</div>'}
      <div class="small">Regular hours as listed on target.com${m.checked ? " (checked " + esc(m.checked) + ")" : ""}; holiday hours differ.</div>
      ${caps.length ? `<div class="kicker">In this store</div><div class="badges">${caps.map(c => `<span class="badge">${esc(c.replace(/ Available$/, ""))}</span>`).join("")}</div>` : ""}
      <table class="kv">${row("Website", x.url ? ext(x.url, "target.com store page ↗") : null)}</table>`;
    };
  }
  function kyxMtn(LAYERS) {
    const SK = K.ski || [], PK = K.peaks || [];
    IDX.ski = {}; IDX.peak = {}; SK.forEach(x => IDX.ski[x.id] = x); PK.forEach(x => IDX.peak[x.id] = x);
    if (!SK.length && !PK.length) return;
    const L_ski = PL_("ski"), L_peak = PL_("peak"), nf = v => v == null ? "" : Math.round(v).toLocaleString();
    SK.forEach(x => L_ski.addLayer(ent("ski", x, () => icOnce("ski", () => sicon("ski", G.skier(22), 22, 22)), { z: 900, zh: 1500,
      tip: () => `⛷ ${esc(x.name)}${x.st && x.st !== ST.ab ? " (" + esc(x.st) + ")" : ""}${x.trails ? " · " + x.trails + " trails" : ""}${x.vert ? " · " + nf(x.vert) + " ft vertical" : ""}` })));
    PK.forEach(x => L_peak.addLayer(ent("peak", x, () => icOnce("peak", () => sicon("peak", G.peak(22), 22, 22)), { z: x.tier === 1 ? 800 : 300, zh: x.tier === 1 ? 1400 : 0,
      tip: () => `⛰ ${esc(x.name)}${x.elev ? " · " + nf(x.elev) + " ft" : ""}${x.hp ? " · " + esc(ST.name) + "'s highest point" : ""}` })));
    const i = LAYERS.findIndex(d => d.key === "act"), rows = [];
    if (SK.length) rows.push({ key: "ski", ic: G.skier(16), label: "Ski areas (trails, lifts, ticket prices)", layer: L_ski, on: true, n: SK.length });
    if (PK.length) rows.push({ key: "peak", ic: G.peak(16), label: "Mountain peaks (elevation, hikes, climate)", layer: L_peak, on: true, n: PK.length });
    LAYERS.splice(i < 0 ? LAYERS.length : i + 1, 0, ...rows);
    if (MORE_LAYER_FOR) { MORE_LAYER_FOR.ski = () => "ski"; MORE_LAYER_FOR.peak = () => "peak"; }
    // offline: fetch the card details once the map is idle (cached by sw.js like any data file)
    if (K.mtnd) window.addEventListener("load", () => setTimeout(() => { try { (window.requestIdleCallback || (f => f()))(() => loadShard("_mtn")); } catch (e) { } }, 6000), { once: true });
  }
  function kyxMtnPinKey(PIN_KEY) {
    if ((K.ski || []).length) PIN_KEY.ski = () => `<div class="ksec"><b>⛷ Ski areas</b> <span class="small">(every alpine ski area in ${esc(ST.name)} plus ones just over the border worth the drive; card: trails, lifts, vertical, snowfall, season, ticket &amp; pass prices with season and source, discounts, special days)</span>${krow(ksv(G.skier(20)), "Ski area", `· icon from zoom ${FULL.ski}`)}${ST.ab === "KY" ? `<div class="small">Kentucky has no operating ski area (Ski Butler closed in the late 1990s); the nearest are in Indiana, Ohio, West Virginia and Tennessee.</div>` : ""}</div>`;
    if ((K.peaks || []).length) PIN_KEY.peak = () => `<div class="ksec"><b>⛰ Mountain peaks</b> <span class="small">(state high point, well-known peaks and popular hiking summits; card: elevation, prominence, activities, estimated summit weather)</span>${krow(ksv(G.peak(20)), "Notable peak", `· best-known from zoom ${FULLE.peak({ it: { tier: 1 } })}, the rest from ${FULL.peak}`)}</div>`;
  }
  function kyxMtnLate() {
    if (!(K.ski || []).length && !(K.peaks || []).length) return;
    Object.assign(THUMB_TITLE, { ski: x => x.name, peak: x => x.name });
    Object.assign(TITLE, { ski: x => x.name + " — ski area", peak: x => x.name + " — mountain peak" });
    Object.assign(LABEL, { ski: "Ski area", peak: "Mountain peak" });
    const nf = v => v == null ? "—" : Math.round(v).toLocaleString(), usd = v => v == null ? "—" : "$" + (Math.round(v * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
    const wikiUrl = t => "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(t).replace(/ /g, "_"));
    const away = x => x.st && x.st !== ST.ab;
    const ul = xs => `<ul class="mtnl">${xs.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`;
    const srcs = xs => (xs || []).length ? `<details class="mtnsrc"><summary>Sources (${xs.length})</summary>${xs.map(u => `<div>${ext(u, host(u) + " ↗")}</div>`).join("")}</details>` : "";
    R.ski = x => {
      const sp = x.split, sn = x.split_n, km = x.km_split;
      const split = sp ? `Beginner ${sp.beg != null ? sp.beg + "%" : "—"} · Intermediate ${sp.int != null ? sp.int + "%" : "—"} · Advanced ${sp.adv != null ? sp.adv + "%" : "—"} <span class="small">(share of trails, Wikipedia)</span>`
        : sn ? `Beginner ${sn.beg != null ? sn.beg : "—"} · Intermediate ${sn.int != null ? sn.int : "—"} · Advanced ${sn.adv != null ? sn.adv : "—"} <span class="small">(trails, Wikipedia)</span>` : "—";
      const kms = km && km.some(v => v != null) ? `Easy ${fmt1(km[0])} km · Intermediate ${fmt1(km[1])} km · Difficult ${fmt1(km[2])} km <span class="small">(${fmt1(x.km)} km of slopes, skiresort.com)</span>` : null;
      const tix = x.tix || [], tk = l => tix.find(t => t[0] === l);
      const trow = (lab, t) => `<tr><td>${esc(lab)}</td><td><b>${t ? usd(t[1]) : "—"}</b>${t ? `<div class="small">${esc(t[2])}</div>` : ""}</td></tr>`;
      const snow = x.snow != null ? `${nf(x.snow)} in <span class="small">(average per season, Wikipedia)</span>` : x.snow_stn ? `— at the mountain · ${nf(x.snow_stn.inches)} in at ${esc(x.snow_stn.stn)} (${nf(x.snow_stn.stn_ft)} ft, ${x.snow_stn.mi} mi away; NOAA 1991–2020). The slopes usually get more.` : "—";
      const plan = x.plan ? x.plan.replace(/^(\d{4}-\d\d-\d\d)\s*-\s*(\d{4}-\d\d-\d\d)$/, "$1 → $2") : null;
      return `${thumb("ski", x)}<div class="kicker">⛷ Ski area${away(x) ? " · just over the border in " + esc(x.st) : " · " + esc(ST.name)}</div><h2>${esc(x.name)}</h2>
      <div class="sub">${x.town ? "Near " + esc(x.town) + (x.town_mi ? ` (${x.town_mi} mi)` : "") : ""}</div>${x.note ? `<div class="note">ℹ️ ${esc(x.note)}</div>` : ""}
      <div class="stats">${stat(x.trails != null ? x.trails : "—", "runs / trails")}${stat(x.lifts != null ? x.lifts : "—", "lifts")}${stat(x.vert != null ? nf(x.vert) + " ft" : "—", "vertical drop")}${stat(x.top != null ? nf(x.top) + " ft" : "—", "summit")}${stat(x.snow != null ? nf(x.snow) + " in" : "—", "avg snowfall")}</div>
      ${(x.multi || []).length ? `<div class="badges">${x.multi.map(m => `<span class="badge gold">${esc(m[0])} Pass</span>`).join("")}</div>` : ""}
      <table class="kv">${row("Trail split", split)}${kms ? row("By slope length", kms) : ""}${row("Lifts", x.lifts != null ? x.lifts + ' <span class="small">(skiresort.com)</span>' : "—")}
      ${row("Vertical / summit / base", `${nf(x.vert)} ft / ${nf(x.top)} ft / ${nf(x.base)} ft`)}${row("Average snowfall", snow)}
      ${row("Typical season", x.season ? esc(x.season) + ' <span class="small">(skiresort.com)</span>' : "—")}${plan ? row("2026–27 plan", esc(plan) + ' <span class="small">(planned dates, skiresort.com)</span>') : ""}</table>
      <div class="kicker">Lift tickets (adult, 1 day)</div><table class="kv">${trow("Weekday", tk("Weekday"))}${trow("Weekend", tk("Weekend"))}${tk("Day (main season)") ? trow("Day, main season", tk("Day (main season)")) : ""}</table>
      <div class="kicker">Season pass</div><table class="kv">${row("This mountain", x.pass ? `<b>${usd(x.pass[0])}</b><div class="small">${esc(x.pass[1])}</div>` : "—")}
      ${row("Multi-resort", (x.multi || []).length ? x.multi.map(m => `<div><b>${esc(m[0])}</b> · <span class="small">${esc(m[1])}</span></div>`).join("") : "— (not on Epic, Ikon or Indy)")}</table>
      <div class="kicker">Discounts</div>${(x.disc || []).length ? ul(x.disc) : '<div class="small">— none found in our sources; check the website.</div>'}
      <div class="small">Nurses / healthcare: ${(x.multi || []).some(m => m[0] === "Ikon") ? "the Ikon Pass sells a discounted nurse pass." : (x.disc || []).some(d => /nurs|healthcare|health care|first responder/i.test(d)) ? "see above." : "— no nurse discount found; ask the ticket office."} Early-bird season passes and multi-day tickets are usually cheaper per day when bought online ahead.</div>
      <div class="kicker">Special days &amp; events</div>${(x.special || []).length ? ul(x.special) : '<div class="small">—</div>'}
      <table class="kv">${row("Website", x.web ? ext(x.web, (host(x.web) || "Website") + " ↗") : null)}${row("Wikipedia", x.wp ? ext(wikiUrl(x.wp), x.wp + " ↗") : null)}</table>
      ${srcs(x.src)}<div class="small">Prices are as published by each source (season and source on every price; checked ${esc((K.mtnd || {}).checked || "Oct 2026")}); '—' = not found. Prices change, so confirm on the resort's site before you go.</div>`;
    };
    R.peak = x => {
      const c = x.clim || {}, t = c.temp, sn = c.snow;
      const deg = v => v == null ? "—" : Math.round(v) + "°F";
      const tmp = t ? `<table class="kv">${row("Summer (July)", `${deg(t.jul_hi)} high / ${deg(t.jul_lo)} low`)}${row("Winter (January)", `${deg(t.jan_hi)} high / ${deg(t.jan_lo)} low`)}
        ${t.sum != null ? row("Summer average (Jun–Aug)", deg(t.sum)) : ""}${t.win != null ? row("Winter average (Dec–Feb)", deg(t.win)) : ""}</table>
        <div class="small">Estimate for the summit: ${esc(t.stn)} weather station (${nf(t.stn_ft)} ft, ${t.mi} mi away, NOAA 1991–2020 normals) adjusted by 3.5 °F per 1,000 ft of height difference. Wind makes summits feel colder.</div>` : '<div class="small">— no weather station close enough for an estimate.</div>';
      return `${thumb("peak", x)}<div class="kicker">⛰ Mountain peak${x.hp ? " · " + esc(ST.name) + "'s highest point" : away(x) ? " · just over the border in " + esc(x.st) : ""}</div><h2>${esc(x.name)}</h2>
      <div class="sub">${x.town ? "Nearest town: " + esc(x.town) + (x.town_mi != null ? ` (${x.town_mi} mi)` : "") : ""}</div>
      <div class="stats">${stat(x.elev != null ? nf(x.elev) + " ft" : "—", "elevation")}${stat(x.prom != null ? nf(x.prom) + " ft" : "—", "prominence")}${stat(sn ? nf(sn.inches) + " in" : "—", "snowfall nearby")}${stat(t ? deg(t.jul_hi) : "—", "July high (est.)")}${stat(t ? deg(t.jan_hi) : "—", "Jan high (est.)")}</div>
      <div class="kicker">Activities</div>${(x.act || []).length ? `<div class="badges">${x.act.map(a => `<span class="badge">${esc(a)}</span>`).join("")}</div>` : '<div class="small">—</div>'}
      <div class="kicker">Weather at the top (estimate)</div>${tmp}
      <table class="kv">${row("Average snowfall", sn ? `${nf(sn.inches)} in at ${esc(sn.stn)} (${nf(sn.stn_ft)} ft, ${sn.mi} mi away; NOAA 1991–2020). The summit usually gets more.` : "—")}
      ${row("Prominence", x.prom != null ? nf(x.prom) + " ft <span class=\"small\">(how far it rises above the saddle to any higher peak)</span>" : "—")}
      ${row("Wikipedia", x.wp ? ext(wikiUrl(x.wp), x.wp + " ↗") : null)}${row("Map data", x.osm ? ext(`https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lon}#map=14/${x.lat}/${x.lon}`, "OpenStreetMap ↗") : x.qid ? ext("https://www.wikidata.org/wiki/" + x.qid, "Wikidata ↗") : null)}</table>
      <div class="small">Elevation and prominence from Wikipedia / Wikidata / OpenStreetMap; activities from the Wikipedia article (fire towers, trails, roads, cliffs). '—' = not found.</div>`;
    };
    if (keyReady) renderKey();
  }
  // ================================================================ /more layers
  kyxMoreLate();
  kyxBorderLate(); kyxMtnLate(); kyxTargetLate();
  // ------------------------------------------------------------------ top-10 bubbles (#deals, #top-buildings, #top-businesses)
  // Three bubbles anchored just south of Kentucky (Tennessee) + a fixed "Top 10s" button; lists come from build.py (scripts/top_lists.py).
  const TOPD = K.tops || {};
  const TOPS = [
    { k: "deals", hash: "deals", type: "property", src: "properties", ll: [35.95, -85.5], icon: G.starDot("#8e24aa"), cls: "tb-deals", row: 1, col: 2, bub: "Deals of the Week",
      label: n => `⭐ Deals of the Week (${n})`, title: "⭐ Deals of the Week", h2: n => `The ${n} best home values right now`,
      sub: "Every home listing (5-acre, 1-acre and near-hospital, ⭐ bargains and others) ranked by price per sq ft (per acre for 5-acre land) vs nearby Zillow listings, criteria fit and extras" },
    { k: "buildings", hash: "top-buildings", type: "building", src: "buildings", ll: [35.95, -87.98], icon: G.starDot("#2e7d32"), cls: "tb-bldg", row: 1, col: 1, bub: "Odd Buildings",
      label: n => `Top ${n} Odd Buildings`, title: "Top 10 Odd Buildings", h2: n => `Top ${n} odd buildings for sale`,
      sub: "Ranked by how interesting or historic it is, price per sq ft vs the other odd buildings listed, and condition" },
    { k: "businesses", hash: "top-businesses", type: "business", src: "businesses", ll: [35.95, -83.02], icon: `<span class="mk biz" style="width:22px;height:22px">$</span>`, cls: "tb-biz", row: 1, col: 3, bub: "Businesses for Sale",
      label: n => `Top ${n} Businesses for Sale`, title: "Top 10 Businesses for Sale", h2: n => `Top ${n} businesses for sale`,
      sub: "Ranked by value (asking price vs stated revenue or cash flow), whether the real estate is included, and appeal (Red River Gorge cabins, RV parks, lake lodging…)" },
    { k: "er_jobs", hash: "top-er-jobs", type: "travel", job: true, ll: [35.0, -86.74], icon: G.nurseCap("ER", "#fff", "#c62828", "#fff"), cls: "tb-job tb-er", row: 2, col: 1, bub: "ER Travel Jobs",
      label: n => `Top ${n} ER Travel Jobs`, title: "Top 10 ER Travel Jobs", h2: n => `Top ${n} ER travel nurse jobs by weekly pay`,
      sub: "Emergency Department / ER / ED / Trauma ER travel RN jobs (no peds ED), highest posted weekly pay first (high end of any range)" },
    { k: "other_jobs", hash: "top-other-jobs", type: "travel", job: true, ll: [35.0, -84.26], icon: G.nurseCap("RN", "#fff", "#c62828", "#fff"), cls: "tb-job tb-oj", row: 2, col: 2, bub: "Non-ER Travel Jobs",
      label: n => `Top ${n} Non-ER Travel Jobs`, title: "Top 10 Non-ER Travel Jobs", h2: n => `Top ${n} non-ER travel nurse jobs by weekly pay`,
      sub: "Every other specialty (ICU, PCU, tele, PACU…; no OR, cardiac cath lab, mom-baby, women's or peds), highest posted weekly pay first (high end of any range)" },
    // permanent RN jobs (perm.js ranks them live from data/pjm.js + data/pjd.js under the active filters)
    { k: "bonus", hash: "top-bonus", type: "perm", perm: "bonus", icon: G.nurseCap("$", "#fff", "#1565c0", "#fff"), cls: "tb-pj tb-bon", row: 2, col: 3, bub: "Sign-on Bonuses",
      label: () => "Top Sign-on Bonuses", title: "Top Sign-on Bonuses", h2: n => `Top ${n} sign-on bonuses (permanent RN jobs)`,
      sub: "Every specialty that passes the filters (ER, ICU, step-down, med-surg…), ranked by the stated sign-on bonus" },
    { k: "perm_er", hash: "top-perm-er", type: "perm", perm: "er", icon: G.nurseCap("ER", "#fff", "#1565c0", "#fff"), cls: "tb-pj tb-per", row: 3, col: 1, bub: "Perm ER",
      label: () => "Top 10 Perm ER Jobs", title: "Top 10 Perm ER Jobs", h2: n => `Top ${n} permanent ER RN jobs by listed pay`,
      sub: "Permanent staff ER / emergency RN jobs (no peds ED), highest listed hourly pay first (top of the range)" },
    { k: "perm_sdms", hash: "top-perm-sdms", type: "perm", perm: "sdms", icon: G.nurseCap("PCU", "#fff", "#1565c0", "#fff"), cls: "tb-pj tb-psd", row: 3, col: 2, bub: "Perm Step-down + Med-surg",
      label: () => "Top 10 Perm Step-down + Med-surg", title: "Top 10 Perm Step-down + Med-surg", h2: n => `Top ${n} permanent step-down + med-surg RN jobs by listed pay`,
      sub: "Permanent staff step-down / PCU / IMC / telemetry and med-surg RN jobs, highest listed hourly pay first (top of the range)" },
    { k: "perm_icu", hash: "top-perm-icu", type: "perm", perm: "icu", icon: G.nurseCap("ICU", "#fff", "#1565c0", "#fff"), cls: "tb-pj tb-picu", row: 3, col: 3, bub: "Perm ICU (general)",
      label: () => "Top 10 Perm ICU (general)", title: "Top 10 Perm ICU (general)", h2: n => `Top ${n} permanent general ICU RN jobs by listed pay`,
      sub: "Permanent staff general ICU / critical care RN jobs (CVICU, neuro ICU and other specialty ICUs are their own filter row), highest listed hourly pay first" },
  ].filter(t => t.perm ? !!(K.meta && K.meta.pj) : (TOPD[t.k] || []).length);
  const TOPK = {}; TOPS.forEach(t => TOPK[t.k] = t);
  const TOPH = {}; TOPS.forEach(t => TOPH[t.hash] = t);
  const topRows1 = t => PROF && PROF.tops ? PROF.tops(t, topRows0(t)) : topRows0(t);
  const topRows = t => ANNA_ON && t.type === "property" ? topRows1(t).filter(([, x]) => !isNH(x)) : topRows1(t);  // Anna: no near-hospital homes
  function topVis(t) { return ANNA_ON ? !!t.anna : !t.anna; }  // Anna on: exactly its own 7 Top 10 lists (no nurse-job or other lists); off: no Anna lists
  const topN = t => t.perm ? 10 : t.ext ? t.cnt() : (TOPD[t.k] || []).length;
  const topRows0 = t => (TOPD[t.k] || []).map(r => [r, IDX[t.type] && IDX[t.type][r.hid || r.id]]).filter(x => x[1] && (!t.job || x[1].jobs.some(j => j.id === x[0].id)));
  const acres = a => (+a).toLocaleString(undefined, { maximumFractionDigits: 2 }) + " ac";
  function topRow(t, r, x) {
    if (t.job) {
      const j = x.jobs.find(j => j.id === r.id), from = "top|" + t.k;
      return `<div class="trow">${gRow("travel", x.id, from, gImg(x.th && x.th.u, "💼"), `<b class="gpay">#${r.rank} ${tjPay(j)}/wk</b> · ${esc(j.u || j.sp || "RN")}`,
        `<b>${esc(shortHosp(x.name))}</b>${x.city ? " · " + esc(x.city) : ""}`, dot([j.sh && esc(j.sh), j.ag && esc(j.ag)]), true)}${j.url ? `<a class="tapply" href="${esc(j.url)}" target="_blank" rel="noopener" aria-label="Apply for this job (opens ${esc(host(j.url))})">Apply ↗</a>` : ""}</div>`;
    }
    const from = "top|" + t.k, img = gImg(x.rt || (x.th && x.th.u) || (x.photos || [])[0], t.k === "deals" ? "🏠" : t.k === "buildings" ? "⛪" : "$");
    const size = [x.sqft && sqft(x.sqft) + " sq ft", x.acres != null && x.acres !== "" && acres(x.acres)].filter(Boolean).join(" · ");
    const facts = t.k === "deals" ? dot([`<b>#${r.rank} ${money(x.price)}</b>`, x.beds != null && `${esc(x.beds)} bd / ${esc(x.bath_detail ? x.bath_detail.replace(/ full/, "") : x.baths)} ba`, size])
      : dot([`<b>#${r.rank} ${x.price != null ? money(x.price) : "Price n/a"}</b>`, size || null]);
    const l3 = dot([x.town && esc(x.town), t.k === "deals" ? (r.bargain ? `<span class="gstar"><span class="bstar">${G.starDot("#8e24aa")}</span> Bargain</span>` : null) : esc(x.title)]);
    return gRow(t.type, x.id, from, img, facts, esc(r.why), l3, true);
  }
  function topHtml(t) {
    const navP = `<nav class="gjump tnav" aria-label="Other top lists">${TOPS.filter(topVis).map(o => `<a class="tchip${o.k === t.k ? " on" : ""}" href="#${o.hash}">${esc(o.title.replace(/^⭐ /, "⭐ "))}</a>`).join("")}</nav>`;
    if (t.ext) return ANNAX.topHtml(t, navP);
    if (t.perm) return PJX.topHtml(t, navP);
    const rows = topRows(t), n = rows.length;
    const nav = TOPS.filter(topVis).length > 1 ? `<nav class="gjump tnav" aria-label="Other top lists">${TOPS.filter(topVis).map(o => `<a class="tchip${o.k === t.k ? " on" : ""}" href="#${o.hash}">${esc(o.title.replace(/^⭐ /, "⭐ "))}</a>`).join("")}</nav>` : "";
    return `<div class="gbar"><button type="button" class="gback" id="gBack" aria-label="Back to the map">‹ Map</button>
        <button type="button" class="gshare" id="gShare" aria-label="Share this list">${navigator.share ? "Share" : "Copy link"}</button></div>
      <div class="kicker">${esc(t.title)} · <span class="tupd">Updated ${esc(TOPD.updated || "")}</span></div><h2>${esc(t.h2(n))}</h2>
      <div class="sub">${esc(t.sub)} · tap a row to open it on the map</div>${PROF ? PROF.note(t.job ? "jobs" : "listings") : ""}${nav}
      <div class="glist tlist">${rows.map(([r, x]) => topRow(t, r, x)).join("") || '<div class="gempty">Nothing qualifies right now.</div>'}</div>
      <div class="actions"><button class="btn" id="shareBtn">${navigator.share ? "Share…" : "Share"}</button><button class="btn ghost" id="copyBtn">Copy link</button><button class="btn ghost" id="zoomBtn">Show all on map</button></div>
      <div class="small" style="word-break:break-all">Link: <a href="#${t.hash}">#${t.hash}</a></div>`;
  }
  const topShareUrl = t => location.protocol === "file:" || t.anna ? new URL("index.html" + (t.anna ? "?anna=1" : "") + "#" + t.hash, location.href).href : new URL("share/" + t.hash + ".html", location.href).href;
  async function shareTop(t) {
    const url = fullUrl(topShareUrl(t));
    if (navigator.share) { try { await navigator.share({ title: t.title + " — " + ST.app, text: t.title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    copy(url);
  }
  function openTop(key, opts = {}) {
    const t = TOPK[key]; if (!t) { toast("List not found"); return false; }
    if (t.perm && !(PJX && PJX.hasD())) {
      const tok = { type: "top", id: key, loading: true }; cardLoading(tok, "#" + t.hash, opts, snap()); card.classList.add("tall"); tmenu.hidden = true;
      loadPermD().then(() => { if (current === tok) openTop(key, Object.assign({}, opts, { replace: true })); }); return true;
    }
    const sv = snap(); current = { type: "top", id: key };
    const tf = topFoc(t); if ((tf && tf.k) !== (TOPF && TOPF.k)) { TOPF = tf; sched(true); }  // kyxFoc: its pins on top
    if (hl) { map.removeLayer(hl); hl = null; }
    body.innerHTML = topHtml(t);
    card.hidden = false; setPeek(false); card.classList.add("tall");
    card.scrollTop = takeScroll(gScroll && gScroll.key === "top|" + key ? gScroll.top : 0); gScroll = null;
    if (PNL) showPnl(null);
    $("#gBack").onclick = () => hasBack() ? history.back() : exitCard();
    $("#gShare").onclick = $("#shareBtn").onclick = () => shareTop(t);
    $("#copyBtn").onclick = () => copy(fullUrl(topShareUrl(t)));
    if (t.perm) PJX.wireTop(t);
    $("#zoomBtn").onclick = () => { const pts = t.ext ? ANNAX.topPts(t) : t.perm ? PJX.topPts(t) : topRows(t).map(([, x]) => [x.lat, x.lon]).filter(p => p[0] != null);
      if (pts.length) map.flyToBounds(pts, Object.assign({ duration: 0.8, padding: [30, 30] }, !PHONE ? { paddingBottomRight: [440, 30] } : { paddingBottomRight: [30, Math.round(VH * 0.55)] })); };
    nav(fh("#" + t.hash), opts.replace, sv);
    document.title = t.title.replace(/^⭐ /, "") + " — " + ST.app;
    tmenu.hidden = true;
    return true;
  }
  // Top 10 lists: a row of pills fixed to the bottom of the screen (a looping sideways carousel; see carousel() below)
  const PILL_T = { deals: "Deals", buildings: "Odd Bldgs", businesses: "Biz", er_jobs: "ER Travel", other_jobs: "Other Travel", bonus: "Bonuses", perm_er: "Perm ER", perm_sdms: "Perm SD/MS", perm_icu: "Perm ICU" };
  const PILL_O = ["deals", "buildings", "businesses", "er_jobs", "other_jobs", "bonus", "perm_er", "perm_sdms", "perm_icu"];
  const pillsEl = document.createElement("nav"); pillsEl.id = "topPills"; pillsEl.className = "tpills"; pillsEl.setAttribute("aria-label", "Top 10 lists");
  function buildPills() {  // rebuilt when the Anna profile switches (its own lists in, nurse-job lists out)
    const ord = TOPS.filter(topVis).sort((x, y) => PILL_O.indexOf(x.k) - PILL_O.indexOf(y.k));
    pillsEl.innerHTML = ord.map(t => `<a class="topbub tpill ${t.cls}" href="#${t.hash}" data-top="${t.k}" role="button" aria-label="${esc(t.label(topN(t)))}: open the list"><span class="tbi">${t.icon}</span><span class="tbt">${esc(PILL_T[t.k] || t.bub)}</span></a>`).join("");
    if (ord.length && !pillsEl.isConnected) { document.body.appendChild(pillsEl); document.documentElement.classList.add("haspills"); }
    if (pillC) requestAnimationFrame(() => pillC.measure()); else if (ord.length && pillsEl.isConnected && pillC === null) pillC = carousel(pillsEl, () => [...pillsEl.querySelectorAll(".tpill:not([data-clone])")], "x", (pos, V) => pos[0] + V / 2 - 60);
  }
  pillsEl.addEventListener("click", e => { const a = e.target.closest("[data-top]"); if (!a) return; e.preventDefault(); openTop(a.dataset.top); });
  if (TOPS.length) buildPills();
  // fixed fallback button (bottom right) -> small menu of the three lists
  const tbtn = document.createElement("button"), tmenu = document.createElement("div");
  tbtn.id = "topBtn"; tbtn.type = "button"; tbtn.className = "topbtn"; tbtn.innerHTML = "🏆 Top 10s"; tbtn.setAttribute("aria-expanded", "false"); tbtn.setAttribute("aria-controls", "topMenu");
  tmenu.id = "topMenu"; tmenu.className = "topmenu"; tmenu.hidden = true;
  function buildTMenu() { const x = tmenu.querySelector(".tmx"); tmenu.innerHTML = TOPS.filter(topVis).map(t => `<a href="#${t.hash}" data-top="${t.k}"><span class="tbi">${t.icon}</span>${esc(t.label(topN(t)).replace(/^⭐ /, ""))}</a>`).join("") + `<div class="small">Updated ${esc(TOPD.updated || "")}</div>`; if (x) tmenu.appendChild(x); }
  buildTMenu();
  if (TOPS.length) { document.body.appendChild(tbtn); document.body.appendChild(tmenu); }
  tbtn.onclick = () => { tmenu.hidden = !tmenu.hidden; tbtn.setAttribute("aria-expanded", !tmenu.hidden); };
  tmenu.insertAdjacentHTML("beforeend", `<div class="tmx"><a href="#favs"><span class="tbi">♥</span>Favorites</a><a href="#compare"><span class="tbi">⚖</span>Compare homes</a><a href="#new"><span class="tbi">🆕</span>New &amp; price cuts</a><a href="#near"><span class="tbi">📍</span>Near me</a><a href="#areas"><span class="tbi">🏙</span>${ST.areas}</a>${ST.other.live !== false ? ST.others.filter(o => o.live !== false).map(o => `<a href="${o.url}" class="stsw"><span class="tbi">🗺</span>Switch to the ${o.name} map</a>`).join("") : ""}</div>`);
  tmenu.addEventListener("click", e => { if (e.target.closest(".tmx a")) { tmenu.hidden = true; tbtn.setAttribute("aria-expanded", "false"); return; } const a = e.target.closest("[data-top]"); if (!a) return; e.preventDefault(); openTop(a.dataset.top); });
  document.addEventListener("click", e => { if (!tmenu.hidden && !e.target.closest("#topMenu,#topBtn")) { tmenu.hidden = true; tbtn.setAttribute("aria-expanded", "false"); } });
  // ------------------------------------------------------------------ phone extras: favorites, compare, badges, directions, near me
  // Small hooks only; the Favorites / Compare / New / Near-me pages live in extras.js (loaded on first use).
  const jget = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
  const FAVT = { property: 1, travel: 1, building: 1, business: 1 };
  const favGet = () => jget(ST.ls + "favs", []), favSet = a => jset(ST.ls + "favs", a);
  const favBtn = $("#cardFav");
  function updFav() {
    if (!favBtn) return; const c = current, on = !!(c && !c.loading && FAVT[c.type] && c.id !== "all" && !card.hidden); favBtn.hidden = !on; if (!on) return;
    const f = favGet().includes(c.type + ":" + c.id); favBtn.textContent = f ? "♥" : "♡"; favBtn.classList.toggle("on", f);
    favBtn.setAttribute("aria-pressed", f); favBtn.setAttribute("aria-label", f ? "Remove from favorites" : "Save to favorites"); favBtn.title = f ? "In your favorites" : "Save to favorites";
  }
  if (favBtn) favBtn.onclick = () => { const c = current; if (!c || !FAVT[c.type]) return; const k = c.type + ":" + c.id, a = favGet(), i = a.indexOf(k);
    if (i >= 0) a.splice(i, 1); else a.unshift(k); favSet(a); updFav();
    toast("", i >= 0 ? "Removed from Favorites" : `♥ Saved to Favorites · <a href="#favs">see all ${a.length}</a>`, 3000); };
  const cmpGet = () => jget(ST.ls + "cmp", []), cmpSet = a => jset(ST.ls + "cmp", a);
  const cmpLabel = id => cmpGet().includes(id) ? `✓ Comparing (${cmpGet().length})` : "⚖ Compare";
  function cmpToggle(id, btn) {
    let a = cmpGet(); const i = a.indexOf(id);
    if (i >= 0) a.splice(i, 1); else { a.push(id); if (a.length > 3) a = a.slice(-3); }
    cmpSet(a); if (btn) btn.textContent = cmpLabel(id);
    toast("", i >= 0 ? `Removed from Compare (${a.length})` : a.length >= 2 ? `⚖ ${a.length} homes picked · <a href="#compare">compare them</a>` : "⚖ Picked for Compare. Pick 1–2 more homes.", 3500);
  }
  function dirUrl(type, it) {
    if (it.lat != null && it.lon != null) return `https://www.google.com/maps/dir/?api=1&destination=${(+it.lat).toFixed(6)},${(+it.lon).toFixed(6)}`;
    if (type === "county") return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(it.name + ST.cus + ", " + ST.name)}`;
    return "";
  }
  // "New" / "↓ Price" since the last visit: a visit starts after 30+ minutes away; the snapshot of ids + prices from the last load of the
  // previous visit is the baseline for the whole visit. First visit ever: baseline only, no badges.
  const BADGE = {};
  (function () {
    const now = Date.now(), cur = {};
    (K.properties || []).forEach(p => cur["property:" + p.id] = p.price || 0);
    (K.businesses || []).forEach(x => cur["business:" + x.id] = x.price || 0);
    (K.buildings || []).forEach(x => cur["building:" + x.id] = x.price || 0);
    TJ_ALL.forEach(j => cur["job:" + j.id] = 0);
    const st = jget(ST.ls + "seen", null);
    const base = !st ? null : now - (st.t || 0) > 30 * 60e3 ? st.items : st.base;
    if (base) Object.keys(cur).forEach(k => { if (!(k in base)) BADGE[k] = { k: "new" }; else if (cur[k] && base[k] && cur[k] < base[k]) BADGE[k] = { k: "cut", was: base[k] }; });
    TJ_ALL.forEach(j => { if (BADGE["job:" + j.id]) BADGE["travel:" + j.h.id] = BADGE["travel:" + j.h.id] || { k: "new", jobs: 0 }, BADGE["travel:" + j.h.id].jobs = (BADGE["travel:" + j.h.id].jobs || 0) + 1; });
    jset(ST.ls + "seen", { t: now, items: cur, base: base || null });
  })();
  const bChip = (type, id) => { const b = BADGE[type + ":" + id]; return !b ? "" : b.k === "new" ? `<span class="nbdg new">New</span>` : `<span class="nbdg cut">↓ Price</span>`; };
  function badgeLine(type, id) {
    const b = BADGE[type + ":" + id]; if (!b) return "";
    return `<div class="nbline">${b.k === "cut" ? `<span class="nbdg cut">↓ Price cut</span> since your last visit (was ${money(b.was)})` : b.jobs ? `<span class="nbdg new">New</span> ${b.jobs} new job${b.jobs > 1 ? "s" : ""} since your last visit` : `<span class="nbdg new">New</span> since your last visit`} · <a href="#new">all new</a></div>`;
  }
  const nNew = () => Object.entries(BADGE).filter(([k, b]) => !k.startsWith("travel:") && b.k === "new").length, nCut = () => Object.values(BADGE).filter(b => b.k === "cut").length;
  // lazy page module
  const JSP = {};
  const loadJS = src => JSP[src] || (JSP[src] = new Promise(res => { const el = document.createElement("script"); el.src = src + (K.meta && K.meta.stamp ? "?v=" + K.meta.stamp : ""); el.async = true; el.onload = res; el.onerror = res; document.head.appendChild(el); }));
  // permanent RN jobs: perm.js + data/pjm.js after the first paint (hats, counts); data/pjd.js (job text) on the first hat / list / Top 10
  var PJX = null; let pjP = null, pjDP = null;
  function loadPerm() {
    if (!(K.meta && K.meta.pj)) return pjP || (pjP = new Promise(() => {}));  // no permanent-jobs data for this state yet: never resolves, no request, no error
    return pjP || (pjP = Promise.all([loadJS("perm.js"), loadJS("data/pjm.js")]).then(() => {
      if (!window.KYXPJ || !window.KYXPJM_D) return Promise.reject(new Error("perm data missing"));
      PJX = KYXPJ.init({ K, IDX, L, G, map, L_perm, LAYERS, ent, sched, link, gRow, dot, host, TJ_ALL, PROF: () => PROF, renderKey, keyReady: () => keyReady,
        refreshCard: () => { if (current && current.type !== "profile") refreshCard(); },
        reTop: k => openTop(k, { replace: true }) });
      const w = $("#pjFilter"); if (w) PJX.panel(w);
      return PJX;
    }));
  }
  const loadPermD = () => pjDP || (pjDP = loadPerm().then(() => window.KYXPJD_D ? 1 : loadJS("data/pjd.js")).then(() => { PJX.details(); return PJX; }));
  let extP = null;
  function loadExtras() {
    return extP || (extP = Promise.all([loadJS("extras.js"), window.KYXPF_D ? 0 : loadJS("data/pf.js")]).then(() => window.KYXE.init({ K, IDX, MARK, map, TJ_ALL, BADGE, PHONE,
      showPage, gRow, gImg, dot, money, esc, toast, copy, stat, link, favGet, favSet, cmpGet, cmpSet, isHome, isNH, isCab, isBig, isCF, isCFo, openItem, updFav, body, card, nav,
      current: () => current })));
  }
  // climate lines + Compare areas: areas.js + data/clim.json + data/areas.json, loaded on the first card open or #areas (never on the first load)
  let arP = null;
  const loadAreas = () => arP || (arP = loadJS("areas.js").then(() => window.KYXA ? KYXA.init({ K, IDX, esc, toast, showPage, nav, current: () => current, loadPerm }) : Promise.reject()));
  const arB = document.createElement("button"); arB.type = "button"; arB.id = "areasBtn"; arB.className = "gpsbtn areasbtn"; arB.innerHTML = '<span aria-hidden="true">🏙</span> Areas'; arB.setAttribute("aria-label", ST.areasAria);
  arB.onclick = () => { if (location.hash === "#areas") return; nav("#areas", false); route(true); };
  document.body.appendChild(arB);
  // Near me: a small button above Top 10s
  const gpsB = document.createElement("button"); gpsB.type = "button"; gpsB.id = "gpsBtn"; gpsB.className = "gpsbtn"; gpsB.innerHTML = '<span aria-hidden="true">📍</span> Near me'; gpsB.setAttribute("aria-label", "Show where I am and what is near me");
  gpsB.onclick = () => { if (location.hash === "#near" && window.KYXE) { KYXE.route("#near", { replace: true, again: true }); return; } nav("#near", false); route(true); };
  document.body.appendChild(gpsB);
  // installable app + offline (service worker; its cache version = the build stamp, so each publish replaces the old caches)
  window.addEventListener("load", () => setTimeout(() => {
    if (!("serviceWorker" in navigator) || !(location.protocol === "https:" || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) return;
    navigator.serviceWorker.register("sw.js?v=" + ((K.meta && K.meta.stamp) || "0")).catch(() => { });
  }, 2500), { once: true });
  window.addEventListener("load", () => setTimeout(() => { const n = nNew(), c = nCut(); if ((n || c) && !location.hash) toast("", `🆕 Since your last visit: ${n ? n + " new" : ""}${n && c ? " · " : ""}${c ? c + " price cut" + (c > 1 ? "s" : "") : ""} · <a href="#new">see them</a>`, 5000); }, 1200), { once: true });

  // ------------------------------------------------------------------ solo layer buttons (right-hand stack)
  // A button shows ONLY that kind of pin (trauma centers, airports and the 5 big cities always stay); tap it again or "All" for the
  // normal map. Not remembered across reloads. The active profile's own filters still apply on top (profiles.js calls reSolo()).
  var SOLO = null, SOLO_ON = null, soloF = null;
  const ALWAYS = new Set(["trauma", "apt", "city"]);
  const SOLOS = [
    { k: "jobs", ic: "💼", t: "Jobs", h: "Nursing jobs", keys: ["travel", "perm"] },
    { k: "hosp", ic: G.nurse(), t: "Hospitals", h: "all hospitals and trauma centers", keys: ["hosp", "trauma"], has: () => (K.hospitals || []).length > 0 },  // kyxHosp (Bill, Oct 8 2026): every hospital incl. border ones, existing icons; trauma on top
    { k: "p5", ic: "🌳", t: "5+ ac", h: "Primary homes (5+ acres)", keys: ["props"] },
    { k: "p1", ic: "🏠", t: "1+ ac", h: "Secondary homes (1+ acre)", keys: ["homes"] },
    { k: "nh", ic: "🏥", t: "Near", h: "Near-hospital homes", keys: ["nh"] },
    { k: "cave", ic: `<span class="cfic">${G.bat(24)}</span>`, t: "Cave", h: "properties with a cave on the property", keys: ["cvf"], f: e => hasCave(e.it), has: () => CFS.some(hasCave) },
    { k: "falls", ic: `<span class="cfic">${G.fall(19)}</span>`, t: "Falls", h: "properties with a waterfall on the property", keys: ["cvf"], f: e => hasFalls(e.it), has: () => CFS.some(hasFalls) },
    { k: "big", ic: `<span class="bkstar">${G.bigStar(18)}</span>`, t: "50+ ac", h: "50+ acre lots under $250k", keys: ["big"], has: () => BIGS.length > 0 },
    ...(ST.cabin ? [{ k: "cab", ic: G.cabin(18), t: ST.cabin.label || "Cabin", h: `${ST.cabin.label || "Cabin"}s (more than ${ST.cabin.acres || 25} acres)`, keys: ["cab"] }] : []),
    { k: "barg", ic: `<span class="bstar">${G.starDot("#8e24aa")}</span>`, t: "Bargain", h: "Bargains", keys: ["props", "homes", "nh", "cab"], f: e => !!e.it.bargain },
    { k: "biz", ic: "💲", t: "Biz", h: "Businesses for sale", keys: ["biz"] },
    { k: "bldg", ic: "🔔", t: "Odd", h: "Odd buildings for sale", keys: ["bldg"] },
    { k: "attr", ic: "🎡", t: "Sights", h: "Attractions", keys: () => [...(MORE_ATT_KEYS || []), "feat"] },
    { k: "sch", ic: "🎓", t: "School", h: "Schools & colleges", keys: ["sch", "col"] },
    { k: "ski", ic: G.skier(18), t: "Ski", h: "Ski areas", keys: ["ski"], has: () => (K.ski || []).length > 0 },
    { k: "peak", ic: G.peak(18), t: "Peaks", h: "Mountain peaks", keys: ["peak"], has: () => (K.peaks || []).length > 0 },
    { k: "tgt", ic: G.tgt(18), t: "Target", h: "Target stores", keys: ["tgt"], has: () => (K.targets || []).length > 0 },
  ].filter(x => x.has ? x.has() : !ST.solo || ST.solo.includes(x.k));  // a state still being built lists only the buttons that have pins  // a state still being built lists only the buttons that have pins
  const CATK = p => isNH(p) ? "nh" : isHome(p) ? "homes" : isCab(p) ? "cab" : isBig(p) ? "big" : isCFo(p) ? null : "props";
  SOLOS.forEach(sd => {  // e.g. "50+ ac" or "Bargain" also shows its listings whose pin is a bat / waterfall
    if (sd.k === "cave" || sd.k === "falls" || typeof sd.keys === "function") return;
    const pk = sd.keys.filter(k => ["props", "homes", "nh", "cab", "big"].includes(k)), f0 = sd.f; if (!pk.length) return;
    sd.keys = sd.keys.concat("cvf"); sd.f = e => e.cfl ? pk.includes(CATK(e.it)) && (!f0 || f0(e)) : (!f0 || f0(e));
  });
  function soloVis(x) { return ANNA_ON ? !(x.k === "jobs" || x.k === "nh" || x.k === "hosp") : !x.anna; }  // Anna on: no nurse-job / near-hospital buttons
  const pinLayer = d => d.layer && !d.group && d.key !== "cty" && d.key !== "sweet";
  const layerDef = d => d.disabled || annaBlk(d) ? false : (d.key in saved ? !!saved[d.key] : !!d.on);
  function reSolo() { if (!SOLO_ON) return; LAYERS.forEach(d => { if (!pinLayer(d)) return; const w = !d.disabled && (SOLO_ON.has(d.key) || ALWAYS.has(d.key)); if (map.hasLayer(d.layer) !== w) setLayer(d, w); }); }
  function setSolo(k) {
    const sd = k && SOLOS.find(x => x.k === k);
    if (!sd || SOLO === k) {  // "All", or the active button again: back to the normal map (the profile's layers if one is on)
      if (SOLO) { SOLO = null; SOLO_ON = null; soloF = null;
        if (window.KYXP && KYXP.relayer) KYXP.relayer(); else LAYERS.forEach(d => { if (pinLayer(d) && map.hasLayer(d.layer) !== layerDef(d)) setLayer(d, layerDef(d)); });
        if (FOCUS) focusLayers();
        sched(true); toast("All: the normal map"); }
      renderStack(); return;
    }
    SOLO = k; SOLO_ON = new Set(typeof sd.keys === "function" ? sd.keys() : sd.keys); soloF = sd.f || null;
    reSolo(); renderStack(); sched(true);
    toast(`Only ${sd.h} (+ ${ANNA_ON || SOLO_ON.has("trauma") ? "" : "trauma centers, "}airports, cities). Tap again or “All” for the normal map.`);
  }
  const lStack = document.createElement("div"); lStack.id = "layerStack"; lStack.className = "lstack"; lStack.setAttribute("role", "toolbar"); lStack.setAttribute("aria-label", "Show only one kind of pin");
  let renderStack = function () {
    lStack.innerHTML = SOLOS.filter(soloVis).map(x => `<button type="button" class="lsb${SOLO === x.k ? " on" : ""}" data-solo="${x.k}" aria-pressed="${SOLO === x.k}" title="Show only: ${esc(x.h)}" aria-label="Show only ${esc(x.h)}"><span class="lsi">${x.ic}</span><span class="lst">${esc(x.t)}</span></button>`).join("")
      + `<button type="button" class="lsb lsall${SOLO ? "" : " on"}" data-solo="" aria-pressed="${!SOLO}" title="Show all (the normal map)" aria-label="Show all"><span class="lsi">◎</span><span class="lst">All</span></button>`;
  };
  lStack.addEventListener("click", e => { const b = e.target.closest("[data-solo]"); if (b) setSolo(b.dataset.solo); });
  // county focus: chip at the bottom ("‹ County" reopens its card = Back; ✕ = leave the focus), all layers on unless a solo button or a profile decides
  const fChip = document.createElement("div"); fChip.id = "focusChip"; fChip.className = "fchip"; fChip.hidden = true;
  fChip.innerHTML = '<button type="button" id="fcBack" aria-label="Back to the county card">‹ <span></span></button><button type="button" id="fcX" aria-label="Leave the county view" title="Leave the county view">✕</button>';
  document.body.appendChild(fChip);
  fChip.querySelector("#fcBack").onclick = () => { const st = history.state || {}, nm = FOCUS && FOCUS.name; if (!nm) return;
    if (/^#cmap=/.test(location.hash) && st.d > 0 && st.fz === nm) history.back(); else openItem("county", nm, { fly: false }); };
  fChip.querySelector("#fcX").onclick = () => clearFocus();
  const profOn = () => !!(window.KYXP && KYXP.active && KYXP.active());
  function focusLayers() { if (SOLO || profOn()) return; LAYERS.forEach(d => { if (pinLayer(d) && !d.disabled && !map.hasLayer(d.layer)) setLayer(d, true); }); }
  function restoreLayers() { if (SOLO) reSolo(); else if (window.KYXP && KYXP.relayer) KYXP.relayer(); else LAYERS.forEach(d => { if (pinLayer(d) && map.hasLayer(d.layer) !== layerDef(d)) setLayer(d, layerDef(d)); }); }
  function setFocus(name, fit) {
    const c = IDX.county[name]; if (!c || !c.rings) return;
    const same = FOCUS && FOCUS.name === name;
    FOCUS = { name, c, z: same && !fit ? FOCUS.z : null };
    if (!same) focusLayers();
    if (card.hidden) highlight("county", c);
    fChip.querySelector("span").textContent = name + ST.cus; fChip.hidden = false;
    sched(true);
    if (fit) FOCUS.z = fitCounty(c);  // the target zoom (a zoom/pan during the fly must not reset it)
    else if (FOCUS.z == null) setTimeout(() => { if (FOCUS && FOCUS.name === name && FOCUS.z == null) FOCUS.z = map.getZoom(); }, 0);
  }
  function clearFocus(silent) {
    if (!FOCUS) return; FOCUS = null; fChip.hidden = true;
    if (hl && card.hidden) { map.removeLayer(hl); hl = null; }
    restoreLayers(); sched(true);
    if (!silent) { const st = history.state || {}; if (st.fz || /^#cmap=/.test(location.hash)) history.replaceState(Object.assign({}, st, { fz: null }), "", /^#cmap=/.test(location.hash) ? location.pathname + location.search : location.href); }
  }
  function focusClose(name) {  // X / swipe-down on a county card: stay on the county, card gone, refit to the whole screen
    const sv = snap(); closeCard(false);
    nav("#cmap=" + encodeURIComponent(name), false, sv, { fz: name });
    setFocus(name, true); document.title = name + ST.cus + " map — " + ST.app;
  }
  map.on("zoomend", () => { if (FOCUS && !POPPING && FOCUS.z != null && map.getZoom() < FOCUS.z - 1.5) clearFocus(); });  // zoomed out well past the county
  renderStack(); document.body.appendChild(lStack);
  lStack.addEventListener("wheel", e => { if (lStack.classList.contains("wheel")) return; e.preventDefault(); e.stopPropagation();  // kyxUI3
    lStack.scrollTop += e.deltaY * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? lStack.clientHeight : 1); }, { passive: false });
  const fitStack = () => {  // the column stops above Areas / Near me / Top 10s and scrolls (wheel, finger) when it does not fit
    if (lStack.classList.contains("wheel")) { lStack.style.maxHeight = ""; return; }
    const a = arB.isConnected && getComputedStyle(arB).display !== "none" ? arB.getBoundingClientRect().top : innerHeight - 70, t = lStack.getBoundingClientRect().top;
    lStack.style.maxHeight = Math.max(110, Math.floor(a - t - 10)) + "px"; };
  window.addEventListener("resize", () => setTimeout(fitStack, 200)); requestAnimationFrame(fitStack); setTimeout(fitStack, 1500);

  // ------------------------------------------------------------------ looping carousels (bottom Top 10 pills; landscape-phone right-hand wheel)
  // Items sit absolutely inside a clipped viewport and are placed with transforms around a continuous offset that wraps (infinite loop).
  // Drag/swipe with momentum, snap to the nearest item, centred item a little larger, a tap (< 7 px of movement) is a normal click.
  function carousel(vp, getItems, axis, o0) {
    const X = axis === "x", GAP = X ? 8 : 5, M3 = 6;
    let it = [], pos = [], sz = [], P = 0, V = 0, o = 0, loop = false, raf = 0, dn = null, moved = false, eat = false, on = true, tapT = -1e9;
    const wrap = d => { d %= P; if (d > P / 2) d -= P; else if (d < -P / 2) d += P; return d; };
    let W3 = 0;  // kyxUI3: sideways pills are sized so exactly 3 whole pills fit; snapping moves 1 pill (or 3)
    let ready = false;  // kyxUI4: never measure while hidden (e.g. the pill row is display:none while a card is open) — that squashed every pill to 60 px at x≈0
    function measure() {
      if (!on) return;
      if (!vp.clientWidth || !vp.clientHeight || !vp.getClientRects().length) return;  // hidden: the ResizeObserver / card-close hook re-measures when it shows again
      const idx0 = ready && X && loop && W3 && pos.length ? snapIdx(o) : null;  // keep the same first pill across re-layouts
      vp.querySelectorAll("[data-clone]").forEach(e => e.remove());
      let base = getItems(); it = base;
      if (X) {  // kyxUI4: pills size to their content (the longest title fits, never truncated) and the row widens to hold exactly 3 whole pills
        base.forEach(e => { e.style.width = ""; e.style.transform = "none"; e.classList.remove("w3", "cc"); });
        const NW = Math.ceil(Math.max(60, ...base.map(e => e.getBoundingClientRect().width))) + 2, A = document.documentElement.clientWidth || innerWidth;
        W3 = Math.max(NW, Math.floor((Math.min(A, 660) - 2 * M3 - 2 * GAP) / 3));
        if (3 * W3 + 2 * GAP + 2 * M3 > A) W3 = Math.floor((A - 2 * M3 - 2 * GAP) / 3);  // narrower than 3 longest titles: fit the screen (CSS shrinks the text on phones)
        const vw = 3 * W3 + 2 * GAP + 2 * M3; if (vp.style.width !== vw + "px") vp.style.width = vw + "px";
        base.forEach(e => { e.style.width = W3 + "px"; e.classList.add("w3"); });
      }
      V = X ? vp.clientWidth : vp.clientHeight;
      const len = () => { pos = []; sz = []; let t = 0; it.forEach(e => { e.style.transform = ""; const r = e.getBoundingClientRect(), z = X ? r.width : r.height; sz.push(z); pos.push(t + z / 2); t += z + GAP; }); return t; };
      P = len(); const mx = Math.max(0, ...sz);
      if (X && P - GAP > V && P < V + mx) { /* clone only when the pills overflow the screen but are too few to loop; if they all fit, show them once, centered */ const cl = base.map(e => { const c = e.cloneNode(true); c.setAttribute("data-clone", ""); c.setAttribute("aria-hidden", "true"); c.tabIndex = -1; vp.appendChild(c); return c; }); it = base.concat(cl); P = len(); }
      loop = P > V + mx;
      if (!ready && o0) o = X && loop ? atIdx(1) : o0(pos, V);  // first visible layout: start position
      else if (!loop) o = 0; else if (X && W3) o = atIdx(idx0 != null ? idx0 : snapIdx(o));
      ready = true; draw();
    }
    function draw() {
      const c = V / 2;
      it.forEach((e, i) => {
        const d = loop ? wrap(pos[i] - o) : pos[i] - (P - GAP) / 2, k = 1 + (X ? 0.04 : 0.1) * Math.max(0, 1 - Math.abs(d) / (sz[i] + GAP));
        e.style.transform = (X ? `translate3d(${(c + d - sz[i] / 2).toFixed(1)}px,0,0)` : `translate3d(0,${(c + d - sz[i] / 2).toFixed(1)}px,0)`) + ` scale(${k.toFixed(3)})`;
        e.classList.toggle("cc", k > (X ? 1.02 : 1.05));
      });
    }
    const near = () => { let best = 0, bd = 1e9; pos.forEach((p, i) => { const d = wrap(p - o); if (Math.abs(d) < Math.abs(bd)) { bd = d; best = i; } }); return bd; };
    function goTo(T) {  // X: ease to an exact pill position (no momentum)
      cancelAnimationFrame(raf); let last = performance.now();
      const step = t => { const dt = Math.min(40, t - last); last = t; const d = T - o;
        if (Math.abs(d) < 0.5) { o = T; draw(); return; } o += d * Math.min(1, dt / 70); draw(); raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }
    const snapIdx = v => { const S = W3 + GAP; return Math.round((v - pos[0]) / S); };
    const atIdx = n => pos[0] + n * (W3 + GAP);
    function anim(v) {
      cancelAnimationFrame(raf); let last = performance.now();
      const step = t => { const dt = Math.min(40, t - last); last = t;
        if (Math.abs(v) > 0.04) { o += v * dt; v *= Math.pow(0.94, dt / 16); draw(); raf = requestAnimationFrame(step); return; }
        const d = near(); if (Math.abs(d) < 0.5) { o += d; draw(); return; }
        o += d * Math.min(1, dt / 90); draw(); raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }
    vp.addEventListener("pointerdown", e => { if (!on || !loop || (e.pointerType === "mouse" && e.button)) return; cancelAnimationFrame(raf);
      dn = { id: e.pointerId, p: X ? e.clientX : e.clientY, o, h: [[performance.now(), X ? e.clientX : e.clientY]] }; moved = false; e.stopPropagation(); });
    vp.addEventListener("pointermove", e => { if (!dn || e.pointerId !== dn.id) return; const p = X ? e.clientX : e.clientY;
      if (!moved && Math.abs(p - dn.p) > 6) { moved = true; try { vp.setPointerCapture(e.pointerId); } catch (_) { } }
      if (moved) { o = dn.o - (p - dn.p); draw(); dn.h.push([performance.now(), p]); if (dn.h.length > 6) dn.h.shift(); e.preventDefault(); } e.stopPropagation(); });
    const up = e => { if (!dn || e.pointerId !== dn.id) return; const h = dn.h, wasMoved = moved, dn0 = dn.o; dn = null; e.stopPropagation();
      if (!wasMoved) {  // a tap: activate it here (a browser may drop the native click right after a fling) and swallow the native one
        const t = e.target && e.target.closest && e.target.closest("a,button"); if (t && vp.contains(t) && e.type === "pointerup") { tapT = performance.now(); t.click(); } return; }
      eat = true; setTimeout(() => eat = false, 60);
      const a = h[0], b = h[h.length - 1], dt = b[0] - a[0];
      if (X && loop) { const S = W3 + GAP, n0 = snapIdx(dn0), dd = o - dn0, v = dt > 0 && performance.now() - b[0] < 80 ? -(b[1] - a[1]) / dt : 0;
        let n = Math.abs(v) > 1.1 || Math.abs(dd) > 2.2 * S ? 3 * Math.sign(Math.abs(v) > 1.1 ? v : dd) : Math.abs(dd) > 0.6 * S ? Math.sign(dd) * Math.round(Math.abs(dd) / S) : (Math.abs(dd) > 0.18 * S || Math.abs(v) > 0.3) ? Math.sign(Math.abs(dd) > 0.18 * S ? dd : v) : 0;
        goTo(atIdx(n0 + n)); return; }
      anim(dt > 0 && performance.now() - b[0] < 80 ? Math.max(-3, Math.min(3, -(b[1] - a[1]) / dt)) : 0); };
    vp.addEventListener("pointerup", up); vp.addEventListener("pointercancel", up);
    vp.addEventListener("click", e => { if (eat) { e.preventDefault(); e.stopImmediatePropagation(); eat = false; } }, true);
    // the native click that follows our own tap activation lands on whatever is there now (e.g. the card that just opened): swallow it
    document.addEventListener("click", e => { if (e.isTrusted && performance.now() - tapT < 450) { tapT = -1e9; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    let wAcc = 0, wLock = 0;
    vp.addEventListener("wheel", e => { if (!on) return; e.preventDefault(); e.stopPropagation(); if (!loop) return;  // never zoom the map under the buttons
      const dlt = (X && Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? V : 1);
      if (X) { const now = performance.now(); wAcc += dlt; if (now < wLock || Math.abs(wAcc) < 30) return; const n = Math.sign(wAcc); wAcc = 0; wLock = now + 220;
        goTo(atIdx(snapIdx(o) + n)); return; }
      cancelAnimationFrame(raf); o += dlt; draw(); clearTimeout(vp._wt); vp._wt = setTimeout(() => anim(0), 120); }, { passive: false });
    ["touchstart", "touchmove", "mousedown", "dblclick"].forEach(t => vp.addEventListener(t, e => e.stopPropagation(), { passive: true }));
    measure();
    let roW = 0, roH = 0;  // kyxUI4: re-measure whenever the viewport's box changes (shown again after a card closes, window resized, fonts loaded)
    if (window.ResizeObserver) new ResizeObserver(() => { const w = vp.clientWidth, h = vp.clientHeight; if (w === roW && h === roH) return; roW = w; roH = h; if (w && h) measure(); }).observe(vp);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => measure());
    return { measure, next(n) { if (X && loop) goTo(atIdx(snapIdx(o) + n)); }, stop() { on = false; cancelAnimationFrame(raf); vp.querySelectorAll("[data-clone]").forEach(e => e.remove()); it.forEach(e => { e.style.transform = ""; e.classList.remove("cc"); if (X) { e.style.width = ""; e.classList.remove("w3"); } }); if (X) vp.style.width = ""; }, draw };
  }
  var pillC;  // var: buildPills() reads it (undefined until the first frame below)
  if (TOPS.length) requestAnimationFrame(() => { pillC = carousel(pillsEl, () => [...pillsEl.querySelectorAll(".tpill:not([data-clone])")], "x", (pos, V) => pos[0] + V / 2 - 60); }); else pillC = null;
  // landscape phone: the right-hand solo stack + Areas / Near me / Top 10s become one vertical looping wheel
  const LQ = window.matchMedia("(orientation: landscape) and (max-height: 500px)");
  let wheel = null;
  const wItems = () => [...lStack.querySelectorAll(".lsb"), arB, gpsB].concat(TOPS.length ? [tbtn] : []);
  function wheelOn() {
    if (wheel) { [arB, gpsB].concat(TOPS.length ? [tbtn] : []).forEach(e => lStack.appendChild(e)); wheel.measure(); return; }
    lStack.classList.add("wheel"); [arB, gpsB].concat(TOPS.length ? [tbtn] : []).forEach(e => lStack.appendChild(e));
    wheel = carousel(lStack, wItems, "y");
  }
  function wheelOff() { if (!wheel) return; wheel.stop(); wheel = null; lStack.classList.remove("wheel"); [arB, gpsB].concat(TOPS.length ? [tbtn] : []).forEach(e => document.body.appendChild(e)); }
  const wSync = () => { if (LQ.matches) wheelOn(); else wheelOff(); if (pillC) pillC.measure(); };
  (LQ.addEventListener ? LQ.addEventListener("change", wSync) : LQ.addListener(wSync));
  let rzT = 0; window.addEventListener("resize", () => { clearTimeout(rzT); rzT = setTimeout(() => { if (wheel) wheel.measure(); if (pillC) pillC.measure(); }, 150); });
  if (LQ.matches) requestAnimationFrame(wheelOn);
  const renderStack0 = renderStack; renderStack = function () { renderStack0(); if (wheel) wheelOn(); };
  // the pill row hides while a card is open (it would sit under the peek bar)
  new MutationObserver(() => { document.documentElement.classList.toggle("cardon", !card.hidden); if (card.hidden && pillC) requestAnimationFrame(() => pillC.measure()); requestAnimationFrame(fitStack); }).observe(card, { attributes: true, attributeFilter: ["hidden"] });
  document.documentElement.classList.toggle("cardon", !card.hidden);

  // ------------------------------------------------------------------ full screen (Fullscreen API; iOS Safari has none -> Add to Home Screen hint)
  const FSC = L.Control.extend({ options: { position: "bottomleft" }, onAdd() {
    const d = document.documentElement, b = L.DomUtil.create("a", "fsbtn");
    b.href = "#"; b.setAttribute("role", "button");
    const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
    const ico = () => { const f = !!fsEl(); b.innerHTML = f ? '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>' : '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';
      b.title = f ? "Leave full screen" : "Full screen"; b.setAttribute("aria-label", b.title); b.classList.toggle("on", f); };
    ico();
    const fit = () => { ico(); map.invalidateSize(); setTimeout(() => { map.invalidateSize(); if (wheel) wheel.measure(); if (pillC) pillC.measure(); fitStack(); }, 350); };
    document.addEventListener("fullscreenchange", fit); document.addEventListener("webkitfullscreenchange", fit);
    L.DomEvent.disableClickPropagation(b);
    L.DomEvent.on(b, "click", e => { L.DomEvent.preventDefault(e);
      if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      const rq = d.requestFullscreen || d.webkitRequestFullscreen;
      if (rq) { try { const r = rq.call(d); if (r && r.catch) r.catch(() => toast("Full screen was blocked by the browser")); } catch (_) { toast("Full screen is not available here"); } return; }
      const sa = navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
      toast("", sa ? "You are already in the full-screen app." : "For full screen on iPhone/iPad: tap <b>Share</b> → <b>Add to Home Screen</b>, then open ${ST.app} from the home screen.", 6000);
    });
    return b; } });
  { const fc = new FSC().addTo(map), el = fc.getContainer(); el.parentNode.appendChild(el); el.classList.add("fsctl"); }  // to the right of the zoom buttons

  // ------------------------------------------------------------------ profiles P1..P4
  // Only these 4 small buttons (+ "All") are on the critical path. The panel, the filters and data/pf.js load on demand (profiles.js):
  // when a button is tapped, a #profile / #pedit / #pmatch link opens, or a profile was left on. With "All" nothing is filtered.
  var PROF = null;  // the active profile's filter api (set by profiles.js); null = the default map
  const PSLOTS = ["P1", "P2", "P3", "P4"];
  const pGet = k => { try { return JSON.parse(localStorage.getItem("kyx_prof_" + k) || "null"); } catch (e) { return null; } };
  const pBar = document.createElement("div"); pBar.id = "profBar"; pBar.className = "profbar"; pBar.setAttribute("role", "toolbar"); pBar.setAttribute("aria-label", "Profiles");
  function renderPBar() {
    const act = ANNA_ON ? "-" : localStorage.getItem("kyx_prof_active") || "";  // Anna on: no P1-P4 / All highlighted
    pBar.innerHTML = `<button type="button" class="pfb${act ? "" : " on"}" data-prof="" aria-pressed="${!act}" title="Default map, no profile filter">All</button>` + PSLOTS.map(k => {
      const p = pGet(k) || (k === "P1" ? { name: "Bill" } : null), nm = p && p.name ? p.name : k;
      return `<button type="button" class="pfb${act === k ? " on" : ""}${p ? "" : " unset"}" data-prof="${k}" aria-pressed="${act === k}" title="Profile ${k}${p ? ": " + esc(nm) : " (not set up)"}">${esc(nm)}</button>`; }).join("")
      + (K.meta && K.meta.anna ? `<button type="button" class="pfb pfa${ANNA_ON ? " on" : ""}" data-anna="1" aria-pressed="${ANNA_ON}" title="${esc(K.meta.anna.name)}: Shawn (engineer) + Anna (leasing / billing) household (Shawn's engineering jobs over $120k, 2bd/2ba homes, no hospitals)">${esc(K.meta.anna.name)}</button>` : "");
  }
  window.KYXPF = d => { window.KYXPF_D = d; };  // data/pf.js calls this
  let profP = null;
  function loadProfiles() {
    if (profP) return profP;
    const v = K.meta && K.meta.stamp ? "?v=" + K.meta.stamp : "";
    const add = src => new Promise(res => { const el = document.createElement("script"); el.src = src + v; el.async = true; el.onload = res; el.onerror = res; document.head.appendChild(el); });
    const layerDefault = d => d.disabled || annaBlk(d) ? false : (d.key in saved ? !!saved[d.key] : !!d.on);
    const remake = e => { PLS.forEach(pl => { if (pl.shown.has(e)) pl._hide(e); }); if (e.mk) { e.mk.off(); e.mk = null; } };
    return profP = Promise.all([add("profiles.js"), add("data/pf.js"), K.meta && K.meta.pj ? loadPerm().catch(() => 0) : 0]).then(() => window.KYXP.init({ K, IDX, MARK, map, LAYERS, setLayer, layerDefault, PLS, sched, remake,
      showPage, refreshCard, renderPBar, toast, copy, esc, money, stat, gRow, gImg, dot, TJ_ALL, isHome, isNH, isCab, isBig, isCF, isCFo, body,
      current: () => current, setProf: p => { PROF = p; if (PJX) PJX.apply(); }, reSolo, loadPerm, PJ: () => PJX }));
  }
  pBar.addEventListener("click", e => {
    const b = e.target.closest("[data-prof],[data-anna]"); if (!b) return;
    if (b.dataset.anna) { b.classList.add("busy"); annaSet(!ANNA_ON).then(() => b.classList.remove("busy")); return; }
    const k = b.dataset.prof;
    if (ANNA_ON) { annaSet(false, { noProf: true, quiet: true }); if (!k) { if (profP) KYXP.tap(""); else { localStorage.removeItem("kyx_prof_active"); renderPBar(); } toast("All: default map, no profile filter"); return; } }
    if (!k && !profP) { toast("All: default map, no profile filter"); return; }  // profiles never loaded = already the default map
    b.classList.add("busy"); loadProfiles().then(() => { b.classList.remove("busy"); KYXP.tap(k); });
  });
  renderPBar(); document.body.appendChild(pBar);
  // ---- Anna on / off. Radio with All / P1-P4: Anna on puts any active profile to sleep (P1-P4 storage kept, so Anna off brings it back).
  let anP = null;
  function loadAnna() {
    if (!(K.meta && K.meta.anna)) return Promise.resolve(false);
    return anP || (anP = Promise.all([loadJS("anna.js"), window.KYXAN_D ? 0 : loadJS("data/anna.js")]).then(() => {
      if (!window.KYXAN || !window.KYXAN_D) return false;
      ANNAX = KYXAN.init({ K, ST, IDX, MARK, map, L, G, LAYERS, PL_, ent, icOnce, sicon, icon, ksv, krow, mk, PIN_KEY, FULL, KEEP, DOTC, TLAB, TITLE, LABEL, THUMB_TITLE, R, SOLOS, TOPS, TOPK, TOPH,
        PILL_T, PILL_O, SHARDS, all, metrics, msel, scaleCache, mkRow, ll, sched, renderKey, link, ext, row, stat, rbadge, money, esc, slug, fmt1, sign, fmtMetric, gRow, gImg, dot, schoolBlock, thumb,
        sqft, hav, isNH, isHome, countyAt, toast, RAMP, BANDS, info, infoBody, MORE_LAYER_FOR, nearbyBlock, openItem, refreshCard, current: () => current,
        setMetric: k => { curMetric = k; if (msel.value !== k) msel.value = k; drawCounties(); }, getMetric: () => curMetric, on: () => ANNA_ON });
      return true;
    }).catch(() => false));
  }
  function annaSet(on, o = {}) {
    if (!(K.meta && K.meta.anna)) return Promise.resolve(false);
    if (on) return loadAnna().then(ok => {
      if (!ok) { anP = null; return false; }
      if (ANNA_ON) return true;
      const prev = localStorage.getItem("kyx_prof_active");
      if (window.KYXP && KYXP.active && KYXP.active()) { KYXP.use("", true); if (prev) localStorage.setItem("kyx_prof_active", prev); }
      ANNA_ON = true; annaApply(o); return true; });
    if (!ANNA_ON) return Promise.resolve(true);
    ANNA_ON = false; annaApply(o);
    if (!o.noProf && localStorage.getItem("kyx_prof_active")) loadProfiles().then(() => KYXP.boot());
    return Promise.resolve(true);
  }
  function annaApply(o) {
    try { localStorage.setItem(ST.ls + "anna", ANNA_ON ? "1" : "0"); } catch (e) { }
    try { const u = new URL(location.href); if (ANNA_ON) u.searchParams.set("anna", "1"); else u.searchParams.delete("anna"); history.replaceState(history.state, "", u.pathname + u.search + u.hash); } catch (e) { }
    document.documentElement.classList.toggle("annaon", ANNA_ON);
    if (SOLO && !soloVis(SOLOS.find(x => x.k === SOLO) || {})) { SOLO = null; SOLO_ON = null; soloF = null; }
    if (ANNAX) ANNAX.apply(ANNA_ON);
    restoreLayers(); if (FOCUS) focusLayers();
    buildPills(); buildTMenu(); renderStack(); renderPBar(); renderKey(); sched(true); requestAnimationFrame(fitStack);
    const c = current, it = c && IDX[c.type] && IDX[c.type][c.id], tp = c && c.type === "top" && TOPK[c.id];
    if (c && !c.loading && !card.hidden) { if ((!ANNA_ON && (c.type === "eng" || c.type === "spj" || (it && it.anna) || (tp && tp.anna))) || (ANNA_ON && (ANNA_HK.has(c.type) || c.type === "hospital" || (tp && !topVis(tp))))) closeCard(); else refreshCard(); }
    if (!o.quiet) toast(ANNA_ON ? `${K.meta.anna.name} on: Shawn's engineering jobs, Anna's jobs, 2bd/2ba homes · no hospitals` : `${K.meta.anna.name} off`);
  }

  // ------------------------------------------------------------------ start
  // de-clutter when zoomed out: hide minor hospitals, shrink markers
  const zc = () => { const z = map.getZoom(), el = map.getContainer(); el.classList.toggle("z-low", z < 8); el.classList.toggle("z-vlow", z < 7); };
  map.on("zoomend", zc);
  if (!history.state || history.state.d == null) history.replaceState(location.hash ? { d: 1, nob: 1, L: isListH(location.hash) ? 1 : undefined } : { d: 0 }, "", location.href);
  const annaQ = new URLSearchParams(location.search).get("anna");
  const annaBoot = !!(K.meta && K.meta.anna) && (annaQ === "1" || (annaQ !== "0" && localStorage.getItem(ST.ls + "anna") === "1"));
  if (annaBoot) annaSet(true, { quiet: true });  // Anna was left on, or ?anna=1 (shared link): its data loads after the first paint
  if (location.hash) route(true);  // (the start view without a hash is set right after the map is created)
  updBack();
  if (!annaBoot && localStorage.getItem("kyx_prof_active")) {  // a profile was left on: load it after the page is up (never blocks the first paint)
    const go = () => loadProfiles().then(() => KYXP.boot());
    if (document.readyState === "complete") setTimeout(go, 30); else window.addEventListener("load", () => setTimeout(go, 30), { once: true });
  }
  zc();
  if (K.meta && K.meta.pj) {  // permanent RN jobs: hats + counts load after the page is up (perm.js + data/pjm.js, ~15 KB gzipped)
    const idle = () => (window.requestIdleCallback || (f => setTimeout(f, 1)))(() => loadPerm().catch(() => 0), { timeout: 4000 });
    if (document.readyState === "complete") setTimeout(idle, 1200); else window.addEventListener("load", () => setTimeout(idle, 1200), { once: true });
  }
  window.KYXApp = { anna: () => ANNA_ON, annaSet, loadPerm, PJ: () => PJX, focus: () => FOCUS && { name: FOCUS.name, z: FOCUS.z }, clearFocus, focusStats: () => { const o = { shown: {}, expect: {} };
    PLS.forEach(pl => pl.ents.forEach(e => { if (!FOCUS || e.px || !inFocus(e)) return; if (SOLO_ON && SOLO_ON.has(pl.key) && soloF && !soloF(e)) return;
      o.expect[e.type] = (o.expect[e.type] || 0) + 1; if (pl.shown.has(e) && e.mk && e.mk._icon) o.shown[e.type] = (o.shown[e.type] || 0) + 1; })); return o; }, BADGE, favGet, cmpGet, loadExtras, homeTarget, countyAt, openItem, closeCard, exitCard, map, IDX, depth, loadProfiles, prof: () => PROF, setSolo, solo: () => SOLO, iconKinds: () => { const z = map.getZoom(), o = []; PLS.forEach(pl => { if ((SOLO_ON && SOLO_ON.has(pl.key)) || !(pl.key in FULL) || z >= FULL[pl.key]) o.push(pl.key); }); return o.sort(); },
    clusters: () => CLS.filter(c => c.mk._icon).map(c => { const q = map.latLngToContainerPoint(c.mk.getLatLng()); return { g: c.g, n: c.n, type: c.xs[0][1].type, x: q.x, y: q.y }; }), dots: () => DOTS.length, fade: () => +(fillPane.style.opacity || 1), FULL, CL_OFF,
    foc: () => ({ on: FOC_ON, top: TOPF && TOPF.k, solo: SOLO }),
    pins: () => { const o = []; PLS.forEach(pl => pl.shown.forEach(e => { if (e.mk && e.mk._icon) { const q = map.latLngToContainerPoint(e.mk.getLatLng()); o.push({ type: e.type, id: e.id, x: q.x, y: q.y }); } })); return o; } };  // pins(): for tests
})();

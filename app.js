/* Kentucky Explorer — one map, many layers, deep links (#type=id), share cards. Static; no server needed. */
(function () {
  "use strict";
  const K = window.KYX || {};
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = s => (String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "x");
  const money = v => v == null ? "—" : "$" + Math.round(v).toLocaleString();
  const fmt1 = v => v == null ? "—" : (Math.round(v * 10) / 10).toLocaleString();
  const sign = (v, d = 0) => v == null ? "—" : (v > 0 ? "+" : "") + v.toFixed(d);
  const rbadge = r => r ? `<span class="r ${esc(r)}">${esc(r)}</span>` : "—";
  const toast = msg => { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 2200); };

  // ------------------------------------------------------------------ map + base layers
  const map = L.map("map", { zoomControl: false, preferCanvas: true, minZoom: 6, maxZoom: 18, zoomSnap: 0.25 }).setView([37.75, -85.7], 7);
  L.control.zoom({ position: "bottomleft" }).addTo(map);
  L.control.scale({ position: "bottomleft", imperial: true, metric: false }).addTo(map);
  const bases = {
    Streets: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }),
    Topo: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenStreetMap, SRTM | © OpenTopoMap (CC-BY-SA)" }),
    Satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" }),
  };
  let curBase = localStorage.getItem("kyx_base") || "Streets";
  if (!bases[curBase]) curBase = "Streets";
  bases[curBase].addTo(map);
  const baseList = $("#baseList");
  Object.keys(bases).forEach(n => {
    const b = document.createElement("button"); b.textContent = n; b.className = n === curBase ? "on" : "";
    b.onclick = () => { map.removeLayer(bases[curBase]); curBase = n; bases[n].addTo(map); bases[n].bringToBack(); localStorage.setItem("kyx_base", n);
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

  const icon = (cls, html, size = 26) => L.divIcon({ className: "", html: `<div class="mk ${cls}" style="width:${size}px;height:${size}px">${html}</div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  // ---- small SVG pin glyphs (phone-legible); G.* return <svg>, sicon() wraps one as a marker, ksv() as a map-key symbol
  const SVGI = (w, h, body) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${body}</svg>`;
  const RED_HOUSE = "#d32f2f";
  const DIPLOMA = `<path d="M3.5 5.5h13v8h-13z" fill="#f6ead0" stroke="#7a5a2b" stroke-width="1.1"/><ellipse cx="3.5" cy="9.5" rx="1.7" ry="4" fill="#e8d3a6" stroke="#7a5a2b" stroke-width="1"/><ellipse cx="16.5" cy="9.5" rx="1.7" ry="4" fill="#e8d3a6" stroke="#7a5a2b" stroke-width="1"/><path d="M9 5.5v8M11 5.5v8" stroke="#c62828" stroke-width="1.7"/><path d="M10 13.2l-2.2 4.3 2.2-1.1 2.2 1.1z" fill="#c62828"/>`;
  const CAP = (fill, dx = 0) => `<g transform="translate(${dx},0)"><path d="M11 1.5 21.5 6 11 10.5.5 6z" fill="${fill}" stroke="#222" stroke-width="1.1" stroke-linejoin="round"/><path d="M5 8.2v4.3c0 1.6 2.7 2.9 6 2.9s6-1.3 6-2.9V8.2L11 10.8z" fill="${fill}" stroke="#222" stroke-width="1.1"/><path d="M19.5 6.9v5.4" stroke="#222" stroke-width="1.1"/><circle cx="19.5" cy="13" r="1.4" fill="#ffd600" stroke="#222" stroke-width=".7"/></g>`;
  const G = {
    house: cross => SVGI(24, 24, `<path d="M12 1.8 23 11.6h-3V22.4H4V11.6H1z" fill="${RED_HOUSE}" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/>` + (cross
      ? `<rect x="6.6" y="13.2" width="10.8" height="4" rx=".5" fill="#fff"/><rect x="10" y="9.8" width="4" height="10.8" rx=".5" fill="#fff"/>`
      : `<rect x="10" y="15.4" width="4" height="7" fill="#fff" opacity=".9"/>`)),
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
    nurseCap: (txt, ring) => SVGI(36, 22, `<path d="M2.5 20 5.6 5.2Q18 .6 30.4 5.2L33.5 20z" fill="#fff" stroke="${ring}" stroke-width="2.2" stroke-linejoin="round"/><text x="18" y="16.4" text-anchor="middle" font-size="11" font-weight="800" fill="#1a1a1a" font-family="system-ui,-apple-system,Segoe UI,sans-serif">${txt}</text>`),
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
  let curMetric = localStorage.getItem("kyx_metric2") || defMetric;  // new storage key so everyone starts on the Appeal score
  if (!metrics.find(m => m.key === curMetric)) curMetric = defMetric;
  const countyLayer = L.layerGroup(), sweetLayer = L.layerGroup();
  const countyPolys = {};
  function countyStyle(c, sc) { return { color: "#123642", weight: 0.8, opacity: 0.7, fillColor: sc ? sc.color(c) : "#000", fillOpacity: sc ? 0.55 : 0.02 }; }
  function tipFor(c, sc) {
    if (!sc) return esc(c.name);
    const v = c.m[sc.m.key];
    const a = c.appeal;
    if (sc.m.key === appealKey && a) return `<b>${esc(c.name)}</b> · Appeal ${esc(fmt1(a.score))} · #${a.rank} of 120<br>${esc(a.band)}`;
    return `<b>${esc(c.name)}</b>: ${esc(fmtMetric(sc.m, v))} <span class="small">(${esc(sc.labelOf(c))})</span>${a ? `<br>Appeal ${esc(fmt1(a.score))} · #${a.rank}` : ""}`;
  }
  function drawCounties() {
    countyLayer.clearLayers();
    const sc = scaleFor(curMetric);
    (K.counties || []).forEach(c => {
      const p = L.polygon(c.rings.map(r => r.map(([x, y]) => [y, x])), countyStyle(c, sc));
      p.bindTooltip(tipFor(c, sc), { sticky: true });
      p.on("click", e => { if (!e.originalEvent._kyxHandled) openItem("county", c.name, { fly: false }); });
      countyLayer.addLayer(p); countyPolys[c.name] = p;
    });
    legend(sc, "#legend");
    if (keyReady) renderKey();
  }
  function drawSweet() {
    sweetLayer.clearLayers();
    const sc = sweetKey && scaleFor(sweetKey);
    if (!sc) return;
    (K.counties || []).forEach(c => {
      const p = L.polygon(c.rings.map(r => r.map(([x, y]) => [y, x])), { color: "#3d2a00", weight: sc.cls(c) === 0 ? 2.5 : 0.6, fillColor: sc.color(c), fillOpacity: 0.6 });
      p.bindTooltip(`${esc(c.name)} — sweet spot: ${esc(fmtMetric(sc.m, c.m[sweetKey]))} (${esc(sc.labelOf(c))})`, { sticky: true });
      p.on("click", () => openItem("county", c.name, { fly: false }));
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
  msel.onchange = () => { curMetric = msel.value; localStorage.setItem("kyx_metric2", curMetric); drawCounties(); };
  drawCounties(); drawSweet();

  // ------------------------------------------------------------------ point layers
  const L_props = L.layerGroup(), L_homes = L.layerGroup(), L_nh = L.layerGroup(), L_hosp = L.layerGroup(), L_trauma = L.layerGroup(), L_sch = L.layerGroup(), L_col = L.layerGroup(), L_act = L.layerGroup();
  const L_hist = {
    mine: L.markerClusterGroup({ maxClusterRadius: 45, showCoverageOnHover: false, iconCreateFunction: cl => L.divIcon({ className: "", html: `<div class="mk h-mine" style="width:30px;height:30px">${cl.getChildCount()}</div>`, iconSize: [30, 30] }) }),
    coal_camp: L.layerGroup(), ghost_town: L.layerGroup(), historic: L.layerGroup()
  };
  const HIST = { mine: ["⛏", "Old mine (USGS MRDS)"], coal_camp: ["🏚", "Historic coal camp"], ghost_town: ["👻", "Ghost town"], historic: ["🏛", "Historic site"] };
  const SCOLOR = { Blue: "#1e5bd8", Green: "#2e9a4b", Yellow: "#e6c229", Orange: "#ef7d1a", Red: "#d33a2c" };
  const ACTI = { "Park": "🌲", "Park / public land": "🏞", "Waterfall": "💧", "Cave": "🕳", "Distillery": "🥃", "Natural arch": "🌉", "Attraction": "🎡", "Hiking trail": "🥾" };

  function reg(type, id, mk) { MARK[type + ":" + id] = mk; mk.on("click", e => { if (e.originalEvent) e.originalEvent._kyxHandled = true; openItem(type, id, { fly: false }); }); return mk; }
  const isHome = p => p.cat === "1-acre-home";
  const isNH = p => p.cat === "near-hospital-home";  // near-hospital homes (blue pins)
  const HOMES = (K.properties || []).filter(isHome), NHOMES = (K.properties || []).filter(isNH), LANDS = (K.properties || []).filter(p => !isHome(p) && !isNH(p));
  const nhMk = {};
  let nf = { maxp: 0, maxm: 0, typ: "" }; try { nf = Object.assign(nf, JSON.parse(localStorage.getItem("kyx_nhfilter") || "{}")); } catch (e) { }
  const sqft = v => v ? Math.round(v).toLocaleString() : "—";
  NHOMES.forEach(p => {
    if (p.lat == null || p.lon == null) return;
    const mk = L.marker([p.lat, p.lon], { icon: p.bargain ? sicon("barg", G.starDot("#1565c0"), 24, 24) : sicon("hs nhh", G.house(true), 24, 24), zIndexOffset: p.bargain ? 3500 : 1600, title: p.title });
    mk.bindTooltip(`🏥 ${esc(p.title)}${p.price ? " · " + money(p.price) : ""} · ${sqft(p.sqft)} sq ft · ${esc(p.beds)} bd/${esc(p.baths)} ba${p.nh ? ` · ~${esc(p.nh.minutes_free_flow)} min to ${esc(p.nh.name)}` : ""}`);
    nhMk[p.id] = mk; reg("property", p.id, mk).addTo(L_nh);
  });
  const homeMk = {};
  let hf = { maxp: 0, mina: 0 }; try { hf = Object.assign(hf, JSON.parse(localStorage.getItem("kyx_homefilter") || "{}")); } catch (e) { }
  HOMES.forEach(p => {
    if (p.lat == null || p.lon == null) return;
    const approx = p.precision === "town", feat = p.standout && p.standout.length;
    const mk = L.marker([p.lat, p.lon], { icon: p.bargain ? sicon("barg", G.starDot("#1565c0"), 24, 24) : sicon("hs", G.house(false), 22, 22), zIndexOffset: p.bargain ? 3500 : 1500, title: p.title });
    mk.bindTooltip(`🏠 ${esc(p.title)}${p.price ? " · " + money(p.price) : ""}${p.acres ? " · " + p.acres + " ac" : ""}${p.beds ? " · " + esc(p.beds) + " bd/" + esc(p.baths) + " ba" : ""}`);
    homeMk[p.id] = mk; reg("property", p.id, mk).addTo(L_homes);
  });
  LANDS.forEach(p => {
    if (p.lat == null || p.lon == null) return;
    const star = p.standout && p.standout.length;
    const approx = p.precision === "town";
    const ic = p.bargain ? sicon("barg", G.starDot("#1565c0"), 24, 24) : sicon("hs", G.house(false), 22, 22);
    const mk = L.marker([p.lat, p.lon], { icon: ic, zIndexOffset: p.bargain ? 3500 : star ? 2000 : 1000, title: p.title });
    mk.bindTooltip(`${esc(p.title)}${p.price ? " · " + money(p.price) : ""}${p.acres ? " · " + p.acres + " ac" : ""}${star ? " ★ " + esc(p.standout.join(", ")) : ""}`);
    reg("property", p.id, mk).addTo(L_props);
  });
  (K.hospitals || []).forEach(h => {
    const tr = h.trauma;
    const lv = tr ? (tr.match(/Level (I{1,3}V?|IV)/) || [0, ""])[1] + (/Pediatric/.test(tr) ? "P" : "") : "";
    const mk = L.marker([h.lat, h.lon], { icon: tr ? icon("trauma", lv, 28) : sicon("hosp" + (h.kind === "general" ? "" : " spec"), G.nurse(), h.kind === "general" ? 20 : 17, h.kind === "general" ? 20 : 17), zIndexOffset: tr ? 500 : 0, title: h.name, opacity: h.kind === "general" ? 1 : 0.75 });
    mk.bindTooltip(esc(h.name) + (tr ? " — Trauma " + esc(tr) : h.kind !== "general" ? " (specialty)" : ""));
    reg("hospital", h.id, mk).addTo(tr ? L_trauma : L_hosp);
  });
  (K.schools || []).forEach(s => {
    const mk = L.marker([s.lat, s.lon], { icon: sicon("sch", G.cap(SCOLOR[s.rating] || "#9e9e9e"), 22, 18), title: s.name });
    mk.bindTooltip(`${esc(s.name)}${s.rating ? " — " + esc(s.rating) : ""}`);
    reg("school", s.id, mk).addTo(L_sch);
  });
  (K.colleges || []).forEach(c => {
    const cc = /community|technical|trade|beauty/i.test(c.kind || "");
    const mk = L.marker([c.lat, c.lon], { icon: cc ? sicon("col", G.diploma(), 20, 18) : sicon("col", G.univ(), 40, 18), title: c.name });
    mk.bindTooltip(esc(c.name)); reg("college", c.id, mk).addTo(L_col);
  });
  (K.activities || []).forEach(a => {
    const og = outdoorGlyph(a);
    const mk = L.marker([a.lat, a.lon], { icon: og ? sicon("act og-" + og, G[og](), 22, 22) : icon("act", ACTI[a.kind] || "★", 24), title: a.name });
    mk.bindTooltip(`${esc(a.name)} (${esc(a.kind)})`); reg("activity", a.id, mk).addTo(L_act);
  });
  (K.history || []).forEach(h => {
    const t = HIST[h.type] || ["•", h.type];
    const mk = L.marker([h.lat, h.lon], { icon: icon("hist h-" + h.type, t[0], h.type === "mine" ? 22 : 26), title: h.name });
    mk.bindTooltip(`${esc(h.name)} — ${esc(t[1])}`); reg("history", h.id, mk).addTo(L_hist[h.type] || L_hist.historic);
  });

  // ------------------------------------------------------------------ travel-nurse assignments (../data/travel_jobs.json -> build.py -> K.travel)
  const TJ = K.travel || { meta: {}, hospitals: [] }, TJM = TJ.meta || {};
  const TJB = TJM.bands || [];
  const L_travel = L.layerGroup();
  const tjPay = j => j.lo != null && j.lo !== j.hi ? `${money(j.lo)}–${money(j.hi).slice(1)}` : money(j.hi);
  const tjK = v => "$" + (v / 1000).toFixed(1) + "k";
  const capK = v => (Math.round(v / 100) / 10).toFixed(1);  // $1,180 -> 1.2 (thousands, nearest $100)
  const tjIcon = h => L.divIcon({ className: "", html: `<div class="mk sv tjc" style="width:36px;height:22px">${G.nurseCap(capK(h.top), RAMP[h.band] || RAMP[4])}</div>`, iconSize: [36, 22], iconAnchor: [18, 11] });
  TJ.hospitals.forEach(h => {
    IDX.travel[h.id] = h;
    const mk = L.marker([h.lat, h.lon], { icon: tjIcon(h), zIndexOffset: 2500 + Math.round(h.top / 10), title: h.name });
    mk.bindTooltip(`💼 ${esc(h.name)} · top ${money(h.top)}/wk · ${h.n} travel RN job${h.n > 1 ? "s" : ""}`);
    reg("travel", h.id, mk).addTo(L_travel);
  });
  const TJ_ALL = TJ.hospitals.flatMap(h => h.jobs.map(j => Object.assign({ h }, j))).sort((a, b) => b.hi - a.hi || (b.lo || 0) - (a.lo || 0));
  if (TJ.hospitals.length) IDX.travel.all = { id: "all", name: "All travel nurse assignments (ranked by weekly pay)", city: `${TJ_ALL.length} jobs` };
  const TJ_NOTE = () => `<div class="small tjnote">💵 Pay is <b>gross weekly pay as posted</b> by the agency (taxable wage + stipends, before taxes); a range is shown when the posting gives one, and the high end is used for ranking. Travel postings change often (seen ${esc(TJM.date_seen || "")}); confirm on the source.</div>`;
  const tjJob = (j, withHosp) => `<div class="tjrow"><div class="tjtop"><b class="tjpay">${tjPay(j)}/wk</b> <span>${esc(j.u || j.sp)}</span>${withHosp ? ` · ${link("travel", j.h.id, j.h.name)}<span class="small"> (${esc(j.h.city || "")})</span>` : ""}</div>
      <div class="small">${esc(j.sh || "—")} · ${esc(j.len || "length n/a")} · start ${esc(j.st || "n/a")} · ${esc(j.ag || "")}${j.na > 1 ? ` <span title="${esc(j.pn || "")}">(+${j.na - 1} more agenc${j.na > 2 ? "ies" : "y"})</span>` : ""}</div>
      <div class="small">${j.fac ? `Posted as “${esc(j.fac)}” · ` : ""}${esc(j.src || "")}${j.po ? " · posted " + esc(j.po) : ""} · <a href="${esc(j.url)}" target="_blank" rel="noopener">Apply / view ↗</a></div></div>`;
  function travelCard(h) {
    if (h.id === "all") return `<div class="kicker">💼 Travel nurse assignments</div><h2>All ${TJ_ALL.length} jobs, ranked by weekly pay</h2>
      <div class="sub">${TJ.hospitals.length} Kentucky hospitals · tap a hospital name for its card</div>${TJ_NOTE()}${TJ_ALL.map(j => tjJob(j, true)).join("")}${travelExcl()}`;
    const b = TJB[h.band] || {};
    return `${thumb("travel", h)}<div class="kicker">💼 Travel nurse assignments</div><h2>${esc(h.name)}</h2>
      <div class="sub">${esc([h.city, h.county && h.county + " County"].filter(Boolean).join(", "))}</div>
      <div class="badges"><span class="badge" style="background:${RAMP[h.band]};color:${h.band === 2 ? "#222" : "#fff"}">Top pay ${money(h.top)}/wk · ${esc(b.label || "")}</span></div>
      <div class="stats">${stat(money(h.top), "top weekly pay")}${stat(h.n, "travel RN jobs")}${stat(money(h.jobs[h.jobs.length - 1].hi), "lowest (high end)")}</div>
      ${TJ_NOTE()}<div class="kicker">Jobs, highest weekly pay first</div>${h.jobs.map(j => tjJob(j, false)).join("")}
      <table class="kv">${row("Hospital", h.hospital_id ? link("hospital", h.hospital_id, "Hospital details (trauma level, ER, website)") : null)}${row("County", h.county ? link("county", h.county, h.county + " County") : null)}${row("All jobs", '<a href="#travel=all">Every Kentucky travel job, ranked by pay</a>')}</table>${nearbyProps(h)}`;
  }
  function travelExcl() {
    const ex = TJM.excluded || {}; const n = Object.values(ex).reduce((a, b) => a + b, 0);
    return n ? `<details class="small"><summary>Left out: ${n} postings</summary>${Object.entries(ex).map(([k, v]) => `${v} · ${esc(k)}`).join("<br>")}${TJM.dups ? `<br>${TJM.dups} · duplicate postings` : ""}<br>Sources: ${Object.entries(TJM.sources || {}).map(([k, v]) => `${esc(k)} — ${esc(v)}`).join("; ")}</details>` : "";
  }

  // ------------------------------------------------------------------ layer panel
  const nHist = t => (K.history || []).filter(h => h.type === t).length;
  const LAYERS = [
    { key: "props", label: "★ Notable Properties (5+ acres)", layer: L_props, on: true, n: LANDS.length },
    { key: "homes", label: "🏠 Homes (1+ acre, 3bd/2ba, under $425k)", layer: L_homes, on: true, n: HOMES.length, filter: true },
    { key: "nh", label: "🏥 Near-hospital homes (1,600+ sq ft, 3bd/2ba, under $325k)", layer: L_nh, on: true, n: NHOMES.length, nfilter: true },
    { key: "trauma", label: "Trauma centers", layer: L_trauma, on: true, n: (K.hospitals || []).filter(h => h.trauma).length },
    { key: "hosp", label: "Other hospitals", layer: L_hosp, on: true, n: (K.hospitals || []).filter(h => !h.trauma).length },
    { key: "travel", label: "💼 Travel nurse assignments (by weekly pay)", layer: L_travel, on: false, n: TJ_ALL.length || null, disabled: !TJ.hospitals.length, note: TJ.hospitals.length ? "" : " (no data)" },
    { key: "sch", label: "Schools (KDE color rating)", layer: L_sch, on: false, n: (K.schools || []).length },
    { key: "col", label: "Colleges & universities", layer: L_col, on: true, n: (K.colleges || []).length },
    { key: "act", label: "Activities & outdoors", layer: L_act, on: false, n: (K.activities || []).length },
    { key: "hist", label: "History", group: true },
    { key: "h_hist", label: "🏛 Historic sites & landmarks", layer: L_hist.historic, on: false, n: nHist("historic"), sub: true },
    { key: "h_coal", label: "🏚 Coal camps", layer: L_hist.coal_camp, on: false, n: nHist("coal_camp"), sub: true },
    { key: "h_ghost", label: "👻 Ghost towns", layer: L_hist.ghost_town, on: false, n: nHist("ghost_town"), sub: true },
    { key: "h_mine", label: "⛏ Old mines (USGS MRDS)", layer: L_hist.mine, on: false, n: nHist("mine"), sub: true },
    { key: "cty", label: "Counties (colored by metric below)", layer: countyLayer, on: true },
    { key: "sweet", label: "Sweet-spot counties", layer: sweetLayer, on: false, disabled: !sweetKey, note: sweetKey ? "" : " (data pending)" },
  ];
  kyxMoreLayers(LAYERS);  // airports, businesses/buildings for sale, attractions (see "more layers" block near the end)
  let saved = {}; try { saved = JSON.parse(localStorage.getItem("kyx_layers") || "{}"); } catch (e) { }
  const ll = $("#layerList");
  LAYERS.forEach(d => {
    if (d.group) { const g = document.createElement("div"); g.innerHTML = `<b>${esc(d.label)}</b>`; g.style.marginTop = "6px"; ll.appendChild(g); return; }
    const on = d.disabled ? false : (d.key in saved ? saved[d.key] : d.on);
    const lab = document.createElement("label"); if (d.sub) lab.className = "sub"; if (d.disabled) lab.classList.add("dis");
    lab.innerHTML = `<input type="checkbox" ${on ? "checked" : ""} ${d.disabled ? "disabled" : ""}> ${esc(d.label)}${esc(d.note || "")}<span class="cnt">${d.n != null ? d.n : ""}</span>`;
    const cb = lab.querySelector("input");
    cb.onchange = () => { setLayer(d, cb.checked); saved[d.key] = cb.checked; localStorage.setItem("kyx_layers", JSON.stringify(saved)); };
    d.cb = cb; ll.appendChild(lab);
    if (d.filter) { d.cnt = lab.querySelector(".cnt"); ll.appendChild(homeFilterEl()); }
    if (d.nfilter) { d.cnt = lab.querySelector(".cnt"); ll.appendChild(nhFilterEl()); }
    if (on) d.layer.addTo(map);
  });
  applyHomeFilter(); applyNHFilter();
  // filter for the Near-hospital homes layer (max price, max drive minutes, house vs townhome/condo); remembered in localStorage
  function nhFilterEl() {
    const w = document.createElement("div"); w.className = "hfilter sub"; w.id = "nhFilter";
    const opt = (vals, cur, f) => vals.map(v => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${f(v)}</option>`).join("");
    w.innerHTML = `<label class="hf">Max price <select id="nfPrice">${opt([0, 200000, 250000, 275000, 300000], nf.maxp, v => v ? "$" + v / 1000 + "k" : "Any (<$325k)")}</select></label>
      <label class="hf">Drive ≤ <select id="nfMin">${opt([0, 5, 7], nf.maxm, v => v ? v + " min" : "10 min")}</select></label>
      <label class="hf">Type <select id="nfType">${opt(["", "House", "Townhome"], nf.typ, v => v === "Townhome" ? "Townhome/condo" : v || "Any")}</select></label>`;
    w.querySelectorAll("select").forEach(s => s.onchange = () => { nf = { maxp: +$("#nfPrice").value, maxm: +$("#nfMin").value, typ: $("#nfType").value }; localStorage.setItem("kyx_nhfilter", JSON.stringify(nf)); applyNHFilter(); });
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
    w.innerHTML = `<label class="hf">Max price <select id="hfPrice">${opt([0, 200000, 250000, 300000, 350000, 400000], hf.maxp, v => v ? "$" + v / 1000 + "k" : "Any (≤$425k)")}</select></label>
      <label class="hf">Min acres <select id="hfAcres">${opt([0, 2, 5, 10, 20], hf.mina, v => v ? v + "+ ac" : "Any (1+)")}</select></label>`;
    w.querySelectorAll("select").forEach(s => s.onchange = () => { hf = { maxp: +$("#hfPrice").value, mina: +$("#hfAcres").value }; localStorage.setItem("kyx_homefilter", JSON.stringify(hf)); applyHomeFilter(); });
    return w;
  }
  function homePass(p) { return (!hf.maxp || (p.price != null && p.price <= hf.maxp)) && (!hf.mina || (p.acres != null && p.acres >= hf.mina)); }
  function applyHomeFilter() {
    let n = 0;
    HOMES.forEach(p => { const mk = homeMk[p.id]; if (!mk) return; const ok = homePass(p) || (current && current.id === p.id); if (ok) { n++; if (!L_homes.hasLayer(mk)) L_homes.addLayer(mk); } else if (L_homes.hasLayer(mk)) L_homes.removeLayer(mk); });
    const d = LAYERS.find(x => x.key === "homes"); if (d && d.cnt) d.cnt.textContent = n === HOMES.length ? String(n) : `${n} of ${HOMES.length}`;
    if (keyReady) renderKey();
  }
  function setLayer(d, on) { if (on) { d.layer.addTo(map); if (d.key === "cty" || d.key === "sweet") d.layer.eachLayer(l => l.bringToBack && l.bringToBack()); } else map.removeLayer(d.layer); if (d.cb) d.cb.checked = on; renderKey(); }
  function ensureLayerFor(type, item) {
    const k = (MORE_LAYER_FOR && MORE_LAYER_FOR._feat(item)) || { property: isNH(item) ? "nh" : isHome(item) ? "homes" : "props", school: "sch", college: "col", activity: "act", travel: "travel" }[type]
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
  const isPhone = () => window.innerWidth < 800;
  function setKeyOpen(open) { keyEl.classList.toggle("collapsed", !open); keyTog.setAttribute("aria-expanded", open); }
  setKeyOpen(!isPhone());
  keyTog.onclick = () => setKeyOpen(keyEl.classList.contains("collapsed"));
  const mk = (cls, html, size, extra = "") => `<span class="mk ${cls}" style="width:${size}px;height:${size}px;${extra}">${html}</span>`;
  const krow = (sym, label, note) => `<div class="krow"><span class="ksym">${sym}</span><span>${label}${note ? `<span class="small"> ${note}</span>` : ""}</span></div>`;
  const PIN_KEY = {
    props: () => `<div class="ksec"><b>Home + 5 acres or more</b> <span class="small">(5+ acres, 2+ bd / 2+ ba, up to $500k)</span>${krow(ksv(G.house(false)), "Red house = home on land", "(5-acre and 1-acre searches)")}</div>`,
    bargain: () => `<div class="ksec"><b>⭐ Bargain homes</b>${krow(ksv(G.starDot("#1565c0")), "Meets every criterion and is priced well below nearby listings", "· shown at every zoom; the card says why")}</div>`,
    homes: () => `<div class="ksec"><b>🏠 Homes</b> <span class="small">(1+ acre, 3+ bd, 2+ full ba, ≤ $425k, active)</span>
      ${krow(ksv(G.house(false)), "Home on 1+ acre", "(red house)")}
      ${hf.maxp || hf.mina ? `<div class="small">Filter on: ${hf.maxp ? "≤ " + money(hf.maxp) : ""}${hf.maxp && hf.mina ? ", " : ""}${hf.mina ? hf.mina + "+ acres" : ""} · <button type="button" class="linkbtn" data-openlayers="1">change</button></div>` : ""}</div>`,
    nh: () => `<div class="ksec"><b>🏥 Near-hospital homes</b> <span class="small">(1,600+ sq ft, 3+ bd, 2+ full ba, under $325k, active, good condition, ≤ 10 min free-flow to a hospital with a 24/7 ER of 10+ beds)</span>
      ${krow(ksv(G.house(true)), "Near-hospital home", "(red house with a white nursing cross; houses, townhomes, condos)")}
      ${nfText() ? `<div class="small">Filter on: ${esc(nfText())} · <button type="button" class="linkbtn" data-openlayers="1">change</button></div>` : ""}</div>`,
    trauma: () => `<div class="ksec"><b>Trauma centers</b> <span class="small">(KYHA Jan 2026 + border centers)</span>
      ${krow(mk("trauma", "I", 22), "Level I", "(highest: UK, UofL, Cincinnati, Vanderbilt, Knoxville)")}${krow(mk("trauma", "II", 22), "Level II", "(Pikeville, Evansville, Huntington)")}
      ${krow(mk("trauma", "III", 22), "Level III")}${krow(mk("trauma", "IV", 22), "Level IV", "(stabilize & transfer)")}${krow(mk("trauma", "IP", 22), "Pediatric Level I", "(Norton Children's)")}</div>`,
    travel: () => `<div class="ksec"><b>💼 Travel nurse assignments</b> <span class="small">(white nurse's cap at the hospital = its top weekly pay in $1,000s, e.g. 2.4 = $2,400/wk; outline color = pay band)</span>${krow(ksv(G.nurseCap("2.4", RAMP[0])), "Top pay $2,400/week")}
      ${TJB.map((b, i) => `<div class="kband"><span class="sw" style="background:${RAMP[i]}"></span><span class="kl">${esc(b.label)}</span><span class="kr small">${i === 0 ? "per week" : ""}</span><span class="kn">${b.n}</span></div>`).join("")}
      ${TJ_NOTE()}<div class="kbtns"><a class="linkbtn" href="#travel=all">📋 All ${TJ_ALL.length} jobs ranked by pay</a></div></div>`,
    hosp: () => `<div class="ksec"><b>Other hospitals</b>${krow(ksv(G.nurse()), "Hospital (not a trauma center)", "· nursing cross; shown from zoom 9")}</div>`,
    sch: () => `<div class="ksec"><b>Schools</b> <span class="small">(KDE 2025 rating, best → lowest)</span>
      <div class="kgrid">${["Blue", "Green", "Yellow", "Orange", "Red"].map(r => krow(ksv(G.cap(SCOLOR[r])), r)).join("")}${krow(ksv(G.cap("#9e9e9e")), "Not rated")}</div></div>`,
    col: () => `<div class="ksec"><b>Colleges</b> <span class="small">(NCES)</span>${krow(ksv(G.univ()), "College or university")}${krow(ksv(G.diploma()), "Community / technical college or trade school", "(KCTCS etc.)")}</div>`,
    act: () => `<div class="ksec"><b>Activities & outdoors</b><div class="kgrid">${krow(ksv(G.park()), "Park (state, national, city, county)")}${krow(ksv(G.tent()), "Campground")}${krow(ksv(G.cave()), "Cave")}${krow(ksv(G.mountain()), "Gorge, peak, arch, overlook")}${krow(ksv(G.lake()), "Lake, river, waterfall, spring")}${krow(ksv(G.tree()), "Forest, trail, wildlife area")}${krow(mk("act", ACTI.Distillery, 20), "Distillery")}${krow(mk("act", ACTI.Attraction, 20), "Zoo / attraction")}</div></div>`,
    h_hist: () => krow(mk("hist h-historic", HIST.historic[0], 20), "Historic site / National Historic Landmark"),
    h_coal: () => krow(mk("hist h-coal_camp", HIST.coal_camp[0], 20), "Historic coal camp"),
    h_ghost: () => krow(mk("hist h-ghost_town", HIST.ghost_town[0], 20), "Ghost town"),
    h_mine: () => krow(mk("hist h-mine", HIST.mine[0], 20), "Old mine (USGS MRDS)", "· numbers = clusters"),
  };
  kyxMorePinKey(PIN_KEY);
  function countyKey(sc, title) {
    if (!sc) return "";
    const m = sc.m, ap = m.key === appealKey;
    const rng = c => c.n ? (c.lo === c.hi ? esc(fmtMetric(m, c.lo)) : `${esc(fmtMetric(m, c.lo))} – ${esc(fmtMetric(m, c.hi))}`) : "—";
    const dir = m.neutral ? "No better/worse direction: blue = highest → lowest." : m.lower_better ? "Lower is better here, so the lowest values are green." : "Higher is better here.";
    return `<div class="ksec"><div class="ktitle">${esc(title)}</div><div class="kmetric">${esc(m.label)}</div>
      ${sc.classes.map(c => `<div class="kband"><span class="sw" style="background:${c.color}"></span><span class="kl">${esc(c.label)}</span><span class="kr">${rng(c)}</span><span class="kn">${c.n}</span></div>`).join("")}
      ${sc.missing ? `<div class="kband"><span class="sw" style="background:${NODATA}"></span><span class="kl">No data</span><span class="kr"></span><span class="kn">${sc.missing}</span></div>` : ""}
      <div class="small">${ap ? "Bands are fifths of the 120 counties by rank (24 each). " : "Fifths of the counties by rank; last column = number of counties. "}${dir}</div>
      <div class="kbtns">${AM && /appeal/.test(m.key) ? '<button type="button" class="linkbtn" data-info="appeal">ⓘ How this score works</button>' : ""}<button type="button" class="linkbtn" data-openlayers="1">Change metric</button></div></div>`;
  }
  function renderKey() {
    const on = k => { const d = LAYERS.find(x => x.key === k); return d && d.layer && map.hasLayer(d.layer); };
    let h = "";
    if (on("cty")) h += countyKey(scaleFor(curMetric), "Counties colored by");
    if (on("sweet")) h += countyKey(scaleFor(sweetKey), "Sweet-spot layer");
    if (!on("cty") && !on("sweet")) h += `<div class="ksec small">County coloring is off. Turn on “Counties” in Layers to color by the Appeal score.</div>`;
    const pinKeys = ["props", "homes", "nh", "bargain", "biz", "bldg", "travel", "trauma", "hosp", "apt", "feat", "sch", "col", "act"].filter(k => k === "bargain" ? (K.properties || []).some(p => p.bargain) : PIN_KEY[k]), histKeys = ["h_hist", "h_coal", "h_ghost", "h_mine"];
    const atKeys = (MORE_ATT_KEYS || []).filter(k => PIN_KEY[k]), aOn = atKeys.filter(on), aOff = atKeys.filter(k => !on(k));
    const onK = k => k === "bargain" ? on("homes") || on("nh") || on("props") : on(k);
    const active = pinKeys.filter(onK), off = pinKeys.filter(k => !onK(k));
    h += active.map(k => PIN_KEY[k]()).join("");
    const hOn = histKeys.filter(on), hOff = histKeys.filter(k => !on(k));
    if (hOn.length) h += `<div class="ksec"><b>History</b>${hOn.map(k => PIN_KEY[k]()).join("")}</div>`;
    if (aOn.length) h += `<div class="ksec"><b>Attractions</b>${aOn.map(k => PIN_KEY[k]()).join("")}</div>`;
    h += krow('<span class="ksel"></span>', "Selected item", "(orange ring)");
    if (PIN_KEY._lod) h += PIN_KEY._lod();
    if (off.length || hOff.length || aOff.length) h += `<details class="ksec koff"><summary>Symbols for layers that are off</summary>${off.map(k => PIN_KEY[k]()).join("")}${hOff.length ? `<div class="ksec"><b>History</b>${hOff.map(k => PIN_KEY[k]()).join("")}</div>` : ""}${aOff.length ? `<div class="ksec"><b>Attractions</b>${aOff.map(k => PIN_KEY[k]()).join("")}</div>` : ""}</details>`;
    const wasOpen = keyBody.querySelector("details.koff[open]");
    keyBody.innerHTML = h;
    if (wasOpen) { const d = keyBody.querySelector("details.koff"); if (d) d.open = true; }
    const sc = on("cty") ? scaleFor(curMetric) : on("sweet") ? scaleFor(sweetKey) : null;
    $("#keyMini").innerHTML = sc ? sc.classes.map(c => `<span style="background:${c.color}"></span>`).join("") : "";
    $("#keyMetric").textContent = sc ? sc.m.label.replace(/^★\s*/, "") : "";
  }
  keyEl.addEventListener("click", e => {
    if (e.target.closest("[data-openlayers]")) { lp.hidden = false; lb.setAttribute("aria-expanded", true); if (isPhone()) setKeyOpen(false); msel.focus(); }
  });
  keyReady = true; renderKey();

  // ------------------------------------------------------------------ "How this score works" popover
  const info = $("#infoPop"), infoBody = $("#infoBody");
  function appealInfoHtml() {
    if (!AM) return "<p>The Appeal score method file (ky_county_appeal_method.json) was not available when this map was built.</p>";
    const w = AM.weights, br = AM.band_ranges || [];
    const r = (pts, name, how) => `<tr><td class="n"><b>${pts}</b></td><td><b>${name}</b><br><span class="small">${how}</span></td></tr>`;
    return `<h2>How the Appeal score works</h2>
      <p>A 0–100 score built for a <b>two-nurse household</b>: most of the weight is on what a nurse's pay buys, given where the jobs are. Every input is a published data set; every county is scored against Kentucky's other 119.</p>
      <div class="kicker">Nurse financial value · ${w.afford + w.hosp + w.l12} points</div>
      <table class="tbl wtbl">
      ${r(w.afford, "RN pay vs. home price", "Area RN median annual wage (BLS OEWS, May 2025) ÷ county median home value (ACS 2020–24). Scored as a percentile: 100 = the wage buys the most house in KY. Two RN incomes double the ratio but don't change the ranking.")}
      ${r(w.hosp, "Drive to the nearest acute-care hospital", `Where the nurse jobs are: ${AM.job_hospitals} hospitals = Kentucky's CMS acute-care hospitals (incl. the 2 VA medical centers), Norton Children's, and the 5 border Level I/II centers. Critical-access (≤25 beds), rural emergency, psychiatric and military hospitals are left out. 100 at ≤${AM.hosp_min[0]} min, falling to 0 at ${AM.hosp_min[1]} min.`)}
      ${r(w.l12, "Drive to the nearest Level I/II trauma center", `The big teaching/tertiary employers (${esc(AM.l12_centers.join("; "))}). 100 at ≤${AM.l12_min[0]} min, 0 at ${AM.l12_min[1]} min.`)}
      </table>
      <div class="kicker">Everything else · ${w.land + w.school + w.trauma} points</div>
      <table class="tbl wtbl">
      ${r(w.land, "Land suitability", "Existing land score: % of land in farms, rainfall, number of farms, cropland share, dry-summer risk, surface water (NASS 2022, NOAA).")}
      ${r(w.school, "Schools", "Existing school score: county district reading+math vs. Kentucky and the U.S. (KDE 2024-25, SEDA 2025.1).")}
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
    const rat = cs && cs.ratings ? cs.ratings.split("/").map(r => rbadge(r)).join(" ") : "—";
    return `<table class="kv">${row("County district", esc(cs && cs.district || c + " County"))}
      ${row("Schools vs KY", `${esc(sign(m.sch_pp_ky, 1))} pp ${cs && cs.band_ky ? "(" + esc(cs.band_ky) + ")" : ""}`)}
      ${row("Schools vs US", `${esc(sign(m.sch_gl_us, 2))} grade levels ${cs && cs.band_us ? "(" + esc(cs.band_us) + ")" : ""}`)}
      ${row("KDE rating ES/MS/HS", rat)}${row("Rank in KY", m.sch_rank != null ? "#" + Math.round(m.sch_rank) + " of 120" : null)}
      ${cs && cs.independents ? row("Independent districts", esc(cs.independents)) : ""}</table>`;
  }
  // thumbnail at the top of each card (data/thumbs.json via build.py -> item.th)
  const THUMB_TITLE = { travel: h => h.name, hospital: h => h.name, school: s => s.name, college: c => c.name, activity: a => a.name, history: h => h.name, county: c => c.name + " County, Kentucky", property: p => p.title };
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
    const P = (nb.poi || []).map(q => `${link(q.t, q.id, q.n)} <span class="small">${fmt1(q.mi)} mi</span>`).join("<br>");
    const S = lv => { const x = (nb.s || {})[lv]; return x ? `${link("school", x.id, x.n)} ${rbadge(x.r)}${x.d != null ? ` <span class="small">${x.d >= 0 ? "+" : ""}${fmt1(x.d)} pts vs KY avg</span>` : ""} <span class="small">· ${fmt1(x.mi)} mi</span>` : null; };
    return `<div class="kicker">Nearby</div><table class="kv nb">${row("🏥 Hospital", H(nb.h))}${nb.t && (!nb.h || nb.t.id !== nb.h.id) ? row("🚑 Level I/II", H(nb.t)) : ""}${row("📍 Places", P || null)}${row("🎓 Elementary", S("ES"))}${row("🎓 Middle", S("MS"))}${row("🎓 High", S("HS"))}</table>`;
  }
  const dealNote = p => p.bargain ? `<div class="note deal">⭐ <b>Bargain:</b> ${esc(p.deal || "")}</div>` : "";
  R.property = p => {
    const photos = p.photos || [];
    const gal = photos.length ? `<div class="gal" id="gal">${photos.map((u, i) => `<img src="${esc(u)}" data-i="${i}" loading="${i < 2 ? "eager" : "lazy"}" alt="Photo ${i + 1} of ${esc(p.title)}">`).join("")}</div><div class="galcount">${photos.length} photo${photos.length > 1 ? "s" : ""} · swipe or tap to enlarge</div>` : "";
    const ppa = p.price && p.acres ? money(p.price / p.acres) + "/ac" : null;
    const drives = (p.drives || []).length ? `<div class="kicker">Hospital drive times</div>
      <table class="tbl"><tr><th>Hospital</th><th class="n">Miles</th><th class="n">7 AM</th><th class="n">7 PM</th></tr>
      ${p.drives.map(d => `<tr><td>${esc(d.hospital)}${d.role ? `<br><span class="small"><b>${esc(d.role)}</b></span>` : ""}${d.traffic_aware ? "" : (d.source && /free-flow/.test(d.source) ? "" : '<br><span class="small">free-flow, no traffic data</span>')}${d.source ? `<br><span class="small">${esc(d.source)}</span>` : ""}</td>
        <td class="n">${fmt1(d.miles)}</td>${d.min_7am == null && d.min_7pm == null && !d.range_7am && d.minutes_free_flow != null ? `<td class="n" colspan="2">~${Math.round(d.minutes_free_flow)} min<br><span class="small">no traffic</span></td></tr>` : `<td class="n">${d.range_7am ? esc(d.range_7am) + " min" : (d.min_7am != null ? Math.round(d.min_7am) + " min" : "—")}</td><td class="n">${d.range_7pm ? esc(d.range_7pm) + " min" : (d.min_7pm != null ? Math.round(d.min_7pm) + " min" : "—")}</td></tr>`}`).join("")}</table>` : "";
    const ns = p.near_schools || {};
    if (isNH(p)) return nhCard(p, gal, drives, ns);
    const home = isHome(p);
    return `<div class="kicker">${home ? "🏠 Home · 1+ acre, 3bd/2ba, under $425k" + (p.standout && p.standout.length ? " · ★ standout" : "") : p.standout && p.standout.length ? "★ Standout property" : "Property"}</div><h2>${esc(p.title)}</h2>
      <div class="sub">${esc([p.town, p.county && p.county + " County"].filter(Boolean).join(", "))}</div>
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
      ${p.school_ind ? `<table class="kv">${row(p.school_ind.name, `${esc(sign(p.school_ind.pp_vs_ky, 1))} pp vs KY · ${esc(sign(p.school_ind.gl_vs_us, 2))} GL vs US · ${rbadge(p.school_ind.es)} ${rbadge(p.school_ind.ms)} ${rbadge(p.school_ind.hs)}`)}</table>` : ""}
      <table class="kv">${row("Nearest elementary", ns.ES ? `${link("school", ns.ES.id, ns.ES.name)} ${rbadge(ns.ES.rating)} · ${ns.ES.miles} mi` : null)}
        ${row("Nearest high school", ns.HS ? `${link("school", ns.HS.id, ns.HS.name)} ${rbadge(ns.HS.rating)} · ${ns.HS.miles} mi` : null)}</table>
      <table class="kv">${row("County", p.county ? link("county", p.county, p.county + " County") : null)}${row("Listing", ext(p.url, "Open original listing ↗"))}${row("Date seen", esc(p.seen))}${row("Listing updated", p.updated ? esc(p.updated) : null)}${row("Status", p.status ? esc(p.status) : null)}</table>
      ${p.desc ? `<div class="kicker">Description</div><div class="desc">${esc(p.desc)}</div>` : ""}`;
  };
  function nhCard(p, gal, drives, ns) {
    const nh = p.nh || {};
    const er = nh.er_beds ? `${esc(nh.er_beds)} ER beds/bays${nh.er_beds_label ? ` <span class="small">(${esc(nh.er_beds_label)})</span>` : ""}` : nh.estimate ? "Likely 10+ ER beds <b>(estimate</b>: 100+ licensed beds, 24/7 ER; no published count)" : esc(nh.er_beds_label || "—");
    return `<div class="kicker">🏥 Near-hospital home · ${esc(p.ptype || "House")} · 1,600+ sq ft, 3bd/2ba, under $325k</div><h2>${esc(p.title)}</h2>
      <div class="sub">${esc(p.address || [p.town, p.county && p.county + " County"].filter(Boolean).join(", "))}</div>
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
      <table class="kv">${row("County", p.county ? link("county", p.county, p.county + " County") : null)}${row("Listing", ext(p.url, "Open original listing ↗"))}${row("Source", p.source ? esc(p.source) : null)}${row("Date seen", esc(p.seen))}${row("Status", p.status ? esc(p.status) : null)}</table>
      ${p.desc ? `<div class="kicker">Description</div><div class="desc">${esc(p.desc)}</div>` : ""}`;
  }
  R.hospital = h => `${thumb("hospital", h)}<div class="kicker">${h.trauma ? "Trauma center" : h.kind === "general" ? "Hospital" : "Specialty hospital"}</div><h2>${esc(h.name)}</h2>
    <div class="sub">${esc([h.addr, h.city, h.state].filter(Boolean).join(", "))}</div>
    ${h.trauma ? `<div class="badges"><span class="badge gold">🚑 Trauma ${esc(h.trauma)}</span></div>` : ""}
    <table class="kv">${row("Trauma designation", h.trauma ? `${esc(h.trauma)}${h.trauma_name ? " — listed as “" + esc(h.trauma_name) + "”" : ""}<br><span class="small">${esc(h.trauma_src)}</span>` : "Not on the Kentucky Trauma System list")}
    ${row("Emergency dept.", h.emergency === "yes" ? "Yes (per OpenStreetMap)" : h.emergency === "no" ? "No (per OpenStreetMap)" : null)}
    ${row("Type", h.kind === "general" ? "General / acute care" : "Specialty (psychiatric, rehab, long-term, etc.)")}
    ${row("ER beds", h.er ? (h.er.beds ? `${esc(h.er.beds)} <span class="small">(${esc(h.er.label || "")})</span>` : h.er.ok ? 'Likely 10+ <span class="small">(estimate: 100+ licensed beds, 24/7 ER)</span>' : 'Unknown <span class="small">(no published count; not used for near-hospital homes)</span>') + (h.er.src ? ` · <a href="${esc(h.er.src)}" target="_blank" rel="noopener">source</a>` : "") : null)}
    ${row("Licensed beds", h.lic_beds ? `${esc(h.lic_beds)}${h.lic_type ? " · " + esc(h.lic_type) : ""}<br><span class="small">KY hospital directory, Sep 2026${h.lic_name ? ` · licensed as “${esc(h.lic_name)}”` : ""}</span>` : h.beds ? `${esc(h.beds)} <span class="small">(OpenStreetMap)</span>` : null)}
    ${row("CMS star rating", h.cms_rating ? `${"★".repeat(Math.round(h.cms_rating))}${"☆".repeat(5 - Math.round(h.cms_rating))} ${esc(h.cms_rating)}/5 <span class="small">(CMS overall rating)</span>` : null)}
    ${row("County", h.county ? link("county", h.county, h.county + " County") : esc(h.state || "out of state"))}
    ${row("Phone", h.phone ? `<a href="tel:${esc(h.phone)}">${esc(h.phone)}</a>` : null)}${row("Website", h.web ? ext(h.web, "Website ↗") : null)}
    ${row("Map data", h.osm ? ext(h.osm, "OpenStreetMap ↗") : esc(h.note || ""))}</table>${nearbyProps(h)}`;
  R.travel = travelCard;
  const _hospCard = R.hospital;  // hospital card: link to its travel jobs
  R.hospital = h => { const t = TJ.hospitals.find(x => x.hospital_id === h.id); return _hospCard(h) + (t ? `<div class="kicker">💼 Travel nurse assignments</div><table class="kv">${row("Travel RN jobs", `${link("travel", t.id, t.n + " job" + (t.n > 1 ? "s" : "") + ", top " + money(t.top) + "/wk")}`)}</table>` : ""); };
  R.school = s => {
    const lv = Object.entries(s.levels || {});
    const dr = s.drank || {};
    return `${thumb("school", s)}<div class="kicker">School</div><h2>${esc(s.name)}</h2><div class="sub">${esc(s.district)} · grades ${esc(s.grades)}</div>
    ${lv.length ? `<table class="tbl"><tr><th>Level</th><th>KDE 2025 rating</th><th class="n">Score</th></tr>${lv.map(([L, v]) => `<tr><td>${esc(L)}</td><td>${rbadge(v.rating)}${v.fed ? `<br><span class="small">${esc(v.fed)}</span>` : ""}</td><td class="n">${v.score != null ? fmt1(v.score) : "—"}</td></tr>`).join("")}</table>` : '<div class="note">No 2025 accountability rating for this school/program.</div>'}
    <table class="kv">${row("ACT composite (2024-25)", s.act != null ? esc(s.act) : null)}
    ${Object.entries(dr).map(([L, r]) => row(`District rank (${L})`, `#${esc(r.rank)} of ${esc(r.of)} districts`)).join("")}
    ${row("Address", esc([s.addr, s.city].filter(Boolean).join(", ")))}${row("Phone", s.phone ? `<a href="tel:${esc(s.phone)}">${esc(s.phone)}</a>` : null)}
    ${row("County", link("county", s.county, s.county + " County"))}</table>
    <div class="kicker">County district context</div>${schoolBlock(s.county)}
    <div class="small">KDE colors: Red &lt; Orange &lt; Yellow &lt; Green &lt; Blue (KDE School Report Card, 2024-25 accountability).</div>`;
  };
  R.college = c => `${thumb("college", c)}<div class="kicker">${esc(c.kind)}</div><h2>${esc(c.name)}</h2><div class="sub">${esc([c.addr, c.city].join(", "))}</div>
    <table class="kv">${row("County", link("county", c.county, c.county + " County"))}${row("Details", ext(c.src, "NCES College Navigator ↗"))}</table>`;
  R.activity = a => `${thumb("activity", a)}<div class="kicker">${esc(a.kind)}</div><h2>${esc(a.name)}</h2>
    ${a.desc ? `<div class="desc">${esc(a.desc)}</div>` : ""}
    <table class="kv">${row("County", link("county", a.county, a.county + " County"))}${row("Website", a.web ? ext(a.web, "Website ↗") : null)}
    ${row("Wikipedia", a.wiki ? ext("https://en.wikipedia.org/wiki/" + encodeURIComponent((a.wiki.split(":")[1] || a.wiki).replace(/ /g, "_")), (a.wiki.split(":")[1] || a.wiki) + " ↗") : null)}
    ${row("Map data", ext(a.src, "OpenStreetMap ↗"))}</table>${nearbyProps(a)}`;
  R.history = h => {
    const t = HIST[h.type] || ["", h.type];
    return `${h.th ? thumb("history", h) : ""}<div class="kicker">${t[0]} ${esc(t[1])}${h.nhl ? " · National Historic Landmark" : ""}</div><h2>${esc(h.name)}</h2>
    ${!h.th && h.img ? `<figure class="thumb"><img src="${esc(h.img.thumb)}" alt="${esc(h.name)}" loading="lazy"><figcaption class="attr">Photo: ${esc(h.img.artist)} · ${esc(h.img.license)} · <a href="${esc(h.img.page)}" target="_blank" rel="noopener">Wikimedia Commons</a></figcaption></figure>` : ""}
    <div class="desc">${esc(h.desc)}</div>
    <table class="kv">${row("County", h.county ? link("county", h.county, h.county + " County") : null)}${row("Source", ext(h.src, (h.src_name || "Source") + " ↗"))}</table>`;
  };
  function appealBlock(c) {
    const a = c.appeal; if (!a) return "";
    const k = Math.max(0, BANDS.indexOf(a.band)), w = (AM && AM.weights) || {};
    const comp = [["RN pay vs. home price", a.afford, w.afford, `${money(a.wage)} RN median${a.wage_flag ? "†" : ""} ÷ ${money(a.home)} home = ${a.ratio != null ? a.ratio.toFixed(2) : "—"}`],
      ["Drive to acute-care hospital", a.hosp, w.hosp, `${esc(a.jh.name)} · ${Math.round(a.jh.min)} min / ${fmt1(a.jh.mi)} mi`],
      ["Drive to Level I/II trauma", a.l12, w.l12, `${esc(a.l12h.name)} (Level ${esc(a.l12h.level)}) · ${Math.round(a.l12h.min)} min / ${fmt1(a.l12h.mi)} mi`],
      ["Land suitability", a.land, w.land, "land score"], ["Schools", a.school, w.school, "school score"],
      ["Trauma access (any level)", a.trauma, w.trauma, `${esc(a.trh.name)} (Level ${esc(a.trh.level)}) · ${Math.round(a.trh.min)} min`]];
    return `<div class="appeal" style="--band:${RAMP[k]}"><div class="ascore"><b>${fmt1(a.score)}</b><span>/100</span></div>
      <div class="ameta"><div class="kicker" style="margin-top:0">Appeal score</div><div class="arank">#${a.rank} of 120 · <span class="aband">${esc(a.band)}</span></div>
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
    return `${thumb("county", c)}<div class="kicker">County</div><h2>${esc(c.name)} County, Kentucky</h2>
      ${appealBlock(c)}
      <div class="stats gtiles">${GCATS.map(g => groupTile(c, g)).join("")}</div><div class="small gtip">Tap a tile to list them · tap a row to fly to its pin</div>
      ${sweetKey && c.m[sweetKey] != null ? `<div class="badges"><span class="badge gold">Sweet-spot: ${esc(fmtMetric(metrics.find(m => m.key === sweetKey), c.m[sweetKey]))}</span></div>` : ""}
      ${mrows ? `<div class="kicker">County metrics</div><table class="tbl"><tr><th>Metric</th><th class="n">Value</th><th class="n">Rank</th></tr>${mrows}</table>` : ""}
      ${txt ? `<table class="kv">${txt}</table>` : ""}
      <div class="kicker">Health care</div><table class="kv">${row("Trauma centers in county", c.n.trauma.length ? esc(c.n.trauma.join("; ")) : "None")}
      ${row("Nearest trauma center", c.near_trauma ? `${link("hospital", c.near_trauma.id, c.near_trauma.name)} · ${esc(c.near_trauma.trauma)} · ~${c.near_trauma.miles} mi from county center` : null)}</table>
      <div class="kicker">Schools</div>${schoolBlock(c.name)}
      ${ds.length ? `<table class="tbl"><tr><th>District</th><th class="n">vs KY</th><th class="n">vs US</th><th>ES/MS/HS</th></tr>${ds.map(d => `<tr><td>${esc(d.name)}</td><td class="n">${esc(sign(d.pp_vs_ky, 0))}</td><td class="n">${esc(sign(d.gl_vs_us, 1))}</td><td>${rbadge(d.es)} ${rbadge(d.ms)} ${rbadge(d.hs)}</td></tr>`).join("")}</table>` : ""}
      ${props.length ? `<div class="kicker">Properties here</div><table class="kv">${props.map(p => row(isNH(p) ? "🏥" : isHome(p) ? "🏠" : p.standout && p.standout.length ? "★" : "⌂", link("property", p.id, p.title) + (p.price ? " · " + money(p.price) : ""))).join("")}</table>` : ""}`;
  };
  function nearbyProps(pt) {
    const near = (K.properties || []).filter(p => p.lat != null).map(p => [p, hav(pt.lat, pt.lon, p.lat, p.lon)]).filter(x => x[1] < 25).sort((a, b) => a[1] - b[1]).slice(0, 5);
    return near.length ? `<div class="kicker">Properties within 25 mi</div><table class="kv">${near.map(([p, d]) => row(d.toFixed(1) + " mi", link("property", p.id, p.title))).join("")}</table>` : "";
  }
  function hav(a, b, c, d) { const R = 3958.8, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }


  // ------------------------------------------------------------------ county grouping pages (#county=<slug>&cat=<cat>)
  // Each county-card count tile opens a compact, sorted list of that county's items; each row opens the item's own card and flies to its pin.
  const GCATS = [
    { k: "listings", n: "props", label: "listings", one: "listing", title: "Listings", icon: "🏡", layers: ["props", "homes", "nh"] },
    { k: "hospitals", n: "hosp", label: "hospitals", title: "Hospitals", icon: "🏥", layers: ["trauma", "hosp"] },
    { k: "travel", n: "travel", label: "travel jobs", one: "travel job", title: "Travel nurse jobs", icon: "💼", layers: ["travel"] },
    { k: "schools", n: "schools", label: "schools", title: "Schools", icon: "🏫", layers: ["sch"] },
    { k: "colleges", n: "colleges", label: "colleges", title: "Colleges", icon: "🎓", layers: ["col"] },
    { k: "activities", n: "acts", label: "activities", one: "activity", title: "Activities & outdoors", icon: "🌲", layers: ["act"] },
    { k: "history", n: "hist", label: "history", h2: "history sites", title: "History", icon: "🏛", layers: ["h_hist", "h_coal", "h_ghost", "h_mine"] },
  ];
  const GC = {}; GCATS.forEach(g => GC[g.k] = g);
  const groupHash = (name, cat) => `#county=${slug(name)}&cat=${cat}`;
  const gItems = {
    listings: n => (K.properties || []).filter(p => p.county === n),
    hospitals: n => (K.hospitals || []).filter(h => h.county === n),
    travel: n => TJ_ALL.filter(j => j.h.county === n),
    schools: n => (K.schools || []).filter(s => s.county === n),
    colleges: n => (K.colleges || []).filter(x => x.county === n),
    activities: n => (K.activities || []).filter(x => x.county === n),
    history: n => (K.history || []).filter(x => x.county === n),
  };
  function gCount(c, g) {
    if (g.k === "travel") return c.n.travel != null ? c.n.travel : gItems.travel(c.name).length;
    return c.n[g.n] || 0;
  }
  function groupTile(c, g) {
    const n = gCount(c, g);
    if (!n) return `<div class="stat gt zero" aria-label="No ${esc(g.label)}"><b>0</b><span>${esc(g.label)}</span></div>`;
    return `<a class="stat gt tap" href="${groupHash(c.name, g.k)}" data-grp="${g.k}" aria-label="${n} ${esc(g.label)}: open the list"><b>${n}</b><span>${esc(g.label)}</span><i class="gchev" aria-hidden="true">›</i></a>`;
  }
  const gImg = (src, ph) => src ? `<img class="gth" src="${esc(src)}" alt="" loading="lazy" decoding="async" width="60" height="60">` : `<span class="gth ph" aria-hidden="true">${ph}</span>`;
  const gRow = (type, id, from, img, l1, l2, l3, wrap2) => `<a class="grow" href="#${type}=${esc(encodeURIComponent(id))}" data-go="${type}" data-id="${esc(id)}" data-from="${esc(from)}">${img}
    <span class="gtx"><span class="g1">${l1}</span>${l2 ? `<span class="g2${wrap2 ? " wrap" : ""}">${l2}</span>` : ""}${l3 ? `<span class="g3">${l3}</span>` : ""}</span><i class="gchev" aria-hidden="true">›</i></a>`;
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
    const r = p => gRow("property", p.id, from, gImg(p.rt || (p.th && p.th.u), isHome(p) ? "🏠" : "⌂"),
      `<b>${p.price != null ? money(p.price) : "Price n/a"}</b>${p.beds != null ? ` · ${esc(p.beds)} bd${p.baths != null ? " / " + esc(p.baths) + " ba" : ""}` : ""}${p.acres != null ? ` · ${esc((+p.acres).toLocaleString(undefined, { maximumFractionDigits: 2 }))} ac` : ""}`,
      `${p.standout && p.standout.length ? `<span class="gstar">★ ${esc(p.standout.join(", "))}</span> · ` : ""}${esc(p.title)}`,
      dot([p.town && esc(p.town), nearestDrive(p)]));
    const rn = p => gRow("property", p.id, from, gImg(p.rt || (p.th && p.th.u), "🏥"),
      `<b>${p.price != null ? money(p.price) : "Price n/a"}</b> · ${esc(p.beds)} bd / ${esc(p.baths)} ba · ${sqft(p.sqft)} sq ft`,
      `${esc(p.ptype || "House")} · ${esc(p.title)}`,
      dot([p.town && esc(p.town), p.nh && `🏥 ${Math.round(p.nh.minutes_free_flow)} min to ${esc(shortHosp(p.nh.name))}${p.nh.er_beds ? ` (${esc(p.nh.er_beds)} ER beds)` : p.nh.estimate ? " (10+ ER beds, est.)" : ""}`]));
    const land = xs.filter(p => !isHome(p) && !isNH(p)).sort(byPrice), homes = xs.filter(isHome).sort(byPrice), nhs = xs.filter(isNH).sort(byPrice);
    return { sub: "Sorted by price, lowest first", secs: [["⌂ 5+ acre land", land.map(r), "No 5+ acre land listings here right now."], ["🏠 1-acre homes", homes.map(r), "No 1-acre home listings here right now."],
      ["🏥 Near-hospital homes", nhs.map(rn), "No near-hospital homes here right now."]] };
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
    return { sub: "Trauma centers first, then by size · beds = state licensed beds", secs: [["Hospitals", gen.map(r), "No general hospitals in this county."], ...(spec.length ? [["Specialty (psychiatric, rehab, long-term)", spec.map(r)]] : [])] };
  };
  GB.travel = (c, xs, from) => ({ sub: "Highest weekly pay first · gross pay as posted", note: TJ_NOTE(), secs: [["Travel RN assignments", xs.map(j => gRow("travel", j.h.id, from, gImg(j.h.th && j.h.th.u, "💼"),
    `<b class="gpay">${tjPay(j)}/wk</b> · ${esc(j.u || j.sp || "RN")}`, dot([j.sh && esc(j.sh), j.len && esc(j.len), j.st && "start " + esc(j.st)]), dot([esc(j.h.name), j.ag && esc(j.ag)])))]] });
  GB.schools = (c, xs, from) => {
    const lv = s => Object.entries(s.levels || {}).sort((a, b) => ["HS", "MS", "ES"].indexOf(a[0]) - ["HS", "MS", "ES"].indexOf(b[0])).map(([L, v]) => {
      const d = v.score != null && SKY[L] != null ? v.score - SKY[L] : null;
      return `<span class="glv">${v.rating ? `<span class="r ${esc(v.rating)}">${L}</span>` : `<span class="r nr">${L}</span>`}${v.score != null ? ` ${fmt1(v.score)}` : ""}${d != null ? ` <span class="${d >= 0 ? "up" : "dn"}">${d >= 0 ? "+" : "−"}${fmt1(Math.abs(d))} vs KY</span>` : ""}</span>`; }).join(" ");
    const score = s => { const L = topLevel(s); return L && s.levels[L].score != null ? s.levels[L].score : -1; };
    const r = s => gRow("school", s.id, from, gImg(s.th && s.th.u, "🏫"), `<b>${esc(s.name)}</b>`, lv(s) || "Not rated in 2025", dot([s.grades && "Grades " + esc(s.grades), esc(s.district), s.city && esc(s.city)]), true);
    const secs = ["HS", "MS", "ES"].map(L => [`${LVLNAME[L]} schools`, xs.filter(s => topLevel(s) === L).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name)).map(r)]);
    const other = xs.filter(s => !topLevel(s)).sort((a, b) => a.name.localeCompare(b.name)).map(r);
    if (other.length) secs.push(["Other / not rated", other]);
    return { sub: `KDE 2025 overall score by level vs the KY average (ES ${fmt1(SKY.ES)}, MS ${fmt1(SKY.MS)}, HS ${fmt1(SKY.HS)}) · best first`, secs: secs.filter(x => x[1].length), jump: true };
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
    const body = secs.map((s, i) => `${multi ? `<div class="gsec" id="gs${i}">${esc(s[0])} <span>${s[1].length}</span></div>` : ""}${s[1].length ? s[1].join("") : `<div class="gempty">${esc(s[2] || "None here.")}</div>`}`).join("");
    return `<div class="gbar"><button type="button" class="gback" id="gBack" aria-label="Back to ${esc(c.name)} County card">‹ ${esc(c.name)} County</button>
        <button type="button" class="gshare" id="gShare" aria-label="Share this list">${navigator.share ? "Share" : "Copy link"}</button></div>
      <div class="kicker">${g.icon} ${esc(g.title)}</div><h2>${n} ${esc(n === 1 ? (g.one || (g.h2 || g.label).replace(/s$/, "")) : (g.h2 || g.label))} in ${esc(c.name)} County</h2>
      <div class="sub">${esc(out.sub)}${xs.length ? " · tap a row to open it on the map" : ""}</div>${out.note || ""}${jump}
      <div class="glist">${xs.length || secs.some(s => s[2]) ? body : `<div class="gempty">No ${esc(g.label)} recorded in ${esc(c.name)} County.</div>`}</div>
      <div class="actions"><button class="btn" id="shareBtn">${navigator.share ? "Share…" : "Share"}</button><button class="btn ghost" id="copyBtn">Copy link</button><button class="btn ghost" id="zoomBtn">Zoom to county</button></div>
      <div class="small" style="word-break:break-all">Link: <a href="${groupHash(c.name, g.k)}">${groupHash(c.name, g.k)}</a></div>`;
  }
  const groupShareUrl = (name, cat) => location.protocol === "file:" ? new URL("index.html" + groupHash(name, cat), location.href).href : new URL("share/county-" + slug(name + "-" + cat) + ".html", location.href).href;
  async function shareGroup(name, cat) {
    const g = GC[cat], title = `${g.title} in ${name} County, KY`, url = groupShareUrl(name, cat);
    if (navigator.share) { try { await navigator.share({ title: title + " — Kentucky Explorer", text: title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    copy(url);
  }
  let gBackHist = false, gScroll = null;  // gBackHist: the county card is the previous history entry (opened from its tile)
  function openGroup(name, cat, opts = {}) {
    const c = IDX.county[name], g = GC[cat];
    if (!c || !g) { toast("List not found"); return false; }
    const prev = current;
    current = { type: "group", id: name, cat };
    gBackHist = !!opts.fromCounty;
    body.innerHTML = groupHtml(c, g);
    card.hidden = false; card.classList.add("tall");
    card.scrollTop = gScroll && gScroll.key === name + "|" + cat ? gScroll.top : 0; gScroll = null;
    if (isPhone()) setKeyOpen(false);
    $("#gBack").onclick = () => { if (gBackHist) history.back(); else openItem("county", name, { replace: true, fly: false }); };
    $("#gShare").onclick = $("#shareBtn").onclick = () => shareGroup(name, cat);
    $("#copyBtn").onclick = () => copy(groupShareUrl(name, cat));
    $("#zoomBtn").onclick = () => zoomTo("county", c, true);
    body.querySelectorAll("[data-jump]").forEach(b => b.onclick = () => { const t = $("#" + b.dataset.jump); if (t) card.scrollTo({ top: t.offsetTop - $(".gbar").offsetHeight - 4, behavior: "smooth" }); });
    const h = groupHash(name, cat);
    if (location.hash !== h) history[opts.replace ? "replaceState" : "pushState"](null, "", h);
    document.title = `${g.title} in ${name} County, KY — Kentucky Explorer`;
    g.layers.forEach(k => { const d = LAYERS.find(x => x.key === k); if (d && !d.disabled && !map.hasLayer(d.layer)) setLayer(d, true); });
    if (!(prev && (prev.type === "county" || prev.type === "group") && prev.id === name)) zoomTo("county", c, false);
    highlight("county", c);
    return true;
  }

  // ------------------------------------------------------------------ share
  const TITLE = { travel: h => h.id === "all" ? "Kentucky travel nurse assignments" : h.name + " — travel RN jobs", property: p => p.title, hospital: h => h.name, school: s => s.name, college: c => c.name, activity: a => a.name, history: h => h.name, county: c => c.name + " County, KY" };
  function itemUrl(type, id) { return new URL("index.html#" + type + "=" + encodeURIComponent(id), location.href).href; }
  function shareUrl(type, id) { return new URL("share/" + type + "-" + slug(id) + ".html", location.href).href; }
  function shareUrlBest(type, id) { return location.protocol === "file:" ? itemUrl(type, id) : shareUrl(type, id); }
  async function doShare(type, id) {
    const it = IDX[type][id]; const title = TITLE[type](it); const url = shareUrlBest(type, id);
    if (navigator.share) { try { await navigator.share({ title: title + " — Kentucky Explorer", text: title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
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
  var current = null; let hl = null;  // var: applyHomeFilter() reads it before this line runs
  function openItem(type, id, opts = {}) {
    const it = IDX[type] && IDX[type][id]; if (!it) { toast("Item not found"); return false; }
    const from = opts.from && (GC[opts.from.cat] || (opts.from.top && TOPK[opts.from.top])) ? opts.from : null;
    current = { type, id };
    card.classList.remove("tall");
    body.innerHTML = (from ? `<button type="button" class="gfrom" id="gFrom">‹ ${from.top ? esc(TOPK[from.top].title) : esc(from.county) + " · " + esc(GC[from.cat].title)}</button>` : "") + R[type](it) + `<div class="actions">
        <button class="btn" id="shareBtn">${navigator.share ? "Share…" : "Share"}</button>
        <button class="btn ghost" id="copyBtn">Copy link</button>
        ${it.lat != null || type === "county" ? '<button class="btn ghost" id="zoomBtn">Zoom here</button>' : ""}</div>
        <div class="small" style="word-break:break-all">Link: <a href="#${esc(type)}=${esc(encodeURIComponent(id))}">#${esc(type)}=${esc(id)}</a></div>`;
    card.hidden = false; card.scrollTop = 0;
    if (isPhone()) setKeyOpen(false);
    $("#shareBtn").onclick = () => doShare(type, id);
    $("#copyBtn").onclick = () => copy(shareUrlBest(type, id));
    const zb = $("#zoomBtn"); if (zb) zb.onclick = () => zoomTo(type, it, true);
    const gf = $("#gFrom"); if (gf) gf.onclick = () => history.back();  // the list is the previous history entry
    const g = $("#gal"); if (g) g.querySelectorAll("img").forEach(img => img.onclick = () => openLB(it.photos, +img.dataset.i));
    const tb = body.querySelector("[data-thumb]");
    if (tb && it.th) tb.onclick = () => openLB([it.th.b || it.th.u], 0, [it.th.k === "satellite" ? "Satellite view · " + SAT.c : (it.th.c || "")], [it.th.u]);
    const h = "#" + type + "=" + encodeURIComponent(id);
    if (location.hash !== h) history[opts.replace ? "replaceState" : "pushState"](null, "", h);
    document.title = TITLE[type](it) + " — Kentucky Explorer";
    ensureLayerFor(type, it);
    if (type === "property" && isHome(it)) applyHomeFilter();
    if (type === "property" && isNH(it)) applyNHFilter();  // a home hidden by the Homes filter still shows its pin while open
    if (opts.fly !== false) zoomTo(type, it, false);
    highlight(type, it);
    return true;
  }
  function zoomTo(type, it, force) {
    if (type === "travel" && it.lat == null) return;  // the ranked list has no single location
    const pad = window.innerWidth >= 800 ? { paddingBottomRight: [440, 0] } : { paddingBottomRight: [0, Math.round(window.innerHeight * 0.55)] };
    if (type === "county") { const b = it.bbox; map.flyToBounds([[b[1], b[0]], [b[3], b[2]]], Object.assign({ duration: 0.8, padding: [20, 20] }, pad)); return; }
    const z = type === "property" ? 13 : 14;
    const ll = L.latLng(it.lat, it.lon);
    const target = Math.max(map.getZoom(), force ? z : Math.min(z, 12));
    // shift center so the pin isn't hidden behind the card
    const p = map.project(ll, target);
    if (window.innerWidth >= 800) p.x += 210; else p.y += Math.round(window.innerHeight * 0.27);
    map.flyTo(map.unproject(p, target), target, { duration: 0.8 });
  }
  function highlight(type, it) {
    if (hl) { map.removeLayer(hl); hl = null; }
    if (type === "county") { hl = L.polygon(it.rings.map(r => r.map(([x, y]) => [y, x])), { color: "#e8a317", weight: 4, fill: false, interactive: false }).addTo(map); }
    else if (it.lat != null) { hl = L.circleMarker([it.lat, it.lon], { radius: 20, color: "#e8a317", weight: 3, fill: false, interactive: false }).addTo(map); }
  }
  function closeCard(push = true) {
    card.hidden = true; card.classList.remove("tall"); current = null; if (hl) { map.removeLayer(hl); hl = null; }
    document.title = "Kentucky Explorer";
    if (push && location.hash) history.pushState(null, "", location.pathname + location.search);
  }
  $("#cardClose").onclick = () => closeCard();
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
  // swipe-down to close on phones
  (function () { let y0 = null; card.addEventListener("touchstart", e => { y0 = card.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
    card.addEventListener("touchend", e => { if (y0 != null && e.changedTouches[0].clientY - y0 > 90) closeCard(); y0 = null; }, { passive: true }); })();
  function countyId(id) {
    if (IDX.county[id]) return id;
    return Object.keys(IDX.county).find(k => k.toLowerCase() === id.toLowerCase().replace(/\s*county$/, "")) || Object.keys(IDX.county).find(k => slug(k) === slug(id.replace(/\s*county$/i, ""))) || id;
  }
  function route(replace) {
    const gm = location.hash.replace(/&amp;/g, "&").match(/^#county=([^&]+)&cat=([a-z]+)$/);
    if (gm) {
      const id = countyId(decodeURIComponent(gm[1]));
      if (current && current.type === "group" && current.id === id && current.cat === gm[2]) return;
      openGroup(id, gm[2], { replace: true }); return;
    }
    const tm = location.hash.match(/^#(deals|top-buildings|top-businesses)$/);
    if (tm) { const t = TOPH[tm[1]]; if (current && current.type === "top" && t && current.id === t.k) return; if (t) { openTop(t.k, { replace: true }); return; } }
    const m = location.hash.match(/^#(property|hospital|school|college|activity|history|county|travel|airport|business|building|attraction)=(.+)$/);
    if (!m) { if (!card.hidden) closeCard(false); return; }
    const type = m[1]; let id = decodeURIComponent(m[2]);
    if (!IDX[type][id] && type === "county") { id = Object.keys(IDX.county).find(k => k.toLowerCase() === id.toLowerCase().replace(/\s*county$/, "")) || id; }
    if (!IDX[type][id]) { id = Object.keys(IDX[type]).find(k => slug(k) === slug(id)) || id; }
    if (current && current.type === type && current.id === id) return;
    openItem(type, id, { replace: true });
  }
  window.addEventListener("hashchange", () => route(true));
  window.addEventListener("popstate", () => route(true));

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
    if (e.key === "Escape") { if (!info.hidden) info.hidden = true; else if (!lp.hidden) lp.hidden = true; else if (!card.hidden) closeCard(); }
  });

  // ------------------------------------------------------------------ search
  const all = [];
  Object.entries(IDX).forEach(([type, o]) => Object.values(o).forEach(it => all.push({ type, id: type === "county" ? it.name : it.id, name: type === "county" ? it.name + " County" : (it.title || it.name), sub: type === "property" ? [isNH(it) ? "🏥 Near-hospital home" + (it.ptype && it.ptype !== "House" ? " (" + it.ptype.toLowerCase() + ")" : "") : isHome(it) ? "🏠 1-acre home" : null, it.town, it.county].filter(Boolean).join(", ") : type === "history" ? (HIST[it.type] || [, ""])[1] : (it.kind || it.district || it.city || ""), extra: type === "property" ? [it.address, isNH(it) ? "near hospital home " + (it.nh ? it.nh.name : "") : ""].filter(Boolean).join(" ").toLowerCase() : "" })));
  const LABEL = { travel: "Travel RN jobs", property: "Property / home", hospital: "Hospital", school: "School", college: "College", activity: "Activity", history: "History", county: "County" };
  const si = $("#search"), res = $("#results"); let hits = [], sel = 0;
  si.addEventListener("input", () => {
    const q = si.value.trim().toLowerCase(); if (q.length < 2) { res.hidden = true; return; }
    const pri = { county: 0, property: 1, business: 1, building: 1, travel: 2, hospital: 2, airport: 2, history: 3, activity: 4, attraction: 4, college: 5, school: 6 };
    hits = all.filter(x => x.name.toLowerCase().includes(q) || (x.sub || "").toLowerCase().includes(q) || (x.extra || "").includes(q)).sort((a, b) => (a.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.name.toLowerCase().startsWith(q) ? 0 : 1) || pri[a.type] - pri[b.type]).slice(0, 30);
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
    const L_apt = L.layerGroup(), L_biz = L.layerGroup(), L_bldg = L.layerGroup(), L_at = {};
    Object.keys(MORE_ATT).forEach(t => L_at[t] = L.layerGroup());
    A.forEach(a => {
      const ic = L.divIcon({ className: "", html: `<div class="mk apt${a.oos ? " oos" : ""}${a.nonstops ? "" : " ga"}" style="width:28px;height:28px">✈</div><b class="plab apt">${esc(a.code)}</b>`, iconSize: [28, 28], iconAnchor: [14, 14] });
      const mk = L.marker([a.lat, a.lon], { icon: ic, zIndexOffset: 3000, title: a.name });
      mk.bindTooltip(`✈ ${esc(a.name)} (${esc(a.code)}) · ${a.nonstops ? a.nonstops + " nonstop destinations" : "no scheduled airline service"}`);
      reg("airport", a.id, mk).addTo(L_apt);
    });
    const saleIcon = (cls, sym, x) => L.divIcon({ className: "", html: `<div class="mk ${cls}" style="width:22px;height:22px">${sym}</div>${x.price ? `<b class="plab ${cls.split(" ")[0]}">${priceK(x.price)}</b>` : ""}`, iconSize: [22, 22], iconAnchor: [11, 11] });
    BZ.forEach(x => { const mk = L.marker([x.lat, x.lon], { icon: saleIcon("biz", "$", x), zIndexOffset: 1200, title: x.title });
      mk.bindTooltip(`🏪 ${esc(x.title)}${x.price ? " · " + money(x.price) : ""} · ${esc(x.kind)}${x.town ? " · " + esc(x.town) : ""}`); reg("business", x.id, mk).addTo(L_biz); });
    BD.forEach(x => { const mk = L.marker([x.lat, x.lon], { icon: saleIcon("bldg sv", G.starDot("#2e7d32"), x), zIndexOffset: 1200, title: x.title });
      mk.bindTooltip(`🔔 ${esc(x.title)}${x.price ? " · " + money(x.price) : ""}${x.was ? " · was: " + esc(x.was) : ""}${x.town ? " · " + esc(x.town) : ""}`); reg("building", x.id, mk).addTo(L_bldg); });
    AT.forEach(x => { const t = MORE_ATT[x.type]; if (!t) return;
      const mk = L.marker([x.lat, x.lon], { icon: x.type === "camp" ? sicon("att at-camp", G.tent(), 22, 22) : icon("att at-" + x.type, t[0], 24), zIndexOffset: 100, title: x.name });
      mk.bindTooltip(`${t[0]} ${esc(x.name)} (${esc(t[3])})`); reg("attraction", x.id, mk).addTo(L_at[x.type]); });
    const ins = (after, rows) => { const i = LAYERS.findIndex(d => d.key === after); LAYERS.splice(i < 0 ? LAYERS.length : i + 1, 0, ...rows); };
    ins("nh", [{ key: "biz", label: "🏪 Businesses for sale (under $1M)", layer: L_biz, on: true, n: BZ.length, disabled: !BZ.length },
      { key: "bldg", label: "🔔 Interesting buildings for sale (under $600k)", layer: L_bldg, on: true, n: BD.length, disabled: !BD.length }]);
    ins("hosp", [{ key: "apt", label: "✈ Airports (KY + nearby hubs)", layer: L_apt, on: true, n: A.length, disabled: !A.length }]);
    ins("act", [{ key: "attr", label: "Attractions", group: true }, ...Object.entries(MORE_ATT).map(([t, v]) => ({ key: v[2], label: v[0] + " " + v[1], layer: L_at[t],
      on: t !== "camp", n: AT.filter(x => x.type === t).length, sub: true, disabled: !AT.some(x => x.type === t) }))]);
    // featured standouts: curated outdoor + history sites (featured flag from data/featured.json) move into their own always-on layer
    const L_feat = L.layerGroup(); let nFeat = 0;
    [["activity", K.activities, () => L_act], ["history", K.history, h => L_hist[h.type] || L_hist.historic], ["attraction", AT, x => L_at[x.type]]].forEach(([type, xs, grp]) => (xs || []).forEach(x => {
      if (!x.featured) return; const m = MARK[type + ":" + x.id]; if (!m) return;
      grp(x).removeLayer(m); const o = m.options.icon.options;
      m.setIcon(L.divIcon(Object.assign({}, o, { html: o.html.replace('class="mk ', 'class="mk stout ') }))); m.setZIndexOffset(2500); L_feat.addLayer(m); nFeat++; }));
    ins("apt", [{ key: "feat", label: "★ Kentucky standouts (Red River Gorge, Mammoth Cave, Cumberland Gap…)", layer: L_feat, on: true, n: nFeat, disabled: !nFeat }]);
    MORE_PIN = ["biz", "bldg", "apt", "feat"];
    MORE_LAYER_FOR = { _feat: it => it && it.featured ? "feat" : null, airport: () => "apt", business: () => "biz", building: () => "bldg", attraction: it => MORE_ATT[it.type] && MORE_ATT[it.type][2] };
  }
  function kyxMorePinKey(PIN_KEY) {
    const mk = (cls, html, size) => `<span class="mk ${cls}" style="width:${size}px;height:${size}px">${html}</span>`;
    const krow = (sym, label, note) => `<div class="krow"><span class="ksym">${sym}</span><span>${label}${note ? `<span class="small"> ${note}</span>` : ""}</span></div>`;
    PIN_KEY.biz = () => `<div class="ksec"><b>🏪 Businesses for sale</b> <span class="small">(under $1M asking; Crexi &amp; Zillow, seen ${esc((K.businesses || [])[0] ? K.businesses[0].seen : "")})</span>${krow(mk("biz", "$", 20), "Business for sale", "(green $) · tag beside the pin = asking price")}</div>`;
    PIN_KEY.bldg = () => `<div class="ksec"><b>🔔 Interesting buildings for sale</b> <span class="small">(under $600k: old churches, banks, schools, stores…)</span>${krow(ksv(G.starDot("#2e7d32")), "Unusual building for sale", "(green circle, yellow star) · tag = asking price")}</div>`;
    PIN_KEY.apt = () => `<div class="ksec"><b>✈ Airports</b>${krow(mk("apt", "✈", 20), "Kentucky airport with airline service", "· code beside the pin")}${krow(mk("apt oos", "✈", 20), "Nearby out-of-state airport (BNA, TYS, HTS, EVV, TRI)")}${krow(mk("apt ga", "✈", 20), "No scheduled flights right now")}</div>`;
    Object.values(MORE_ATT || {}).forEach(([e, label, key]) => { const t = Object.keys(MORE_ATT).find(k => MORE_ATT[k][2] === key); PIN_KEY[key] = () => krow(t === "camp" ? ksv(G.tent()) : mk("att at-" + t, e, 20), esc(label)); });
    PIN_KEY.feat = () => `<div class="ksec"><b>★ Kentucky standouts</b> <span class="small">(a short hand-picked list: big parks, gorges, caves, battlefields, landmark homes, plus the famous museums, Newport Aquarium and Ark Encounter)</span>${krow(`<span class="mk sv stout">${G.mountain()}</span>`, "Standout site", "· gold glow; shown from zoom 9")}</div>`;
    PIN_KEY._lod = () => `<div class="ksec small"><b>Zoomed out?</b> Statewide (zoom 8 and out) the map shows only Level I/II trauma centers, airports, businesses and unusual buildings for sale, and ⭐ bargain homes over the county colors. Zoom 9 adds the ★ standouts and all hospitals; zoom 10 (about one county) brings back everything else.</div>`;
  }
  function kyxMoreLate() {
    const A = K.airports || [], BZ = K.businesses || [], BD = K.buildings || [], AT = K.attractions || [];
    const ATT = MORE_ATT;
    Object.assign(THUMB_TITLE, { airport: a => `${a.name} (${a.code})`, business: x => x.title, building: x => x.title, attraction: x => x.name });
    Object.assign(TITLE, { airport: a => `${a.name} (${a.code})`, business: x => x.title + " — business for sale", building: x => x.title + " — building for sale", attraction: x => x.name });
    Object.assign(LABEL, { airport: "Airport", business: "Business for sale", building: "Building for sale", attraction: "Attraction" });
    const sqft = v => v ? Math.round(v).toLocaleString() : "—";
    const wikiUrl = t => "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(t).replace(/ /g, "_"));
    R.airport = a => `${thumb("airport", a)}<div class="kicker">✈ ${a.oos ? "Airport · out of state, near Kentucky" : "Kentucky airport"}</div><h2>${esc(a.name)} (${esc(a.code)})</h2>
      <div class="sub">${esc(a.city)}, ${esc(a.state)}</div>${a.note ? `<div class="note">ℹ️ ${esc(a.note)}</div>` : ""}
      <div class="stats">${stat(a.nonstops != null ? a.nonstops : "—", "nonstop destinations")}${stat((a.airlines || []).length, "airlines")}${stat(esc(a.code), "airport code")}</div>
      ${(a.airlines || []).length ? `<div class="kicker">Airlines</div><div class="badges">${a.airlines.map(x => `<span class="badge">${esc(x)}</span>`).join("")}</div>` : ""}
      ${(a.dests || []).length ? `<div class="kicker">Some nonstop destinations</div><div class="desc">${esc(a.dests.join(" · "))}${a.nonstops > a.dests.length ? " …" : ""}</div>` : ""}
      <table class="kv">${row("County", a.county ? link("county", a.county, a.county + " County") : esc(a.state))}${row("Wikipedia", a.wiki ? ext(a.wiki, "Airlines & destinations ↗") : null)}</table>
      <div class="small">Nonstop count = destinations in Wikipedia's airlines &amp; destinations table (seasonal routes included), checked Oct 2026.</div>${nearbyProps(a)}`;
    function saleCard(x, kind) {
      const photos = x.photos || [];
      const gal = photos.length ? `<div class="gal" id="gal">${photos.map((u, i) => `<img src="${esc(u)}" data-i="${i}" loading="${i < 2 ? "eager" : "lazy"}" alt="Photo ${i + 1} of ${esc(x.title)}">`).join("")}</div><div class="galcount">${photos.length} photo${photos.length > 1 ? "s" : ""} · swipe or tap to enlarge</div>` : "";
      const ppsf = x.price && x.sqft ? "$" + Math.round(x.price / x.sqft).toLocaleString() : "—";
      return `<div class="kicker">${kind === "business" ? "🏪 Business for sale · " + esc(x.kind) : "🔔 Interesting building for sale" + (x.was ? " · was: " + esc(x.was) : "")}</div><h2>${esc(x.title)}</h2>
        <div class="sub">${esc(x.address || [x.town, x.county && x.county + " County"].filter(Boolean).join(", "))}</div>${gal}
        <div class="badges">${x.biz_only ? '<span class="badge">Business only · no real estate</span>' : kind === "business" ? '<span class="badge">Real estate included</span>' : ""}${x.auction ? '<span class="badge gold">Auction</span>' : ""}</div>
        ${x.note ? `<div class="note">⚠️ ${esc(x.note)}</div>` : ""}
        <div class="stats">${stat(money(x.price), "asking price")}${stat(sqft(x.sqft), "sq ft")}${stat(x.acres ? fmt1(x.acres) : "—", "acres")}${stat(ppsf, "per sq ft")}${stat(x.year_built ? esc(x.year_built) : "—", "built")}${stat(esc(x.seen || "—"), "date seen")}</div>${nearbyBlock(x.nearby)}
        <table class="kv">${row(kind === "business" ? "Business" : "What it was", esc(kind === "business" ? x.kind : (x.was || x.kind)))}${row("Address", x.address ? esc(x.address) : null)}
        ${row("County", x.county ? link("county", x.county, x.county + " County") : null)}
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
      <div class="sub">${esc(a.county ? a.county + " County, KY" : "Kentucky")}</div>${a.desc ? `<div class="desc">${esc(a.desc)}</div>` : ""}
      <table class="kv">${row("Campsites", a.sites ? esc(a.sites) : null)}${row("Run by", a.operator ? esc(a.operator) : null)}${row("Lake / area", a.area ? esc(a.area) : null)}${row("Nightly fee", a.price ? esc(a.price) : null)}
      ${row("County", a.county ? link("county", a.county, a.county + " County") : null)}${row(isRec ? "Reserve" : "Website", a.web ? ext(a.web, isRec ? "Reservations & details ↗" : (host(a.web) || "Website") + " ↗") : null)}
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
  // Below about county zoom, everyday pin layers become faint, small canvas dots (no icons, no labels); full icons come back at zoom 10
  // (zoom 11 for schools and minor history). Hospitals, airports, museums, the aquarium and the featured standouts are never dotted.
  // Full icons are only added for the visible area (viewport culling). Each layer's group keeps working for filters (addLayer/removeLayer patched).
  function kyxLOD() {
    const FULL = { feat: 9, trauma: 9, hosp: 9, a_museum: 10, a_aqua: 10, props: 10, homes: 10, nh: 10, travel: 10, col: 10, act: 10, a_park: 10, a_water: 10, a_camp: 10, sch: 11, h_hist: 11, h_coal: 11, h_ghost: 11, h_mine: 11 };
    const bigHosp = h => /^Level (I|II)(\s|$)/.test(h.trauma || "") || (h.kind === "general" && (h.lic_beds || 0) >= 200);
    const top12 = h => /^Level (I|II)(\s|$)/.test(h.trauma || ""), barg = p => !!p.bargain;
    const KEEP = { trauma: top12, props: barg, homes: barg, nh: barg };  // always icons even when zoomed out; everything else is hidden below its FULL zoom
    const DOTSTY = { trauma: [0.75, 0.6, "#c62828"], hosp: [0.75, 0.6, "#c62828"] };  // [fillOpacity, extra radius, color]: hospitals a bit stronger than ordinary dots
    const itemOf = l => { const k = REV.get(l); if (!k) return null; const i = k.indexOf(":"); return (IDX[k.slice(0, i)] || {})[k.slice(i + 1)] || null; };
    const FB = { props: "#e8a317", homes: "#00897b", nh: "#1565c0", travel: "#1a7d3a", biz: "#e65100", bldg: "#8e244d", a_park: "#c2185b", a_water: "#0288d1", a_camp: "#5b7f1f" };
    map.createPane("lodPane").style.zIndex = 450;
    const dotR = L.canvas({ pane: "lodPane", padding: 0.3, tolerance: 5 });
    const REV = new Map(); Object.entries(MARK).forEach(([k, m]) => REV.set(m, k));
    const open = l => { const k = REV.get(l); if (k) { const i = k.indexOf(":"); openItem(k.slice(0, i), k.slice(i + 1)); } };
    const cc = {};
    function colorOf(l, fb) {
      if (l instanceof L.CircleMarker) return l.options.fillColor || fb;
      const html = (l.options.icon && l.options.icon.options.html) || "";
      if (cc[html] !== undefined) return cc[html] || fb;
      const m = html.match(/background:\s*(#[0-9a-f]{3,8}|rgb[^;"]+)/i);
      let c = m ? m[1] : "";
      if (!c) { const tmp = document.createElement("div"); tmp.style.cssText = "position:absolute;left:-9999px;top:0"; tmp.innerHTML = html; document.body.appendChild(tmp);
        const el = tmp.querySelector(".mk"); c = el ? getComputedStyle(el).backgroundColor : ""; tmp.remove();
        if (!c || c === "transparent" || /rgba\(0, 0, 0, 0\)/.test(c)) c = ""; }
      cc[html] = c; return c || fb;
    }
    const LOD = L.Layer.extend({
      initialize(d) {
        this.d = d; this.g = d.layer; this.shown = new Set(); this.tier = null; this.dirty = true;
        const self = this, g = this.g, add = g.addLayer, rem = g.removeLayer;
        g.addLayer = function (l) { add.call(g, l); self.dirty = true; self._soon(); return g; };
        g.removeLayer = function (l) { rem.call(g, l); self.dirty = true; if (self.shown.has(l)) { if (self._map) self._map.removeLayer(l); self.shown.delete(l); } self._soon(); return g; };
      },
      onAdd(m) { this._map = m; this.tier = null; m.on("zoomend", this._upd, this); m.on("moveend", this._cull, this); this._upd(); },
      onRemove(m) { m.off("zoomend", this._upd, this); m.off("moveend", this._cull, this); this._clear(); this.tier = null; },
      _soon() { if (!this._map || this._t) return; this._t = setTimeout(() => { this._t = null; this._upd(); }, 40); },
      _upd() {
        if (!this._map) return;
        const z = this._map.getZoom(), t = z >= FULL[this.d.key] ? "full" : "dot";
        if (t !== this.tier) { this._clear(); this.tier = t; this.dirty = true; }
        if (t === "dot") { if (this.dirty) { this._clearDots(); this._dots(); } this._size(z); } else this._cull();
        this.dirty = false;
      },
      _cull() {
        if (this.tier !== "full" || !this._map) return;
        const m = this._map, b = m.getBounds().pad(0.3);
        this.g.eachLayer(l => { const inb = b.contains(l.getLatLng()); if (inb && !this.shown.has(l)) { m.addLayer(l); this.shown.add(l); } else if (!inb && this.shown.has(l)) { m.removeLayer(l); this.shown.delete(l); } });
      },
      _clearDots() { if (this.dl && this._map) this._map.removeLayer(this.dl); this.dl = null; this.rz = null; },
      _clear() { this._clearDots(); this.shown.forEach(l => this._map && this._map.removeLayer(l)); this.shown.clear(); },
      _size(z) { const r = (z < 7 ? 1.8 : z < 8 ? 2.2 : z < 9 ? 2.6 : 3) + (DOTSTY[this.d.key] ? DOTSTY[this.d.key][1] : 0); if (r === this.rz || !this.dl) return; this.rz = r; this.dl.eachLayer(c => c.setRadius(r)); },
      _dots() {
        const key = this.d.key, fb = FB[key] || "#607d8b", lg = L.layerGroup(), keep = KEEP[key], sty = DOTSTY[key];
        this.g.eachLayer(l => { if (keep) { const it = itemOf(l); if (it && keep(it)) { this._map.addLayer(l); this.shown.add(l); return; } }
          return;  // hidden below FULL zoom (Bill: hidden preferred over faint dots)
          const cm = L.circleMarker(l.getLatLng(), { renderer: dotR, radius: 2.2, stroke: false, fillColor: sty ? sty[2] : colorOf(l, fb), fillOpacity: sty ? sty[0] : 0.42 });
          const tt = l.getTooltip && l.getTooltip(); if (tt) cm.bindTooltip(tt.getContent());
          cm.on("click", e => { if (e.originalEvent) e.originalEvent._kyxHandled = true; open(l); }); lg.addLayer(cm); });
        this.dl = lg.addTo(this._map);
      },
    });
    LAYERS.forEach(d => {
      if (!d.layer || d.group || !FULL[d.key]) return;
      const was = map.hasLayer(d.layer); if (was) map.removeLayer(d.layer);
      d.layer = new LOD(d); if (was) d.layer.addTo(map);
    });
    // always-icon layers sit above the dots when zoomed out: trauma > hospitals > airports > standouts > museums/aquarium
    const lift = [];
    Object.entries(MARK).forEach(([k, m]) => { if (!m.setZIndexOffset) return; const it = k.split(":"), x = (IDX[it[0]] || {})[k.slice(it[0].length + 1)] || {};
      const zh = it[0] === "hospital" ? (x.trauma ? 9000 : 8000) : it[0] === "airport" ? 7000 : x.featured ? 6000 : it[0] === "property" && x.bargain ? 6500 : it[0] === "business" || it[0] === "building" ? 5500 : it[0] === "attraction" && (x.type === "museum" || x.type === "aquarium") ? 5000 : 0;
      if (zh) lift.push([m, m.options.zIndexOffset || 0, zh]); });
    let lifted = null;
    const zl = () => { const low = map.getZoom() < 10; if (low === lifted) return; lifted = low; lift.forEach(([m, z0, zh]) => m.setZIndexOffset(low ? zh : z0)); };
    map.on("zoomend", zl); zl();
    if (keyReady) renderKey();
  }
  // ================================================================ /more layers
  kyxMoreLate();
  // ------------------------------------------------------------------ top-10 bubbles (#deals, #top-buildings, #top-businesses)
  // Three bubbles anchored just south of Kentucky (Tennessee) + a fixed "Top 10s" button; lists come from build.py (scripts/top_lists.py).
  const TOPD = K.tops || {};
  const TOPS = [
    { k: "deals", hash: "deals", type: "property", src: "properties", ll: [35.95, -85.5], icon: G.starDot("#1565c0"), cls: "tb-deals",
      label: n => `⭐ Deals of the Week (${n})`, title: "⭐ Deals of the Week", h2: n => `The ${n} best home values right now`,
      sub: "Every home listing (5-acre, 1-acre and near-hospital, ⭐ bargains and others) ranked by price per sq ft (per acre for 5-acre land) vs nearby Zillow listings, criteria fit and extras" },
    { k: "buildings", hash: "top-buildings", type: "building", src: "buildings", ll: [35.95, -87.98], icon: G.starDot("#2e7d32"), cls: "tb-bldg",
      label: n => `Top ${n} Odd Buildings`, title: "Top 10 Odd Buildings", h2: n => `Top ${n} odd buildings for sale`,
      sub: "Ranked by how interesting or historic it is, price per sq ft vs the other odd buildings listed, and condition" },
    { k: "businesses", hash: "top-businesses", type: "business", src: "businesses", ll: [35.95, -83.02], icon: `<span class="mk biz" style="width:22px;height:22px">$</span>`, cls: "tb-biz",
      label: n => `Top ${n} Businesses for Sale`, title: "Top 10 Businesses for Sale", h2: n => `Top ${n} businesses for sale`,
      sub: "Ranked by value (asking price vs stated revenue or cash flow), whether the real estate is included, and appeal (Red River Gorge cabins, RV parks, lake lodging…)" },
  ].filter(t => (TOPD[t.k] || []).length);
  const TOPK = {}; TOPS.forEach(t => TOPK[t.k] = t);
  const TOPH = {}; TOPS.forEach(t => TOPH[t.hash] = t);
  const topRows = t => (TOPD[t.k] || []).map(r => [r, IDX[t.type] && IDX[t.type][r.id]]).filter(x => x[1]);
  const acres = a => (+a).toLocaleString(undefined, { maximumFractionDigits: 2 }) + " ac";
  function topRow(t, r, x) {
    const from = "top|" + t.k, img = gImg(x.rt || (x.th && x.th.u) || (x.photos || [])[0], t.k === "deals" ? "🏠" : t.k === "buildings" ? "⛪" : "$");
    const size = [x.sqft && sqft(x.sqft) + " sq ft", x.acres != null && x.acres !== "" && acres(x.acres)].filter(Boolean).join(" · ");
    const facts = t.k === "deals" ? dot([`<b>#${r.rank} ${money(x.price)}</b>`, x.beds != null && `${esc(x.beds)} bd / ${esc(x.bath_detail ? x.bath_detail.replace(/ full/, "") : x.baths)} ba`, size])
      : dot([`<b>#${r.rank} ${x.price != null ? money(x.price) : "Price n/a"}</b>`, size || null]);
    const l3 = dot([x.town && esc(x.town), t.k === "deals" ? (r.bargain ? '<span class="gstar">⭐ Bargain</span>' : null) : esc(x.title)]);
    return gRow(t.type, x.id, from, img, facts, esc(r.why), l3, true);
  }
  function topHtml(t) {
    const rows = topRows(t), n = rows.length;
    const nav = TOPS.length > 1 ? `<nav class="gjump tnav" aria-label="Other top lists">${TOPS.map(o => `<a class="tchip${o.k === t.k ? " on" : ""}" href="#${o.hash}">${esc(o.title.replace(/^⭐ /, "⭐ "))}</a>`).join("")}</nav>` : "";
    return `<div class="gbar"><button type="button" class="gback" id="gBack" aria-label="Back to the map">‹ Map</button>
        <button type="button" class="gshare" id="gShare" aria-label="Share this list">${navigator.share ? "Share" : "Copy link"}</button></div>
      <div class="kicker">${esc(t.title)} · <span class="tupd">Updated ${esc(TOPD.updated || "")}</span></div><h2>${esc(t.h2(n))}</h2>
      <div class="sub">${esc(t.sub)} · tap a row to open it on the map</div>${nav}
      <div class="glist tlist">${rows.map(([r, x]) => topRow(t, r, x)).join("") || '<div class="gempty">Nothing qualifies right now.</div>'}</div>
      <div class="actions"><button class="btn" id="shareBtn">${navigator.share ? "Share…" : "Share"}</button><button class="btn ghost" id="copyBtn">Copy link</button><button class="btn ghost" id="zoomBtn">Show all on map</button></div>
      <div class="small" style="word-break:break-all">Link: <a href="#${t.hash}">#${t.hash}</a></div>`;
  }
  const topShareUrl = t => location.protocol === "file:" ? new URL("index.html#" + t.hash, location.href).href : new URL("share/" + t.hash + ".html", location.href).href;
  async function shareTop(t) {
    const url = topShareUrl(t);
    if (navigator.share) { try { await navigator.share({ title: t.title + " — Kentucky Explorer", text: t.title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    copy(url);
  }
  function openTop(key, opts = {}) {
    const t = TOPK[key]; if (!t) { toast("List not found"); return false; }
    current = { type: "top", id: key };
    if (hl) { map.removeLayer(hl); hl = null; }
    body.innerHTML = topHtml(t);
    card.hidden = false; card.classList.add("tall");
    card.scrollTop = gScroll && gScroll.key === "top|" + key ? gScroll.top : 0; gScroll = null;
    if (isPhone()) setKeyOpen(false);
    $("#gBack").onclick = () => closeCard();
    $("#gShare").onclick = $("#shareBtn").onclick = () => shareTop(t);
    $("#copyBtn").onclick = () => copy(topShareUrl(t));
    $("#zoomBtn").onclick = () => { const pts = topRows(t).map(([, x]) => [x.lat, x.lon]).filter(p => p[0] != null);
      if (pts.length) map.flyToBounds(pts, Object.assign({ duration: 0.8, padding: [30, 30] }, window.innerWidth >= 800 ? { paddingBottomRight: [440, 30] } : { paddingBottomRight: [30, Math.round(window.innerHeight * 0.55)] })); };
    const h = "#" + t.hash;
    if (location.hash !== h) history[opts.replace ? "replaceState" : "pushState"](null, "", h);
    document.title = t.title.replace(/^⭐ /, "") + " — Kentucky Explorer";
    tmenu.hidden = true;
    return true;
  }
  if (TOPS.length) {
    map.createPane("tops"); map.getPane("tops").style.zIndex = 640;
    TOPS.forEach(t => {
      const n = (TOPD[t.k] || []).length;
      const ic = L.divIcon({ className: "topbub-wrap", iconSize: [0, 0], iconAnchor: [0, 0],
        html: `<a class="topbub ${t.cls}" href="#${t.hash}" role="button" aria-label="${esc(t.label(n))}: open the list"><span class="tbi">${t.icon}</span><span class="tbt">${esc(t.label(n).replace(/^⭐ /, ""))}</span></a>` });
      const mk = L.marker(t.ll, { icon: ic, pane: "tops", keyboard: false, title: t.label(n) }).addTo(map);
      mk.on("click", e => { if (e.originalEvent) { e.originalEvent.preventDefault(); e.originalEvent._kyxHandled = true; } openTop(t.k); });
    });
  }
  // fixed fallback button (bottom right) -> small menu of the three lists
  const tbtn = document.createElement("button"), tmenu = document.createElement("div");
  tbtn.id = "topBtn"; tbtn.type = "button"; tbtn.className = "topbtn"; tbtn.innerHTML = "🏆 Top 10s"; tbtn.setAttribute("aria-expanded", "false"); tbtn.setAttribute("aria-controls", "topMenu");
  tmenu.id = "topMenu"; tmenu.className = "topmenu"; tmenu.hidden = true;
  tmenu.innerHTML = TOPS.map(t => `<a href="#${t.hash}" data-top="${t.k}"><span class="tbi">${t.icon}</span>${esc(t.label((TOPD[t.k] || []).length).replace(/^⭐ /, ""))}</a>`).join("") + `<div class="small">Updated ${esc(TOPD.updated || "")}</div>`;
  if (TOPS.length) { document.body.appendChild(tbtn); document.body.appendChild(tmenu); }
  tbtn.onclick = () => { tmenu.hidden = !tmenu.hidden; tbtn.setAttribute("aria-expanded", !tmenu.hidden); };
  tmenu.addEventListener("click", e => { const a = e.target.closest("[data-top]"); if (!a) return; e.preventDefault(); openTop(a.dataset.top); });
  document.addEventListener("click", e => { if (!tmenu.hidden && !e.target.closest("#topMenu,#topBtn")) { tmenu.hidden = true; tbtn.setAttribute("aria-expanded", "false"); } });
  // ------------------------------------------------------------------ start
  // de-clutter when zoomed out: hide minor hospitals, shrink markers
  const zc = () => { const z = map.getZoom(), el = map.getContainer(); el.classList.toggle("z-low", z < 8); el.classList.toggle("z-vlow", z < 7); };
  map.on("zoomend", zc);
  if (location.hash) route(true);
  else if (isPhone()) { const zs = map.options.zoomSnap; map.options.zoomSnap = 0.05; map.fitBounds([[36.49, -89.57], [39.15, -81.96]], { padding: [2, 2], animate: false }); map.options.zoomSnap = zs; }  // phone: Kentucky fills the width
  else map.fitBounds([[36.5, -89.55], [39.15, -81.95]], { paddingTopLeft: [325, 50], paddingBottomRight: [8, 8] });  // keep the map key from covering the Purchase
  zc();
  window.KYXApp = { openItem, closeCard, map, IDX };
})();

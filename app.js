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
  const map = L.map("map", { zoomControl: false, preferCanvas: true, minZoom: 6, maxZoom: 18 }).setView([37.75, -85.7], 7);
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
  const IDX = { property: {}, hospital: {}, school: {}, college: {}, activity: {}, history: {}, county: {} };
  const MARK = {};  // "type:id" -> marker/layer
  (K.properties || []).forEach(x => IDX.property[x.id] = x);
  (K.hospitals || []).forEach(x => IDX.hospital[x.id] = x);
  (K.schools || []).forEach(x => IDX.school[x.id] = x);
  (K.colleges || []).forEach(x => IDX.college[x.id] = x);
  (K.activities || []).forEach(x => IDX.activity[x.id] = x);
  (K.history || []).forEach(x => IDX.history[x.id] = x);
  (K.counties || []).forEach(x => IDX.county[x.name] = x);

  const icon = (cls, html, size = 26) => L.divIcon({ className: "", html: `<div class="mk ${cls}" style="width:${size}px;height:${size}px">${html}</div>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

  // ------------------------------------------------------------------ county choropleth
  const metrics = (K.meta && K.meta.metrics) || [];
  const sweetKey = K.meta && K.meta.sweet;
  const PAL_DIV = ["#b2182b", "#ef8a62", "#fddbc7", "#f7f7f7", "#d1e5f0", "#67a9cf", "#2166ac"];
  const PAL_SEQ = ["#f7fcf5", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a32"];
  const PAL_SWEET = ["#fff5eb", "#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#e6550d", "#a63603"];
  function scaleFor(key, pal) {
    const m = metrics.find(x => x.key === key); if (!m) return null;
    const vals = (K.counties || []).map(c => c.m[key]).filter(v => v != null).sort((a, b) => a - b);
    if (!vals.length) return null;
    const diverging = /pp|gl/.test(m.fmt) && !pal;
    pal = pal || (diverging ? PAL_DIV : PAL_SEQ);
    let breaks;
    if (diverging) { const mx = Math.max(Math.abs(vals[0]), Math.abs(vals[vals.length - 1])) || 1; breaks = [-.6, -.3, -.1, .1, .3, .6].map(f => f * mx); }
    else breaks = [1, 2, 3, 4, 5, 6].map(i => vals[Math.floor(i * (vals.length - 1) / 7)]);
    const color = v => { if (v == null) return "#ccc"; let i = 0; while (i < breaks.length && v > breaks[i]) i++; const c = m.lower_better ? pal[pal.length - 1 - i] : pal[i]; return c; };
    return { m, color, min: vals[0], max: vals[vals.length - 1], pal: m.lower_better ? pal.slice().reverse() : pal };
  }
  function fmtMetric(m, v) {
    if (v == null) return "—";
    if (m.fmt === "pp") return sign(v, 1) + " pp";
    if (m.fmt === "gl") return sign(v, 2) + " grade lvls";
    if (m.fmt === "usd") return money(v);
    if (m.fmt === "int") return Math.round(v).toString();
    return Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : fmt1(v);
  }
  let curMetric = localStorage.getItem("kyx_metric") || (metrics[0] && metrics[0].key) || "";
  if (!metrics.find(m => m.key === curMetric)) curMetric = metrics[0] ? metrics[0].key : "";
  const countyLayer = L.layerGroup(), sweetLayer = L.layerGroup();
  const countyPolys = {};
  function countyStyle(c, sc) { return { color: "#123642", weight: 0.8, opacity: 0.7, fillColor: sc ? sc.color(c.m[sc.m.key]) : "#000", fillOpacity: sc ? 0.45 : 0.02 }; }
  function drawCounties() {
    countyLayer.clearLayers();
    const sc = scaleFor(curMetric);
    (K.counties || []).forEach(c => {
      const p = L.polygon(c.rings.map(r => r.map(([x, y]) => [y, x])), countyStyle(c, sc));
      p.bindTooltip(`${esc(c.name)}${sc ? ": " + esc(fmtMetric(sc.m, c.m[sc.m.key])) : ""}`, { sticky: true });
      p.on("click", e => { if (!e.originalEvent._kyxHandled) openItem("county", c.name, { fly: false }); });
      countyLayer.addLayer(p); countyPolys[c.name] = p;
    });
    legend(sc, "#legend");
  }
  function drawSweet() {
    sweetLayer.clearLayers();
    const sc = sweetKey && scaleFor(sweetKey, PAL_SWEET);
    if (!sc) return;
    (K.counties || []).forEach(c => {
      const v = c.m[sweetKey];
      const p = L.polygon(c.rings.map(r => r.map(([x, y]) => [y, x])), { color: "#7a3000", weight: v != null && v >= sc.max * 0.85 ? 2.5 : 0.6, fillColor: sc.color(v), fillOpacity: 0.55 });
      p.bindTooltip(`${esc(c.name)} — sweet spot: ${esc(fmtMetric(sc.m, v))}`, { sticky: true });
      p.on("click", () => openItem("county", c.name, { fly: false }));
      sweetLayer.addLayer(p);
    });
  }
  function legend(sc, sel) {
    const el = $(sel); if (!sc) { el.innerHTML = metrics.length ? "" : '<span class="small">County metrics will appear when data CSVs are available.</span>'; return; }
    el.innerHTML = `<div class="bar">${sc.pal.map(c => `<span style="background:${c}"></span>`).join("")}</div>
      <div class="ends"><span>${esc(fmtMetric(sc.m, sc.m.lower_better ? sc.max : sc.min))}</span><span>${sc.m.lower_better ? "better →" : "higher →"}</span><span>${esc(fmtMetric(sc.m, sc.m.lower_better ? sc.min : sc.max))}</span></div>
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
  msel.onchange = () => { curMetric = msel.value; localStorage.setItem("kyx_metric", curMetric); drawCounties(); };
  drawCounties(); drawSweet();

  // ------------------------------------------------------------------ point layers
  const L_props = L.layerGroup(), L_hosp = L.layerGroup(), L_trauma = L.layerGroup(), L_sch = L.layerGroup(), L_col = L.layerGroup(), L_act = L.layerGroup();
  const L_hist = {
    mine: L.markerClusterGroup({ maxClusterRadius: 45, showCoverageOnHover: false, iconCreateFunction: cl => L.divIcon({ className: "", html: `<div class="mk h-mine" style="width:30px;height:30px">${cl.getChildCount()}</div>`, iconSize: [30, 30] }) }),
    coal_camp: L.layerGroup(), ghost_town: L.layerGroup(), historic: L.layerGroup()
  };
  const HIST = { mine: ["⛏", "Old mine (USGS MRDS)"], coal_camp: ["🏚", "Historic coal camp"], ghost_town: ["👻", "Ghost town"], historic: ["🏛", "Historic site"] };
  const SCOLOR = { Blue: "#1e5bd8", Green: "#2e9a4b", Yellow: "#e6c229", Orange: "#ef7d1a", Red: "#d33a2c" };
  const ACTI = { "Park": "🌲", "Park / public land": "🏞", "Waterfall": "💧", "Cave": "🕳", "Distillery": "🥃", "Natural arch": "🌉", "Attraction": "🎡", "Hiking trail": "🥾" };

  function reg(type, id, mk) { MARK[type + ":" + id] = mk; mk.on("click", e => { if (e.originalEvent) e.originalEvent._kyxHandled = true; openItem(type, id, { fly: false }); }); return mk; }
  (K.properties || []).forEach(p => {
    if (p.lat == null || p.lon == null) return;
    const star = p.standout && p.standout.length;
    const approx = p.precision === "town";
    const ic = star ? icon("star" + (approx ? " approx" : ""), "★", 34) : icon("prop" + (approx ? " approx" : ""), "<i>⌂</i>", 28);
    const mk = L.marker([p.lat, p.lon], { icon: ic, zIndexOffset: star ? 2000 : 1000, title: p.title });
    mk.bindTooltip(`${esc(p.title)}${p.price ? " · " + money(p.price) : ""}${p.acres ? " · " + p.acres + " ac" : ""}${star ? " ★ " + esc(p.standout.join(", ")) : ""}`);
    reg("property", p.id, mk).addTo(L_props);
  });
  (K.hospitals || []).forEach(h => {
    const tr = h.trauma;
    const lv = tr ? (tr.match(/Level (I{1,3}V?|IV)/) || [0, ""])[1] + (/Pediatric/.test(tr) ? "P" : "") : "";
    const mk = L.marker([h.lat, h.lon], { icon: tr ? icon("trauma", lv, 28) : icon("hosp", "+", h.kind === "general" ? 22 : 18), zIndexOffset: tr ? 500 : 0, title: h.name, opacity: h.kind === "general" ? 1 : 0.75 });
    mk.bindTooltip(esc(h.name) + (tr ? " — Trauma " + esc(tr) : h.kind !== "general" ? " (specialty)" : ""));
    reg("hospital", h.id, mk).addTo(tr ? L_trauma : L_hosp);
  });
  (K.schools || []).forEach(s => {
    const mk = L.circleMarker([s.lat, s.lon], { radius: 6, weight: 1.5, color: "#fff", fillColor: SCOLOR[s.rating] || "#9e9e9e", fillOpacity: 0.95 });
    mk.bindTooltip(`${esc(s.name)}${s.rating ? " — " + esc(s.rating) : ""}`);
    reg("school", s.id, mk).addTo(L_sch);
  });
  (K.colleges || []).forEach(c => {
    const mk = L.marker([c.lat, c.lon], { icon: icon("col", "🎓", 24), title: c.name });
    mk.bindTooltip(esc(c.name)); reg("college", c.id, mk).addTo(L_col);
  });
  (K.activities || []).forEach(a => {
    const mk = L.marker([a.lat, a.lon], { icon: icon("act", ACTI[a.kind] || "★", 24), title: a.name });
    mk.bindTooltip(`${esc(a.name)} (${esc(a.kind)})`); reg("activity", a.id, mk).addTo(L_act);
  });
  (K.history || []).forEach(h => {
    const t = HIST[h.type] || ["•", h.type];
    const mk = L.marker([h.lat, h.lon], { icon: icon("hist h-" + h.type, t[0], h.type === "mine" ? 22 : 26), title: h.name });
    mk.bindTooltip(`${esc(h.name)} — ${esc(t[1])}`); reg("history", h.id, mk).addTo(L_hist[h.type] || L_hist.historic);
  });

  // ------------------------------------------------------------------ layer panel
  const nHist = t => (K.history || []).filter(h => h.type === t).length;
  const LAYERS = [
    { key: "props", label: "★ Notable Properties", layer: L_props, on: true, n: (K.properties || []).length },
    { key: "trauma", label: "Trauma centers", layer: L_trauma, on: true, n: (K.hospitals || []).filter(h => h.trauma).length },
    { key: "hosp", label: "Other hospitals", layer: L_hosp, on: true, n: (K.hospitals || []).filter(h => !h.trauma).length },
    { key: "sch", label: "Schools (KDE color rating)", layer: L_sch, on: false, n: (K.schools || []).length },
    { key: "col", label: "Colleges & universities", layer: L_col, on: false, n: (K.colleges || []).length },
    { key: "act", label: "Activities & outdoors", layer: L_act, on: false, n: (K.activities || []).length },
    { key: "hist", label: "History", group: true },
    { key: "h_hist", label: "🏛 Historic sites & landmarks", layer: L_hist.historic, on: false, n: nHist("historic"), sub: true },
    { key: "h_coal", label: "🏚 Coal camps", layer: L_hist.coal_camp, on: false, n: nHist("coal_camp"), sub: true },
    { key: "h_ghost", label: "👻 Ghost towns", layer: L_hist.ghost_town, on: false, n: nHist("ghost_town"), sub: true },
    { key: "h_mine", label: "⛏ Old mines (USGS MRDS)", layer: L_hist.mine, on: false, n: nHist("mine"), sub: true },
    { key: "cty", label: "Counties (colored by metric below)", layer: countyLayer, on: true },
    { key: "sweet", label: "Sweet-spot counties", layer: sweetLayer, on: false, disabled: !sweetKey, note: sweetKey ? "" : " (data pending)" },
  ];
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
    if (on) d.layer.addTo(map);
  });
  function setLayer(d, on) { if (on) { d.layer.addTo(map); if (d.key === "cty" || d.key === "sweet") d.layer.eachLayer(l => l.bringToBack && l.bringToBack()); } else map.removeLayer(d.layer); if (d.cb) d.cb.checked = on; }
  function ensureLayerFor(type, item) {
    const k = { property: "props", school: "sch", college: "col", activity: "act" }[type]
      || (type === "hospital" ? (item.trauma ? "trauma" : "hosp") : null)
      || (type === "history" ? { mine: "h_mine", coal_camp: "h_coal", ghost_town: "h_ghost", historic: "h_hist" }[item.type] : null);
    const d = LAYERS.find(x => x.key === k); if (d && !map.hasLayer(d.layer)) setLayer(d, true);
  }
  const lb = $("#layersBtn"), lp = $("#layersPanel");
  lb.onclick = () => { lp.hidden = !lp.hidden; lb.setAttribute("aria-expanded", !lp.hidden); };
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = () => { $("#" + b.dataset.close).hidden = true; });
  const S = K.meta && K.meta.sources || {};
  $("#srcNote").innerHTML = "Sources: " + Object.entries(S).map(([k, v]) => `<b>${esc(k)}</b>: ${esc(v)}`).join("; ") + (K.meta ? `<br>Built ${esc(K.meta.built)}` : "");

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
  const R = {};
  R.property = p => {
    const photos = p.photos || [];
    const gal = photos.length ? `<div class="gal" id="gal">${photos.map((u, i) => `<img src="${esc(u)}" data-i="${i}" loading="${i < 2 ? "eager" : "lazy"}" alt="Photo ${i + 1} of ${esc(p.title)}">`).join("")}</div><div class="galcount">${photos.length} photo${photos.length > 1 ? "s" : ""} · swipe or tap to enlarge</div>` : "";
    const ppa = p.price && p.acres ? money(p.price / p.acres) + "/ac" : null;
    const drives = (p.drives || []).length ? `<div class="kicker">Hospital drive times</div>
      <table class="tbl"><tr><th>Hospital</th><th class="n">Miles</th><th class="n">7 AM</th><th class="n">7 PM</th></tr>
      ${p.drives.map(d => `<tr><td>${esc(d.hospital)}${d.traffic_aware ? "" : '<br><span class="small">free-flow, no traffic data</span>'}${d.source ? `<br><span class="small">${esc(d.source)}</span>` : ""}</td>
        <td class="n">${fmt1(d.miles)}</td><td class="n">${d.range_7am ? esc(d.range_7am) + " min" : (d.min_7am != null ? Math.round(d.min_7am) + " min" : "—")}</td><td class="n">${d.range_7pm ? esc(d.range_7pm) + " min" : (d.min_7pm != null ? Math.round(d.min_7pm) + " min" : "—")}</td></tr>`).join("")}</table>` : "";
    const ns = p.near_schools || {};
    return `<div class="kicker">${p.standout && p.standout.length ? "★ Standout property" : "Property"}</div><h2>${esc(p.title)}</h2>
      <div class="sub">${esc([p.town, p.county && p.county + " County"].filter(Boolean).join(", "))}</div>
      ${gal}
      ${p.standout && p.standout.length ? `<div class="badges">${p.standout.map(s => `<span class="badge gold">★ ${esc(s)}</span>`).join("")}</div>` : ""}
      ${p.precision === "town" ? `<div class="note">📍 Approximate pin: placed at the town center (${esc(p.town || "town")}); the exact parcel location wasn't published.</div>` : ""}
      ${p.pending ? '<div class="note">Listing details are still being collected (listings.json not ready when this map was built). Re-run build.py to fill in price, acreage and the exact location.</div>' : ""}
      <div class="stats">${stat(money(p.price), "price")}${stat(p.acres != null ? fmt1(p.acres) : "—", "acres")}${stat(ppa || "—", "per acre")}
        ${stat(`${p.beds != null ? esc(p.beds) : "—"} / ${p.baths != null ? esc(p.baths) : "—"}`, "bed / bath")}${stat(p.dwellings != null ? esc(p.dwellings) : "—", "dwellings")}${stat(esc(p.seen || "—"), "date seen")}</div>
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
  R.hospital = h => `<div class="kicker">${h.trauma ? "Trauma center" : h.kind === "general" ? "Hospital" : "Specialty hospital"}</div><h2>${esc(h.name)}</h2>
    <div class="sub">${esc([h.addr, h.city, h.state].filter(Boolean).join(", "))}</div>
    ${h.trauma ? `<div class="badges"><span class="badge gold">🚑 Trauma ${esc(h.trauma)}</span></div>` : ""}
    <table class="kv">${row("Trauma designation", h.trauma ? `${esc(h.trauma)}${h.trauma_name ? " — listed as “" + esc(h.trauma_name) + "”" : ""}<br><span class="small">${esc(h.trauma_src)}</span>` : "Not on the Kentucky Trauma System list")}
    ${row("Emergency dept.", h.emergency === "yes" ? "Yes (per OpenStreetMap)" : h.emergency === "no" ? "No (per OpenStreetMap)" : null)}
    ${row("Type", h.kind === "general" ? "General / acute care" : "Specialty (psychiatric, rehab, long-term, etc.)")}
    ${row("County", h.county ? link("county", h.county, h.county + " County") : esc(h.state || "out of state"))}
    ${row("Phone", h.phone ? `<a href="tel:${esc(h.phone)}">${esc(h.phone)}</a>` : null)}${row("Website", h.web ? ext(h.web, "Website ↗") : null)}
    ${row("Map data", h.osm ? ext(h.osm, "OpenStreetMap ↗") : esc(h.note || ""))}</table>${nearbyProps(h)}`;
  R.school = s => {
    const lv = Object.entries(s.levels || {});
    const dr = s.drank || {};
    return `<div class="kicker">School</div><h2>${esc(s.name)}</h2><div class="sub">${esc(s.district)} · grades ${esc(s.grades)}</div>
    ${lv.length ? `<table class="tbl"><tr><th>Level</th><th>KDE 2025 rating</th><th class="n">Score</th></tr>${lv.map(([L, v]) => `<tr><td>${esc(L)}</td><td>${rbadge(v.rating)}${v.fed ? `<br><span class="small">${esc(v.fed)}</span>` : ""}</td><td class="n">${v.score != null ? fmt1(v.score) : "—"}</td></tr>`).join("")}</table>` : '<div class="note">No 2025 accountability rating for this school/program.</div>'}
    <table class="kv">${row("ACT composite (2024-25)", s.act != null ? esc(s.act) : null)}
    ${Object.entries(dr).map(([L, r]) => row(`District rank (${L})`, `#${esc(r.rank)} of ${esc(r.of)} districts`)).join("")}
    ${row("Address", esc([s.addr, s.city].filter(Boolean).join(", ")))}${row("Phone", s.phone ? `<a href="tel:${esc(s.phone)}">${esc(s.phone)}</a>` : null)}
    ${row("County", link("county", s.county, s.county + " County"))}</table>
    <div class="kicker">County district context</div>${schoolBlock(s.county)}
    <div class="small">KDE colors: Red &lt; Orange &lt; Yellow &lt; Green &lt; Blue (KDE School Report Card, 2024-25 accountability).</div>`;
  };
  R.college = c => `<div class="kicker">${esc(c.kind)}</div><h2>${esc(c.name)}</h2><div class="sub">${esc([c.addr, c.city].join(", "))}</div>
    <table class="kv">${row("County", link("county", c.county, c.county + " County"))}${row("Details", ext(c.src, "NCES College Navigator ↗"))}</table>`;
  R.activity = a => `<div class="kicker">${esc(a.kind)}</div><h2>${esc(a.name)}</h2>
    ${a.desc ? `<div class="desc">${esc(a.desc)}</div>` : ""}
    <table class="kv">${row("County", link("county", a.county, a.county + " County"))}${row("Website", a.web ? ext(a.web, "Website ↗") : null)}
    ${row("Wikipedia", a.wiki ? ext("https://en.wikipedia.org/wiki/" + encodeURIComponent((a.wiki.split(":")[1] || a.wiki).replace(/ /g, "_")), (a.wiki.split(":")[1] || a.wiki) + " ↗") : null)}
    ${row("Map data", ext(a.src, "OpenStreetMap ↗"))}</table>${nearbyProps(a)}`;
  R.history = h => {
    const t = HIST[h.type] || ["", h.type];
    return `<div class="kicker">${t[0]} ${esc(t[1])}${h.nhl ? " · National Historic Landmark" : ""}</div><h2>${esc(h.name)}</h2>
    ${h.img ? `<figure class="thumb"><img src="${esc(h.img.thumb)}" alt="${esc(h.name)}" loading="lazy"><figcaption class="attr">Photo: ${esc(h.img.artist)} · ${esc(h.img.license)} · <a href="${esc(h.img.page)}" target="_blank" rel="noopener">Wikimedia Commons</a></figcaption></figure>` : ""}
    <div class="desc">${esc(h.desc)}</div>
    <table class="kv">${row("County", h.county ? link("county", h.county, h.county + " County") : null)}${row("Source", ext(h.src, (h.src_name || "Source") + " ↗"))}</table>`;
  };
  R.county = c => {
    const mrows = metrics.map(m => { const v = c.m[m.key]; if (v == null) return ""; const all = K.counties.map(x => x.m[m.key]).filter(x => x != null).sort((a, b) => m.lower_better ? a - b : b - a); return `<tr><td>${esc(m.label)}</td><td class="n">${esc(fmtMetric(m, v))}</td><td class="n small">#${all.indexOf(v) + 1}/${all.length}</td></tr>`; }).join("");
    const props = (K.properties || []).filter(p => p.county === c.name);
    const ds = c.districts || [];
    const txt = c.text ? Object.entries(c.text).map(([k, v]) => row(k, esc(v))).join("") : "";
    return `<div class="kicker">County</div><h2>${esc(c.name)} County, Kentucky</h2>
      <div class="stats">${stat(c.n.props, "listings")}${stat(c.n.hosp, "hospitals")}${stat(c.n.schools, "schools")}${stat(c.n.colleges, "colleges")}${stat(c.n.acts, "activities")}${stat(c.n.hist, "history")}</div>
      ${sweetKey && c.m[sweetKey] != null ? `<div class="badges"><span class="badge gold">Sweet-spot: ${esc(fmtMetric(metrics.find(m => m.key === sweetKey), c.m[sweetKey]))}</span></div>` : ""}
      ${mrows ? `<div class="kicker">County metrics</div><table class="tbl"><tr><th>Metric</th><th class="n">Value</th><th class="n">Rank</th></tr>${mrows}</table>` : ""}
      ${txt ? `<table class="kv">${txt}</table>` : ""}
      <div class="kicker">Health care</div><table class="kv">${row("Trauma centers in county", c.n.trauma.length ? esc(c.n.trauma.join("; ")) : "None")}
      ${row("Nearest trauma center", c.near_trauma ? `${link("hospital", c.near_trauma.id, c.near_trauma.name)} · ${esc(c.near_trauma.trauma)} · ~${c.near_trauma.miles} mi from county center` : null)}</table>
      <div class="kicker">Schools</div>${schoolBlock(c.name)}
      ${ds.length ? `<table class="tbl"><tr><th>District</th><th class="n">vs KY</th><th class="n">vs US</th><th>ES/MS/HS</th></tr>${ds.map(d => `<tr><td>${esc(d.name)}</td><td class="n">${esc(sign(d.pp_vs_ky, 0))}</td><td class="n">${esc(sign(d.gl_vs_us, 1))}</td><td>${rbadge(d.es)} ${rbadge(d.ms)} ${rbadge(d.hs)}</td></tr>`).join("")}</table>` : ""}
      ${props.length ? `<div class="kicker">Properties here</div><table class="kv">${props.map(p => row(p.standout && p.standout.length ? "★" : "⌂", link("property", p.id, p.title) + (p.price ? " · " + money(p.price) : ""))).join("")}</table>` : ""}`;
  };
  function nearbyProps(pt) {
    const near = (K.properties || []).filter(p => p.lat != null).map(p => [p, hav(pt.lat, pt.lon, p.lat, p.lon)]).filter(x => x[1] < 25).sort((a, b) => a[1] - b[1]).slice(0, 5);
    return near.length ? `<div class="kicker">Properties within 25 mi</div><table class="kv">${near.map(([p, d]) => row(d.toFixed(1) + " mi", link("property", p.id, p.title))).join("")}</table>` : "";
  }
  function hav(a, b, c, d) { const R = 3958.8, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }

  // ------------------------------------------------------------------ share
  const TITLE = { property: p => p.title, hospital: h => h.name, school: s => s.name, college: c => c.name, activity: a => a.name, history: h => h.name, county: c => c.name + " County, KY" };
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
  let current = null, hl = null;
  function openItem(type, id, opts = {}) {
    const it = IDX[type] && IDX[type][id]; if (!it) { toast("Item not found"); return false; }
    current = { type, id };
    body.innerHTML = R[type](it) + `<div class="actions">
        <button class="btn" id="shareBtn">${navigator.share ? "Share…" : "Share"}</button>
        <button class="btn ghost" id="copyBtn">Copy link</button>
        ${it.lat != null || type === "county" ? '<button class="btn ghost" id="zoomBtn">Zoom here</button>' : ""}</div>
        <div class="small" style="word-break:break-all">Link: <a href="#${esc(type)}=${esc(encodeURIComponent(id))}">#${esc(type)}=${esc(id)}</a></div>`;
    card.hidden = false; card.scrollTop = 0;
    $("#shareBtn").onclick = () => doShare(type, id);
    $("#copyBtn").onclick = () => copy(shareUrlBest(type, id));
    const zb = $("#zoomBtn"); if (zb) zb.onclick = () => zoomTo(type, it, true);
    const g = $("#gal"); if (g) g.querySelectorAll("img").forEach(img => img.onclick = () => openLB(it.photos, +img.dataset.i));
    const h = "#" + type + "=" + encodeURIComponent(id);
    if (location.hash !== h) history[opts.replace ? "replaceState" : "pushState"](null, "", h);
    document.title = TITLE[type](it) + " — Kentucky Explorer";
    ensureLayerFor(type, it);
    if (opts.fly !== false) zoomTo(type, it, false);
    highlight(type, it);
    return true;
  }
  function zoomTo(type, it, force) {
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
    card.hidden = true; current = null; if (hl) { map.removeLayer(hl); hl = null; }
    document.title = "Kentucky Explorer";
    if (push && location.hash) history.pushState(null, "", location.pathname + location.search);
  }
  $("#cardClose").onclick = () => closeCard();
  body.addEventListener("click", e => { const a = e.target.closest("[data-go]"); if (a) { e.preventDefault(); openItem(a.dataset.go, a.dataset.id); } });
  // swipe-down to close on phones
  (function () { let y0 = null; card.addEventListener("touchstart", e => { y0 = card.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
    card.addEventListener("touchend", e => { if (y0 != null && e.changedTouches[0].clientY - y0 > 90) closeCard(); y0 = null; }, { passive: true }); })();
  function route(replace) {
    const m = location.hash.match(/^#(property|hospital|school|college|activity|history|county)=(.+)$/);
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
  let lbList = [], lbI = 0;
  function openLB(list, i) { lbList = list; lbI = i; lbx.hidden = false; showLB(); }
  function showLB() { lbImg.src = lbList[lbI]; $("#lbCount").textContent = `${lbI + 1} / ${lbList.length}`; lbImg.style.transform = ""; }
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
    if (e.key === "Escape") { if (!lp.hidden) lp.hidden = true; else if (!card.hidden) closeCard(); }
  });

  // ------------------------------------------------------------------ search
  const all = [];
  Object.entries(IDX).forEach(([type, o]) => Object.values(o).forEach(it => all.push({ type, id: type === "county" ? it.name : it.id, name: type === "county" ? it.name + " County" : (it.title || it.name), sub: type === "property" ? [it.town, it.county].filter(Boolean).join(", ") : type === "history" ? (HIST[it.type] || [, ""])[1] : (it.kind || it.district || it.city || "") })));
  const LABEL = { property: "Property", hospital: "Hospital", school: "School", college: "College", activity: "Activity", history: "History", county: "County" };
  const si = $("#search"), res = $("#results"); let hits = [], sel = 0;
  si.addEventListener("input", () => {
    const q = si.value.trim().toLowerCase(); if (q.length < 2) { res.hidden = true; return; }
    const pri = { county: 0, property: 1, hospital: 2, history: 3, activity: 4, college: 5, school: 6 };
    hits = all.filter(x => x.name.toLowerCase().includes(q) || (x.sub || "").toLowerCase().includes(q)).sort((a, b) => (a.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.name.toLowerCase().startsWith(q) ? 0 : 1) || pri[a.type] - pri[b.type]).slice(0, 30);
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

  // ------------------------------------------------------------------ start
  // de-clutter when zoomed out: hide minor hospitals, shrink markers
  const zc = () => { const z = map.getZoom(), el = map.getContainer(); el.classList.toggle("z-low", z < 8); el.classList.toggle("z-vlow", z < 7); };
  map.on("zoomend", zc);
  if (location.hash) route(true);
  else map.fitBounds([[36.5, -89.55], [39.15, -81.95]], { padding: [4, 4] });
  zc();
  window.KYXApp = { openItem, closeCard, map, IDX };
})();

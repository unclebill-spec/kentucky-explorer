// Kentucky / Tennessee Explorer: climate lines + Compare Areas (home-state cities vs the other state's counterparts). Loaded on first card open / #areas.
// Data: data/clim.json (NOAA 1991-2020 station normals) and data/areas.json (built by compare/build_areas.py). Add a state by adding areas there.
(function () {
  let A = null, C = null, AR = null, P = null;
  const esc = s => A.esc(s);
  const stamp = () => (A.K.meta && A.K.meta.stamp) || "0";
  const getJ = u => fetch(u + "?v=" + stamp()).then(r => r.ok ? r.json() : null).catch(() => null);
  function load() { return P || (P = Promise.all([getJ("data/clim.json"), getJ("data/areas.json")]).then(([c, a]) => { C = c; AR = a; })); }
  const hav = (a, b, c, d) => { const p = Math.PI / 180, x = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 7917.5 * Math.asin(Math.sqrt(x)); };
  const deg = v => v == null ? "–" : Math.round(v) + "°";
  const f1 = v => v == null ? "–" : (+v).toFixed(1).replace(/\.0$/, "");
  const n0 = v => v == null ? "–" : Math.round(v).toLocaleString();
  const money = v => v == null ? "–" : "$" + Math.round(v).toLocaleString();
  // ---------------------------------------------------------------- climate (every card with a location)
  function nearest(lat, lon, col) { let b = null, bd = 1e9; C.st.forEach((s, i) => { if (s[col] == null) return; const d = hav(lat, lon, s[2], s[3]); if (d < bd) { bd = d; b = i; } }); return [b, bd]; }
  function climHTML(type, it) {
    if (!C) return "";
    const full = type === "property" || type === "county";
    let ti, td, wi, wd;
    if (type === "county") { const v = C.cty[it.name || it.id]; if (!v) return ""; [ti, td, , wi, wd] = v; }
    else { if (it.lat == null) return ""; [ti, td] = nearest(it.lat, it.lon, 4); [wi, wd] = nearest(it.lat, it.lon, 10); }
    const t = C.st[ti], w = C.st[wi]; if (!t) return "";
    const st = (s, d) => `${esc(s[1])} (${d < 1 ? "<1" : Math.round(d)} mi)`;
    let h = `<div class="clim"><div class="climl"><span title="June–August average">☀️ Summer avg <b>${deg(t[4])}F</b> <span class="cl2">Jul ${deg(t[6])}/${deg(t[7])}</span></span>`
      + `<span title="December–February average">❄️ Winter avg <b>${deg(t[5])}F</b> <span class="cl2">Jan ${deg(t[8])}/${deg(t[9])}</span></span></div>`;
    if (full && w) h += `<div class="climl"><span>🌧 <b>${n0(w[11])}</b> rainy days/yr</span><span>🌨 <b>${n0(w[13])}</b> snow days</span><span><b>${f1(w[12])}</b> in snow/yr</span><span><b>${f1(w[10])}</b> in precip/yr</span></div>`;
    h += `<div class="clsrc">NOAA 1991–2020 normals · ${st(t, td)}${full && w && wi !== ti ? " · rain/snow: " + st(w, wd) : ""}</div></div>`;
    return h;
  }
  // ---------------------------------------------------------------- areas
  const byId = id => AR && AR.areas.find(a => a.id === id);
  const ST = () => window.KYX_ST || { ab: "KY", name: "Kentucky", other: { ab: "TN", name: "Tennessee" } };
  const H = () => ST().ab, HN = () => ST().name, ON = () => (ST().other || {}).name || "Tennessee";
  const kyAreas = () => AR.areas.filter(a => a.st === H());  // every home-state area (county cards, homes)
  const topAreas = () => kyAreas().slice().sort((a, b) => b.pop - a.pop).slice(0, 5);  // the state's 5 largest cities
  const uniq = as => as.filter((a, i) => as.indexOf(a) === i);
  const RN = a => a.rn_h != null ? `$${a.rn_h.toFixed(2)}/hr<br><span class="cl2">$${n0(a.rn_a)}/yr</span>` : `<span class="cl2">${a.rn_note ? "not published by BLS" : "–"}</span>`;
  const sgn = v => v == null ? "n/a" : (v > 0 ? "+" : v < 0 ? "−" : "±") + Math.abs(v).toFixed(2);
  // k, label, value fn, display fn, better ("lo" | "hi" | null), short label for the compact block
  const ROWS = [
    ["pop", "City population (2025)", a => a.pop, a => n0(a.pop), null],
    ["rn", "Median RN pay", a => a.rn_h, RN, "hi", "RN pay"],
    ["jobs", "Permanent RN jobs", a => a.jobs, a => a.jobs != null ? `${n0(a.jobs)}<br><span class="cl2">${a.mc && a.mc.length > 1 ? "metro, " : ""}your filters</span>` : `<span class="cl2">${a.st === H() ? "pending" : H() + " only"}</span>`, "hi"],
    ["home", "Median home price", a => a.home, a => money(a.home), "lo", "Home price"],
    ["ppsf", "Price per sq ft", a => a.ppsf, a => money(a.ppsf), "lo"],
    ["land", "5+ acre land (median ask)", a => a.land, a => a.land != null ? `${money(a.land)}<br><span class="cl2">${a.land_n} lots</span>` : "–", "lo"],
    ["afford", "Home price ÷ RN pay", a => a.afford, a => a.afford != null ? a.afford.toFixed(1) + "×" : '<span class="cl2">no BLS wage</span>', "lo", "Price ÷ pay"],
    ["trauma", "Drive to Level I/II trauma", a => a.trauma_min, a => a.trauma_min != null ? `${a.trauma_min} min<br><span class="cl2">${esc(a.trauma_name.replace(/ \((KY|TN|OH|IN|WV), /, " ($1 ").replace(/University of /, "U of "))}</span>` : "–", "lo", "Trauma drive"],
    ["sch", "Schools vs U.S. avg", a => a.sch_us, a => `${sgn(a.sch_us)} grade lvls<br><span class="cl2">${sgn(a.sch_st)} vs ${a.st} avg · ${esc(a.sch_dist)}</span>`, "hi", "Schools vs US"],
    ["sum", "Summer avg (Jun–Aug)", a => a.sum, a => `${f1(a.sum)}°F<br><span class="cl2">Jul ${deg(a.jul_hi)}/${deg(a.jul_lo)}</span>`, "lo", "Summer"],
    ["win", "Winter avg (Dec–Feb)", a => a.win, a => `${f1(a.win)}°F<br><span class="cl2">Jan ${deg(a.jan_hi)}/${deg(a.jan_lo)}</span>`, "hi", "Winter"],
    ["rdays", "Rainy days / yr", a => a.rdays, a => n0(a.rdays), "lo"],
    ["sdays", "Snow days / yr", a => a.sdays, a => n0(a.sdays), "lo"],
    ["snow", "Snowfall / yr", a => a.snow, a => f1(a.snow) + " in", "lo", "Snow"],
    ["vio", "Violent crime per 100k", a => a.vio, a => a.vio != null ? n0(a.vio) : '<span class="cl2">pending</span>', "lo", "Violent crime"],
    ["prop", "Property crime per 100k", a => a.prop, a => a.prop != null ? n0(a.prop) : '<span class="cl2">pending</span>', "lo"],
  ];
  const bestOf = (row, as) => { if (!row[4]) return null; const vs = as.map(row[2]).filter(v => v != null); if (vs.length < 2) return null; return row[4] === "lo" ? Math.min(...vs) : Math.max(...vs); };
  function table(as, rows) {
    return `<div class="cmpwrap"><table class="cmpt arT"><thead><tr><th></th>${as.map(a => `<td class="arH"><b>${esc(a.city)}</b><br><span class="cl2">${esc(a.county)} Co., ${a.st}</span></td>`).join("")}</tr></thead><tbody>`
      + rows.map(r => { const b = bestOf(r, as); return `<tr data-r="${r[0]}"><th>${esc(r[1])}</th>${as.map(a => `<td${b != null && r[2](a) === b ? ' class="best"' : ""}>${r[3](a)}</td>`).join("")}</tr>`; }).join("") + "</tbody></table></div>";
  }
  // pros / cons from the numbers: rank in the group + a few absolute thresholds
  const PH = {
    rn: [a => `Highest RN pay ($${a.rn_h.toFixed(2)}/hr)`, a => `Lowest RN pay ($${a.rn_h.toFixed(2)}/hr)`],
    home: [a => `Cheapest homes (${money(a.home)} median)`, a => `Priciest homes (${money(a.home)} median)`],
    land: [a => `Cheapest 5+ acre land (${money(a.land)})`, a => `Priciest 5+ acre land (${money(a.land)})`],
    afford: [a => `Best pay vs home price (${a.afford.toFixed(1)}×)`, a => `Homes cost the most vs RN pay (${a.afford.toFixed(1)}×)`],
    trauma: [a => `Level I/II trauma center ${a.trauma_min} min away`, a => `Longest drive to Level I/II trauma (${a.trauma_min} min)`],
    sch: [a => `Strongest schools (${sgn(a.sch_us)} grade levels vs US)`, a => `Weakest schools (${sgn(a.sch_us)} grade levels vs US)`],
    win: [a => `Mildest winters (${f1(a.win)}°F avg)`, a => `Coldest winters (${f1(a.win)}°F avg)`],
    sum: [a => `Coolest summers (${f1(a.sum)}°F avg)`, a => `Hottest summers (${f1(a.sum)}°F avg)`],
    snow: [a => `Least snow (${f1(a.snow)} in/yr)`, a => `Most snow (${f1(a.snow)} in/yr, ${n0(a.sdays)} snow days)`],
    rdays: [a => `Fewest rainy days (${n0(a.rdays)}/yr)`, a => `Most rainy days (${n0(a.rdays)}/yr)`],
    vio: [a => `Lowest violent crime (${n0(a.vio)} per 100k)`, a => `Highest violent crime (${n0(a.vio)} per 100k)`],
    prop: [a => `Lowest property crime (${n0(a.prop)} per 100k)`, a => `Highest property crime (${n0(a.prop)} per 100k)`],
  };
  function prosCons(a, as) {
    const pro = [], con = [];
    ROWS.forEach(r => {
      if (!PH[r[0]] || !r[4]) return; const v = r[2](a); if (v == null) return;
      const vs = as.map(r[2]).filter(x => x != null); if (vs.length < 3) return;
      const best = r[4] === "lo" ? Math.min(...vs) : Math.max(...vs), worst = r[4] === "lo" ? Math.max(...vs) : Math.min(...vs);
      if (v === best) pro.push(PH[r[0]][0](a)); else if (v === worst) con.push(PH[r[0]][1](a));
    });
    if (a.sch_us < 0 && !con.some(c => /schools/i.test(c))) con.push(`Schools below the U.S. average (${sgn(a.sch_us)} grade levels)`);
    if (a.sch_us >= 0.5 && !pro.some(c => /schools/i.test(c))) pro.push(`Schools above the U.S. average (${sgn(a.sch_us)} grade levels)`);
    if (a.trauma_min != null && a.trauma_min <= 25 && !pro.some(c => /trauma/i.test(c))) pro.push(`Level I/II trauma center ${a.trauma_min} min away`);
    if (a.trauma_min != null && a.trauma_min >= 60 && !con.some(c => /trauma/i.test(c))) con.push(`${a.trauma_min} min to the nearest Level I/II trauma center`);
    if (a.rn_note) con.push("No published BLS RN wage for this metro");
    return [pro.slice(0, 4), con.slice(0, 4)];
  }
  const pcHTML = (a, as) => { const [p, c] = prosCons(a, as); return `<div class="arpc"><div class="arpcH">${esc(a.city)}, ${a.st}</div>${p.map(x => `<div class="pro">＋ ${esc(x)}</div>`).join("")}${c.map(x => `<div class="con">－ ${esc(x)}</div>`).join("")}</div>`; };
  function foot() {
    const s = AR.src; return `<div class="arsrc"><b>Sources.</b> ${["pop", "rn", "home", "land", "trauma", "schools", "climate", "crime", "pairs"].map(k => esc(s[k])).join(". ")}. `
      + `“Best” = higher pay and schools; lower prices, drive time, crime, rain and snow; cooler summer, milder winter. Nothing is estimated: a dash means the source has no figure.`
      + `${AR.areas.filter(a => a.rn_note || a.home_note).map(a => " " + esc(a.city) + ": " + esc([a.rn_note, a.home_note].filter(Boolean).join(" "))).join("")} ${A.K.meta && A.K.meta.pj ? ` Permanent RN jobs: staff RN postings on ${HN()} hospital career sites (the map's blue-hat layer) in the city's ${HN()} metro counties, under the current permanent-job filters; ${ON()} hospitals are on the ${ON()} map.` : ` Permanent RN jobs: ${HN()} hospital career sites aren't collected yet.`}</div>`;
  }
  function page(opts) {
    const ky = topAreas(), pairs = ky.map(a => [a, byId(a.pair)]).filter(p => p[1]), oth = uniq(pairs.map(p => p[1]));
    const html = `<div class="kicker">🏙 Compare areas</div><h2>${esc(HN())}'s 5 largest cities, side by side</h2>
      <div class="sub">Each city with its county / metro. Green = best in the row. Swipe the table sideways.</div>
      ${table(ky, ROWS)}
      <div class="xh">Pros &amp; cons (from the numbers above)</div><div class="arpcs">${ky.map(a => pcHTML(a, ky)).join("")}</div>
      <div class="xh">${esc(HN())} vs ${esc(ON())}</div>
      <div class="sub">Each ${H()} city is paired with the ${esc(ON())} city closest in population that anchors its own metro area (Census 2025).</div>
      ${pairs.map(([k, t]) => `<div class="arpair" id="pair-${k.id}"><div class="arpairH">${esc(k.city)} <span class="cl2">${n0(k.pop)}</span> vs ${esc(t.city)} <span class="cl2">${n0(t.pop)}</span></div>${table([k, t], ROWS.filter(r => r[0] !== "pop" && r[0] !== "jobs"))}</div>`).join("")}
      <div class="xh">${esc(ON())} pros &amp; cons</div><div class="arpcs">${oth.map(a => pcHTML(a, oth)).join("")}</div>
      ${foot()}`;
    A.showPage({ type: "xpage", id: "areas", hash: "#areas" }, html, "#areas", Object.assign({ title: "Compare areas", tall: true }, opts || {}));
    const pid = opts && opts.pair; if (pid) { const el = document.getElementById("pair-" + pid); if (el) setTimeout(() => el.scrollIntoView({ block: "start" }), 50); }
  }
  // compact "vs <other-state city>" block for county pages of the 5 cities and homes near them
  function vsBlock(k, compact) {
    const t = byId(k.pair); if (!t) return "";
    const rows = ROWS.filter(r => r[5]);
    const cell = (r, a, b) => { const v = r[2](a), w = r[2](b); const win = v != null && w != null && v !== w && (r[4] === "lo" ? v < w : v > w); return `<td${win ? ' class="best"' : ""}>${r[3](a).replace(/<br>.*$/, "")}</td>`; };
    return `<div class="arvs${compact ? " cmp" : ""}"><div class="arvsH">${compact ? `${esc(k.city)} area vs ${esc(t.city)}, ${t.st}` : `${esc(k.city)} vs ${esc(t.city)}, ${t.st}`}<a href="#areas" data-pair="${k.id}" class="arvsL">All areas ›</a></div>
      <table class="cmpt"><thead><tr><th></th><td><b>${esc(k.city)}</b></td><td><b>${esc(t.city)}</b></td></tr></thead><tbody>${rows.map(r => `<tr><th>${esc(r[5])}</th>${cell(r, k, t)}${cell(r, t, k)}</tr>`).join("")}</tbody></table>
      <div class="clsrc">Green = better. Sources on the Compare areas page.</div></div>`;
  }
  function areaFor(type, it) {
    if (!AR) return null;
    if (type === "county") return kyAreas().find(a => (a.blk || a.county) === (it.name || it.id)) || null;  // blk: the map block when it is not the county (MA towns)
    if (type !== "property" || it.lat == null) return null;
    let best = null, bd = 1e9;
    kyAreas().forEach(a => { const d = hav(it.lat, it.lon, a.lat, a.lon); const inMetro = it.county && a.mc.includes(String(it.county).replace(/ County$/, "")); if ((d <= 30 || inMetro) && d < bd) { bd = d; best = a; } });
    return best;
  }
  function card(type, id, it, el) {
    return load().then(() => {
      const cur = A.current(); if (!el || !el.isConnected || !cur || cur.type !== type || cur.id !== id) return;
      const a = areaFor(type, it);
      el.innerHTML = climHTML(type, it) + (a ? vsBlock(a, type === "property") : "");
      el.querySelectorAll("[data-pair]").forEach(x => x.onclick = e => { e.preventDefault(); A.nav("#areas", false); route("#areas", { pair: x.dataset.pair }); });
    });
  }
  function permCounts() {  // live counts from the permanent-jobs layer (perm.js), home-state metro counties only
    if (!A.loadPerm || !(A.K.meta && A.K.meta.pj)) return Promise.resolve();
    return A.loadPerm().then(P => { AR.areas.forEach(a => { if (a.st === H()) a.jobs = (a.mc && a.mc.length ? a.mc : [a.county]).reduce((n, c) => n + P.countyJobs(c).length, 0); }); }).catch(() => 0);
  }
  function route(hs, opts) { return load().then(() => { if (!AR) { A.toast("Couldn't load the area data"); return; } return permCounts().then(() => page(opts)); }); }
  window.KYXA = { init(api) { A = api; return window.KYXA; }, card, route, load, data: () => ({ C, AR }), climHTML, prosCons };
})();

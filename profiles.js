/* State Explorer: profiles P1..P4 (panel, filters, share links). Loaded on demand by app.js together with data/pf.js
   (only when a profile button is tapped, a #profile / #pedit / #pmatch link opens, or a profile was left active).
   Nothing here runs for the default map ("All"), which stays exactly as it is without a profile. */
(function () {
  "use strict";
  let A = null, PF = { props: {} };
  const SLOTS = ["P1", "P2", "P3", "P4"];
  const KEY = k => "kyx_prof_" + k, ACT = "kyx_prof_active";
  // P1 = Bill's defaults: the map exactly as it is today (job exclusions match the collector; every home layer on, existing caps)
  // pjobs = permanent RN job filters (perm.js): Bill leaves out OR/periop, cath lab, women's services (L&D/OB/mom-baby), NICU and peds; PACU and CVICU stay in
  const SEED = { P1: { v: 1, name: "Bill", seed: 1, jobs: { exOR: 1, exCath: 1, exMom: 1, exPeds: 1 }, pjobs: { x: ["or", "cath", "mom", "nicu", "peds"], c: 1, g: 1 }, home: { props: 1, homes: 1, nh: 1, barg: 1, condo: 1 }, area: {}, layers: {} } };
  const EMPTY = () => ({ v: 1, name: "", jobs: { exOR: 1, exCath: 1, exMom: 1, exPeds: 1 }, pjobs: { x: ["or", "cath", "mom", "nicu", "peds"], c: 1, g: 1 }, home: { props: 1, homes: 1, nh: 1, barg: 1, condo: 1 }, area: {}, layers: {} });
  const load = k => { try { const p = JSON.parse(localStorage.getItem(KEY(k)) || "null"); if (p) return p; } catch (e) { } return SEED[k] ? JSON.parse(JSON.stringify(SEED[k])) : null; };
  const store = (k, p) => localStorage.setItem(KEY(k), JSON.stringify(p));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = v => v === "" || v == null || isNaN(+v) ? null : +v;
  const miles = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * 3958.8 * Math.asin(Math.sqrt(x)); };
  const today = new Date(); today.setHours(0, 0, 0, 0);

  // ---------------------------------------------------------------- job facets (from the travel data already on the page)
  const RX = {  // same exclusions as scripts/travel_filters.py + top_lists.py
    orCI: /operating room|\bcvor\b|circulat|\bscrub\b|first assist|\brnfa\b|surgical services|perioperative|\bperi-?op\b|intra-?op/i, orCS: /(^|[^A-Za-z])OR([^A-Za-z]|$)/,
    orKeep: /\bpacu\b|recovery|phase i|pre-?op|same day surgery|cath|\bendo/i,
    cath: /\bcath\b|\bcath[ -]?lab|catheteri[sz]ation|\bcvl\b|\bcv[ -]?lab|cardiovascular (lab|laboratory)|\bccl\b|interventional cardiolog/i,
    mom: /mom|baby|post ?partum|labou?r|deliver|\bl ?& ?d\b|\bldrp?\b|\bob\b|ob\/|obstet|antepartum|nicu|nursery|women|gyn|mother|infant|maternal|newborn|neonat|couplet|perinatal|birth/i,
    peds: /pediatric|paediatric|\bpeds?\b|picu|child/i, er: /emergency|trauma er|(^|[^A-Za-z])(ED|ER)([^A-Za-z]|$)/,
  };
  const SPECS = [  // specialty groups (a posting can list several units)
    ["er", "ER / Emergency", RX.er], ["icu", "ICU / critical care", /\bicu\b|intensive care|cvicu|ctic|micu|sicu|sticu|critical care/i],
    ["pcu", "PCU / stepdown / DOU", /\bpcu\b|progressive care|stepdown|step down|\bdou\b|intermediate care/i], ["tele", "Telemetry", /tele/i],
    ["ms", "Med Surg", /med ?surg|medsurg|acute care|float/i], ["pacu", "PACU / recovery", /pacu|post anesthesia|recovery/i],
    ["psych", "Behavioral / psych", /psych|behavioral|mental health/i], ["onc", "Oncology", /oncolog|hematolog/i], ["ortho", "Orthopedics", /ortho/i],
    ["dial", "Dialysis", /dialysis/i], ["rehab", "Rehab", /rehab/i], ["ltc", "LTAC / LTC / SNF", /ltac|long term|snf/i],
    ["clinic", "Clinic / outpatient", /clinic|outpatient/i], ["cm", "Case management", /case manag/i], ["neuro", "Neuro", /neuro/i], ["trauma", "Trauma", /trauma/i],
  ];
  const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function jf(j) {  // cached per job
    if (j._pf) return j._pf;
    const t = (j.u || "") + " " + (j.sp || ""), sh = j.sh || "";
    const hm = sh.match(/(\d)\s*x\s*(\d+)/);
    let start = null; const sm = (j.st || "").match(/([A-Z][a-z]{2})\w*\.?\s+(\d{1,2})/);
    if (sm && MON[sm[1].toLowerCase()] != null) { start = new Date(today.getFullYear(), MON[sm[1].toLowerCase()], +sm[2]); if (start < today - 60 * 864e5) start.setFullYear(start.getFullYear() + 1); }
    else if (/asap/i.test(j.st || "")) start = today;
    const wk = (j.len || "").match(/(\d+)\s*week/i);
    return j._pf = { t, specs: SPECS.filter(s => s[2].test(t)).map(s => s[0]), hours: hm ? +hm[1] * +hm[2] : null,
      shift: /rotat/i.test(sh) ? "rot" : /night|evening/i.test(sh) && /day/i.test(sh) ? "rot" : /night|evening/i.test(sh) ? "night" : /day/i.test(sh) ? "day" : null,
      weeks: wk ? +wk[1] : null, start, posted: j.po ? (today - new Date(j.po + "T00:00:00")) / 864e5 : null,
      isOR: !RX.orKeep.test(t) && (RX.orCI.test(t) || RX.orCS.test(t)), isCath: RX.cath.test(t), isMom: RX.mom.test(t), isPeds: RX.peds.test(t) };
  }
  // ---------------------------------------------------------------- towns (home base) from places already on the map
  let TOWNS = null;
  function towns() {
    if (TOWNS) return TOWNS;
    const acc = {};
    const add = (n, lat, lon) => { if (!n || lat == null) return; const k = String(n).trim(); const a = acc[k] || (acc[k] = { n: k, la: 0, lo: 0, c: 0 }); a.la += lat; a.lo += lon; a.c++; };
    (A.K.schools || []).forEach(s => add(s.city, s.lat, s.lon)); (A.K.hospitals || []).forEach(h => h.state ? null : add(h.city, h.lat, h.lon)); (A.K.colleges || []).forEach(c => add(c.city, c.lat, c.lon));
    (A.K.properties || []).forEach(p => add(p.town, p.lat, p.lon));
    return TOWNS = Object.values(acc).map(a => ({ n: a.n, lat: a.la / a.c, lon: a.lo / a.c, c: a.c })).sort((a, b) => a.n.localeCompare(b.n));
  }
  const townOf = name => { const n = String(name || "").trim().toLowerCase(); return towns().find(t => t.n.toLowerCase() === n) || null; };
  const nearestTownMi = p => { if (p._tm != null) return p._tm; let m = 1e9; towns().forEach(t => { if (t.c < 2) return; const d = miles(p.lat, p.lon, t.lat, t.lon); if (d < m) m = d; }); return p._tm = m; };

  // ---------------------------------------------------------------- predicates
  const RANK = { Blue: 5, Green: 4, Yellow: 3, Orange: 2, Red: 1 };
  const TRK = t => !t ? 9 : /Level I\b(?! ?I)/.test(t) && !/II|IV/.test(t) ? 1 : /Level II\b/.test(t) && !/III/.test(t) ? 2 : /III/.test(t) ? 3 : /IV/.test(t) ? 4 : 5;
  function compile(P) {
    const H = P.home || {}, J = P.jobs || {}, R = P.area || {}, base = R.base && R.base.lat != null ? R.base : null;
    const cInc = new Set(R.cInc || []), cExc = new Set(R.cExc || []);
    const cty = c => (!cInc.size || cInc.has(c)) && !cExc.has(c);
    const kw = String(H.kw || "").toLowerCase().split(/[\s,]+/).filter(Boolean);
    const types = new Set(H.types || []), water = H.water || [];
    const flag = { garage: "g", bsmt: "b", single: "s", pool: "p", outb: "o", fence: "F", reduced: "r" };
    function prop(p) {
      const f = PF.props[p.id] || { t: [], f: "" };
      const cat = A.isNH(p) ? "nh" : A.isHome(p) ? "homes" : A.isCab && A.isCab(p) ? "cab" : A.isBig && A.isBig(p) ? "big" : A.isCFo && A.isCFo(p) ? "cvf" : "props";
      if (cat === "cab" || cat === "big" || cat === "cvf" ? H[cat] === 0 : !H[cat]) return false;  // caves / waterfalls (all maps) show unless the profile unticks them  // 50+ ac lots (all maps) show unless the profile unticks them  // cabins (ST.cabin states only) show unless the profile unticks them
      if (p.bargain && !H.barg) return false;
      if (!cty(p.county)) return false;
      if (H.minP != null && !(p.price >= H.minP)) return false;
      if (H.maxP != null && !(p.price <= H.maxP)) return false;
      if (H.beds != null && !(p.beds >= H.beds)) return false;
      if (H.baths != null && !(p.baths >= H.baths)) return false;
      if (H.sqft != null && !(p.sqft >= H.sqft)) return false;
      if (H.acres != null && !(p.acres >= H.acres)) return false;
      if (H.maxHm != null && !(f.hm <= H.maxHm)) return false;
      if (H.maxTm != null && !(f.tm <= H.maxTm)) return false;
      if (!H.condo && f.t.some(t => t === "condo" || t === "townhome")) return false;
      if (H.noFix && f.f.includes("x")) return false;
      if (types.size && !f.t.some(t => types.has(t))) return false;
      if (H.minYb != null && !(f.yb >= H.minYb)) return false;
      for (const k in flag) if (H[k] && !f.f.includes(flag[k])) return false;
      if (water.length && !water.some(w => f.f.includes(w))) return false;
      if (H.land && !f.f.includes(H.land)) return false;
      if (H.util && !f.f.includes(H.util)) return false;
      if (H.hoaNone && f.f.includes("H")) return false;
      if (H.hoaMax != null && f.hoa != null && f.hoa > H.hoaMax) return false;
      if (H.maxDom != null && !(f.dom <= H.maxDom)) return false;
      if (H.photos && !(f.ph >= 1)) return false;
      if (H.maxPpa != null && !(p.acres > 0 && p.price / p.acres <= H.maxPpa)) return false;
      if (kw.length) { const t = (f.kw || "") + " " + String(p.title || "").toLowerCase(); if (!kw.every(w => t.includes(w))) return false; }
      if (H.maxBase != null && base && miles(base.lat, base.lon, p.lat, p.lon) > H.maxBase) return false;
      const c7a = f.c7a != null ? f.c7a : f.hf != null ? f.hf : f.hm, c7p = f.c7p != null ? f.c7p : f.hf != null ? f.hf : f.hm;
      if (R.c7a != null && !(c7a <= R.c7a)) return false;
      if (R.c7p != null && !(c7p <= R.c7p)) return false;
      if (R.minSch && !(f.sr >= RANK[R.minSch])) return false;
      if (R.townMi != null && nearestTownMi(p) > R.townMi) return false;
      return true;
    }
    const inc = new Set(J.inc || []), exc = new Set(J.exc || []), hrs = new Set((J.hours || []).map(Number)), ags = new Set(J.ag || []), facs = new Set(J.fac || []);
    const sFrom = J.sFrom ? new Date(J.sFrom + "T00:00:00") : null, sTo = J.sTo ? new Date(J.sTo + "T23:59:59") : null;
    function job(j, h) {
      h = h || j.h; const x = jf(j);
      if (J.exOR && x.isOR) return false; if (J.exCath && x.isCath) return false; if (J.exMom && x.isMom) return false; if (J.exPeds && x.isPeds) return false;
      if (inc.size && !x.specs.some(s => inc.has(s))) return false;
      if (exc.size && x.specs.some(s => exc.has(s))) return false;
      if (J.minPay != null) { const v = J.unit === "hr" ? (x.hours ? j.hi / x.hours : null) : j.hi; if (!(v >= J.minPay)) return false; }
      if (J.shift && x.shift !== J.shift) return false;
      if (hrs.size && !hrs.has(x.hours)) return false;
      if (J.minWk != null && !(x.weeks >= J.minWk)) return false;
      if (J.maxWk != null && !(x.weeks <= J.maxWk)) return false;
      if (sFrom && !(x.start && x.start >= sFrom)) return false;
      if (sTo && !(x.start && x.start <= sTo)) return false;
      if (ags.size && !ags.has(j.ag)) return false;
      const hos = h.hospital_id && A.IDX.hospital[h.hospital_id];
      if (facs.size && !(hos && facs.has(hos.kind))) return false;
      if (J.trauma) { const r = TRK(hos && hos.trauma); if (r > +J.trauma) return false; }
      if (J.posted != null && !(x.posted != null && x.posted <= J.posted)) return false;
      if (J.maxMi != null && base && miles(base.lat, base.lon, h.lat, h.lon) > J.maxMi) return false;
      if (!cty(h.county)) return false;
      return true;
    }
    const jdist = j => base ? miles(base.lat, base.lon, j.h.lat, j.h.lon) : 0;
    function sortJobs(js) {
      if (J.sort === "dist" && base) return js.slice().sort((a, b) => jdist(a) - jdist(b) || b.hi - a.hi);
      if (J.sort === "new") return js.slice().sort((a, b) => String(b.po || "").localeCompare(String(a.po || "")) || b.hi - a.hi);
      return js;  // already highest pay first
    }
    function sortProps(ps) {
      const s = H.sort, f = p => PF.props[p.id] || {};
      const by = { price: (a, b) => a.price - b.price, ppa: (a, b) => (a.price / (a.acres || 1e-9)) - (b.price / (b.acres || 1e-9)), new: (a, b) => (f(a).dom ?? 9e9) - (f(b).dom ?? 9e9),
        acres: (a, b) => (b.acres || 0) - (a.acres || 0), hosp: (a, b) => (f(a).hm ?? 9e9) - (f(b).hm ?? 9e9) }[s];
      return by ? ps.slice().sort(by) : ps.slice().sort((a, b) => a.price - b.price);
    }
    const school = s => (!R.minSch || RANK[s.rating] >= RANK[R.minSch]) && cty(s.county);
    return { prop, job, school, cty, sortJobs, sortProps, P };
  }

  // ---------------------------------------------------------------- applying a profile to the map, lists and counts
  let active = "", C = null;
  function api(slot, P) {
    C = compile(P);
    return {
      slot, name: P.name || slot, prop: C.prop, job: C.job, school: C.school, pj: P.pjobs && typeof P.pjobs === "object" && Object.keys(P.pjobs).length ? P.pjobs : null,
      jobs: (js, h) => C.sortJobs(js.filter(j => C.job(j, h))),
      tops: (t, rows) => {
        if (t.job) {  // recomputed from every job so the list still has 10 rows under the profile
          const xs = A.TJ_ALL.filter(j => C.job(j, j.h) && (t.k === "er_jobs") === RX.er.test(jf(j).t) && !RX.mom.test(jf(j).t) && !RX.peds.test(jf(j).t));
          return xs.slice(0, 10).map((j, i) => [{ id: j.id, hid: j.h.id, rank: i + 1, hi: j.hi }, j.h]);
        }
        return rows.filter(([r, x]) => t.type === "property" ? C.prop(x) : C.cty(x.county)).map(([r, x], i) => [Object.assign({}, r, { rank: i + 1 }), x]);
      },
      note: kind => `<div class="pnote">👤 Profile <b>${esc(P.name || slot)}</b> is on: showing only matching ${kind}. <a href="#pedit=${slot}">Edit</a> · <button type="button" class="linkbtn" data-pall="1">Show all</button></div>`,
    };
  }
  const ATT = ["a_park", "a_water", "a_aqua", "a_museum", "a_camp"];
  const LMAP = { biz: ["biz"], bldg: ["bldg"], att: ATT, sch: ["sch"], col: ["col"], apt: ["apt"], travel: ["travel"], perm: ["perm"] };
  function applyLayers(P) {
    A.LAYERS.forEach(d => { if (!d.layer || d.group) return; const want = A.layerDefault(d); if (A.map.hasLayer(d.layer) !== want) A.setLayer(d, want); });
    if (!P) return;
    const H = P.home || {};
    ["props", "homes", "nh", "cab", "big", "cvf"].forEach(k => { const d = A.LAYERS.find(x => x.key === k), w = k === "cab" || k === "big" || k === "cvf" ? H[k] !== 0 : !!H[k]; if (d && A.map.hasLayer(d.layer) !== w) A.setLayer(d, w); });
    const L = P.layers || {};
    if (L.set) Object.keys(LMAP).forEach(k => LMAP[k].forEach(key => { const d = A.LAYERS.find(x => x.key === key); if (d && !d.disabled && A.map.hasLayer(d.layer) !== !!L[k]) A.setLayer(d, !!L[k]); }));
  }
  function applyPins(prof) {
    const travel = [];
    Object.values(A.MARK).forEach(e => {
      let px = 0, it = e.it;
      if (prof) {
        if (e.type === "property") px = prof.prop(it) ? 0 : 1;
        else if (e.type === "travel") { const js = it.jobs.filter(j => prof.job(j, it)); px = js.length ? 0 : 1; const top = js.length ? Math.max(...js.map(j => j.hi)) : null; if (top !== (it.ptop ?? it.top)) { it.ptop = top != null && top !== it.top ? top : undefined; travel.push(e); } }
        else if (e.type === "school") px = prof.school(it) ? 0 : 1;
        else if (it && it.county && e.type !== "city") px = C.cty(it.county) ? 0 : 1;
      } else if (e.type === "travel" && it.ptop !== undefined) { it.ptop = undefined; travel.push(e); }
      if ((e.px || 0) !== px) e.px = px;
    });
    travel.forEach(e => A.remake(e));
    A.sched(true);
  }
  function use(slot, quiet) {
    const P = slot ? load(slot) : null;
    if (slot && !P) { edit(slot); return; }
    active = P ? slot : "";
    if (active) localStorage.setItem(ACT, active); else localStorage.removeItem(ACT);
    const prof = P ? api(slot, P) : null;
    A.setProf(prof); applyPins(prof); applyLayers(P); if (A.reSolo) A.reSolo(); A.renderPBar(); A.refreshCard();
    if (!quiet) A.toast(P ? `Profile ${P.name || slot} on` : "All: default map, no profile filter");
  }
  function counts(P) {
    const c = compile(P);
    return { homes: (A.K.properties || []).filter(c.prop).length, jobs: A.TJ_ALL.filter(j => c.job(j, j.h)).length };
  }

  // ---------------------------------------------------------------- the panel (#pedit=P2), share import (#profile=...), match lists (#pmatch=P2-homes)
  const SPEC_IN = () => SPECS.filter(s => A.TJ_ALL.some(j => jf(j).specs.includes(s[0])));
  const AGENCIES = () => [...new Set(A.TJ_ALL.map(j => j.ag).filter(Boolean))].sort();
  const KINDS = { general: "General acute-care hospital", specialty: "Specialty hospital (rehab, psych, LTAC…)" };
  const cb = (name, val, on, label) => `<label class="pfc"><input type="checkbox" name="${name}" value="${esc(val)}"${on ? " checked" : ""}> ${label}</label>`;
  const nf = (name, v, label, ph, extra = "") => `<label class="pfn">${label}<input type="number" inputmode="numeric" name="${name}" value="${v == null ? "" : esc(v)}" placeholder="${esc(ph || "any")}" ${extra}></label>`;
  const sel = (name, v, opts, label) => `<label class="pfn">${label}<select name="${name}">${opts.map(([k, t]) => `<option value="${esc(k)}"${String(v || "") === String(k) ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
  const has = (a, v) => (a || []).map(String).includes(String(v));
  function formHtml(slot, P) {
    const H = P.home || {}, J = P.jobs || {}, R = P.area || {}, L = P.layers || {};
    const cnt = counts(P);
    const isAct = active === slot;
    const ctys = Object.keys(A.IDX.county).sort();
    const mselect = (name, vals) => `<select name="${name}" multiple size="5" class="pfmulti">${ctys.map(c => `<option${has(vals, c) ? " selected" : ""}>${esc(c)}</option>`).join("")}</select>`;
    return `<div class="kicker">👤 Profile ${slot}${isAct ? " · <span class=\"pon\">ON</span>" : ""}</div><h2>${esc(P.name || slot + " (not set up yet)")}</h2>
      <div class="sub">Profiles filter the pins, the Top 10 lists and the county counts. “All” brings back the default map.</div>
      <div class="stats">${A.stat(cnt.homes, "matching homes")}${A.stat(cnt.jobs, "matching jobs")}</div>
      <div class="pfact"><button type="button" class="btn" data-pf="save">${isAct ? "Save" : "Save & use"}</button>${load(slot) && !isAct ? '<button type="button" class="btn ghost" data-pf="use">Use</button>' : ""}
        <button type="button" class="btn ghost" data-pf="all">All / no filter</button></div>
      <div class="pfact"><a class="btn ghost" href="#pmatch=${slot}-homes">📋 Matching homes</a><a class="btn ghost" href="#pmatch=${slot}-jobs">📋 Matching jobs</a></div>
      <div class="pferr" id="pfErr" role="alert" hidden></div>
      <form class="pform" id="pform" novalidate autocomplete="off">
      <details class="pfsec" open><summary>Basics</summary>
        <label class="pfn">Name (up to 9 letters)<input type="text" name="name" maxlength="9" required pattern=".{1,9}" value="${esc(P.name || "")}" placeholder="${slot}" autocapitalize="words"></label>
        <label class="pfn">Home base town (for distance filters)<input type="text" name="area.baseName" list="pfTowns" value="${esc(R.base ? R.base.name : "")}" placeholder="e.g. Danville"></label>
        <datalist id="pfTowns">${towns().map(t => `<option value="${esc(t.n)}">`).join("")}</datalist>
      </details>
      <details class="pfsec"><summary>🏠 Housing</summary>
        <div class="pfh">Show</div><div class="pfgrid">${cb("home.props", 1, H.props, "Home + 5 acres")}${cb("home.homes", 1, H.homes, "1-acre homes")}${cb("home.nh", 1, H.nh, "Near-hospital homes")}${(window.KYX_ST || {}).cabin ? cb("home.cab", 1, H.cab !== 0, esc(((window.KYX_ST || {}).cabin.label || "Cabin") + "s (" + ((window.KYX_ST || {}).cabin.acres || 25) + "+ ac)")) : ""}${cb("home.barg", 1, H.barg, "⭐ Bargains")}</div>
        <div class="pfgrid">${nf("home.minP", H.minP, "Min price $", "any", 'step="5000"')}${nf("home.maxP", H.maxP, "Max price $", "any", 'step="5000"')}
          ${nf("home.beds", H.beds, "Min beds")}${nf("home.baths", H.baths, "Min baths", "any", 'step="0.5"')}${nf("home.sqft", H.sqft, "Min sq ft", "any", 'step="100"')}${nf("home.acres", H.acres, "Min acres", "any", 'step="0.5"')}
          ${nf("home.maxHm", H.maxHm, "Max min. to a hospital")}${nf("home.maxTm", H.maxTm, "Max min. to Level I/II trauma")}
          ${nf("home.minYb", H.minYb, "Year built (min)")}${nf("home.maxDom", H.maxDom, "Max days on market")}${nf("home.maxPpa", H.maxPpa, "Max $ per acre", "any", 'step="1000"')}${nf("home.maxBase", H.maxBase, "Max miles from home base")}</div>
        <div class="pfgrid">${cb("home.condo", 1, H.condo, "Townhomes / condos OK")}${cb("home.noFix", 1, H.noFix, "No fixer-uppers")}</div>
        <div class="pfh">Property type <span class="small">(none checked = any)</span></div>
        <div class="pfgrid">${[["house", "House"], ["townhome", "Townhome"], ["condo", "Condo"], ["land", "Land (5+ ac)"], ["farm", "Farm"], ["cabin", "Cabin / log home"], ["mobile", "Mobile / manufactured"]].map(([k, t]) => cb("home.types", k, has(H.types, k), t)).join("")}</div>
        <div class="pfh">Must have <span class="small">(from the listing text)</span></div>
        <div class="pfgrid">${cb("home.garage", 1, H.garage, "Garage / carport")}${cb("home.bsmt", 1, H.bsmt, "Basement")}${cb("home.single", 1, H.single, "Single story")}${cb("home.pool", 1, H.pool, "Pool")}
          ${cb("home.outb", 1, H.outb, "Barn / workshop / outbuilding")}${cb("home.fence", 1, H.fence, "Fenced")}${cb("home.reduced", 1, H.reduced, "Price reduced")}${cb("home.photos", 1, H.photos, "Has photos")}</div>
        <div class="pfh">Water <span class="small">(any checked)</span></div>
        <div class="pfgrid">${cb("home.water", "c", has(H.water, "c"), "Creek / stream")}${cb("home.water", "n", has(H.water, "n"), "Pond")}${cb("home.water", "l", has(H.water, "l"), "Lake / river frontage")}</div>
        <div class="pfgrid">${sel("home.land", H.land, [["", "Any"], ["w", "Wooded"], ["O", "Open / pasture"]], "Land")}${sel("home.util", H.util, [["", "Any"], ["W", "Well / septic"], ["C", "City water / sewer"]], "Utilities")}
          ${sel("home.sort", H.sort, [["", "Price (low first)"], ["ppa", "Price per acre"], ["new", "Newest"], ["acres", "Most acres"], ["hosp", "Closest hospital"]], "Sort lists by")}</div>
        <div class="pfgrid">${cb("home.hoaNone", 1, H.hoaNone, "No HOA")}${nf("home.hoaMax", H.hoaMax, "Max HOA $/mo")}</div>
        <label class="pfn">Keywords (all must appear)<input type="text" name="home.kw" value="${esc(H.kw || "")}" placeholder="e.g. creek barn"></label>
      </details>
      <details class="pfsec"><summary>💼 Jobs</summary>
        <div class="pfh">Specialty <span class="small">(✓ include = only these; ✗ exclude)</span></div>
        <div class="pfspec">${SPEC_IN().map(([k, t]) => `<div class="pfsr"><span>${esc(t)}</span><label title="Include"><input type="checkbox" name="jobs.inc" value="${k}"${has(J.inc, k) ? " checked" : ""}> ✓</label><label title="Exclude"><input type="checkbox" name="jobs.exc" value="${k}"${has(J.exc, k) ? " checked" : ""}> ✗</label></div>`).join("")}</div>
        <div class="pfgrid">${nf("jobs.minPay", J.minPay, "Min pay $")}${sel("jobs.unit", J.unit, [["wk", "per week"], ["hr", "per hour"]], "Pay is")}
          ${sel("jobs.shift", J.shift, [["", "Any"], ["day", "Days"], ["night", "Nights / evenings"], ["rot", "Rotating / mixed"]], "Shift")}
          ${nf("jobs.minWk", J.minWk, "Min weeks")}${nf("jobs.maxWk", J.maxWk, "Max weeks")}${nf("jobs.maxMi", J.maxMi, "Max miles from home base")}${nf("jobs.posted", J.posted, "Posted within (days)")}
          <label class="pfn">Start from<input type="date" name="jobs.sFrom" value="${esc(J.sFrom || "")}"></label><label class="pfn">Start by<input type="date" name="jobs.sTo" value="${esc(J.sTo || "")}"></label>
          ${sel("jobs.trauma", J.trauma, [["", "Any"], ["1", "Level I only"], ["2", "Level I or II"], ["3", "Level I–III"], ["4", "Any trauma level"]], "Trauma center")}
          ${sel("jobs.sort", J.sort, [["", "Pay (highest)"], ["dist", "Distance from home base"], ["new", "Newest posting"]], "Sort by")}</div>
        <div class="pfh">Hours per week</div><div class="pfgrid">${[36, 40, 48].map(h => cb("jobs.hours", h, has(J.hours, h), h + " hrs")).join("")}</div>
        <div class="pfh">Facility type</div><div class="pfgrid">${Object.entries(KINDS).map(([k, t]) => cb("jobs.fac", k, has(J.fac, k), t)).join("")}</div>
        <details class="pfsub"><summary>Agency (${AGENCIES().length})</summary><div class="pfgrid">${AGENCIES().map(a => cb("jobs.ag", a, has(J.ag, a), esc(a))).join("")}</div></details>
        <div class="pfh">Leave out</div><div class="pfgrid">${cb("jobs.exOR", 1, J.exOR, "OR (PACU / recovery OK)")}${cb("jobs.exCath", 1, J.exCath, "Cath lab")}${cb("jobs.exMom", 1, J.exMom, "Mom-baby, L&D, OB, NICU, women's")}${cb("jobs.exPeds", 1, J.exPeds, "Peds")}</div>
        <div class="small">These four are already left out when the jobs are collected, so unchecking them can't add postings.</div>
      </details>
      <details class="pfsec"><summary>🩺 Permanent RN jobs</summary>
        ${A.PJ && A.PJ() ? A.PJ().formHtml("pjobs", P.pjobs || A.PJ().DEF()) : '<div class="small">Permanent job data is not available.</div>'}
        <div class="small">These filters drive the blue hats, the county lists and the permanent-job Top 10s while this profile is on.</div>
      </details>
      <details class="pfsec"><summary>🚗 Area / commute</summary>
        <div class="pfgrid">${nf("area.c7a", R.c7a, "Max min. to hospital, 7 AM")}${nf("area.c7p", R.c7p, "Max min. to hospital, 7 PM")}
          ${sel("area.minSch", R.minSch, [["", "Any"], ["Blue", "Blue"], ["Green", "Green or better"], ["Yellow", "Yellow or better"], ["Orange", "Orange or better"]], "Min school rating (KDE)")}
          ${nf("area.townMi", R.townMi, "Max miles to a town")}</div>
        <div class="small">Commute: Google 7 AM / 7 PM times where the listing has them, otherwise free-flow drive time. School rating = the home's assigned schools (and school pins). Walmart / grocery distances aren't in the data, so there's no filter for them.</div>
        <div class="pfgrid2"><label class="pfn">Only these counties ${mselect("area.cInc", R.cInc)}</label><label class="pfn">Leave out counties ${mselect("area.cExc", R.cExc)}</label></div>
      </details>
      <details class="pfsec"><summary>🗺 Layers</summary>
        ${cb("layers.set", 1, L.set, "<b>Set which layers show</b> with this profile")}
        <div class="pfgrid">${[["biz", "Businesses for sale"], ["bldg", "Odd buildings"], ["att", "Attractions"], ["sch", "Schools"], ["col", "Colleges"], ["apt", "Airports"], ["travel", "Travel jobs"], ["perm", "Permanent RN jobs"]].map(([k, t]) => cb("layers." + k, 1, L[k], t)).join("")}</div>
      </details>
      </form>
      <div class="pfact"><button type="button" class="btn" data-pf="save">${isAct ? "Save" : "Save & use"}</button><button type="button" class="btn ghost" data-pf="share">Share link</button><button type="button" class="btn ghost" data-pf="reset">Reset</button></div>
      <div class="actions" hidden><button class="btn" id="shareBtn">Share</button></div>`;
  }
  function readForm(f, slot) {
    const P = { v: 1, name: "", jobs: {}, pjobs: {}, home: {}, area: {}, layers: {} };
    const put = (path, v) => { const [a, b] = path.split("."); if (!b) P[a] = v; else P[a][b] = v; };
    const arr = {};
    [...f.elements].forEach(el => {
      if (!el.name) return;
      if (el.type === "checkbox") {
        if (/^(home\.(types|water)|jobs\.(inc|exc|hours|ag|fac)|pjobs\.(x|i|e|s))$/.test(el.name)) { (arr[el.name] = arr[el.name] || []); if (el.checked) arr[el.name].push(el.name === "jobs.hours" ? +el.value : el.value); }
        else put(el.name, el.checked ? 1 : 0);
      } else if (el.multiple) arr[el.name] = [...el.selectedOptions].map(o => o.value);
      else if (el.type === "number") { const v = num(el.value); if (v != null) put(el.name, v); }
      else if (el.name === "name") P.name = el.value.trim();
      else if (el.name === "area.baseName") { const t = townOf(el.value); if (t) P.area.base = { name: t.n, lat: +t.lat.toFixed(5), lon: +t.lon.toFixed(5) }; else if (el.value.trim()) P.area._badBase = el.value.trim(); }
      else if (el.value !== "") put(el.name, el.value);
    });
    Object.entries(arr).forEach(([k, v]) => { if (v.length || k.startsWith("pjobs.")) put(k, v); });
    return P;
  }
  function validate(P) {
    if (!P.name) return "Give the profile a name (up to 9 letters).";
    if (P.name.length > 9) return "The name can be at most 9 characters.";
    if (P.area._badBase) return `Home base “${P.area._badBase}” isn't a town on the map. Pick one from the list.`;
    const H = P.home; if (H.minP != null && H.maxP != null && H.minP > H.maxP) return "Min price is above max price.";
    return null;
  }
  function edit(slot, opts = {}) {
    const P = load(slot) || EMPTY();
    A.showPage({ type: "profile", id: slot, hash: "#pedit=" + slot }, formHtml(slot, P), "#pedit=" + slot, Object.assign({ title: "Profile " + (P.name || slot) }, opts));
    wire(slot);
  }
  function wire(slot) {
    const body = A.body, f = body.querySelector("#pform");
    body.querySelectorAll("[data-pf]").forEach(b => b.onclick = () => {
      const k = b.dataset.pf;
      if (k === "save") {
        const P = readForm(f, slot), err = validate(P), e = body.querySelector("#pfErr");
        if (err) { e.textContent = err; e.hidden = false; e.scrollIntoView({ block: "center" }); return; }
        delete P.area._badBase; store(slot, P); use(slot, true); A.toast(`Saved ${P.name} (${slot}) and turned it on`); edit(slot, { replace: true });
      } else if (k === "use") { use(slot); edit(slot, { replace: true }); }
      else if (k === "all") { use(""); edit(slot, { replace: true }); }
      else if (k === "reset") {
        if (!confirm(`Reset ${slot}${SEED[slot] ? " to Bill's defaults" : " (clear it)"}?`)) return;
        localStorage.removeItem(KEY(slot)); if (active === slot) use(SEED[slot] ? slot : "", true); A.renderPBar(); edit(slot, { replace: true }); A.toast(`${slot} reset`);
      } else if (k === "share") share(slot);
    });
    if (f) f.addEventListener("input", () => { const e = body.querySelector("#pfErr"); if (e) e.hidden = true; });
    const nm = f && f.querySelector("[name=name]"); if (nm) nm.addEventListener("input", () => { if (nm.value.length > 9) nm.value = nm.value.slice(0, 9); });
    const sb = body.querySelector("#shareBtn"); if (sb) sb.onclick = () => share(slot);  // header share button
  }
  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
  function share(slot) {
    const P = load(slot); if (!P) { A.toast("Save the profile first"); return; }
    const p = JSON.parse(JSON.stringify(P)); delete p.seed;
    const url = location.href.split("#")[0] + "#profile=" + b64(JSON.stringify(p));
    const title = `${(window.KYX_ST || {}).app || "Kentucky Explorer"} profile: ${P.name || slot}`;
    if (navigator.share) navigator.share({ title, text: title, url }).catch(() => { }); else A.copy(url);
  }
  function importPage(enc, opts) {
    let P = null; try { P = JSON.parse(unb64(enc)); } catch (e) { }
    if (!P || typeof P !== "object") { A.showPage({ type: "profile", id: "bad", hash: "#profile=" + enc }, `<div class="kicker">👤 Profile link</div><h2>This profile link is damaged</h2>`, "#profile=" + enc, opts); return; }
    P.name = String(P.name || "Shared").slice(0, 9);
    ["jobs", "home", "area", "layers"].forEach(k => { if (!P[k] || typeof P[k] !== "object") P[k] = {}; });
    const c = counts(P), free = SLOTS.find(k => !localStorage.getItem(KEY(k)) && !SEED[k]) || "P4";
    A.showPage({ type: "profile", id: "import", hash: "#profile=" + enc }, `<div class="kicker">👤 Shared profile</div><h2>${esc(P.name)}</h2>
      <div class="sub">Someone sent you a ${esc((window.KYX_ST || {}).app || "Kentucky Explorer")} profile. Save it to a slot to use it; you can edit it after.</div>
      <div class="stats">${A.stat(c.homes, "matching homes")}${A.stat(c.jobs, "matching jobs")}</div>
      <label class="pfn">Save to slot <select id="pfSlot">${SLOTS.map(k => { const q = load(k); return `<option value="${k}"${k === free ? " selected" : ""}>${k}${q ? " (replaces " + esc(q.name || k) + ")" : " (empty)"}</option>`; }).join("")}</select></label>
      <div class="pfact"><button type="button" class="btn" id="pfImp">Save & use</button></div>`, "#profile=" + enc, Object.assign({ title: "Shared profile " + P.name }, opts));
    A.body.querySelector("#pfImp").onclick = () => { const k = A.body.querySelector("#pfSlot").value; store(k, P); use(k, true); A.toast(`Saved ${P.name} to ${k}`); edit(k, { replace: true }); };
  }
  function matchPage(slot, what, opts) {
    const P = load(slot); if (!P) { edit(slot, opts); return; }
    const c = compile(P);
    let rows = "", n = 0;
    if (what === "jobs") {
      const js = c.sortJobs(A.TJ_ALL.filter(j => c.job(j, j.h))); n = js.length;
      rows = js.slice(0, 300).map(j => A.gRow("travel", j.h.id, "", A.gImg(j.h.th && j.h.th.u, "💼"), `<b class="gpay">${A.money(j.hi)}/wk</b> · ${esc(j.u || j.sp || "RN")}`, `<b>${esc(j.h.name)}</b>${j.h.city ? " · " + esc(j.h.city) : ""}`, A.dot([j.sh && esc(j.sh), j.len && esc(j.len), j.ag && esc(j.ag)]), true)).join("");
    } else {
      const ps = c.sortProps((A.K.properties || []).filter(c.prop)); n = ps.length;
      rows = ps.map(p => { const f = PF.props[p.id] || {}; return A.gRow("property", p.id, "", A.gImg(p.rt || (p.th && p.th.u), "🏠"), `<b>${A.money(p.price)}</b> · ${p.beds != null ? esc(p.beds) + " bd / " + esc(p.baths) + " ba" : ""}${p.acres ? " · " + esc((+p.acres).toLocaleString(undefined, { maximumFractionDigits: 2 })) + " ac" : ""}`,
        esc(p.title), A.dot([p.town && esc(p.town), f.hm != null && "🏥 " + f.hm + " min", f.dom != null && f.dom + " days listed"]), true); }).join("");
    }
    A.showPage({ type: "profile", id: slot + "-" + what, hash: `#pmatch=${slot}-${what}` }, `<div class="kicker">👤 ${esc(P.name || slot)} · matching ${what}</div><h2>${n} ${what === "jobs" ? "travel jobs" : "homes"} match</h2>
      <div class="sub"><a href="#pedit=${slot}">Edit the profile</a></div><div class="glist">${rows || '<div class="gempty">Nothing matches. Loosen a filter.</div>'}</div>`, `#pmatch=${slot}-${what}`, Object.assign({ title: `${P.name || slot}: matching ${what}` }, opts));
  }
  function route(hs, opts) {
    const cur = A.current();
    if (cur && cur.hash === hs) return;
    let m;
    if ((m = hs.match(/^#pedit=(P[1-4])$/))) edit(m[1], opts);
    else if ((m = hs.match(/^#pmatch=(P[1-4])-(homes|jobs)$/))) matchPage(m[1], m[2], opts);
    else if ((m = hs.match(/^#profile=([A-Za-z0-9_-]+)$/))) importPage(m[1], opts);
  }
  function tap(slot) {
    if (!slot) { use(""); return; }
    if (load(slot)) use(slot, true);
    edit(slot);
  }
  window.KYXP = {
    init(api_) { A = api_; PF = window.KYXPF_D || PF; document.addEventListener("click", e => { if (e.target.closest && e.target.closest("[data-pall]")) { e.preventDefault(); use(""); } }); return window.KYXP; },
    boot() { const k = localStorage.getItem(ACT); if (k && load(k)) use(k, true); },
    tap, use, route, active: () => active,
    relayer() { applyLayers(active ? load(active) : null); },  // app.js: leaving a solo layer button
  };
})();

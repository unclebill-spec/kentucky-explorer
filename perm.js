/* Kentucky Explorer: permanent (staff) RN jobs at Kentucky hospitals. Loaded after the first paint with data/pjm.js (hospitals + one
   small filter tuple per job); data/pjd.js (titles, units, pay text, bonus, links) loads only when a hat, a county list or a Top 10 opens.
   Data: ../data/perm_jobs.json (scripts/perm_jobs_collect.py, public career sites) -> build.py write_perm().
   Filters: one global set (Layers panel, localStorage kyx_pjf, default = Bill's exclusions) or the active profile's own set (P.pjobs). */
(function () {
  "use strict";
  let A = null, M = null, H = [], J = [], D = null, SPK = [], SPL = {}, ready = false;
  const EMP = ["", "FT", "PT", "PRN"], SH = ["day", "night", "eve", "wkd", "rot"], SHL = { day: "Day", night: "Night", eve: "Evening", wkd: "Weekend", rot: "Rotating", na: "Not stated" };
  const ROLE = r => (M.roles || [])[r] || "staff";
  const DEF = () => ({ x: ["or", "cath", "mom", "nicu", "peds"], i: [], e: [], s: [], p: 0, m: 0, c: 1, g: 1, b: 0 });
  const norm = f => { const d = DEF(); if (!f || typeof f !== "object") return d; const o = {};
    ["x", "i", "e", "s"].forEach(k => o[k] = Array.isArray(f[k]) ? f[k].map(String) : k === "x" && !("x" in f) ? d.x : []);
    o.p = f.p ? 1 : 0; o.m = +f.m > 0 ? +f.m : 0; o.c = "c" in f ? (f.c ? 1 : 0) : 1; o.g = "g" in f ? (f.g ? 1 : 0) : 1; o.b = f.b ? 1 : 0; return o; };
  const LSP = (window.KYX_ST || {}).ls || "kyx_";
  let GF = DEF(); try { const s = localStorage.getItem(LSP + "pjf"); if (s) GF = norm(JSON.parse(s)); } catch (e) { }
  let TOPCM = localStorage.getItem(LSP + "pjtop_cm") === "1";  // Top 10s: include charge / manager roles
  const active = () => { const P = A.PROF(); return P && P.pj ? norm(P.pj) : GF; };
  const fromProfile = () => { const P = A.PROF(); return !!(P && P.pj); };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isCharge = x => ROLE(x[2]) === "charge", isMgr = x => /manager|leadership/.test(ROLE(x[2]));
  // x = [hospital, specialty, role, emp, shift bits, top hourly, low hourly, bonus (0 none, 1 amount not listed, else $), extra tags]
  function pass(x, F, o = {}) {
    const sp = SPK[x[1]], tg = x[8] || [];
    if (F.x.length && (F.x.includes(sp) || tg.some(t => F.x.includes(SPK[t])))) return false;
    if (F.i.length && !F.i.includes(sp)) return false;
    if (F.e.length && !F.e.includes(EMP[x[3]] || "na")) return false;
    if (F.s.length && !(x[4] ? SH.some((s, i) => (x[4] & (1 << i)) && F.s.includes(s)) : F.s.includes("na"))) return false;
    if ((F.p || F.m) && x[5] == null) return false;
    if (F.m && x[5] < F.m) return false;
    if (F.b && !x[7]) return false;
    const c = o.roles != null ? o.roles : F.c, g = o.roles != null ? o.roles : F.g;
    if (!c && isCharge(x)) return false; if (!g && isMgr(x)) return false;
    return true;
  }
  const hrs = v => "$" + (Math.round(v * 100) / 100).toFixed(2).replace(/\.00$/, "");
  const payOf = (i, x) => D && D[i][3] ? D[i][3] : x[5] != null ? (x[6] != null && x[6] !== x[5] ? hrs(x[6]) + "–" + hrs(x[5]) : hrs(x[5])) + "/hr" : "";
  const bonusOf = (i, x) => D && D[i][4] ? D[i][4] : x[7] > 1 ? "$" + x[7].toLocaleString() + " sign-on bonus" : x[7] ? "Sign-on bonus" : "";
  const HAT = (txt, w = 36, h = 22) => A.G.nurseCap(txt, "#fff", "#1565c0", "#fff");
  const RHAT = txt => A.G.nurseCap(txt, "#fff", "#c62828", "#fff");
  const capTxt = (n, top) => top != null ? "$" + Math.round(top) : String(n);

  // ---------------------------------------------------------------- map hats (one per hospital; count or top listed hourly pay)
  const ENT = [];
  function apply() {
    const F = active(); let tot = 0;
    H.forEach((h, hi) => {
      const js = h.js.filter(i => pass(J[i], F)); h.n = js.length; h.top = js.reduce((m, i) => J[i][5] != null && (m == null || J[i][5] > m) ? J[i][5] : m, null); tot += js.length;
      const e = h.e; if (!e) return;
      const txt = capTxt(h.n, h.top);
      if (!h.n) { if (A.L_perm.hasLayer(e)) A.L_perm.removeLayer(e); return; }
      if (e._txt !== txt) { e._txt = txt; if (A.L_perm.hasLayer(e)) A.L_perm.removeLayer(e); if (e.mk) { e.mk.off(); e.mk = null; }
        const ic = A.L.divIcon({ className: "", html: `<div class="mk sv tjc pjc" style="width:36px;height:22px">${HAT(txt)}</div>`, iconSize: [36, 22], iconAnchor: [18, -1] });  // just below the hospital point, clear of a red travel hat
        e.ic = () => ic; e.z = 2400 + Math.min(99, h.n); }
      if (!A.L_perm.hasLayer(e)) A.L_perm.addLayer(e);
    });
    const d = A.LAYERS.find(x => x.key === "perm"); if (d && d.cb) { const c = d.cb.parentNode.querySelector(".cnt"); if (c) c.textContent = tot === J.length ? String(tot) : `${tot} of ${J.length}`; }
    document.querySelectorAll("[data-pjn]").forEach(b => { const n = countyJobs(b.dataset.pjn).length; b.textContent = n; const a = b.closest(".gt"); if (a && !n) a.classList.add("zero"); });
    const s = document.getElementById("pjSum"); if (s) s.innerHTML = sumHtml();
    A.sched(true); if (A.keyReady()) A.renderKey();
  }
  // ---------------------------------------------------------------- filter text + forms (Layers panel and the profile form share formHtml)
  function summary(F) {
    const sp = F.i.length ? "only " + F.i.map(k => SPL[k] || k).join(", ") : "";
    const ex = F.x.length ? "no " + F.x.map(k => (SPL[k] || k).replace(/ \(.*\)$/, "")).join(", ") : "";
    return [sp, ex, F.e.length && F.e.join("/"), F.s.length && F.s.map(s => SHL[s]).join("/") + " shifts", F.p && "pay listed only", F.m && "≥ $" + F.m + "/hr",
      !F.c && "no charge roles", !F.g && "no manager roles", F.b && "sign-on bonus only"].filter(Boolean).join(" · ") || "all permanent RN jobs";
  }
  const sumHtml = () => { const F = active(); return `${fromProfile() ? "👤 Profile filters: " : ""}${esc(summary(F))}`; };
  const has = (a, v) => (a || []).includes(v);
  const cb = (name, val, on, label) => `<label class="pfc"><input type="checkbox" name="${name}" value="${esc(val)}"${on ? " checked" : ""}> ${label}</label>`;
  function formHtml(pre, F) {
    F = norm(F);
    return `<div class="pfh">Specialty <span class="small">(✓ only these · ✗ leave out; PACU and CVICU are their own rows)</span></div>
      <div class="pfspec">${M.specs.map(([k, t]) => `<div class="pfsr"><span>${esc(t)}</span><label title="Only these"><input type="checkbox" name="${pre}.i" value="${k}"${has(F.i, k) ? " checked" : ""}> ✓</label><label title="Leave out"><input type="checkbox" name="${pre}.x" value="${k}"${has(F.x, k) ? " checked" : ""}> ✗</label></div>`).join("")}</div>
      <div class="pfh">Employment type <span class="small">(none ticked = any)</span></div><div class="pfgrid">${["FT", "PT", "PRN", "na"].map(v => cb(pre + ".e", v, has(F.e, v), { FT: "Full-time", PT: "Part-time", PRN: "PRN", na: "Not stated" }[v])).join("")}</div>
      <div class="pfh">Shift <span class="small">(none ticked = any)</span></div><div class="pfgrid">${[...SH, "na"].map(v => cb(pre + ".s", v, has(F.s, v), SHL[v])).join("")}</div>
      <div class="pfh">Pay, roles, bonus</div><div class="pfgrid">${cb(pre + ".p", 1, F.p, "Pay listed only")}<label class="pfn">Min hourly pay $ (top of range)<input type="number" inputmode="decimal" name="${pre}.m" value="${F.m || ""}" placeholder="any" min="0" max="200" step="1"></label>
        ${cb(pre + ".c", 1, F.c, "Include charge nurse roles")}${cb(pre + ".g", 1, F.g, "Include manager / supervisor roles")}${cb(pre + ".b", 1, F.b, "Sign-on bonus only")}</div>
      <div class="small">Only about ${Math.round((M.share || 0.19) * 100)}% of postings list pay, so “pay listed only” or a minimum pay hides most jobs.</div>`;
  }
  function readForm(root, pre) {
    const f = { x: [], i: [], e: [], s: [], p: 0, m: 0, c: 0, g: 0, b: 0 };
    root.querySelectorAll(`[name^="${pre}."]`).forEach(el => { const k = el.name.slice(pre.length + 1);
      if (Array.isArray(f[k])) { if (el.checked) f[k].push(el.value); } else if (el.type === "checkbox") f[k] = el.checked ? 1 : 0; else f[k] = +el.value > 0 ? +el.value : 0; });
    return f;
  }
  function panel(w) {  // Layers panel: summary line + "change" opens the form inline
    w.innerHTML = `<div class="small pjsum"><span id="pjSum">${sumHtml()}</span> · <button type="button" class="linkbtn" id="pjEdit">change</button></div><form id="pjForm" class="pjform" hidden></form>`;
    const f = w.querySelector("#pjForm");
    w.querySelector("#pjEdit").onclick = () => {
      if (!f.hidden) { f.hidden = true; return; }
      f.innerHTML = (fromProfile() ? `<div class="pnote">👤 The active profile has its own permanent-job filters (edit them in the profile). These are the filters for the default map.</div>` : "") + formHtml("pjf", GF) +
        `<div class="pfact"><button type="button" class="btn ghost" id="pjReset">Reset to Bill's defaults</button></div>`;
      f.hidden = false;
      f.onchange = () => { GF = norm(readForm(f, "pjf")); localStorage.setItem(LSP + "pjf", JSON.stringify(GF)); apply(); A.refreshCard(); };
      f.querySelector("#pjReset").onclick = () => { GF = DEF(); localStorage.removeItem(LSP + "pjf"); f.hidden = true; apply(); A.refreshCard(); };
    };
  }
  // ---------------------------------------------------------------- rows
  const specL = x => (SPL[SPK[x[1]]] || "").replace(/ \(.*\)$/, "");
  function chips(i, x) {
    const pay = payOf(i, x), bon = bonusOf(i, x), sh = D ? D[i][2] : "";
    return `<div class="pjchips">${EMP[x[3]] ? `<span class="pjt">${EMP[x[3]]}</span>` : ""}${sh ? `<span class="pjt">${esc(sh)}</span>` : ""}${pay ? `<span class="pjt pay">${esc(pay)}</span>` : '<span class="pjt nopay">pay not listed</span>'}${bon ? `<span class="pjt bon">💰 ${esc(bon)}</span>` : ""}</div>`;
  }
  const roleTag = x => isCharge(x) ? " · charge" : isMgr(x) ? " · manager" : ROLE(x[2]) === "new_grad/residency" ? " · new grad / residency" : "";
  function jobRow(i, hosp) {
    const x = J[i], d = D[i], h = H[x[0]];
    return `<div class="tjrow pjrow"><div class="tjtop"><b>${esc(d[0])}</b>${hosp ? ` · ${A.link("perm", h.id, short(h.name))}` : ""}</div>
      ${d[1] || d[7] ? `<div class="small">${esc(d[1] || d[7])}</div>` : ""}${chips(i, x)}
      <div class="small">${esc(specL(x))}${roleTag(x)}${d[6] ? " · posted " + esc(d[6]) : ""}${d[5] ? ` · <a href="${esc(d[5])}" target="_blank" rel="noopener">Apply / view ↗</a>` : ""}</div></div>`;
  }
  const short = s => String(s || "").replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const sortJ = (a, b) => (J[b][5] ?? -1) - (J[a][5] ?? -1) || (J[b][7] || 0) - (J[a][7] || 0) || (D ? D[a][0].localeCompare(D[b][0]) : 0);
  const NOTE = () => `<div class="small tjnote">🩺 Permanent staff RN postings from each hospital system's public career site (seen ${esc(M.date)}). Pay is shown only where the posting lists it (about ${Math.round(M.share * 100)}% do); it is never estimated. A range is the posting's own range.${M.failed && M.failed.length ? ` Not covered: ${esc(M.failed.map(short).join(", "))} (career sites blocked or no online list).` : ""}</div>`;
  const filtNote = () => { const P = A.PROF(); return `<div class="small pjfn">Filters: ${sumHtml()} · ${P && P.pj ? `<a href="#pedit=${esc(P.slot)}">edit profile</a>` : '<button type="button" class="linkbtn" data-pjedit="1">change</button>'}</div>`; };
  // the hospital card (hat tap)
  function card(h) {
    const F = active(), all = h.js.slice().sort(sortJ), on = all.filter(i => pass(J[i], F)), off = all.filter(i => !pass(J[i], F));
    const hosp = h.hid && A.IDX.hospital[h.hid], tj = Object.values(A.IDX.travel).find(t => t.hospital_id && t.hospital_id === h.hid);
    const npay = on.filter(i => J[i][5] != null).length;
    return `<div class="kicker">🩺 Permanent RN jobs</div><h2>${esc(short(h.name))}</h2>
      <div class="sub">${esc([h.city, h.county && h.county + (window.KYX_ST.cus != null ? window.KYX_ST.cus : " County"), h.sys].filter(Boolean).join(" · "))}</div>
      <table class="kv">${hosp ? `<tr><td>Hospital</td><td>${A.link("hospital", hosp.id, hosp.name)}</td></tr>` : ""}${h.county && A.IDX.county[h.county] ? `<tr><td>${window.KYX_ST.cu || "County"}</td><td>${A.link("county", h.county, h.county + (window.KYX_ST.cus != null ? window.KYX_ST.cus : " County"))}</td></tr>` : ""}${tj ? `<tr><td>Travel jobs</td><td>${A.link("travel", tj.id, tj.n + " travel RN job" + (tj.n > 1 ? "s" : ""))}</td></tr>` : ""}</table>
      ${NOTE()}${filtNote()}<div class="kicker">${on.length} job${on.length === 1 ? "" : "s"} · ${npay} list pay · highest listed pay first</div>
      ${on.map(i => jobRow(i)).join("") || '<div class="gempty">No jobs here pass your filters.</div>'}
      ${off.length ? `<details class="pjmore"><summary>${off.length} more hidden by your filters</summary>${off.map(i => jobRow(i)).join("")}</details>` : ""}`;
  }
  // county list
  const countyJobs = name => { const F = active(); return J.map((x, i) => i).filter(i => H[J[i][0]].county === name && pass(J[i], F)); };
  function group(c, xs, from) {
    const row = i => { const x = J[i], d = D[i], h = H[x[0]], pay = payOf(i, x);
      return `<div class="trow">${A.gRow("perm", h.id, from, `<span class="gth ph pjh" aria-hidden="true">${HAT(x[5] != null ? "$" + Math.round(x[5]) : EMP[x[3]] || "RN")}</span>`,
        `<b>${esc(d[0])}</b>`, `${pay ? `<b class="gpay">${esc(pay)}</b> · ` : ""}${esc(short(h.name))}${d[1] ? " · " + esc(d[1]) : ""}`,
        A.dot([EMP[x[3]], d[2] && esc(d[2]), !pay && "pay not listed", bonusOf(i, x) && "💰 " + esc(bonusOf(i, x))]), true)}${d[5] ? `<a class="tapply" href="${esc(d[5])}" target="_blank" rel="noopener">Apply ↗</a>` : ""}</div>`; };
    const s = xs.slice().sort(sortJ), paid = s.filter(i => J[i][5] != null), np = s.filter(i => J[i][5] == null);
    const all = J.filter(x => H[x[0]].county === c.name).length;
    return { sub: "Highest listed pay first", note: NOTE() + filtNote() + (all > xs.length ? `<div class="small">${all - xs.length} more in this ${(window.KYX_ST.cu || "County").toLowerCase()} are hidden by the filters.</div>` : ""),
      secs: [["💵 Pay listed", paid.map(row), "None of these postings list pay."], ["Pay not listed", np.map(row), "—"]] };
  }
  // ---------------------------------------------------------------- Top 10s (perm ER, step-down + med-surg, ICU general, sign-on bonuses)
  const TSEL = { er: x => SPK[x[1]] === "er", sdms: x => SPK[x[1]] === "sd" || SPK[x[1]] === "ms", icu: x => SPK[x[1]] === "icu", bonus: x => x[7] > 0 };
  function topLists(t) {
    const F = active(), sel = TSEL[t.perm];
    const xs = J.map((x, i) => i).filter(i => sel(J[i]) && pass(J[i], F, { roles: TOPCM ? 1 : 0 }));
    if (t.perm === "bonus") {
      const tr = [];  // travel jobs that state a sign-on / completion bonus (none in the current data)
      (A.TJ_ALL || []).forEach(j => { if (j.bo) tr.push(j); });
      const amt = xs.filter(i => J[i][7] > 1), rows = amt.map(i => ({ i, v: J[i][7], p: J[i][5] })).concat(tr.map(j => ({ tj: j, v: j.bo, p: null })))
        .sort((a, b) => b.v - a.v || (b.p ?? -1) - (a.p ?? -1));
      return { top: rows.slice(0, 10), more: rows.slice(10), nolist: xs.filter(i => J[i][7] === 1).sort(sortJ), tr: tr.length, roleN: J.filter((x, i) => sel(x) && pass(x, F, { roles: 1 }) && (isCharge(x) || isMgr(x))).length };
    }
    const paid = xs.filter(i => J[i][5] != null).sort(sortJ);
    return { top: paid.slice(0, 10).map(i => ({ i })), more: paid.slice(10).map(i => ({ i })), nolist: xs.filter(i => J[i][5] == null).sort(sortJ),
      roleN: J.filter((x, i) => sel(x) && pass(x, F, { roles: 1 }) && (isCharge(x) || isMgr(x))).length };
  }
  function topRow(t, r, rank) {
    const from = "top|" + t.k;
    if (r.tj) { const j = r.tj, h = j.h;
      return `<div class="trow">${A.gRow("travel", h.id, from, `<span class="gth ph pjh" aria-hidden="true">${RHAT("T")}</span>`, `<b class="gpay">${rank ? "#" + rank + " " : ""}${j.bou ? "Up to " : ""}$${j.bo.toLocaleString()}</b> · <span class="pjtag tr">Travel</span> ${esc(j.u || j.sp || "RN")}`,
        `<b>${esc(short(h.name))}</b>${h.city ? " · " + esc(h.city) : ""}`, A.dot([j.sh && esc(j.sh), "$" + j.hi.toLocaleString() + "/wk", j.ag && esc(j.ag)]), true)}${j.url ? `<a class="tapply" href="${esc(j.url)}" target="_blank" rel="noopener">Apply ↗</a>` : ""}</div>`; }
    const i = r.i, x = J[i], d = D[i], h = H[x[0]], pay = payOf(i, x), bon = t.perm === "bonus";
    const l1 = bon ? `<b class="gpay">${rank ? "#" + rank + " " : ""}${esc(bonusOf(i, x).replace(/ sign-on bonus$/, ""))}</b> · ${esc(specL(x))}` : `<b class="gpay">${rank ? "#" + rank + " " : ""}${esc(pay || "pay not listed")}</b> · ${esc(d[0])}`;
    const l2 = `<b>${esc(short(h.name))}</b>${h.city ? " · " + esc(h.city) : ""}${bon ? " · " + esc(d[0]) : d[1] ? " · " + esc(d[1]) : ""}`;
    const l3 = A.dot([EMP[x[3]], d[2] && esc(d[2]), bon ? (pay ? esc(pay) : "pay not listed") : bonusOf(i, x) && "💰 " + esc(bonusOf(i, x)), roleTag(x).slice(3)]);
    return `<div class="trow">${A.gRow("perm", h.id, from, `<span class="gth ph pjh" aria-hidden="true">${HAT(bon ? "$" : SPK[x[1]] === "icu" ? "ICU" : SPK[x[1]] === "er" ? "ER" : "RN")}</span>`, l1, l2, l3, true)}${d[5] ? `<a class="tapply" href="${esc(d[5])}" target="_blank" rel="noopener" aria-label="Apply (opens ${esc(A.host(d[5]))})">Apply ↗</a>` : ""}</div>`;
  }
  function topHtml(t, nav) {
    const L = topLists(t), bon = t.perm === "bonus";
    const more = L.more.length ? `<details class="pjmore"><summary>See more: ${L.more.length} more ${bon ? "with a stated amount" : "with listed pay"}</summary>${L.more.map(r => topRow(t, r)).join("")}</details>` : "";
    const nol = L.nolist.length ? `<details class="pjmore"><summary>See more: ${L.nolist.length} ${bon ? "with a sign-on bonus, amount not listed" : "that don't list pay"}</summary>${L.nolist.map(i => topRow(t, { i })).join("")}</details>` : "";
    return `<div class="gbar"><button type="button" class="gback" id="gBack" aria-label="Back to the map">‹ Map</button>
        <button type="button" class="gshare" id="gShare" aria-label="Share this list">${navigator.share ? "Share" : "Copy link"}</button></div>
      <div class="kicker">${esc(t.title)} · <span class="tupd">Updated ${esc(M.date)}</span></div><h2>${esc(t.h2(L.top.length))}</h2>
      <div class="sub">${esc(t.sub)} · tap a row for the hospital's job list</div>
      <div class="small tjnote">💵 ${bon ? `Ranked by the sign-on bonus amount the posting states (“up to” amounts count at their maximum). ${M.bonus} of ${M.n} permanent postings mention a sign-on bonus. ${L.tr ? "" : `No travel posting lists a sign-on or completion bonus right now (${(A.TJ_ALL || []).length} checked); any that do show here tagged <span class="pjtag tr">Travel</span>.`}` : `Ranked by listed hourly pay, top of the range. Only about ${Math.round(M.share * 100)}% of postings list pay, so jobs without pay are in “see more” below.`}</div>
      ${filtNote()}<label class="pfc pjcm"><input type="checkbox" id="pjCM"${TOPCM ? " checked" : ""}> Include charge &amp; manager roles${L.roleN ? ` (${L.roleN})` : ""}</label>${nav}
      <div class="glist tlist">${L.top.map((r, k) => topRow(t, r, k + 1)).join("") || '<div class="gempty">Nothing qualifies with these filters.</div>'}${more}${nol}</div>
      <div class="actions"><button class="btn" id="shareBtn">${navigator.share ? "Share…" : "Share"}</button><button class="btn ghost" id="copyBtn">Copy link</button><button class="btn ghost" id="zoomBtn">Show all on map</button></div>
      <div class="small" style="word-break:break-all">Link: <a href="#${t.hash}">#${t.hash}</a></div>`;
  }
  const topPts = t => topLists(t).top.map(r => r.tj ? [r.tj.h.lat, r.tj.h.lon] : [H[J[r.i][0]].lat, H[J[r.i][0]].lon]).filter(p => p[0] != null);
  function wireTop(t) { const c = document.getElementById("pjCM"); if (c) c.onchange = () => { TOPCM = c.checked; localStorage.setItem(LSP + "pjtop_cm", TOPCM ? "1" : "0"); A.reTop(t.k); }; }
  // hospital / travel cards: a link to this hospital's permanent jobs
  function hook(type, it, body) {
    if (type !== "hospital" && type !== "travel") return;
    const hid = type === "hospital" ? it.id : it.hospital_id; if (!hid) return;
    const h = H.find(h => h.hid === hid); if (!h) return;
    const ac = body.querySelector(".actions"); if (!ac || body.querySelector(".pjlink")) return;
    ac.insertAdjacentHTML("beforebegin", `<div class="pjlink"><a class="inl" data-go="perm" data-id="${esc(h.id)}">🩺 ${h.n} permanent RN job${h.n === 1 ? "" : "s"} here${h.n < h.js.length ? ` (${h.js.length} before filters)` : ""} ›</a></div>`);
  }

  window.KYXPJ = {
    init(a) {
      if (ready) return window.KYXPJ; A = a; const d = window.KYXPJM_D; if (!d) throw new Error("no pjm");
      M = d.meta; J = d.j; SPK = M.specs.map(s => s[0]); M.specs.forEach(([k, l]) => SPL[k] = l);
      H = d.h.map(r => ({ id: r[0], name: r[1], lat: r[2], lon: r[3], county: r[4], city: r[5], sys: r[6], hid: r[7], js: [] }));
      J.forEach((x, i) => H[x[0]].js.push(i));
      A.IDX.perm = {}; H.forEach(h => { A.IDX.perm[h.id] = h;
        if (h.lat != null) h.e = A.ent("perm", h, null, { tip: () => `🩺 ${esc(short(h.name))} · ${h.n} permanent RN job${h.n === 1 ? "" : "s"}${h.top != null ? ` · top listed $${h.top.toFixed(2)}/hr` : " · pay not listed"}` }); });
      ready = true; apply(); return window.KYXPJ;
    },
    details() { D = window.KYXPJD_D || null; return !!D; },
    hasD: () => !!D, apply, active, norm, DEF, summary, formHtml, readForm, panel, card, countyJobs, group, topHtml, topPts, wireTop, hook,
    meta: () => M, count: () => J.length,
  };
})();

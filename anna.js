/* Anna profile: the 5th top button (after All / P1-P4). Shared by every state map; does nothing unless that state's build wrote
   K.meta.anna and data/anna.js (explorer/anna_build.py). Loaded by app.js (loadAnna) only when Anna is turned on.
   Anna = early-30s engineer household: Shawn (husband) BSME (ULA propulsion test 2018-23, Lockheed Martin F-16 manufacturing engineer since 2023),
   Anna leasing / assistant property manager + law-firm AR & billing. While Anna is on (app.js hooks): no hospital, trauma, nurse-job
   or near-hospital layers, buttons, lists or card sections; instead engineering jobs > $120k, relocation / bonus filters, spouse jobs,
   2bd/2ba homes under the cap, and the Anna county score (engineer pay vs home price, drive to engineering jobs, K-6 schools, homes for sale). */
(function () {
  "use strict";
  let A = null, D = null, ST = null, esc, money, fmt1, NM = "Anna", prevMetric = null;
  const HK = new Set(["trauma", "hosp", "travel", "perm", "nh"]);
  const NRX = /appeal|nurse|hospital|trauma|\bRN\b|-rn-|\bER\b/i;  // county metrics / rows about hospitals or nursing: hidden while Anna is on
  const HRX = /hospital|trauma|nurs|\bRN\b|\bER beds?\b|appeal|Level I\/II/i;
  const SVG = (w, h, b) => `<svg width="${w}" height="${h}" viewBox="0 0 24 24" aria-hidden="true">${b}</svg>`;
  const GEAR = "M12 4.6l1.5.2.5 1.7 1.3.6 1.6-.9 1.1 1.1-.9 1.6.6 1.3 1.7.5.2 1.5-.2 1.5-1.7.5-.6 1.3.9 1.6-1.1 1.1-1.6-.9-1.3.6-.5 1.7-1.5.2-1.5-.2-.5-1.7-1.3-.6-1.6.9-1.1-1.1.9-1.6-.6-1.3-1.7-.5-.2-1.5.2-1.5 1.7-.5.6-1.3-.9-1.6 1.1-1.1 1.6.9 1.3-.6.5-1.7z";
  const G_ENG = (sz = 22) => SVG(sz, sz, `<rect x="1" y="1" width="22" height="22" rx="5" fill="#263238" stroke="#fff" stroke-width="1.6"/><path d="${GEAR}" fill="#ff9800"/><circle cx="12" cy="12" r="2.7" fill="#263238"/>`);
  const G_SPJ = (sz = 20) => SVG(sz, sz, `<rect x="1" y="1" width="22" height="22" rx="5.5" fill="#00897b" stroke="#fff" stroke-width="1.6"/><circle cx="8.3" cy="12" r="3.4" fill="none" stroke="#fff" stroke-width="2"/><path d="M11.7 12h7.6M17 12v3M19.3 12v2.3" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`);
  const G_AH = (sz = 22) => SVG(sz, sz, `<path d="M12 1.8 23 11.6h-3V22.4H4V11.6H1z" fill="#3949ab" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/><path d="${GEAR}" transform="translate(6.2 8.6) scale(.48)" fill="#ffb74d"/><circle cx="12" cy="14.4" r="1.3" fill="#3949ab"/>`);
  const payR = j => (j.lo === j.hi ? money(j.hi) : money(j.lo) + "–" + money(j.hi).slice(1)) + (j.est ? " est." : "");
  const TX = k => ((D && D.meta && D.meta.txt) || {})[k];  // per-state wording (anna.json "txt"); undefined -> the Tennessee default text
  const payK = v => "$" + Math.round(v / 1000) + "k";
  const site = i => D.sites[i] || {};
  const estF = s => s.m ? D.meta.est.metro : D.meta.est.other;
  const est = (s, m) => { const f = estF(s); return [Math.round(m * f[0]), Math.round(m * f[1])]; };
  const shortSite = s => String(s.site || "").replace(/\s*\(.*?\)\s*/g, " ").trim();
  const emps = s => (s.emps || []).join(", ");
  // nearest engineering sites for any point: listing drives from the build (OSRM free-flow), else straight line x 1.25 at ~45 mph (approx.)
  function nearSites(it) {
    if (it.eng && it.eng.length && Array.isArray(it.eng[0])) return it.eng.map(([s, min, mi]) => ({ s, min, mi }));
    const d = D.drv[it.id]; if (d) return d.map(([s, min, mi]) => ({ s, min, mi }));
    if (it.lat == null) return [];
    return D.sites.map((x, s) => { const mi = A.hav(it.lat, it.lon, x.lat, x.lon) * 1.25; return { s, mi: Math.round(mi * 10) / 10, min: Math.round(mi / 45 * 60), apx: 1 }; }).sort((a, b) => a.min - b.min).slice(0, 3);
  }
  const jobsAt = s => D.eng.filter(j => j.s === s).sort((a, b) => b.mid - a.mid);
  // ---- estimates (postings give no bonus amount or relocation package value): labelled "est." everywhere they show
  // bonus: assumed annual-incentive target % of the pay midpoint by level (director 15, manager / lead 10, senior / principal 7, other 5)
  const bonusPct = j => /director|\bvp\b|chief/i.test(j.t) ? 15 : /manager|\bmgr\b|\blead\b/i.test(j.t) ? 10 : /senior|\bsr\b|principal|staff|engineer 4/i.test(j.t) ? 7 : 5;
  // relocation: 2 = posting says relocation is available, 1 = "may be available", 0 = not stated
  const relTier = j => !j.reloc ? 0 : /may be|might|possibl/i.test(j.src || "") ? 1 : 2;
  const REL_TXT = ["Not stated", "May be available (per posting)", "Yes, relocation available (per posting)"];
  const bonusTxt = j => j.bonus ? `${esc(j.bonus)} · <b>~${money(j.bx)}/yr est.</b> <span class="small">(${j.bp}% target assumed; amount not published)</span>` : "Not stated";
  // Best Balance: from the build when present (p.bal / p.bc / p.sp / p.wes: drive to a job, pay nearby, K-6 school, cost of living, spouse jobs), else the in-page fallback (p._b)
  const homeRec = p => p.bal != null ? { score: p.bal, sp: (p.sp || {}).n || 0, c: p.bc } : (p._b || {});
  const sch = p => p.wes || p.es || {};
  const BALL = { job: "Drive to one of Shawn's engineering jobs", pay: "Best >$120k job pay within 45 min", school: "K-6 school (nearest grade + distance to an A/B school)", col: "Cost of living (engineer pay ÷ price)", spouse: "Anna's jobs within ~25 mi" };
  function engTable(it) {
    const ns = nearSites(it); if (!ns.length) return "";
    const apx = ns.some(n => n.apx);
    return `<div class="kicker">🛠 Shawn's nearest engineering jobs (over $120k)</div>
      <table class="tbl"><tr><th>Employer site</th><th class="n">Miles</th><th class="n">7 AM</th><th class="n">7 PM</th></tr>
      ${ns.map(n => { const s = site(n.s), e = est(s, n.min), top = jobsAt(n.s)[0];
        return `<tr><td>${top ? A.link("eng", top.id, shortSite(s)) : esc(shortSite(s))}<br><span class="small">${s.n} job${s.n > 1 ? "s" : ""} · top ${payK(s.top)} midpoint · ${esc(emps(s))}</span><br><span class="small">${apx ? "≈" : "~"}${n.min} min free-flow${apx ? " (straight-line estimate)" : " (OSRM)"}</span></td>
        <td class="n">${fmt1(n.mi)}</td><td class="n">~${e[0]} min<br><span class="small">est.</span></td><td class="n">~${e[1]} min<br><span class="small">est.</span></td></tr>`; }).join("")}</table>
      <div class="small">${esc(D.meta.est.note)}</div>`;
  }
  function engNear(it) {  // one line for the Nearby table
    const n = nearSites(it)[0]; if (!n) return null; const s = site(n.s), top = jobsAt(n.s)[0];
    return `${top ? A.link("eng", top.id, shortSite(s)) : esc(shortSite(s))} · <b>~${n.min} min</b> <span class="small">drive · ${s.n} job${s.n > 1 ? "s" : ""}, top ${payK(s.top)}</span>`;
  }
  function cScore(name) { return name && D.counties[name] && D.counties[name].score != null ? D.counties[name] : null; }
  const nC = () => Object.values(D.counties).filter(v => v.score != null).length;
  function scoreLine(name) { const v = cScore(name); return v ? `<div class="small annaline">★ ${esc(NM)} score for ${esc(name)}${esc(ST.cus)}: <b>${fmt1(v.score)}</b>/100 · #${v.rank} of ${nC()} (${esc(v.band)}) · <button type="button" class="linkbtn" data-annainfo="1">ⓘ how</button></div>` : ""; }
  function scoreBlock(name) {
    const v = cScore(name); if (!v) return "";
    const k = Math.max(0, A.BANDS.indexOf(v.band)), W = D.meta.method.weights, c = v.c, j = v.job ? site(v.job.s) : null;
    const comp = [["Engineer pay vs. home price", c.afford, W.afford, `${money(v.wage)} mech. engineer median${v.wage_flag ? "†" : ""} ÷ ${money(v.home)} home = ${v.ratio != null ? v.ratio.toFixed(2) : "—"}`],
      ["Drive to engineering jobs", c.job, W.job, j ? `${esc(shortSite(j))} · ${v.job.min} min / ${fmt1(v.job.mi)} mi free-flow` : "—"],
      ["K-6 schools", c.school, W.school, v.es != null ? `elementary grade average ${v.es.toFixed(2)} of 5 (${v.es_n} schools)` : "no graded elementary schools"],
      ["Homes for sale (2+ bd / 2+ ba, ≤ ${money(D.meta.cap)})", c.avail, W.avail, v.zc != null ? `${v.zc.toLocaleString()} for sale · ${fmt1(v.avail)} per 10k people` : "—"]];
    return `<div class="appeal anna" style="--band:${A.RAMP[k]}"><div class="ascore"><b>${fmt1(v.score)}</b><span>/100</span></div>
      <div class="ameta"><div class="kicker" style="margin-top:0">★ ${esc(NM)} score</div><div class="arank">#${v.rank} of ${nC()} · <span class="aband">${esc(v.band)}</span></div>
      <div class="small">Shawn (engineer) + Anna (leasing / billing) household · <button type="button" class="linkbtn" data-annainfo="1">ⓘ How this score works</button></div></div></div>
      <details class="abreak"><summary>Score breakdown</summary><table class="tbl"><tr><th>Component</th><th class="n">0–100</th><th class="n">pts</th></tr>
      ${comp.map(([n, x, w, d]) => `<tr><td>${esc(n)}<br><span class="small">${d}</span></td><td class="n">${fmt1(x)}</td><td class="n">${x != null ? fmt1(x * w / 100) : "—"}<span class="small">/${w}</span></td></tr>`).join("")}</table>
      ${v.wage_flag ? `<div class="small">† ${esc(v.wage_flag)}.</div>` : ""}<div class="small">Wage area: ${esc(v.wage_area || "")}.</div></details>`;
  }
  function infoHtml() {
    const m = D.meta.method;
    return `<h2>How the ${esc(NM)} score works</h2><p>A 0–100 score for Shawn and Anna, an early-30s household (Shawn: mechanical engineer with aerospace test and manufacturing experience; Anna: leasing / property management and AR billing) with young children. Every ${esc(ST.cu.toLowerCase())} is scored against ${esc(ST.name)}'s others.</p>
      <table class="tbl wtbl">${m.text.map(([n, w, how]) => `<tr><td class="n"><b>${w}</b></td><td><b>${esc(n)}</b><br><span class="small">${esc(how)}</span></td></tr>`).join("")}</table>
      <p class="small"><b>Score</b> = Σ (component 0–100 × points) ÷ 100; a missing component is left out and the rest re-weighted. Bands are fifths by rank.</p>
      <div class="kicker">Shawn's engineering jobs on the map</div><p class="small">${esc(D.meta.rule)} Seen ${esc(D.meta.seen)}.</p>
      <div class="kicker">Drive times</div><p class="small">${esc(D.meta.est.note)}</p>
      <div class="kicker">Gaps</div><ul class="small">${(D.meta.gaps || []).map(g => `<li>${esc(g)}</li>`).join("")}</ul>`;
  }
  // ---------------------------------------------------------------- cards
  const KIND_FIT = k => /test/.test(k) ? "Direct match: ULA propulsion systems test engineering (2018–23)." : /propulsion/.test(k) ? "Matches both the ULA propulsion test years and the Lockheed F-16 manufacturing role."
    : /manufactur/.test(k) ? "Matches the Lockheed Martin F-16 manufacturing-engineer role (since 2023)." : /quality/.test(k) ? "Uses aerospace manufacturing quality experience; design-quality roles usually want medical-device or AS9100 background."
    : /nuclear/.test(k) ? "BSME core; nuclear / defense work usually needs a clearance (DOE Q / DoD) the aerospace background helps with." : "BSME core role.";
  const SPJ_FIT = k => /leasing/.test(k) ? "Matches 4 years of apartment leasing." : /property/.test(k) ? "Matches leasing management / assistant property manager experience." : /legal/.test(k) ? "Matches 3 years of law-firm AR and billing." : "Matches accounts-receivable and billing experience.";
  const KLAB = { leasing: "Leasing", "property manager": "Property management", "legal billing / AR": "Legal billing / AR", "AR / billing": "AR / billing" };
  function engCard(j) {
    const s = site(j.s), same = jobsAt(j.s).filter(x => x.id !== j.id);
    const homes = D.homes.map(h => [h, (h.eng || []).find(e => e[0] === j.s)]).filter(x => x[1] && x[1][1] <= 30).sort((a, b) => a[1][1] - b[1][1]).slice(0, 8);
    const over = j.st && j.st !== ST.ab;
    return `<div class="kicker"><span class="lic">${G_ENG(16)}</span> Shawn's engineering job · #${j.rank} of ${D.eng.length} by pay</div>${over ? `<div class="btag">🧭 Just over the state line in <b>${esc(j.st)}</b></div>` : ""}<h2>${esc(j.t)}</h2>
      <div class="sub">${esc(j.e)} · ${esc(j.town)}${over ? ", " + esc(j.st) : ""}</div>
      <div class="badges">${j.reloc ? '<span class="badge gold">🚚 Relocation assistance</span>' : ""}${j.bonus ? `<span class="badge gold">💰 Bonus ~${payK(j.bx)}/yr est.</span>` : ""}<span class="badge">${esc(j.kind || "engineering")}</span></div>
      <div class="stats">${A.stat(payR(j), "posted pay / year")}${A.stat(money(j.mid), "midpoint")}${A.stat(esc(j.posted || "—"), "posted")}</div>
      ${j.note ? `<div class="note">ℹ️ ${esc(j.note)}</div>` : ""}
      <div class="note good">🎯 ${esc(KIND_FIT(j.kind || ""))}</div>
      <table class="kv">${A.row("Employer", esc(j.e))}${A.row("Location", esc(s.site || j.town) + (s.exact ? "" : ' <span class="small">(approximate pin)</span>'))}${A.row(ST.cu, j.county ? A.link("county", j.county, j.county + ST.cus) : null)}
      ${A.row("Pay", payR(j) + (j.est ? ` <span class="small">per year · <b>ESTIMATE</b>, pay not posted: ${esc(j.pb || "")}</span>` : ' <span class="small">per year, as posted (highest grade band when several)</span>'))}${A.row("Posted", j.posted ? esc(j.posted) : "not shown")}${A.row("Relocation", REL_TXT[j.rt] + (j.rt ? ' <span class="small">(package value not published; ask the recruiter)</span>' : ""))}
      ${A.row("Bonus", bonusTxt(j))}${A.row("Overall job score", `<b>${fmt1(j.ov)}</b>/100 <span class="small">(pay 60 + bonus 20 + relocation 20; #${j.ovr} of ${D.eng.length})</span>`)}${A.row("Source", esc(j.src || ""))}${A.row("Apply", A.ext(j.url, "Open the posting ↗"))}</table>
      ${same.length ? `<div class="kicker">Shawn's other engineering jobs here (${same.length})</div><table class="kv">${same.map(x => A.row(payK(x.mid), A.link("eng", x.id, x.t) + ` <span class="small">${esc(x.e)}</span>`)).join("")}</table>` : ""}
      ${homes.length ? `<div class="kicker">Homes for ${esc(NM)} within 30 min</div><table class="kv">${homes.map(([h, e]) => A.row(`${e[1]} min`, A.link("property", h.id, h.title) + ` · ${money(h.price)}`)).join("")}</table>` : ""}
      <div class="small">${esc(D.meta.rule)} Seen ${esc(D.meta.seen)}; postings close often, so confirm on the source.</div>`;
  }
  function spjCard(j) {
    return `<div class="kicker"><span class="lic">${G_SPJ(16)}</span> Anna's job · ${esc(KLAB[j.kind] || j.kind)}</div><h2>${esc(j.t)}</h2>
      <div class="sub">${esc(j.e)} · ${esc(j.town)}</div>
      <div class="stats">${A.stat(esc(j.pay || "not posted"), "pay as posted")}${A.stat(j.mid ? money(j.mid) : "—", "about per year")}${A.stat(esc(j.posted || "—"), "posted")}</div>
      <div class="note good">🎯 ${esc(SPJ_FIT(j.kind))}</div>${j.note ? `<div class="note">ℹ️ ${esc(j.note)}</div>` : ""}
      ${j.exact ? "" : `<div class="note">📍 Approximate pin: placed at ${esc(j.town)} (the exact office or property address wasn't published).</div>`}
      <table class="kv">${A.row("Employer", esc(j.e))}${A.row("Town", esc(j.town))}${A.row(ST.cu, j.county ? A.link("county", j.county, j.county + ST.cus) : null)}${A.row("Source", esc(j.src || ""))}${A.row("Apply", A.ext(j.url, "Open the posting ↗"))}</table>
      <div class="small">Anna: associate's in biblical studies, 4 years apartment leasing / assistant property manager, 3 years AR & billing at a law firm. Seen ${esc(D.meta.seen)}.</div>`;
  }
  function homeCard(p) {
    const ph = p.photos || [], es = p.es || {};
    const gal = ph.length ? `<div class="gal" id="gal">${ph.map((u, i) => `<img src="${esc(u)}" data-i="${i}" loading="${i < 2 ? "eager" : "lazy"}" alt="Photo ${i + 1} of ${esc(p.title)}">`).join("")}</div><div class="galcount">${ph.length} photo${ph.length > 1 ? "s" : ""} · swipe or tap to enlarge</div>` : "";
    const sl = x => x && x.name ? `${A.IDX.school[x.id] ? A.link("school", x.id, x.name) : esc(x.name)} ${A.rbadge(x.rating)} · ${fmt1(x.miles)} mi` : null;
    const esRow = sl(es), wes = p.wes && p.wes.id !== es.id ? sl(p.wes) : null, b = homeRec(p), spn = p.sp || null;
    const spRow = spn ? `<b>${spn.n}</b> within ~25 mi${spn.kinds && spn.kinds.length ? " (" + spn.kinds.map(k => esc(KLAB[k] || k)).join(", ") + ")" : ""}${spn.id && A.IDX.spj && A.IDX.spj[spn.id] ? " · nearest " + A.link("spj", spn.id, A.IDX.spj[spn.id].t) + ` ~${fmt1(spn.mi)} mi` : ""}` : null;
    const balBox = b.score != null && b.c && p.bal != null ? `<details class="abreak"><summary>⚖️ Best Balance score <b>${fmt1(b.score)}</b>/100 · breakdown</summary><table class="tbl"><tr><th>Part</th><th class="n">0–100</th><th class="n">pts</th></tr>
      ${Object.keys(BALL).map(k => `<tr><td>${esc(BALL[k])}</td><td class="n">${fmt1(b.c[k])}</td><td class="n">${fmt1(b.c[k] * D.meta.balw[k] / 100)}<span class="small">/${D.meta.balw[k]}</span></td></tr>`).join("")}</table></details>`
      : b.score != null ? `<div class="small annaline">⚖️ Best Balance score <b>${fmt1(b.score)}</b>/100 · ${b.sp} Anna job${b.sp === 1 ? "" : "s"} (leasing / property mgmt / AR-billing) within 20 mi</div>` : "";
    return `<div class="kicker"><span class="lic">${G_AH(16)}</span> Home for ${esc(NM)} · 2+ bd / 2+ ba · under ${payK(D.meta.cap)}</div><h2>${esc(p.title)}</h2>
      <div class="sub">${esc(p.address || [p.town, p.county && p.county + ST.cus].filter(Boolean).join(", "))}</div>${gal}
      <div class="stats">${A.stat(money(p.price), "price")}${A.stat(A.sqft(p.sqft), "sq ft")}${A.stat(`${esc(p.beds)} / ${esc(p.baths)}`, "bed / bath")}${A.stat(esc(p.ptype || "House"), "type")}${A.stat(p.year_built ? esc(p.year_built) : "—", "built")}${A.stat(esc(p.seen || "—"), "date seen")}</div>
      <table class="kv nb">${A.row("🛠 Shawn's job", engNear(p))}${A.row("🎓 Elementary (K-5/6)", esRow)}${A.row("🎓 Nearest A/B K-5", wes)}${A.row("🔑 Anna's jobs", spRow)}</table>
      ${scoreLine(p.county)}${balBox}
      ${engTable(p)}
      <table class="kv">${A.row("Address", p.address ? esc(p.address) : null)}${A.row("Type", esc(p.ptype || "House"))}${A.row("Baths", p.bath_detail ? esc(p.bath_detail) : null)}${A.row("Lot", p.acres ? fmt1(p.acres) + " acres" : null)}${A.row("MLS #", p.mls ? esc(p.mls) : null)}${A.row("Days on Zillow", p.dom != null ? esc(p.dom) : null)}</table>
      ${p.features && p.features.length ? `<div class="kicker">Features</div><div class="badges">${p.features.map(w => `<span class="badge">${esc(w)}</span>`).join("")}</div>` : ""}
      <div class="kicker">Schools</div>${A.schoolBlock(p.county)}
      <table class="kv">${A.row(ST.cu, p.county ? A.link("county", p.county, p.county + ST.cus) : null)}${A.row("Listing", A.ext(p.url, "Open original listing ↗"))}${A.row("Source", p.source ? esc(p.source) : null)}${A.row("Date seen", esc(p.seen || ""))}${A.row("Status", p.status ? esc(p.status) : null)}</table>
      ${p.notes ? `<div class="note">${esc(p.notes)}</div>` : ""}${p.desc ? `<div class="kicker">Description</div><div class="desc">${esc(p.desc)}</div>` : ""}`;
  }
  // Anna on: every other card loses its hospital / nurse parts and gains the engineering-job parts
  function card(type, it, h) {
    if (type === "eng" || type === "spj" || (it && it.anna)) return h;
    const t = document.createElement("template"); t.innerHTML = h; const r = t.content;
    const qa = s => [...r.querySelectorAll(s)];
    qa(".kicker").forEach(k => { if (/^(Health care|Hospital drive times|💼 Travel nurse assignments)$/.test(k.textContent.trim())) { const n = k.nextElementSibling; if (n && n.tagName === "TABLE") n.remove(); k.remove(); } });
    qa(".nhbox, .appeal, details.abreak, .pjlink, .tjnote").forEach(e => e.remove());
    qa('[data-grp="hospitals"], [data-grp="travel"], [data-grp="perm"]').forEach(e => e.remove());
    qa(".stat.gt.zero").forEach(e => { if (/hospital|travel job|RN job/i.test(e.getAttribute("aria-label") || "")) e.remove(); });
    qa("tr").forEach(tr => { const c0 = tr.firstElementChild; if (!c0) return; const tx = c0.textContent.trim(); if (/^(🏥|🚑)/.test(tx) || HRX.test(tx)) tr.remove(); });
    qa("div.small").forEach(e => { if (/^Nurses \/ healthcare/.test(e.textContent.trim())) e.remove(); });
    qa(".note").forEach(e => { if (/hospital|Appeal/i.test(e.textContent)) e.innerHTML = e.innerHTML.replace(/\s*\([^()]*(hospital|Appeal)[^()]*\)/gi, ""); });
    qa('a[data-go="hospital"], a[data-go="travel"], a[data-go="perm"]').forEach(a => a.replaceWith(a.textContent));
    qa("table").forEach(tb => { if (!tb.querySelector("td")) tb.remove(); });
    const schK = qa(".kicker").find(k => k.textContent.trim() === "Schools");
    const put = (html, before) => { const w = document.createElement("template"); w.innerHTML = html; if (before) before.before(w.content); else r.appendChild(w.content); };
    if (type === "property" || type === "business" || type === "building") {
      const nb = r.querySelector("table.nb tbody") || r.querySelector("table.nb");
      const line = engNear(it); if (nb && line) { const w = document.createElement("template"); w.innerHTML = `<table><tr><td>🛠 Shawn's job</td><td>${line}</td></tr></table>`; nb.prepend(w.content.querySelector("tr")); }
      put(engTable(it) + (type === "property" ? scoreLine(it.county) : ""), schK || r.querySelector(".actions"));
    } else if (type === "county") {
      const h2 = r.querySelector("h2"); if (h2) { const w = document.createElement("template"); w.innerHTML = scoreBlock(it.name); h2.after(w.content); }
      put(countyEng(it), schK);
    } else if (type === "group" && it.g && it.g.k === "listings") {
      qa("a.grow[data-go=property]").forEach(a => { const p = A.IDX.property[a.dataset.id]; if (p && A.isNH(p)) { a.remove(); return; }
        const g3 = a.querySelector(".g3"), n = p && nearSites(p)[0]; if (g3 && n) g3.innerHTML = g3.innerHTML.replace(/\s*(·\s*)?🏥[^]*$/, "") + `${g3.textContent.trim() ? " · " : ""}🛠 ${n.min} min to ${esc(shortSite(site(n.s)))}`; });
      qa(".gsec").forEach(g => { if (/Near-hospital/.test(g.textContent)) { const n = g.nextElementSibling; if (n && n.classList.contains("gempty")) n.remove(); g.remove(); } });
      const hs = D.homes.filter(x => x.county === it.c.name).sort((a, b) => a.price - b.price), gl = r.querySelector(".glist");
      if (gl) { const w = document.createElement("template"); w.innerHTML = `<div class="gsec"><span class="lic">${G_AH(16)}</span> Homes for ${esc(NM)} (2+ bd / 2+ ba, ≤ ${payK(D.meta.cap)}) <span>${hs.length}</span></div>` + (hs.length ? hs.map(p => homeRow(p, it.c.name + "|listings")).join("") : '<div class="gempty">None picked here right now.</div>'); gl.appendChild(w.content); }
    }
    return t.innerHTML;
  }
  const homeRow = (p, from) => { const n = nearSites(p)[0];
    return A.gRow("property", p.id, from, A.gImg(p.photos && p.photos[0], "🏠"), `<b>${money(p.price)}</b> · ${esc(p.beds)} bd / ${esc(p.baths)} ba · ${A.sqft(p.sqft)} sq ft`, esc(p.title),
      A.dot([p.town && esc(p.town), n && `🛠 ${n.min} min to ${esc(shortSite(site(n.s)))}`, p.es && p.es.letter && `🎓 ES ${esc(p.es.letter)}`])); };
  function countyEng(c) {
    const v = D.counties[c.name] || {}, j = v.job ? site(v.job.s) : null, here = D.eng.filter(x => x.county === c.name), sp = D.spj.filter(x => x.county === c.name), hs = D.homes.filter(x => x.county === c.name);
    return `<div class="kicker">🛠 Shawn's engineering jobs (over $120k)</div><table class="kv">${A.row("Nearest job site", j ? `${A.link("eng", (jobsAt(v.job.s)[0] || {}).id, shortSite(j))} · ~${v.job.min} min / ${fmt1(v.job.mi)} mi from the ${esc(ST.cu.toLowerCase())} center <span class="small">(free-flow)</span>` : null)}
      ${A.row("Jobs in this " + ST.cu.toLowerCase(), here.length ? here.map(x => A.link("eng", x.id, `${x.t} (${payK(x.mid)})`)).join("<br>") : "None posted with pay right now")}
      ${A.row("Anna's jobs here", sp.length ? sp.map(x => A.link("spj", x.id, x.t)).join("<br>") : null)}${A.row(`Homes for ${NM} here`, hs.length ? `${hs.length} picked (2+ bd / 2+ ba ≤ ${payK(D.meta.cap)})` : null)}
      ${A.row("Mech. engineer median pay", v.wage ? money(v.wage) + ` <span class="small">(BLS OEWS May 2025, ${esc(v.wage_area || "")})</span>` : null)}</table>`;
  }
  function clean(el) { if (!el) return; el.querySelectorAll("tr").forEach(tr => { const c0 = tr.firstElementChild; if (c0 && /RN|nurs|trauma|Price ÷ pay/i.test(c0.textContent)) tr.remove(); }); }
  // ---------------------------------------------------------------- top lists (pills) + solo buttons
  const engRows = f => D.eng.filter(f || (() => true)).sort((a, b) => b.mid - a.mid);
  function engTopRow(t, j, i) {
    const head = t.k === "eng_bonus" ? `#${i + 1} ~${money(j.bx)}/yr bonus est.` : t.k === "eng_best" ? `#${i + 1} score ${fmt1(j.ov)}` : t.k === "reloc" ? `#${i + 1} ${j.rt === 2 ? "Relocation: yes" : "Relocation: may be"}` : `#${i + 1} ${payR(j)}`;
    return `<div class="trow">${A.gRow("eng", j.id, "top|" + t.k, A.gImg(null, "🛠"), `<b class="gpay">${head}</b> · ${esc(j.t)}`, `<b>${esc(j.e)}</b> · ${esc(j.town)}${j.st && j.st !== ST.ab ? " (" + esc(j.st) + ")" : ""}${t.k !== "eng_pay" ? " · " + payR(j) : ""}`,
      A.dot([j.reloc && "🚚 " + (j.rt === 2 ? "Relocation" : "Relocation may be offered"), j.bonus && `💰 ~${payK(j.bx)} bonus est.`, j.posted && "posted " + esc(j.posted)]), true)}${j.url ? `<a class="tapply" href="${esc(j.url)}" target="_blank" rel="noopener" aria-label="Apply (opens the posting)">Apply ↗</a>` : ""}</div>`;
  }
  function spjTopRow(t, j) {
    return `<div class="trow">${A.gRow("spj", j.id, "top|" + t.k, A.gImg(null, "🔑"), `<b class="gpay">${esc(j.pay || "pay not posted")}</b> · ${esc(j.t)}`, `<b>${esc(j.e)}</b> · ${esc(j.town)}`, A.dot([KLAB[j.kind], j.posted && "posted " + esc(j.posted)]), true)}${j.url ? `<a class="tapply" href="${esc(j.url)}" target="_blank" rel="noopener" aria-label="Apply (opens the posting)">Apply ↗</a>` : ""}</div>`;
  }
  function homeTopRow(t, p, i) {
    const b = homeRec(p), n = nearSites(p)[0], s = n ? site(n.s) : null, e = s ? est(s, n.min) : null, es = p.es || {};
    const w = sch(p), head = t.k === "ah_job" ? `#${i + 1} ${n ? n.min + " min" : "—"} to Shawn's nearest job` : t.k === "ah_school" ? `#${i + 1} ${fmt1(w.miles)} mi to ${esc(w.name || "an elementary")}${w.letter ? " (" + esc(w.letter) + ")" : ""}` : `#${i + 1} balance ${fmt1(b.score)}`;
    const l3 = t.k === "ah_balance" ? A.dot([n && `🛠 ${n.min} min`, es.letter && `🎓 ${esc(es.letter)} ${fmt1(es.miles)} mi`, `🔑 ${b.sp} Anna job${b.sp === 1 ? "" : "s"} ≤ ${p.sp ? "~25" : "20"} mi`, b.area != null && `area ${fmt1(b.area)}`])
      : t.k === "ah_job" ? A.dot([s && esc(shortSite(s)), e && `7 AM ~${e[0]} / 7 PM ~${e[1]} min est.`, es.letter && `🎓 ${esc(es.letter)}`])
      : A.dot([w.grades && "grades " + esc(w.grades), es.name && es.name !== w.name && `nearest any-grade: ${esc(es.name)} (${esc(es.letter || "")})`, n && `🛠 ${n.min} min`]);
    return `<div class="trow">${A.gRow("property", p.id, "top|" + t.k, A.gImg(p.photos && p.photos[0], "🏠"), `<b class="gpay">${head}</b> · ${money(p.price)} · ${esc(p.beds)} bd / ${esc(p.baths)} ba`, esc(p.title) + (p.town ? " · " + esc(p.town) : ""), l3, true)}</div>`;
  }
  function topHtml(t, navP) {
    const xs = t.rows(), n = xs.length;
    let body;
    if (t.type === "spj") { const ks = ["property manager", "leasing", "legal billing / AR", "AR / billing"]; body = ks.map(k => { const g = xs.filter(j => j.kind === k); return g.length ? `<div class="gsec">${esc(KLAB[k])} <span>${g.length}</span></div>` + g.map(j => spjTopRow(t, j)).join("") : ""; }).join(""); }
    else if (t.type === "ahome") body = xs.map((p, i) => homeTopRow(t, p, i)).join("");
    else body = xs.map((j, i) => engTopRow(t, j, i)).join("");
    return `<div class="gbar"><button type="button" class="gback" id="gBack" aria-label="Back to the map">‹ Map</button>
        <button type="button" class="gshare" id="gShare" aria-label="Share this list">${navigator.share ? "Share" : "Copy link"}</button></div>
      <div class="kicker">${esc(t.title)} · <span class="tupd">${esc(NM)} profile · seen ${esc(D.meta.seen)}</span></div><h2>${esc(t.h2(n))}</h2>
      <div class="sub">${esc(t.sub)} · tap a row to open it on the map</div>${navP}
      <div class="glist tlist">${body || '<div class="gempty">Nothing qualifies right now.</div>'}</div>
      ${t.foot ? `<div class="small">${esc(t.foot)}</div>` : ""}
      <div class="actions"><button class="btn" id="shareBtn">${navigator.share ? "Share…" : "Share"}</button><button class="btn ghost" id="copyBtn">Copy link</button><button class="btn ghost" id="zoomBtn">Show all on map</button></div>
      <div class="small" style="word-break:break-all">Link: <a href="#${t.hash}">#${t.hash}</a></div>`;
  }
  function apply(on) {
    A.LAYERS.forEach(d => { if (d.lab) d.lab.hidden = on ? HK.has(d.key) : !!d.anna; });
    ["nhFilter", "pjFilter"].forEach(id => { const e = document.getElementById(id); if (e) e.hidden = on; });
    A.msel.querySelectorAll("optgroup").forEach(g => { const an = g.dataset.anna === "1"; let vis = 0;
      g.querySelectorAll("option").forEach(o => { const hide = an ? !on : on && NRX.test(o.value + " " + o.textContent); o.hidden = hide; o.disabled = hide; if (!hide) vis++; }); g.hidden = !vis; });
    const cur = A.getMetric();
    if (on) { if (!/^anna-/.test(cur)) prevMetric = cur; A.setMetric("anna-score"); }
    else if (/^anna-/.test(cur)) A.setMetric(prevMetric || (A.K.meta && A.K.meta.default_metric) || A.metrics[0].key);
  }
  function tip(c, sc) {
    const v = cScore(c.name), m = sc.m;
    if (m.key === "anna-score") return v ? `<b>${esc(c.name)}</b> · ${esc(NM)} ${fmt1(v.score)} · #${v.rank} of ${nC()}<br>${esc(v.band)}` : `<b>${esc(c.name)}</b>: no ${esc(NM)} score`;
    return `<b>${esc(c.name)}</b>: ${esc(A.fmtMetric(m, c.m[m.key]))} <span class="small">(${esc(sc.labelOf(c))})</span>${v ? `<br>${esc(NM)} ${fmt1(v.score)} · #${v.rank}` : ""}`;
  }
  // ---------------------------------------------------------------- init
  function init(api) {
    A = api; D = window.KYXAN_D; ST = A.ST; esc = A.esc; money = A.money; fmt1 = A.fmt1; NM = (A.K.meta.anna && A.K.meta.anna.name) || "Anna";
    const { IDX, L } = A;
    const cty = (lat, lon) => { const c = A.countyAt(L.latLng(lat, lon)); return c ? c.name : null; };
    IDX.eng = {}; IDX.spj = {};
    // same-site jobs fan out a little (about 150-300 m) so each has its own pin when zoomed in; still grouped with a count when zoomed out
    const seen = {};
    D.eng.forEach(j => { j.county = j.st && j.st !== ST.ab ? null : cty(j.lat, j.lon); const k = j.lat + "," + j.lon, i = seen[k] = (seen[k] || 0) + 1;
      if (i > 1) { const a = i * 2.4, r = 0.0016 * (1 + i / 6); j.lat = +(j.lat + r * Math.sin(a)).toFixed(5); j.lon = +(j.lon + r * 1.25 * Math.cos(a)).toFixed(5); } IDX.eng[j.id] = j; });
    D.spj.forEach(j => { j.county = cty(j.lat, j.lon); IDX.spj[j.id] = j; });
    D.homes.forEach(h => { IDX.property[h.id] = h; });
    A.SHARDS.add("_anna");
    // layers
    const L_eng = A.PL_("eng"), L_spj = A.PL_("spj"), L_ah = A.PL_("ahome");
    const engIc = j => L.divIcon({ className: "", html: `<div class="mk sv eng" style="width:24px;height:24px">${G_ENG(24)}</div><b class="plab eng">${payK(j.mid)}</b>`, iconSize: [24, 24], iconAnchor: [12, 12] });
    D.eng.forEach(j => L_eng.addLayer(A.ent("eng", j, () => engIc(j), { z: 2600 + Math.round(j.mid / 1000), zh: 7200 + Math.round(j.mid / 1000),
      tip: () => `🛠 ${esc(j.t)} · ${esc(j.e)} · ${payR(j)}${j.reloc ? " · 🚚 relocation" : ""}${j.bonus ? " · 💰 bonus" : ""}` })));
    const IC_SPJ = () => A.icOnce("spj", () => A.sicon("spj", G_SPJ(20), 20, 20));
    D.spj.forEach(j => L_spj.addLayer(A.ent("spj", j, IC_SPJ, { z: 1300, tip: () => `🔑 ${esc(j.t)} · ${esc(j.e)} · ${esc(j.pay || "pay not posted")}` })));
    const IC_AH = () => A.icOnce("ahome", () => A.sicon("hs ahome", G_AH(24), 24, 24));
    D.homes.forEach(p => L_ah.addLayer(A.ent("property", p, IC_AH, { z: 1700 + Math.max(0, 300 - (p.ar || 300)), zh: 0,
      tip: () => { const n = nearSites(p)[0]; return `🏠 ${esc(p.title)} · ${money(p.price)} · ${esc(p.beds)} bd/${esc(p.baths)} ba${n ? ` · ${n.min} min to ${esc(shortSite(site(n.s)))}` : ""}`; } })));
    Object.assign(A.FULL, { spj: 8.5, ahome: 8.5 }); A.KEEP.eng = () => true;
    Object.assign(A.DOTC, { eng: "#ef6c00", spj: "#00897b", ahome: "#3949ab" });
    Object.assign(A.TLAB, { eng: "Shawn's job", spj: "Anna's job" });
    Object.assign(A.TITLE, { eng: j => `${j.t} — ${j.e}`, spj: j => `${j.t} — ${j.e}` });
    Object.assign(A.LABEL, { eng: "Shawn's engineering job (over $120k)", spj: "Anna's job (leasing / billing)" });
    if (A.MORE_LAYER_FOR) { A.MORE_LAYER_FOR.eng = () => "eng"; A.MORE_LAYER_FOR.spj = () => "spj"; }
    const rows = [{ key: "anna_g", label: `${NM} & Shawn`, group: true, anna: true },
      { key: "eng", ic: G_ENG(16), label: `Shawn's engineering jobs over $120k (${D.eng.filter(j => j.reloc).length} relocation, ${D.eng.filter(j => j.bonus).length} bonus)`, layer: L_eng, on: true, n: D.eng.length, anna: true },
      { key: "ahome", ic: G_AH(16), label: `Homes for ${NM} (2+ bd / 2+ ba, under ${payK(D.meta.cap)})`, layer: L_ah, on: true, n: D.homes.length, anna: true },
      { key: "spj", ic: G_SPJ(16), label: "Anna's jobs (leasing, property management, AR / legal billing)", layer: L_spj, on: true, n: D.spj.length, anna: true }];
    A.LAYERS.unshift(...rows);
    const first = A.ll.firstChild; rows.forEach(d => A.mkRow(d, x => A.ll.insertBefore(x, first)));
    // map key
    A.PIN_KEY.eng = () => `<div class="ksec"><b><span class="lic">${G_ENG(16)}</span> Shawn's engineering jobs over $120k</b> <span class="small">(mechanical, manufacturing, test, propulsion, aerospace / defense and nuclear-mechanical; posted pay midpoint ≥ $120k; ${D.eng.length} jobs, seen ${esc(D.meta.seen)})</span>${A.krow(A.ksv(G_ENG(20)), "Shawn's engineering job", "· tag = posted pay midpoint ($k) · shown at every zoom; jobs at one site group with a count")}</div>`;
    A.PIN_KEY.ahome = () => `<div class="ksec"><b><span class="lic">${G_AH(16)}</span> Homes for ${esc(NM)}</b> <span class="small">(2+ bd, 2+ full ba, up to ${payK(D.meta.cap)}, houses and townhomes, active, ≤ 50 min free-flow to an engineering job site; ranked by elementary grade, drive, price and size)</span>${A.krow(A.ksv(G_AH(22)), "Home for " + esc(NM), `· icon from zoom ${A.FULL.ahome}`)}</div>`;
    A.PIN_KEY.spj = () => `<div class="ksec"><b><span class="lic">${G_SPJ(16)}</span> Anna's jobs</b> <span class="small">(leasing, assistant / property manager, AR and legal billing; ${D.spj.length} jobs)</span>${A.krow(A.ksv(G_SPJ(18)), "Anna's job", "· most pins sit at the town center")}</div>`;
    const lod0 = A.PIN_KEY._lod; if (lod0) A.PIN_KEY._lod = () => A.on() ? lod0().replace("only Level I/II trauma centers, ", "only engineering jobs, ") : lod0();
    // cards
    A.R.eng = engCard; A.R.spj = spjCard;
    const rp = A.R.property; A.R.property = p => p.anna ? homeCard(p) : rp(p);
    // search
    D.eng.forEach(j => A.all.push({ type: "eng", id: j.id, name: j.t, sub: `${j.e} · ${payR(j)} · ${j.town}${j.reloc ? " · relocation" : ""}${j.bonus ? " · bonus" : ""}`, extra: `shawn engineering engineer job ${j.kind || ""} ${j.e}`.toLowerCase(), anna: 1 }));
    D.spj.forEach(j => A.all.push({ type: "spj", id: j.id, name: j.t, sub: `${j.e} · ${j.pay || ""} · ${j.town}`, extra: `anna spouse job ${j.kind} ${j.e}`.toLowerCase(), anna: 1 }));
    D.homes.forEach(p => A.all.push({ type: "property", id: p.id, name: p.title, sub: [`🏠 Home for ${NM}`, p.town, p.county].filter(Boolean).join(", "), extra: [p.address, "anna home"].filter(Boolean).join(" ").toLowerCase(), anna: 1 }));
    // solo buttons (right-hand stack), Anna only
    A.SOLOS.unshift({ k: "aeng", ic: G_ENG(18), t: "Shawn's", h: "Shawn's engineering jobs over $120k", keys: ["eng"], anna: true },
      { k: "areloc", ic: "🚚", t: "Reloc", h: "Shawn's engineering jobs offering relocation", keys: ["eng"], f: e => !!e.it.reloc, anna: true },
      { k: "abonus", ic: "💰", t: "Bonus", h: "Shawn's engineering jobs with a bonus", keys: ["eng"], f: e => !!e.it.bonus, anna: true },
      { k: "aspj", ic: G_SPJ(18), t: "Anna's", h: "Anna's jobs (leasing / billing)", keys: ["spj"], anna: true },
      { k: "ahome", ic: G_AH(18), t: "2bd/2ba", h: `homes for ${NM}`, keys: ["ahome"], anna: true });
    // top lists (bottom pills)
    // estimates + scores used by the Top 10 lists
    const maxMid = Math.max(...D.eng.map(j => j.mid)), minMid = Math.min(120000, ...D.eng.map(j => j.mid));
    D.eng.forEach(j => { j.rt = relTier(j); j.bp = j.bonus ? bonusPct(j) : 0; j.bx = j.bonus ? Math.round(j.mid * j.bp / 100 / 500) * 500 : 0; });
    const maxBx = Math.max(1, ...D.eng.map(j => j.bx));
    D.eng.forEach(j => { j.ov = Math.round(10 * (60 * (j.mid - minMid) / Math.max(1, maxMid - minMid) + 20 * j.bx / maxBx + 20 * [0, 0.6, 1][j.rt])) / 10; });
    D.eng.slice().sort((a, b) => b.ov - a.ov || b.mid - a.mid).forEach((j, i) => j.ovr = i + 1);
    const GV = { A: 100, B: 75, C: 50, D: 25, F: 0 };
    D.homes.forEach(p => { if (p.bal != null) return; const n = nearSites(p)[0], es = p.es || {}, v = cScore(p.county);
      const sp = D.spj.filter(j => A.hav(p.lat, p.lon, j.lat, j.lon) <= 20).length;
      const c = { job: n ? Math.max(0, Math.min(100, 100 * (50 - n.min) / 35)) : 0, school: (GV[es.letter] != null ? GV[es.letter] : 50) * (es.miles <= 3 ? 1 : es.miles <= 6 ? 0.85 : 0.7),
        price: Math.max(0, Math.min(100, 100 * (D.meta.cap - p.price) / (D.meta.cap * 0.6))), area: v ? v.score : 50, sp: [0, 40, 60, 75, 85, 100][Math.min(5, sp)] };
      p._b = { c, sp, area: v ? v.score : null, score: Math.round(10 * (25 * c.job + 25 * c.school + 10 * c.price + 15 * c.area + 25 * c.sp) / 100) / 10 }; });
    const hn = p => (nearSites(p)[0] || { min: 999 }).min;
    const T = [
      { k: "eng_pay", hash: "top-eng-pay", type: "eng", rows: () => engRows().slice(0, 10), bub: "Top Pay", title: "Top 10 Shawn's Jobs by Pay", label: n => `Top ${n} Shawn's Jobs by Pay`,
        h2: n => TX("pay_h2") ? `Top ${n} ${TX("pay_h2")}` : `Top ${n} of Shawn's engineering jobs by posted pay`, sub: TX("pay_sub") || "Mechanical, manufacturing, test, propulsion, aerospace / defense and nuclear-mechanical jobs over $120k, highest posted pay midpoint first", icon: G_ENG(20), cls: "tb-eng" },
      { k: "eng_bonus", hash: "top-eng-bonus", type: "eng", rows: () => D.eng.filter(j => j.bonus).sort((a, b) => b.bx - a.bx || b.mid - a.mid).slice(0, 10), bub: "Biggest Bonus", icon: "💰", cls: "tb-eng",
        title: "Top 10 Biggest Bonuses", label: n => `Top ${n} Biggest Bonuses (est.)`, h2: n => `Top ${n} of Shawn's engineering jobs by bonus (estimated)`,
        sub: "Jobs whose posting offers an annual bonus / cash incentive, biggest estimated yearly bonus first",
        foot: TX("bonus_foot") || "Bonus amounts are ESTIMATES: no posting publishes one, so each is the pay midpoint × an assumed annual-incentive target (director 15%, manager / lead 10%, senior / principal 7%, other 5%). Beehive also grants equity. No posting with listed pay offered a sign-on bonus when checked." },
      { k: "reloc", hash: "top-reloc", type: "eng", rows: () => D.eng.filter(j => j.rt).sort((a, b) => b.rt - a.rt || b.mid - a.mid).slice(0, 10), bub: "Best Relocation", icon: "🚚", cls: "tb-eng",
        title: "Top 10 Relocation Packages", label: n => `Top ${n} Relocation Packages`, h2: n => `${n} engineering job${n === 1 ? "" : "s"} for Shawn offering relocation`,
        sub: "Ranked by how firmly the posting offers relocation (stated \"available\" first, then \"may be available\"), then pay",
        foot: "No posting publishes the package value, so the ranking is by the posting's wording, then pay; ask the recruiter for the package (lump sum, movers, temporary housing, home-sale help). Most postings don't say either way." },
      { k: "eng_best", hash: "top-eng-best", type: "eng", rows: () => D.eng.slice().sort((a, b) => b.ov - a.ov || b.mid - a.mid).slice(0, 10), bub: "Best Overall Job", icon: "🏆", cls: "tb-eng",
        title: "Top 10 Best Overall Jobs", label: n => `Top ${n} Best Overall Jobs`, h2: n => `Top ${n} of Shawn's engineering jobs: pay + bonus + relocation`,
        sub: "Score 0–100: posted pay midpoint 60, estimated bonus 20, relocation 20 (stated 20, may be 12)",
        foot: "The bonus part uses estimated bonus amounts (see Biggest Bonus); everything else is as posted." },
      { k: "ah_job", hash: "top-ah-job", type: "ahome", rows: () => D.homes.slice().sort((a, b) => hn(a) - hn(b) || a.price - b.price).slice(0, 10), bub: "Homes Near Job", icon: G_AH(20), cls: "tb-ah",
        title: "Top 10 Homes Closest to Shawn's Job", label: n => `Top ${n} Homes Closest to Shawn's Job`, h2: n => `Top ${n} homes closest to one of Shawn's engineering jobs (2+ bd / 2+ ba, ≤ ${payK(D.meta.cap)})`,
        sub: "Shortest drive to a site with a posted >$120k engineering job; free-flow minutes, 7 AM / 7 PM shown as estimates", foot: D.meta.est.note },
      { k: "ah_school", hash: "top-ah-school", type: "ahome", rows: () => D.homes.slice().sort((a, b) => (sch(a).miles || 99) - (sch(b).miles || 99) || ((sch(b).letter || "Z") < (sch(a).letter || "Z") ? 1 : -1)).slice(0, 10), bub: "Homes Near School", icon: "🎓", cls: "tb-ah",
        title: "Top 10 Homes Closest to a School (K-6)", label: n => `Top ${n} Homes Closest to an Elementary School`, h2: n => `Top ${n} homes closest to an elementary school (K-5/6)`,
        sub: TX("es_near") || "Straight-line miles to the nearest well-rated school teaching K-5 (TDOE 2024-25 grade A or B; K-5, K-6 and K-8 schools)", foot: "Distances are straight line; attendance zones aren't on this map, so confirm the zoned school with the district." },
      { k: "ah_balance", hash: "top-ah-balance", type: "ahome", rows: () => D.homes.slice().sort((a, b) => homeRec(b).score - homeRec(a).score).slice(0, 10), bub: "Best Balance", icon: "⚖️", cls: "tb-ah",
        title: "Top 10 Best Balance Homes", label: n => `Top ${n} Best Balance Homes`, h2: n => `Top ${n} homes with the best balance for the whole family`,
        sub: D.meta.balw ? `Score 0–100: drive to one of Shawn's jobs ${D.meta.balw.job}, pay of jobs within 45 min ${D.meta.balw.pay}, K-6 school ${D.meta.balw.school}, cost of living (engineer pay ÷ price) ${D.meta.balw.col}, Anna's jobs nearby (leasing / property manager / AR-billing, ~25 mi) ${D.meta.balw.spouse}`
          : "Score 0–100: drive to an engineering job 25, K-6 school grade + distance 25, Anna's jobs (leasing / property management / AR-billing) within 20 mi 25, area Anna score 15, price room under the cap 10",
        foot: "Anna's-job distances are straight line x 1.25 (most of these pins are town centers). Open a home for its full score breakdown." }];
    T.forEach(t => { t.ext = true; t.anna = true; t.cnt = () => t.rows().length; A.TOPS.push(t); A.TOPK[t.k] = t; A.TOPH[t.hash] = t; });
    Object.assign(A.PILL_T, { eng_pay: "Top Pay", eng_bonus: "Big Bonus", reloc: "Relocation", eng_best: "Best Job", ah_job: "Near Job", ah_school: "Near School", ah_balance: "Best Balance" });
    A.PILL_O.unshift("eng_pay", "eng_bonus", "reloc", "eng_best", "ah_job", "ah_school", "ah_balance");
    // county metrics
    const MG = `★ ${NM} & Shawn`, src = TX("src") || "BLS OEWS May 2025, ACS 2020-24, TDOE 2024-25, Zillow, OSRM";
    const MS = [["anna-score", `★ ${NM} score (0-100)`, "score", false, `Engineer pay vs home price ${D.meta.method.weights.afford}, drive to engineering jobs ${D.meta.method.weights.job}, K-6 schools ${D.meta.method.weights.school}, homes for sale ${D.meta.method.weights.avail} (see ⓘ)`, v => v.score],
      ["anna-ratio", "Mech. engineer pay ÷ home value", null, false, "BLS mechanical-engineer median wage for the area ÷ county median home value", v => v.ratio],
      ["anna-jobmin", "Drive min to Shawn's nearest job (>$120k)", "min", true, "Free-flow drive from the county center to the nearest engineering job site on this map", v => v.job && v.job.min],
      ["anna-es", "Elementary grade average (A=5 … F=1)", "score", false, TX("es_metric") || "Average TDOE letter grade of the county's elementary schools", v => v.es],
      ["anna-avail", "Homes for sale per 10k people (2bd/2ba ≤ cap)", "score", false, (TX("avail_src") || "Zillow") + " for-sale homes matching the Anna search per 10,000 residents", v => v.avail],
      ["anna-zc", "Homes for sale (2bd/2ba ≤ cap)", "int", false, (TX("avail_src") || "Zillow") + " for-sale homes matching the Anna search", v => v.zc],
      ["anna-wage", "Mechanical engineer median wage", "usd", false, "BLS OEWS May 2025 median annual wage, mechanical engineers (17-2141), by wage area", v => v.wage]];
    const og = document.createElement("optgroup"); og.label = MG; og.dataset.anna = "1";
    MS.forEach(([key, label, fmt, lb, desc, f]) => { A.metrics.push({ key, label, group: MG, fmt, lower_better: lb, desc, src });
      A.K.counties.forEach(c => { const v = D.counties[c.name]; const x = v ? f(v) : null; if (x != null) c.m[key] = x; });
      const o = document.createElement("option"); o.value = key; o.textContent = label; og.appendChild(o); });
    A.msel.insertBefore(og, A.msel.firstChild);
    document.addEventListener("click", e => { if (e.target.closest && e.target.closest("[data-annainfo]")) { e.preventDefault(); A.infoBody.innerHTML = infoHtml(); A.info.hidden = false; } });
    return window.KYXAN;
  }
  window.KYXAN = { init, apply, card, clean, tip, topHtml, topPts: t => t.rows().map(j => [j.lat, j.lon]).filter(p => p[0] != null), data: () => D };
})();

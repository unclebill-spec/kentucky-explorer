// State Explorer: phone extras, loaded on first use (Favorites, Compare, New & price cuts, Near me).
// Pages: #favs, #favs=<shared list>, #compare, #compare=<id,id,id>, #new, #near. All render into the card (Back / X / expand work as usual).
(function () {
  let A = null;
  const esc = s => A.esc(s);
  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
  const PF = () => (window.KYXPF_D && window.KYXPF_D.props) || {};
  const SR = { 5: "Blue (best)", 4: "Green", 3: "Yellow", 2: "Orange", 1: "Red" };
  const TL = { property: "🏠 Homes & land", travel: "💼 Travel nurse jobs", building: "🔔 Buildings for sale", business: "💲 Businesses for sale" };
  const item = k => { const i = k.indexOf(":"), t = k.slice(0, i), id = k.slice(i + 1); return { t, id, it: A.IDX[t] && A.IDX[t][id] }; };
  const ac = v => v == null ? "" : (+v).toLocaleString(undefined, { maximumFractionDigits: 2 }) + " ac";
  function row(t, id, it, l3x) {
    if (!it) return "";
    if (t === "property") return A.gRow(t, id, "", A.gImg(it.rt || (it.th && it.th.u), "🏠"), `<b>${A.money(it.price)}</b>${it.beds != null ? ` · ${esc(it.beds)} bd / ${esc(it.baths)} ba` : ""}${it.acres ? " · " + ac(it.acres) : ""}`, esc(it.title), A.dot([it.town && esc(it.town), l3x]), true);
    if (t === "travel") return A.gRow(t, id, "", A.gImg(it.th && it.th.u, "💼"), `<b class="gpay">top ${A.money(it.top)}/wk</b> · ${esc(it.n)} job${it.n > 1 ? "s" : ""}`, esc(it.name), A.dot([it.city && esc(it.city), l3x]), true);
    if (t === "business" || t === "building") return A.gRow(t, id, "", A.gImg(it.th && it.th.u, t === "business" ? "💲" : "🔔"), `<b>${it.price ? A.money(it.price) : "Price n/a"}</b>${it.kind ? " · " + esc(it.kind) : ""}`, esc(it.title || it.name), A.dot([it.town && esc(it.town), l3x]), true);
    return A.gRow(t, id, "", A.gImg(it.th && it.th.u, "📍"), esc(it.name || it.title || id), it.city ? esc(it.city) : "", l3x || "", true);
  }
  const page = (id, hash, html, title, opts) => A.showPage({ type: "xpage", id, hash }, html, hash, Object.assign({ title, tall: true }, opts || {}));
  const share = (url, title) => { if (navigator.share) navigator.share({ title, text: title, url }).catch(() => { }); else A.copy(url); };
  const here = () => location.href.split("#")[0];

  // ---------------------------------------------------------------- favorites
  function favList(keys, shared, enc, opts) {
    const groups = {}; keys.forEach(k => { const x = item(k); if (x.it) (groups[x.t] = groups[x.t] || []).push(x); });
    const n = Object.values(groups).reduce((a, g) => a + g.length, 0);
    const body = Object.keys(TL).filter(t => groups[t]).map(t => `<div class="xh">${TL[t]} (${groups[t].length})</div><div class="glist">${groups[t].map(x => row(x.t, x.id, x.it)).join("")}</div>`).join("");
    const hash = shared ? "#favs=" + enc : "#favs";
    page(shared ? "favs-shared" : "favs", hash, `<div class="kicker">♥ ${shared ? "Shared favorites" : "Favorites"}</div><h2>${n} saved place${n === 1 ? "" : "s"}</h2>
      <div class="sub">${shared ? "Someone shared this list with you." : "Tap ♡ at the top of a home, job, building or business card to save it here. Saved on this phone only."}</div>
      <div class="xact">${shared ? `<button type="button" class="btn" data-x="addall">♥ Add all to my favorites</button>` : n ? `<button type="button" class="btn" data-x="share">Share this list</button><button type="button" class="btn ghost" data-x="clear">Clear all</button>` : ""}</div>
      ${body || '<div class="gempty">Nothing saved yet.</div>'}`, shared ? "Shared favorites" : "Favorites", opts);
    wire({
      share: () => share(here() + "#favs=" + b64(JSON.stringify(A.favGet())), "My " + ((window.KYX_ST || {}).app || "Kentucky Explorer") + " favorites"),
      clear: () => { if (confirm("Remove all favorites?")) { A.favSet([]); favList([], false, "", { replace: true }); } },
      addall: () => { const a = A.favGet(); keys.forEach(k => { if (!a.includes(k) && item(k).it) a.push(k); }); A.favSet(a); A.toast(`Added. You have ${a.length} favorites.`); A.updFav(); },
    });
  }
  function wire(fns) { A.body.querySelectorAll("[data-x]").forEach(b => b.onclick = () => fns[b.dataset.x] && fns[b.dataset.x](b)); }

  // ---------------------------------------------------------------- compare (2-3 homes)
  function compare(ids, opts) {
    ids = ids.filter(id => A.IDX.property[id]).slice(0, 3);
    const hash = "#compare" + (ids.length ? "=" + ids.map(encodeURIComponent).join(",") : "");
    if (ids.length < 2) {
      page("compare", hash, `<div class="kicker">⚖ Compare homes</div><h2>Pick ${ids.length ? "one or two more homes" : "2 or 3 homes"}</h2>
        <div class="sub">Open a home's card and tap <b>⚖ Compare</b> at the bottom. Then come back here.</div>
        ${ids.length ? `<div class="glist">${ids.map(id => row("property", id, A.IDX.property[id])).join("")}</div>` : ""}`, "Compare homes", opts);
      return;
    }
    const P = ids.map(id => A.IDX.property[id]), F = ids.map(id => PF()[id] || {});
    const ppa = p => p.price && p.acres ? p.price / p.acres : null;
    const nhMin = (p, f) => f.hm != null ? f.hm : p.nh && p.nh.minutes_free_flow != null ? p.nh.minutes_free_flow : null;
    const rows = [
      ["Price", (p) => p.price, v => A.money(v), "min"],
      ["Acres", (p) => p.acres, v => ac(v), "max"],
      ["$ per acre", (p) => ppa(p), v => A.money(Math.round(v)), "min"],
      ["Beds / baths", (p) => p.beds != null ? +p.beds + (+p.baths || 0) / 10 : null, (v, p) => `${esc(p.beds)} bd / ${esc(p.baths)} ba`, "max"],
      ["Sq ft", (p) => p.sqft, v => Math.round(v).toLocaleString(), "max"],
      ["Year built", (p, f) => f.yb || p.year_built, v => esc(v), "max"],
      ["Drive to hospital", (p, f) => nhMin(p, f), v => `${v} min`, "min"],
      ["Drive to Level I/II trauma", (p, f) => f.tm, v => `${v} min`, "min"],
      ["School rating (nearby, KDE)", (p, f) => f.sr, v => esc(SR[v] || v), "max"],
      ["Days listed", (p, f) => f.dom, v => `${v}`, "min"],
    ];
    const cell = (r) => { const vals = P.map((p, i) => r[1](p, F[i])); const ok = vals.filter(v => v != null && v !== "" && !isNaN(+v)).map(Number);
      const best = ok.length > 1 ? (r[3] === "min" ? Math.min(...ok) : Math.max(...ok)) : null;
      return `<tr><th>${r[0]}</th>${vals.map((v, i) => `<td${best != null && +v === best && ok.filter(x => x === best).length < ok.length ? ' class="best"' : ""}>${v == null || v === "" ? "—" : r[2](v, P[i])}</td>`).join("")}</tr>`; };
    page("compare", hash, `<div class="kicker">⚖ Compare homes</div><h2>${P.length} homes side by side</h2>
      <div class="sub">Green = best in the row. Drive times are free-flow (no traffic). School rating = the lowest-rated school nearby (KDE colors).</div>
      <div class="cmpwrap"><table class="cmpt"><tr><th></th>${P.map((p, i) => `<td>${p.rt || (p.th && p.th.u) ? `<img src="${esc(p.rt || p.th.u)}" alt="" loading="lazy">` : ""}<div>${A.link("property", ids[i], p.title)}</div><div class="small">${esc(p.town || "")}</div><button type="button" class="linkbtn" data-rm="${esc(ids[i])}">remove</button></td>`).join("")}</tr>
      ${rows.map(cell).join("")}</table></div>
      <div class="xact"><button type="button" class="btn" data-x="share">Share this comparison</button><button type="button" class="btn ghost" data-x="clear">Clear</button></div>`, "Compare homes", opts);
    wire({ share: () => share(here() + hash, "Compare homes: " + ((window.KYX_ST || {}).app || "Kentucky Explorer")), clear: () => { A.cmpSet([]); compare([], { replace: true }); } });
    A.body.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { const a = ids.filter(x => x !== b.dataset.rm); A.cmpSet(a); compare(a, { replace: true }); });
  }

  // ---------------------------------------------------------------- new & price cuts since the last visit
  function whatsNew(opts) {
    const B = A.BADGE, ks = Object.keys(B).filter(k => !k.startsWith("job:"));
    const by = t => ks.filter(k => k.startsWith(t + ":")).map(item).filter(x => x.it);
    const sec = (t, label) => { const xs = by(t); return xs.length ? `<div class="xh">${label} (${xs.length})</div><div class="glist">${xs.map(x => { const b = B[x.t + ":" + x.id];
      return row(x.t, x.id, x.it, b.k === "cut" ? `was ${A.money(b.was)}` : b.jobs ? `${b.jobs} new job${b.jobs > 1 ? "s" : ""}` : "new"); }).join("")}</div>` : ""; };
    const html = sec("property", "🏠 Homes & land") + sec("business", "💲 Businesses") + sec("building", "🔔 Buildings") + sec("travel", "💼 Hospitals with new travel jobs");
    page("new", "#new", `<div class="kicker">🆕 Since your last visit</div><h2>New listings &amp; price cuts</h2>
      <div class="sub">Compared with what this phone saw on your previous visit (a visit = after 30+ minutes away). ${Object.keys(B).length ? "" : "Nothing new yet. Come back after the next listings refresh."}</div>${html}`, "New & price cuts", opts);
  }

  // ---------------------------------------------------------------- near me
  let me = null, meLayer = null;
  const hav = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2), y = Math.sin((d - b) * r / 2); return 7917.6 * Math.asin(Math.sqrt(x * x + Math.cos(a * r) * Math.cos(c * r) * y * y)); };
  function nearPage(opts) {
    page("near", "#near", `<div class="kicker">📍 Near me</div><h2>Finding you…</h2><div class="sub">Allow location access when your phone asks. Your location stays on this phone.</div>`, "Near me", opts);
    if (!navigator.geolocation) { failNear("This browser can't share its location."); return; }
    navigator.geolocation.getCurrentPosition(pos => showNear(pos.coords), err => failNear(err.code === 1 ? "Location access is turned off for this site. Turn it on in your browser settings to use Near me." : "Couldn't get your location (" + esc(err.message || "timeout") + ")."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 });
  }
  function failNear(msg) { const c = A.current(); if (!c || c.id !== "near") return; A.body.querySelector("h2").textContent = "Location unavailable"; A.body.querySelector(".sub").innerHTML = msg; }
  function showNear(co) {
    const c0 = A.current(); if (!c0 || c0.id !== "near") return;
    me = [co.latitude, co.longitude];
    if (meLayer) A.map.removeLayer(meLayer);
    meLayer = L.layerGroup([L.circle(me, { radius: Math.min(co.accuracy || 50, 3000), color: "#1e88e5", weight: 1, fillOpacity: 0.12, interactive: false }),
      L.marker(me, { icon: L.divIcon({ className: "", html: '<div class="medot"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }), interactive: false, zIndexOffset: 9999 })]).addTo(A.map);
    const ofs = A.PHONE ? Math.round(innerHeight * 0.3) : 0, z = 11, p = A.map.project(me, z); p.y += ofs; if (!A.PHONE) p.x += 210;
    A.map.flyTo(A.map.unproject(p, z), z, { duration: 0.8 });
    const K = A.K, near = (arr, f, n = 3) => (arr || []).filter(x => x.lat != null && (!f || f(x))).map(x => [x, hav(me[0], me[1], x.lat, x.lon)]).sort((a, b) => a[1] - b[1]).slice(0, n);
    const mi = d => d < 10 ? d.toFixed(1) + " mi" : Math.round(d) + " mi";
    const sec = (label, t, xs) => xs.length ? `<div class="xh">${label}</div><div class="glist">${xs.map(([x, d]) => row(t, x.id, A.IDX[t][x.id] || x, mi(d) + " away (straight line)")).join("")}</div>` : "";
    const far = near(K.hospitals, null, 1)[0];
    A.body.querySelector("h2").textContent = "Closest to you";
    A.body.querySelector(".sub").innerHTML = `Straight-line distances from your location (±${Math.round(co.accuracy || 0)} m).${far && far[1] > 60 ? ` You're well outside ${(window.KYX_ST || {}).name || "Kentucky"}; these are the nearest anyway.` : ""}`;
    A.body.insertAdjacentHTML("beforeend",
      sec("🏥 Trauma centers", "hospital", near(K.hospitals, h => /Level (I|II)(\s|$)/.test(h.trauma || ""))) +
      sec("🏥 Hospitals", "hospital", near(K.hospitals)) +
      sec("💼 Travel nurse jobs", "travel", near(K.travel && K.travel.hospitals)) +
      sec("🏠 Homes & land", "property", near(K.properties)) +
      sec("💲 Businesses for sale", "business", near(K.businesses)) +
      sec("🔔 Buildings for sale", "building", near(K.buildings)) +
      sec("🎡 Attractions", "attraction", near(K.attractions)) +
      sec("🎓 Schools", "school", near(K.schools)));
  }

  function route(hs, opts) {
    let m;
    if (hs === "#favs") favList(A.favGet(), false, "", opts);
    else if ((m = hs.match(/^#favs=([A-Za-z0-9_-]+)$/))) { let ks = []; try { ks = JSON.parse(unb64(m[1])); } catch (e) { } favList(Array.isArray(ks) ? ks.filter(k => typeof k === "string").slice(0, 200) : [], true, m[1], opts); }
    else if (hs === "#compare") compare(A.cmpGet(), opts);
    else if ((m = hs.match(/^#compare=(.+)$/))) compare(m[1].split(",").map(decodeURIComponent), opts);
    else if (hs === "#new") whatsNew(opts);
    else if (hs === "#near") nearPage(opts);
  }
  window.KYXE = { init(api) { A = api; return window.KYXE; }, route, me: () => me };
})();

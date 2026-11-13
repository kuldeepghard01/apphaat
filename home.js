/* AppHaat: home page, listings, listing details */
function iconHtml(l){
  const u = safeUrl(l.icon_url);
  if (u) return `<img class="icon" src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  return `<div class="icon" aria-hidden="true">${esc((l.title || "?").trim().charAt(0).toUpperCase())}</div>`;
}
function cardHtml(l, rank, small){
  return `<button class="card${small ? " sm" : ""}" data-id="${esc(l.id)}">
    ${rank ? '<div class="awning"></div>' : ""}
    ${savedIds.has(l.id) ? '<span class="heart" aria-label="Saved">&#9829;</span>' : ""}
    <div class="body">${iconHtml(l)}
      <div class="info">
        ${rank ? `<div class="rank">Sponsored &middot; Rank ${esc(rank)}</div>` : ""}
        <h3>${esc(l.title)}</h3>
        <div class="meta">
          <span class="price">${moneyL(l, l.price)}</span>
          <span>${platformLabel(l)}</span>
          ${l.monthly_profit != null ? `<span>Profit ${moneyL(l, l.monthly_profit)}/mo</span>` : ""}
          ${l.verified ? '<span class="ok">Verified &#10003;</span>' : '<span class="warn">Unverified</span>'}
        </div>
      </div>
    </div></button>`;
}

function fillSuggest(){
  const names = [...new Set([...CATEGORIES, ...all.map(l => l.title)])].filter(Boolean).slice(0, 80);
  $("sugList").innerHTML = names.map(x => `<option value="${esc(x)}">`).join("");
}

function similar(ref, n){
  const rp = Number(ref.price) || 0;
  return all.filter(l => l.id !== ref.id).map(l => {
    let s = 0;
    if (ref.category && l.category === ref.category) s += 3;
    if (ref.type && l.type === ref.type) s += 1;
    if (rp > 0) s -= Math.abs(Math.log((Number(l.price) + 1) / (rp + 1))) * 0.5;
    return { l, s };
  }).sort((a, b) => b.s - a.s).slice(0, n).map(x => x.l);
}

function render(){
  $("fMin").placeholder = "Min price (" + DISPLAY + ")"; $("fMax").placeholder = "Max price (" + DISPLAY + ")";
  $("fRev").placeholder = "Min monthly revenue (" + DISPLAY + ")";
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const num = (id, d) => ($(id).value === "" ? d : Number($(id).value));
  const cat = $("fCat").value, min = num("fMin", 0), max = num("fMax", Infinity);
  const minRev = num("fRev", 0), minTraffic = num("fTraffic", 0);
  const onlyNew = $("fNew").checked, onlyVer = $("fVer").checked;
  const cp = (l) => convert(l.price, l.currency || "USD");
  const platOk = (l) => filterType === "all" || (filterType === "website" ? l.type === "website" : l.type === "app" && (l.platform === filterType || l.platform === "cross"));
  const text = (l) => [l.title, l.category, l.description, l.country, platformLabel(l), l.platform === "ios" || l.platform === "cross" ? "iphone" : "", l.type === "website" ? "web site" : ""].join(" ").toLowerCase();
  const score = (l) => tokens.reduce((s, t) => s + ((l.title || "").toLowerCase().includes(t) ? 3 : 0) + ((l.category || "").toLowerCase().includes(t) ? 2 : 0), 0);
  const match = (l) => platOk(l) && (!cat || l.category === cat) && (!onlyVer || l.verified) &&
    (!onlyNew || Date.now() - new Date(l.created_at).getTime() < 7 * 864e5) &&
    cp(l) >= min && cp(l) <= max &&
    (!minRev || (l.monthly_revenue != null && convert(l.monthly_revenue, l.currency || "USD") >= minRev)) &&
    (!minTraffic || (l.traffic != null && Number(l.traffic) >= minTraffic)) &&
    (!tokens.length || tokens.every(t => text(l).includes(t)));

  const feat = featured.filter(f => match(f.listing));
  $("featWrap").hidden = feat.length === 0;
  $("feat").innerHTML = feat.map(f => cardHtml(f.listing, f.rank)).join("");

  const featIds = new Set(featured.map(f => f.listing.id));
  const rest = all.filter(l => !featIds.has(l.id) && match(l));
  const sort = $("fSort").value;
  if (sort === "low") rest.sort((a, b) => cp(a) - cp(b));
  else if (sort === "high") rest.sort((a, b) => cp(b) - cp(a));
  else if (sort === "rev") rest.sort((a, b) => convert(b.monthly_revenue || 0, b.currency || "USD") - convert(a.monthly_revenue || 0, a.currency || "USD"));
  else if (sort === "traffic") rest.sort((a, b) => Number(b.traffic || 0) - Number(a.traffic || 0));
  else if (tokens.length) rest.sort((a, b) => score(b) - score(a) || new Date(b.created_at) - new Date(a.created_at));
  $("list").innerHTML = rest.map(l => cardHtml(l, null, true)).join("");
  const total = rest.length + feat.length;
  $("fCount").textContent = total + (total === 1 ? " listing found" : " listings found");
  const active = [$("fMin").value, $("fMax").value, $("fRev").value, $("fTraffic").value].filter(v => v !== "").length + (onlyVer ? 1 : 0) + (onlyNew ? 1 : 0);
  $("fMoreSum").textContent = active ? `More filters (${active})` : "More filters";

  const none = rest.length === 0 && feat.length === 0;
  $("empty").hidden = !none;
  $("empty").textContent = all.length ? "No exact match for these filters." : "No listings found yet. Be the first to list yours.";
  const mid = isFinite(max) ? (min + max) / 2 : min;
  const sug = none && all.length ? similar({ category: cat, type: filterType === "all" ? "" : (filterType === "website" ? "website" : "app"), price: mid }, 4) : [];
  $("sugWrap").hidden = sug.length === 0;
  $("sug").innerHTML = sug.map(l => cardHtml(l, null, true)).join("");
}

async function load(){
  const now = new Date().toISOString();
  const [a, s] = await Promise.all([
    sb.from("listings").select("*").eq("status", "approved").order("created_at", { ascending: false }),
    sb.from("slots").select("rank, ends_at, listings(*)").lte("starts_at", now).gte("ends_at", now).order("rank")
  ]);
  if (a.error) { toast("Could not load listings. Check your internet and try again."); console.error(a.error); }
  all = a.data || [];
  featured = (s.data || [])
    .filter(x => x.listings && x.listings.status === "approved")
    .map(x => ({ rank: x.rank, listing: x.listings, ends: x.ends_at }));
  render(); renderPromo(); fillSuggest();
}

/* Filters */
$("q").addEventListener("input", e => { query = e.target.value; render(); });
$("chips").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  filterType = b.dataset.t;
  document.querySelectorAll("#chips .chip").forEach(c => c.setAttribute("aria-pressed", c === b ? "true" : "false"));
  render();
});

const catOpts = CATEGORIES.map(c => `<option>${esc(c)}</option>`).join("");
$("fCat").innerHTML = '<option value="">All categories</option>' + catOpts;
$("sCat").innerHTML = '<option value="">Choose a category</option>' + catOpts;
["fCat", "fMin", "fMax", "fSort", "fVer", "fRev", "fTraffic", "fNew"].forEach(id => $(id).addEventListener("input", render));
$("fClear").onclick = () => {
  ["fCat", "fMin", "fMax", "fRev", "fTraffic", "q"].forEach(id => { $(id).value = ""; });
  $("fSort").value = "new"; $("fVer").checked = false; $("fNew").checked = false; query = ""; filterType = "all";
  document.querySelectorAll("#chips .chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.t === "all" ? "true" : "false"));
  render();
};

$("fCur").value = DISPLAY;
$("fCur").addEventListener("input", () => {
  DISPLAY = $("fCur").value;
  try { localStorage.setItem("apphaat_cur", DISPLAY); } catch (e) {}
  render(); renderPromo();
});

async function renderPromo(){
  await settingsReady;
  const ends = {}; featured.forEach(f => { ends[f.rank] = f.ends; });
  const short = (x) => new Date(x).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  $("promo").innerHTML = Object.keys(SLOT_PRICES).map(Number).filter(r => r <= 3).map(r => `
    <button class="promo-card" data-info="spot" data-rank="${r}"><span class="tag">Spot ${r}</span>
      <b>${esc(money(SLOT_PRICES[r]))}<small> /wk</small></b>
      <span class="hint">${ends[r] ? "Till " + esc(short(ends[r])) : "Available"}</span></button>`).join("");
}

/* Listing detail */
function shotsHtml(l){
  const list = (l.screenshots || []).map(safeUrl).filter(Boolean);
  return list.length ? `<div class="shots">${list.map(u => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer"><img src="${esc(u)}" alt="Screenshot" loading="lazy"></a>`).join("")}</div>` : "";
}
function statsHtml(l){
  const mult = l.monthly_profit > 0 ? (Number(l.price) / (l.monthly_profit * 12)).toFixed(1) + "x" : "";
  const items = [
    ["Asking price", moneyL(l, l.price)], ["Type", platformLabel(l)],
    l.category && ["Category", l.category],
    l.monthly_revenue != null && ["Monthly revenue", moneyL(l, l.monthly_revenue)],
    l.monthly_profit != null && ["Monthly profit", moneyL(l, l.monthly_profit)],
    mult && ["Profit multiple", mult],
    l.age_years != null && ["Age", l.age_years + (Number(l.age_years) === 1 ? " year" : " years")],
    l.traffic != null && ["Monthly traffic", Number(l.traffic).toLocaleString("en-IN")],
    l.country && ["Country", l.country]
  ].filter(Boolean);
  return `<div class="stats">${items.map(([k, v]) => `<button class="stat" ${k === "Category" ? `data-cat="${esc(v)}"` : `data-info="stat" data-key="${esc(k)}"`}><span>${esc(k)}</span><b>${esc(v)}</b></button>`).join("")}</div>`;
}
settingsReady.then(() => {
  const b = $("banner"), t = (BANNER.text || "").trim(), u = safeUrl(BANNER.link);
  b.hidden = !t;
  if (t) b.innerHTML = u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer nofollow">${esc(t)}</a>` : esc(t);
});
const findListing = (id) => [...all, ...featured.map(f => f.listing)].find(x => x.id === id);
function openDetail(id){
  const l = findListing(id);
  if (!l) return;
  const link = safeUrl(l.link);
  const sim = similar(l, 4);
  const own = !!user && user.id === l.owner_id;
  $("det").innerHTML = `
    <div class="dlg-head"><h2>${esc(l.title)}</h2><button class="x" data-close aria-label="Close">&times;</button></div>
    <div class="body" style="display:flex;gap:12px;align-items:center">${iconHtml(l)}
      <div class="meta" style="margin:0">
        <span class="price">${moneyL(l, l.price)}</span>
        <span>${platformLabel(l)}</span>
        ${l.category ? `<span>${esc(l.category)}</span>` : ""}
        ${l.verified ? '<button class="linkbtn ok" data-info="verified">Verified &#10003;</button>' : '<button class="linkbtn warn" data-info="unverified">Not verified yet</button>'}
      </div>
    </div>
    ${shotsHtml(l)}
    <div class="hint">Seller: <button class="linkbtn" id="sellerLink" data-seller="${esc(l.owner_id)}">Seller profile</button> &middot; <span id="viewCnt"></span></div>
    ${statsHtml(l)}
    <h3 style="font-size:18px;margin:14px 0 2px">About this listing</h3>
    <p class="desc" style="margin-top:6px">${esc(l.description || "The seller has not added a description yet.")}</p>
    <div class="row">
      ${own ? `<button class="btn" id="anaBtn" data-id="${esc(l.id)}">Listing analytics</button>` : `<button class="btn" id="contactBtn" data-id="${esc(l.id)}">Contact seller</button>
      <button class="btn ghost" id="saveBtn" data-id="${esc(l.id)}" data-on="0">&#9825; Save</button>`}
      ${link ? `<a class="btn ghost" href="${esc(link)}" target="_blank" rel="noopener noreferrer nofollow">Open link</a>` : ""}
      ${own ? "" : `<button class="btn ghost" id="reportBtn" data-id="${esc(l.id)}">Report</button>`}
    </div>
    <div class="safe">Verify ownership before you pay. For larger amounts, use a safe method such as Escrow.com.</div>
    ${sim.length ? `<h3 class="sec-title" style="font-size:18px">Similar listings</h3><div class="grid compact">${sim.map(x => cardHtml(x, null, true)).join("")}</div>` : ""}`;
  if (!$("detDlg").open) $("detDlg").showModal();
  $("detDlg").scrollTop = 0;
  recordView(l);
  paintSave(l);
  sb.from("listing_stats").select("views").eq("listing_id", l.id).maybeSingle().then(r => { const v = $("viewCnt"); if (v) v.textContent = (r.data ? r.data.views : 0) + " views"; });
  sb.from("public_profiles").select("display_name").eq("id", l.owner_id).maybeSingle().then(r => { const a = $("sellerLink"); if (a && r.data && r.data.display_name) a.textContent = r.data.display_name; });
}
document.addEventListener("click", async e => {
  const card = e.target.closest(".card");
  if (card) return openDetail(card.dataset.id);
  if (e.target.closest("[data-close]")) { e.target.closest("dialog").close(); return; }
  const rb = e.target.closest("#reportBtn");
  if (rb) {
    if (!user) { $("detDlg").close(); openAuth("login", "Please log in to report a listing."); return; }
    const reason = prompt("Why are you reporting this listing? (for example: fake listing, wrong link)");
    if (!reason || !reason.trim()) return;
    const { error } = await sb.from("reports").insert({ listing_id: rb.dataset.id, reporter_id: user.id, reason: reason.trim().slice(0, 500) });
    toast(error ? "Could not send the report. Please try again." : "Report received. Thank you.");
    if (!error) $("detDlg").close();
  }
});
["authDlg", "detDlg", "sellDlg", "mineDlg", "featDlg", "adminDlg", "contactDlg", "infoDlg", "payDlg", "profDlg", "sellerDlg", "notifDlg", "inboxDlg", "dashDlg", "anaDlg", "wishDlg"].forEach(id => $(id).addEventListener("click", e => { if (e.target === $(id)) $(id).close(); }));

load();

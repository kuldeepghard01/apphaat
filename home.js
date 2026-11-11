/* AppHaat: home page, listings, listing details */
function iconHtml(l){
  const u = safeUrl(l.icon_url);
  if (u) return `<img class="icon" src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">`;
  return `<div class="icon" aria-hidden="true">${esc((l.title || "?").trim().charAt(0).toUpperCase())}</div>`;
}
function cardHtml(l, rank){
  return `<button class="card" data-id="${esc(l.id)}">
    ${rank ? '<div class="awning"></div>' : ""}
    <div class="body">${iconHtml(l)}
      <div class="info">
        ${rank ? `<div class="rank">Rank ${esc(rank)}</div>` : ""}
        <h3>${esc(l.title)}</h3>
        <div class="meta">
          <span class="price">${money(l.price)}</span>
          <span>${l.type === "website" ? "Website" : "App"}</span>
          ${l.verified ? '<span class="ok">Verified &#10003;</span>' : ""}
        </div>
      </div>
    </div></button>`;
}

function render(){
  const q = query.trim().toLowerCase();
  const match = (l) => (filterType === "all" || l.type === filterType) &&
    (!q || (l.title || "").toLowerCase().includes(q) || (l.category || "").toLowerCase().includes(q));

  const feat = featured.filter(f => match(f.listing));
  $("featWrap").hidden = feat.length === 0;
  $("feat").innerHTML = feat.map(f => cardHtml(f.listing, f.rank)).join("");

  const featIds = new Set(featured.map(f => f.listing.id));
  const rest = all.filter(l => !featIds.has(l.id) && match(l));
  $("list").innerHTML = rest.map(l => cardHtml(l)).join("");
  $("empty").hidden = rest.length > 0 || feat.length > 0;
}

async function load(){
  const now = new Date().toISOString();
  const [a, s] = await Promise.all([
    sb.from("listings").select("*").eq("status", "approved").order("created_at", { ascending: false }),
    sb.from("slots").select("rank, listings(*)").lte("starts_at", now).gte("ends_at", now).order("rank")
  ]);
  if (a.error) { toast("Could not load listings. Check your internet and try again."); console.error(a.error); }
  all = a.data || [];
  featured = (s.data || [])
    .filter(x => x.listings && x.listings.status === "approved")
    .map(x => ({ rank: x.rank, listing: x.listings }));
  render();
}

/* Filters */
$("q").addEventListener("input", e => { query = e.target.value; render(); });
$("chips").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  filterType = b.dataset.t;
  document.querySelectorAll("#chips .chip").forEach(c => c.setAttribute("aria-pressed", c === b ? "true" : "false"));
  render();
});

/* Listing detail */
function openDetail(id){
  const l = [...all, ...featured.map(f => f.listing)].find(x => x.id === id);
  if (!l) return;
  const link = safeUrl(l.link);
  $("det").innerHTML = `
    <div class="dlg-head"><h2>${esc(l.title)}</h2><button class="x" data-close aria-label="Close">&times;</button></div>
    <div class="body" style="display:flex;gap:12px;align-items:center">${iconHtml(l)}
      <div class="meta" style="margin:0">
        <span class="price">${money(l.price)}</span>
        <span>${l.type === "website" ? "Website" : "App"}</span>
        ${l.category ? `<span>${esc(l.category)}</span>` : ""}
        ${l.verified ? '<span class="ok">Verified &#10003;</span>' : '<span>Not verified yet</span>'}
      </div>
    </div>
    <p class="desc">${esc(l.description || "The seller has not added a description yet.")}</p>
    <div class="row">
      ${link ? `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener noreferrer nofollow">Open link</a>` : ""}
      <button class="btn ghost" id="reportBtn" data-id="${esc(l.id)}">Report</button>
    </div>
    <div class="safe">Verify ownership before you pay. For larger amounts, use a safe method such as Escrow.com.</div>`;
  $("detDlg").showModal();
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
["authDlg", "detDlg", "sellDlg", "mineDlg", "featDlg", "adminDlg"].forEach(id => $(id).addEventListener("click", e => { if (e.target === $(id)) $(id).close(); }));

load();

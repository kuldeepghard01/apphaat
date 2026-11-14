/* AppHaat: Recently sold (only deals with an accepted offer) and Mark as sold */
let soldList = [];

async function loadSold(){
  const { data } = await sb.from("recent_sales").select("*").order("sold_at", { ascending: false }).limit(30);
  soldList = data || [];
  renderSold();
}
function renderSold(){
  $("soldWrap").hidden = !soldList.length;
  $("soldRow").innerHTML = soldList.slice(0, 12).map(s => `<div class="sold-card">
    <span class="tag">SOLD</span>
    <div class="body" style="padding:0;display:flex;gap:8px;align-items:center">${iconHtml(s)}<h3>${esc(s.title)}</h3></div>
    <div class="hint">${esc(platformLabel(s))}${s.category ? " &middot; " + esc(s.category) : ""}</div>
    <div class="price">Sold for ${esc(moneyL(s, s.price))}</div>
    <div class="hint">${s.asking_price > 0 ? pctOf(s.price, s.asking_price) + "% of asking price &middot; " : ""}${esc(timeAgo(s.sold_at))}</div></div>`).join("");
}

async function confirmSold(oid, amtText, title){
  if (!confirm(`Mark "${title}" as sold for ${amtText}?\n\nIt will leave the live listings and appear in Recently sold with this price. This cannot be undone.`)) return;
  const { error } = await sb.rpc("mark_sold", { oid });
  if (error) { toast(error.message); return; }
  toast("Marked as sold. Congratulations!");
  load(); loadSold(); checkNotifs();
  $("mineDlg").close(); openOffers();
}

document.addEventListener("click", async e => {
  const b = e.target.closest(".soldBtn");
  if (b) {
    const { data } = await sb.from("offers").select("*").eq("listing_id", b.dataset.id).eq("status", "accepted");
    const ok = data || [];
    if (!ok.length) { toast("First accept an offer from a buyer (Profile > Offers). Then you can mark the sale."); return; }
    if (ok.length > 1) { $("mineDlg").close(); openOffers(); toast("Several offers are accepted. Tap Mark as sold on the one you want."); return; }
    const l = mineCache.find(x => x.id === b.dataset.id) || {};
    confirmSold(ok[0].id, cm(ok[0].amount, ok[0].currency), l.title || "this listing");
    return;
  }
  const s = e.target.closest(".offSold");
  if (s) confirmSold(s.dataset.oid, s.dataset.amt, s.dataset.title);
});

loadSold();

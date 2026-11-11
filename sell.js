/* AppHaat: sell form, my listings, get featured */
/* Sell and My listings */
function supportHtml(){
  return SUPPORT_EMAIL ? `<a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>` : "AppHaat support";
}
async function openSell(){
  if (!user) { openAuth("login", "Please log in to list an app or website."); return; }
  const { data } = await sb.from("profiles").select("is_paid").eq("id", user.id).maybeSingle();
  const paid = !!(data && data.is_paid);
  $("sellLock").hidden = paid; $("sellForm").hidden = !paid;
  if (!paid) $("sellLock").innerHTML = `Your account is not activated yet. Contact ${supportHtml()} to activate it, then you can list your app or website.`;
  $("sellMsg").textContent = "";
  $("sellDlg").showModal();
}
$("sellGo").onclick = async () => {
  const m = $("sellMsg"); m.className = "msg err";
  const title = $("sTitle").value.trim(), type = $("sType").value, link = safeUrl($("sLink").value.trim());
  const priceRaw = $("sPrice").value, price = Number(priceRaw);
  const category = $("sCat").value.trim(), description = $("sDesc").value.trim();
  const file = $("sIcon").files[0];
  if (!title) { m.textContent = "Enter a title."; return; }
  if (!link) { m.textContent = "Enter a valid link that starts with https://"; return; }
  if (priceRaw === "" || !isFinite(price) || price < 0) { m.textContent = "Enter a valid price."; return; }
  if (!description) { m.textContent = "Add a short description."; return; }
  const ext = file ? ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" })[file.type] : null;
  if (file && !ext) { m.textContent = "Icon must be a PNG, JPG or WebP image."; return; }
  if (file && file.size > 1048576) { m.textContent = "Icon must be 1 MB or smaller."; return; }

  $("sellGo").disabled = true; m.className = "msg"; m.textContent = "Submitting...";
  let icon_url = null;
  if (file) {
    const path = `${user.id}/${Date.now()}.${ext}`;
    const up = await sb.storage.from("icons").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) { $("sellGo").disabled = false; m.className = "msg err"; m.textContent = "Could not upload the icon. Please try again."; console.error(up.error); return; }
    icon_url = sb.storage.from("icons").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await sb.from("listings").insert({ owner_id: user.id, title, type, link, price, category: category || null, description, icon_url });
  $("sellGo").disabled = false;
  if (error) { m.className = "msg err"; m.textContent = "Could not submit your listing. Please try again."; console.error(error); return; }
  ["sTitle","sLink","sPrice","sCat","sDesc","sIcon"].forEach(id => $(id).value = "");
  $("sellDlg").close();
  toast("Listing submitted. It goes live after review.");
  openMine();
};

const STATUS = { pending: "Pending review", approved: "Live", rejected: "Rejected", hidden: "Hidden" };
async function openMine(){
  $("mineList").innerHTML = '<div class="empty">Loading...</div>';
  $("mineDlg").showModal();
  const { data, error } = await sb.from("listings")
    .select("id,title,status,verified,verify_code,created_at")
    .eq("owner_id", user.id).order("created_at", { ascending: false });
  if (error) { $("mineList").innerHTML = '<div class="empty">Could not load your listings.</div>'; return; }
  if (!data.length) { $("mineList").innerHTML = '<div class="empty">You have no listings yet.</div>'; return; }
  $("mineList").innerHTML = data.map(l => `
    <div class="mine">
      <div class="mrow"><strong>${esc(l.title)}</strong><span class="tag">${esc(STATUS[l.status] || l.status)}</span></div>
      <div class="meta">${l.verified ? '<span class="ok">Verified &#10003;</span>' : "<span>Not verified yet</span>"}</div>
      ${l.verified ? "" : `<div class="safe">To get verified, add this code to your website (any page) or your app store description: <b>${esc(l.verify_code)}</b>. Then contact ${supportHtml()}.</div>`}
      ${l.status === "approved" ? `<div class="row"><button class="btn small featBtn" data-id="${esc(l.id)}" data-title="${esc(l.title)}">Get featured</button></div>` : ""}
    </div>`).join("");
}

/* Get featured: rank slot requests */
let featListingId = null;
const fmtDate = (x) => new Date(x).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
async function openFeat(id, title){
  featListingId = id;
  $("featFor").textContent = "Listing: " + title;
  $("featMsg").textContent = "";
  $("featList").innerHTML = '<div class="empty">Loading...</div>';
  $("featDlg").showModal();
  const { data } = await sb.from("slots").select("rank,ends_at").gt("ends_at", new Date().toISOString());
  const until = {};
  (data || []).forEach(x => { if (!until[x.rank] || x.ends_at > until[x.rank]) until[x.rank] = x.ends_at; });
  $("featList").innerHTML = [1, 2, 3].map(r => `
    <div class="mine">
      <div class="mrow"><strong>Rank ${r}</strong><span class="price">${money(SLOT_PRICES[r])} / week</span></div>
      <div class="meta"><span>${until[r] ? "Booked until " + esc(fmtDate(until[r])) : "Available now"}</span></div>
      <div class="row"><button class="btn small slotBtn" data-rank="${r}">${until[r] ? "Join waitlist" : "Request this slot"}</button></div>
    </div>`).join("");
}
document.addEventListener("click", async e => {
  const fb = e.target.closest(".featBtn");
  if (fb) { $("mineDlg").close(); openFeat(fb.dataset.id, fb.dataset.title); return; }
  const sbn = e.target.closest(".slotBtn");
  if (!sbn) return;
  const rank = Number(sbn.dataset.rank), m = $("featMsg");
  sbn.disabled = true; m.className = "msg"; m.textContent = "Sending...";
  const { error } = await sb.from("slot_requests").insert({ listing_id: featListingId, owner_id: user.id, rank });
  sbn.disabled = false;
  if (error) {
    m.className = "msg err";
    m.textContent = error.code === "23505" ? "You already have a pending request for this rank." : "Could not send your request. Please try again.";
    return;
  }
  m.className = "msg good";
  m.innerHTML = `Request sent for Rank ${rank}. Contact ${supportHtml()} to pay ${esc(money(SLOT_PRICES[rank]))}. Your slot starts after payment is confirmed.`;
});

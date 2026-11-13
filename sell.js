/* AppHaat: sell form, my listings, get featured */
/* Sell and My listings */
function supportHtml(){
  return SUPPORT_EMAIL ? `<a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a>` : "AppHaat support";
}
let editingId = null, editingLink = null, mineCache = [];
const FIELDS = ["sTitle", "sLink", "sPrice", "sCat", "sDesc", "sIcon", "sRev", "sProfit", "sAge", "sTraffic", "sCountry", "sShots"];
function clearForm(){ FIELDS.forEach(id => { $(id).value = ""; }); $("sType").value = "app"; $("sCur").value = "USD"; }
function openEdit(l){
  editingId = l.id; editingLink = l.link;
  clearForm();
  $("sTitle").value = l.title || ""; $("sType").value = l.type; $("sLink").value = l.link || "";
  $("sPrice").value = l.price; $("sCur").value = l.currency || "USD"; $("sCat").value = l.category || "";
  $("sDesc").value = l.description || "";
  $("sRev").value = l.monthly_revenue ?? ""; $("sProfit").value = l.monthly_profit ?? "";
  $("sAge").value = l.age_years ?? ""; $("sTraffic").value = l.traffic ?? ""; $("sCountry").value = l.country || "";
  $("sellHead").textContent = "Edit your listing"; $("sellGo").textContent = "Save changes";
  $("sellLock").hidden = true; $("sellForm").hidden = false; $("sellMsg").textContent = "";
  $("sellDlg").showModal();
}
async function openSell(){
  editingId = null; clearForm();
  $("sellHead").textContent = "List your app or website"; $("sellGo").textContent = "Submit for review";
  if (!user) { openAuth("login", "Please log in to list an app or website."); return; }
  await settingsReady;
  const { data } = await sb.from("profiles").select("is_paid").eq("id", user.id).maybeSingle();
  const paid = !!(data && data.is_paid);
  $("sellLock").hidden = paid; $("sellForm").hidden = !paid;
  if (!paid) $("sellLock").innerHTML = `Your account is not activated yet. ${ACCOUNT_FEE > 0 ? `The one-time account fee is ${esc(money(ACCOUNT_FEE))}. ` : ""}Pay it below to activate your account, then you can list your app or website. Need help? Contact ${supportHtml()}.${ACCOUNT_FEE > 0 ? `<div class="row"><button class="btn small payBtn" data-purpose="account" data-amount="${esc(ACCOUNT_FEE)}">Pay ${esc(money(ACCOUNT_FEE))}</button></div>` : ""}`;
  $("sellMsg").textContent = "";
  $("sellDlg").showModal();
}
$("sellGo").onclick = async () => {
  const m = $("sellMsg"); m.className = "msg err";
  const title = $("sTitle").value.trim(), type = $("sType").value, link = safeUrl($("sLink").value.trim());
  const priceRaw = $("sPrice").value, price = Number(priceRaw);
  const category = $("sCat").value.trim(), description = $("sDesc").value.trim();
  const num = (id) => ($(id).value === "" ? null : Number($(id).value));
  const extra = { monthly_revenue: num("sRev"), monthly_profit: num("sProfit"), age_years: num("sAge"), traffic: num("sTraffic"), country: $("sCountry").value.trim() || null };
  if ([extra.monthly_revenue, extra.monthly_profit, extra.age_years, extra.traffic].some(v => v !== null && (!isFinite(v) || v < 0))) { m.textContent = "Check the optional numbers. They must be zero or more."; return; }
  const file = $("sIcon").files[0];
  if (!title) { m.textContent = "Enter the app or website name."; return; }
  if (!category) { m.textContent = "Choose a category."; return; }
  if (!link) { m.textContent = "Enter a valid link that starts with https://"; return; }
  if (priceRaw === "" || !isFinite(price) || price < 0) { m.textContent = "Enter a valid price."; return; }
  if (!description) { m.textContent = "Add a short description."; return; }
  const ext = file ? ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" })[file.type] : null;
  if (file && !ext) { m.textContent = "Icon must be a PNG, JPG or WebP image."; return; }
  if (file && file.size > 1048576) { m.textContent = "Icon must be 1 MB or smaller."; return; }
  const IMG_EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
  const shotFiles = [...$("sShots").files];
  if (shotFiles.length > 5) { m.textContent = "Choose up to 5 screenshots."; return; }
  if (shotFiles.some(f => !IMG_EXT[f.type] || f.size > 3145728)) { m.textContent = "Screenshots must be PNG, JPG or WebP, up to 3 MB each."; return; }

  $("sellGo").disabled = true; m.className = "msg"; m.textContent = "Saving...";
  let icon_url = null;
  if (file) {
    const path = `${user.id}/${Date.now()}.${ext}`;
    const up = await sb.storage.from("icons").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) { $("sellGo").disabled = false; m.className = "msg err"; m.textContent = "Could not upload the icon. Please try again."; console.error(up.error); return; }
    icon_url = sb.storage.from("icons").getPublicUrl(path).data.publicUrl;
  }
  const payload = { title, type, link, price, currency: $("sCur").value, category: category || null, description, ...extra };
  if (icon_url) payload.icon_url = icon_url;
  if (shotFiles.length) {
    const urls = [];
    for (let i = 0; i < shotFiles.length; i++) {
      const f = shotFiles[i], sp = `${user.id}/shot-${Date.now()}-${i}.${IMG_EXT[f.type]}`;
      const su = await sb.storage.from("icons").upload(sp, f, { contentType: f.type, upsert: false });
      if (su.error) { $("sellGo").disabled = false; m.className = "msg err"; m.textContent = "Could not upload a screenshot. Please try again."; return; }
      urls.push(sb.storage.from("icons").getPublicUrl(sp).data.publicUrl);
    }
    payload.screenshots = urls;
  }
  let error;
  if (editingId) {
    const r = await sb.from("listings").update(payload).eq("id", editingId).select("id");
    error = r.error || (!r.data || !r.data.length ? { message: "not saved" } : null);
  } else {
    ({ error } = await sb.from("listings").insert({ owner_id: user.id, ...payload }));
  }
  $("sellGo").disabled = false;
  if (error) { m.className = "msg err"; m.textContent = "Could not save your listing. Please try again."; console.error(error); return; }
  const relink = editingId && link !== editingLink, wasEdit = !!editingId;
  editingId = null; clearForm(); $("sellDlg").close();
  toast(wasEdit ? (relink ? "Saved. The link changed, so it needs review and verification again." : "Changes saved.") : "Listing submitted. It goes live after review.");
  load(); openMine();
};

const STATUS = { pending: "Pending review", approved: "Live", rejected: "Rejected", hidden: "Hidden" };
async function openMine(){
  $("mineList").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("mineDlg").open) $("mineDlg").showModal();
  const { data, error } = await sb.from("listings")
    .select("*")
    .eq("owner_id", user.id).order("created_at", { ascending: false });
  if (error) { $("mineList").innerHTML = '<div class="empty">Could not load your listings.</div>'; return; }
  mineCache = data;
  if (!data.length) { $("mineList").innerHTML = '<div class="empty">You have no listings yet.</div>'; return; }
  const inq = await sb.from("inquiries").select("listing_id,buyer_email,message,offer,created_at")
    .in("listing_id", data.map(l => l.id)).order("created_at", { ascending: false });
  const by = {}; (inq.data || []).forEach(x => { (by[x.listing_id] = by[x.listing_id] || []).push(x); });
  const ids = data.map(l => l.id);
  const stR = await sb.from("listing_stats").select("*").in("listing_id", ids);
  const st = {}; (stR.data || []).forEach(x => { st[x.listing_id] = x; });
  const chR = await sb.from("chat_messages").select("listing_id,buyer_id").in("listing_id", ids);
  const ch = {}; (chR.data || []).forEach(x => { (ch[x.listing_id] = ch[x.listing_id] || new Set()).add(x.buyer_id); });
  $("mineList").innerHTML = data.map(l => `
    <div class="mine">
      <div class="mrow"><strong>${esc(l.title)}</strong><span class="tag">${esc(STATUS[l.status] || l.status)}</span></div>
      <div class="meta">${l.verified ? '<span class="ok">Verified &#10003;</span>' : "<span>Not verified yet</span>"}</div>
      <div class="meta"><span>${(st[l.id] || {}).views || 0} views</span><span>${(st[l.id] || {}).views_7d || 0} in 7 days</span><span>${(ch[l.id] || new Set()).size} chats</span></div>
      <div class="row"><button class="btn small ghost viewBtn" data-id="${esc(l.id)}">View</button>${safeUrl(l.link) ? `<a class="btn small ghost" href="${esc(safeUrl(l.link))}" target="_blank" rel="noopener noreferrer">Visit site</a>` : ""}<button class="btn small ghost editBtn" data-id="${esc(l.id)}">Edit</button><button class="btn small ghost delBtn" data-id="${esc(l.id)}">Delete</button></div>
      ${l.verified ? "" : `<div class="safe">To get verified, put this code on your website inside the head tag as <b>&lt;meta name="apphaat-verify" content="${esc(l.verify_code)}"&gt;</b>, or in your app store description. Then contact ${supportHtml()}. Only verified listings can be featured.</div><div class="row"><button class="btn small verBtn" data-id="${esc(l.id)}">Verify now</button></div>`}
      ${l.status === "approved" && l.verified ? `<div class="row"><button class="btn small featBtn" data-id="${esc(l.id)}" data-title="${esc(l.title)}">Get featured</button></div>` : ""}
      ${inboxHtml(by[l.id] || [], l.title)}
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
  await settingsReady;
  const { data } = await sb.from("slots").select("rank,ends_at").gt("ends_at", new Date().toISOString());
  const until = {};
  (data || []).forEach(x => { if (!until[x.rank] || x.ends_at > until[x.rank]) until[x.rank] = x.ends_at; });
  $("featList").innerHTML = Object.keys(SLOT_PRICES).map(Number).map(r => `
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
  const { data: made, error } = await sb.from("slot_requests").insert({ listing_id: featListingId, owner_id: user.id, rank }).select("id").single();
  sbn.disabled = false;
  if (error) {
    m.className = "msg err";
    m.textContent = error.code === "23505" ? "You already have a pending request for this rank." : "Could not send your request. Please try again.";
    return;
  }
  m.className = "msg good";
  m.innerHTML = `Request sent for Rank ${rank}. Pay ${esc(money(SLOT_PRICES[rank]))} to start your spot. It starts after we confirm your payment. <div class="row"><button class="btn small payBtn" data-purpose="slot" data-amount="${esc(SLOT_PRICES[rank])}" data-ref="${esc(made.id)}">Pay now</button></div>`;
  openPay("slot", SLOT_PRICES[rank], made.id);
});

document.addEventListener("click", async e => {
  const eb = e.target.closest(".editBtn"), db = e.target.closest(".delBtn");
  if (eb) { const l = mineCache.find(x => x.id === eb.dataset.id); if (l) { $("mineDlg").close(); openEdit(l); } return; }
  if (!db) return;
  if (!confirm("Delete this listing permanently? Any featured slot on it will be lost too.")) return;
  db.disabled = true;
  const r = await sb.from("listings").delete().eq("id", db.dataset.id).select("id");
  if (r.error || !r.data || !r.data.length) { toast("Could not delete the listing."); db.disabled = false; return; }
  toast("Listing deleted."); load(); openMine();
});

/* Hero and footer shortcuts */
$("promoBtn").onclick = () => { if (user) openMine(); else openAuth("login", "Log in to book a spot."); };
$("heroSell").onclick = openSell;
$("footSell").onclick = (e) => { e.preventDefault(); openSell(); };
$("footAd").onclick = (e) => { e.preventDefault(); if (user) openMine(); else openAuth("login", "Log in to promote your listing."); };

/* AppHaat: admin panel (only works for admin accounts) */
/* Admin panel */
let isAdmin = false, adminTab = "listings", adminStatus = "pending", adminQuery = "";
async function syncAdmin(){
  let now = false;
  if (user) {
    const { data } = await sb.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    now = !!(data && data.is_admin);
  }
  if (now !== isAdmin) { isAdmin = now; paintUser(); }
}
async function emailMap(ids){
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return {};
  const { data } = await sb.from("profiles").select("id,email").in("id", uniq);
  const m = {}; (data || []).forEach(x => m[x.id] = x.email); return m;
}
async function titleMap(ids){
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return {};
  const { data } = await sb.from("listings").select("id,title,status").in("id", uniq);
  const m = {}; (data || []).forEach(x => m[x.id] = x); return m;
}
function openAdmin(){
  if (!isAdmin) return;
  $("adminMsg").textContent = "";
  $("adminDlg").showModal();
  renderAdmin();
}
async function renderAdmin(){
  document.querySelectorAll("#adminTabs .chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.tab === adminTab ? "true" : "false"));
  const body = $("adminBody");
  body.innerHTML = '<div class="empty">Loading...</div>';
  try {
    if (adminTab === "listings") body.innerHTML = await adminListings();
    else if (adminTab === "requests") body.innerHTML = await adminRequests();
    else if (adminTab === "users") body.innerHTML = await adminUsers();
    else if (adminTab === "settings") body.innerHTML = adminSettings();
    else if (adminTab === "slots") body.innerHTML = await adminSlots();
    else body.innerHTML = await adminReports();
  } catch (err) {
    console.error(err);
    body.innerHTML = '<div class="empty">Could not load this section. Check that the admin SQL was run.</div>';
  }
}
/* Supabase says "success" even when security rules block a change, so check that a row really changed */
async function run(q){
  const r = await q.select("id");
  if (!r.error && (!r.data || !r.data.length)) return { error: { message: "Nothing changed. Make sure the admin SQL was run and this account is an admin." } };
  return r;
}
const btn = (label, a, id, v, extra) => `<button class="btn small ${extra || ""}" data-a="${a}" data-id="${esc(id)}" data-v="${esc(v)}">${label}</button>`;

async function adminListings(){
  let q = sb.from("listings").select("id,owner_id,title,type,link,price,status,verified,verify_code,created_at")
    .order("created_at", { ascending: false }).limit(100);
  if (adminStatus !== "all") q = q.eq("status", adminStatus);
  const { data, error } = await q;
  if (error) throw error;
  const em = await emailMap(data.map(l => l.owner_id));
  const opts = ["pending", "approved", "rejected", "hidden", "all"]
    .map(o => `<option value="${o}" ${o === adminStatus ? "selected" : ""}>${o[0].toUpperCase() + o.slice(1)}</option>`).join("");
  const head = `<div class="sel"><label for="aStatus" style="margin:0">Show</label><select class="f" id="aStatus">${opts}</select></div>`;
  if (!data.length) return head + '<div class="empty">No listings here.</div>';
  return head + data.map(l => {
    const link = safeUrl(l.link);
    const acts = [
      l.status !== "approved" ? btn("Approve", "status", l.id, "approved") : "",
      l.status === "pending" ? btn("Reject", "status", l.id, "rejected", "ghost") : "",
      l.status === "approved" ? btn("Hide", "status", l.id, "hidden", "ghost") : "",
      l.verified ? btn("Remove verified", "verify", l.id, "false", "ghost") : btn("Mark verified", "verify", l.id, "true", "ghost")
    ].join("");
    return `<div class="mine">
      <div class="mrow"><strong>${esc(l.title)}</strong><span class="tag">${esc(STATUS[l.status] || l.status)}</span></div>
      <div class="meta"><span class="price">${moneyL(l, l.price)}</span><span>${l.type === "website" ? "Website" : "App"}</span>
        ${l.verified ? '<span class="ok">Verified &#10003;</span>' : "<span>Not verified</span>"}
        <span>${esc(em[l.owner_id] || "unknown owner")}</span></div>
      <div class="meta">${link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer nofollow">Open link</a>` : ""}
        <span>Verify code: <b>${esc(l.verify_code)}</b></span></div>
      <div class="hint">Open the link and check that this code is in the page source (meta tag apphaat-verify) or the app description. Mark verified only if you find it.</div>
      <div class="row">${acts}</div></div>`;
  }).join("");
}

async function adminRequests(){
  const { data, error } = await sb.from("slot_requests").select("id,listing_id,owner_id,rank,created_at")
    .eq("status", "pending").order("created_at", { ascending: true }).limit(100);
  if (error) throw error;
  if (!data.length) return '<div class="empty">No pending slot requests.</div>';
  const [em, tm, sl] = await Promise.all([
    emailMap(data.map(r => r.owner_id)), titleMap(data.map(r => r.listing_id)),
    sb.from("slots").select("rank,ends_at").gt("ends_at", new Date().toISOString())
  ]);
  const until = {};
  (sl.data || []).forEach(x => { if (!until[x.rank] || x.ends_at > until[x.rank]) until[x.rank] = x.ends_at; });
  return data.map(r => {
    const l = tm[r.listing_id] || {};
    const start = until[r.rank] ? new Date(until[r.rank]) : new Date();
    const end = new Date(start.getTime() + 7 * 864e5);
    const live = l.status === "approved";
    return `<div class="mine">
      <div class="mrow"><strong>Rank ${esc(r.rank)}: ${esc(l.title || "Listing")}</strong><span class="tag">${money(SLOT_PRICES[r.rank])}</span></div>
      <div class="meta"><span>${esc(em[r.owner_id] || "unknown owner")}</span><span>Requested ${esc(fmtDate(r.created_at))}</span></div>
      <div class="meta"><span>Slot would run ${esc(fmtDate(start))} to ${esc(fmtDate(end))}</span></div>
      ${live ? "" : '<div class="safe">This listing is not live, so the slot cannot be activated.</div>'}
      <div class="row">${live ? `<button class="btn small" data-a="slot" data-id="${esc(r.id)}" data-v="${esc(r.rank)}" data-listing="${esc(r.listing_id)}" data-start="${esc(start.toISOString())}" data-end="${esc(end.toISOString())}">Activate slot (after payment)</button>` : ""}
        ${btn("Reject", "reject", r.id, "", "ghost")}</div></div>`;
  }).join("");
}

async function adminUsers(){
  let q = sb.from("profiles").select("id,email,is_paid,is_admin,created_at").order("created_at", { ascending: false }).limit(50);
  if (adminQuery) q = q.ilike("email", `%${adminQuery.replace(/[%_]/g, "")}%`);
  const { data, error } = await q;
  if (error) throw error;
  const head = `<div class="sel"><input class="f" id="aQ" type="search" placeholder="Search by email" value="${esc(adminQuery)}"><button class="btn small" id="aSearch">Search</button></div>`;
  if (!data.length) return head + '<div class="empty">No users found.</div>';
  return head + data.map(u => `<div class="mine">
    <div class="mrow"><strong style="overflow-wrap:anywhere">${esc(u.email)}</strong><span class="tag">${u.is_paid ? "Active" : "Not activated"}</span></div>
    <div class="meta"><span>Joined ${esc(fmtDate(u.created_at))}</span>${u.is_admin ? "<span>Admin</span>" : ""}</div>
    <div class="row">${u.is_paid ? btn("Deactivate", "paid", u.id, "false", "ghost") : btn("Activate account", "paid", u.id, "true")}</div></div>`).join("");
}

function adminSettings(){
  const prices = Object.keys(SLOT_PRICES).map(Number).sort((a, b) => a - b).map(k => SLOT_PRICES[k]).join(",");
  return `<label for="cFee">Account fee (${esc(CURRENCY)})</label>
    <input class="f" id="cFee" type="number" min="0" step="any" value="${esc(ACCOUNT_FEE)}">
    <label for="cSlots">Slot prices per week, Rank 1 first</label>
    <input class="f" id="cSlots" type="text" value="${esc(prices)}">
    <div class="hint">Separate with commas. Each number is one slot, so 20,15,10 means 3 slots and Rank 1 costs 20. Add more numbers to add more slots (up to 20).</div>
    <label for="cMail">Support email</label>
    <input class="f" id="cMail" type="email" value="${esc(SUPPORT_EMAIL)}">
    <label for="cRate">Rupees per 1 US dollar (used for the INR/USD switch)</label>
    <input class="f" id="cRate" type="number" min="0" step="any" value="${esc(USD_INR)}">
    <label for="cBan">Top banner message (an ad or announcement, leave empty to hide)</label>
    <input class="f" id="cBan" type="text" maxlength="120" value="${esc(BANNER.text)}">
    <label for="cBanLink">Banner link (optional)</label>
    <input class="f" id="cBanLink" type="url" placeholder="https://" value="${esc(BANNER.link)}">
    <div class="row"><button class="btn" id="aSaveCfg">Save settings</button></div>`;
}
document.addEventListener("click", async e => {
  if (!e.target.closest("#aSaveCfg") || !isAdmin) return;
  const m = $("adminMsg"), fee = Number($("cFee").value);
  const parts = $("cSlots").value.split(",").map(x => x.trim());
  if (!(Number($("cRate").value) > 0) || !isFinite(fee) || fee < 0 || $("cFee").value === "" || parts.length > 20 || parts.some(x => x === "" || !isFinite(Number(x)) || Number(x) < 0)) {
    m.className = "msg err"; m.textContent = "Check the numbers. Slot prices must be comma separated, up to 20 slots."; return;
  }
  m.className = "msg"; m.textContent = "Saving...";
  const rows = [{ key: "account_fee", value: String(fee) }, { key: "slot_prices", value: parts.join(",") }, { key: "support_email", value: $("cMail").value.trim() }, { key: "usd_inr", value: String(Number($("cRate").value)) }, { key: "banner_text", value: $("cBan").value.trim() }, { key: "banner_link", value: $("cBanLink").value.trim() }];
  const r = await sb.from("settings").upsert(rows).select("key");
  if (r.error || !r.data || !r.data.length) { m.className = "msg err"; m.textContent = "Could not save. Make sure the latest SQL was run."; return; }
  await loadSettings();
  m.className = "msg good"; m.textContent = "Settings saved.";
});

async function adminSlots(){
  const { data, error } = await sb.from("slots").select("id,rank,listing_id,starts_at,ends_at")
    .gt("ends_at", new Date().toISOString()).order("rank").order("starts_at");
  if (error) throw error;
  if (!data.length) return '<div class="empty">No live or upcoming slots.</div>';
  const tm = await titleMap(data.map(x => x.listing_id));
  return data.map(x => `<div class="mine">
    <div class="mrow"><strong>Rank ${esc(x.rank)}: ${esc((tm[x.listing_id] || {}).title || "Listing")}</strong></div>
    <div class="meta"><span>${esc(fmtDate(x.starts_at))} to ${esc(fmtDate(x.ends_at))}</span></div>
    <div class="row">${btn("Remove slot", "unslot", x.id, "", "ghost")}</div></div>`).join("");
}

async function adminReports(){
  const { data, error } = await sb.from("reports").select("id,listing_id,reporter_id,reason,created_at")
    .order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  if (!data.length) return '<div class="empty">No reports.</div>';
  const [em, tm] = await Promise.all([emailMap(data.map(r => r.reporter_id)), titleMap(data.map(r => r.listing_id))]);
  return data.map(r => {
    const l = tm[r.listing_id] || {};
    return `<div class="mine">
      <div class="mrow"><strong>${esc(l.title || "Listing")}</strong><span class="tag">${esc(STATUS[l.status] || l.status || "")}</span></div>
      <p class="desc" style="margin:6px 0">${esc(r.reason || "No reason given.")}</p>
      <div class="meta"><span>By ${esc(em[r.reporter_id] || "unknown")}</span><span>${esc(fmtDate(r.created_at))}</span></div>
      <div class="row">${l.status !== "hidden" ? btn("Hide listing", "status", r.listing_id, "hidden") : ""}${btn("Dismiss report", "dismiss", r.id, "", "ghost")}</div></div>`;
  }).join("");
}

document.addEventListener("click", async e => {
  const tb = e.target.closest("#adminTabs .chip");
  if (tb) { adminTab = tb.dataset.tab; $("adminMsg").textContent = ""; renderAdmin(); return; }
  if (e.target.closest("#aSearch")) { adminQuery = $("aQ").value.trim(); renderAdmin(); return; }
  const b = e.target.closest("[data-a]");
  if (!b || !isAdmin) return;
  const a = b.dataset.a, id = b.dataset.id, v = b.dataset.v, m = $("adminMsg");
  b.disabled = true; m.className = "msg"; m.textContent = "Working...";
  let error = null;
  if (a === "status") ({ error } = await run(sb.from("listings").update({ status: v }).eq("id", id)));
  else if (a === "verify") ({ error } = await run(sb.from("listings").update({ verified: v === "true" }).eq("id", id)));
  else if (a === "paid") ({ error } = await run(sb.from("profiles").update({ is_paid: v === "true" }).eq("id", id)));
  else if (a === "reject") ({ error } = await run(sb.from("slot_requests").update({ status: "rejected" }).eq("id", id)));
  else if (a === "dismiss") ({ error } = await run(sb.from("reports").delete().eq("id", id)));
  else if (a === "unslot") {
    if (!confirm("Remove this slot?")) { b.disabled = false; m.textContent = ""; return; }
    ({ error } = await run(sb.from("slots").delete().eq("id", id)));
  }
  else if (a === "slot") {
    ({ error } = await run(sb.from("slots").insert({ rank: Number(v), listing_id: b.dataset.listing, starts_at: b.dataset.start, ends_at: b.dataset.end })));
    if (!error) ({ error } = await run(sb.from("slot_requests").update({ status: "approved" }).eq("id", id)));
  }
  if (error) {
    console.error(error);
    m.className = "msg err";
    m.textContent = "Could not save: " + (error.message || "unknown error");
    b.disabled = false; return;
  }
  m.className = "msg good"; m.textContent = "Done.";
  await renderAdmin(); load();
});
document.addEventListener("change", e => {
  if (e.target.id === "aStatus") { adminStatus = e.target.value; renderAdmin(); }
});

/* AppHaat: Buyer Demand Board. Buyers post what they want to buy, sellers with a matching listing contact them. */
let demands = [], myDemandIds = new Set(), demTab = "all", demType = "all";
const DEM_TYPES = { any: "Any type", website: "Website", android: "Android app", ios: "iOS app" };
const typeFits = (t, l) => t === "any" || (t === "website" ? l.type === "website" : l.type === "app" && (l.platform === t || l.platform === "cross"));

async function loadDemands(){
  const { data } = await sb.from("demand_board").select("*").order("created_at", { ascending: false }).limit(60);
  demands = data || [];
  myDemandIds = new Set();
  if (user) { const r = await sb.from("demands").select("id").eq("user_id", user.id); (r.data || []).forEach(x => myDemandIds.add(x.id)); }
  renderDemandPreview();
}

function demandCard(d, full){
  const budget = (d.budget_min > 0 ? cm(d.budget_min, d.currency) + " to " : "Up to ") + cm(d.budget_max, d.currency);
  return `<div class="mine">
    <div class="mrow"><strong>${esc(d.title)}</strong><span class="tag">${esc(DEM_TYPES[d.type] || "Any type")}</span></div>
    <div style="font-size:18px;font-weight:600">${esc(budget)}</div>
    <div class="hint">${d.category ? esc(d.category) + " &middot; " : ""}${esc(timeAgo(d.created_at))} &middot; ${d.responses} ${d.responses === 1 ? "response" : "responses"}</div>
    ${d.keywords ? `<div class="hint">Looking for: ${esc(d.keywords)}</div>` : ""}
    ${full && d.details ? `<div class="desc hint">${esc(d.details)}</div>` : ""}
    <div class="row">${myDemandIds.has(d.id) ? '<span class="tag">Your request</span>' : `<button class="btn small demRespond" data-id="${esc(d.id)}">I have this</button>`}</div></div>`;
}
function renderDemandPreview(){
  $("demandPreview").innerHTML = demands.length ? demands.slice(0, 3).map(d => demandCard(d, false)).join("")
    : '<div class="empty">No requests yet. Tell sellers what you want to buy.</div>';
}

async function openDemands(){
  if (!$("demandsDlg").open) $("demandsDlg").showModal();
  $("demandsBody").innerHTML = '<div class="empty">Loading...</div>';
  await loadDemands();
  const tabs = `<div class="chips" style="margin-bottom:10px"><button class="chip demTab" data-tab="all" aria-pressed="${demTab === "all"}">All requests</button><button class="chip demTab" data-tab="mine" aria-pressed="${demTab === "mine"}">My requests</button></div>`;
  if (demTab === "mine") {
    if (!user) { $("demandsBody").innerHTML = tabs + '<div class="empty">Log in to see your requests.</div>'; return; }
    const [r, c] = await Promise.all([sb.from("demands").select("*").eq("user_id", user.id).order("created_at", { ascending: false }), sb.from("demand_responses").select("demand_id")]);
    const cnt = {}; (c.data || []).forEach(x => { cnt[x.demand_id] = (cnt[x.demand_id] || 0) + 1; });
    $("demandsBody").innerHTML = tabs + ((r.data || []).map(d => {
      const live = d.status === "open" && new Date(d.expires_at) > new Date();
      return `<div class="mine"><div class="mrow"><strong>${esc(d.title)}</strong><span class="tag">${live ? "Open" : "Closed"}</span></div>
        <div class="hint">${esc((d.budget_min > 0 ? cm(d.budget_min, d.currency) + " to " : "Up to ") + cm(d.budget_max, d.currency))} &middot; ${cnt[d.id] || 0} responses &middot; ${esc(timeAgo(d.created_at))}</div>
        <div class="row">${live ? `<button class="btn small ghost demClose" data-id="${esc(d.id)}">Close request</button>` : ""}<button class="btn small ghost" data-open-inbox>Messages</button></div></div>`;
    }).join("") || '<div class="empty">You have not posted a request yet.</div>');
    return;
  }
  const chips = `<div class="chips" style="margin-bottom:10px">${["all", "website", "android", "ios"].map(t => `<button class="chip demType" data-t="${t}" aria-pressed="${demType === t}">${t === "all" ? "All" : DEM_TYPES[t] + "s"}</button>`).join("")}</div>`;
  const list = demands.filter(d => demType === "all" || d.type === demType || d.type === "any");
  $("demandsBody").innerHTML = tabs + `<div class="row" style="margin:0 0 10px"><button class="btn gold small" id="demandPost2">Post what you want to buy</button></div>` + chips +
    (list.map(d => demandCard(d, true)).join("") || '<div class="empty">No requests match. Try another type.</div>');
}

function openDemandForm(){
  if (!user) { openAuth("login", "Log in to post a request."); return; }
  $("demForm").innerHTML = `<div class="dlg-head"><h2>What do you want to buy?</h2><button class="x" data-close aria-label="Close">&times;</button></div>
    <label for="dTitle">Your request</label><input class="f" id="dTitle" maxlength="100" placeholder="e.g. WordPress blog under 20,000">
    <label for="dType">Type</label><select class="f" id="dType">${Object.keys(DEM_TYPES).map(k => `<option value="${k}">${esc(DEM_TYPES[k])}</option>`).join("")}</select>
    <label for="dCat">Category (optional)</label><select class="f" id="dCat"><option value="">Any category</option>${CATEGORIES.map(c => `<option>${esc(c)}</option>`).join("")}</select>
    <label for="dKeys">Keywords (optional, separate with commas)</label><input class="f" id="dKeys" maxlength="100" placeholder="WordPress, blog, travel">
    <label for="dCur">Currency</label><select class="f" id="dCur"><option value="INR">Indian Rupee (&#8377;)</option><option value="USD">US Dollar ($)</option></select>
    <label for="dMax">Maximum budget</label><input class="f" id="dMax" type="number" inputmode="decimal" min="0" step="any">
    <label for="dMin">Minimum budget (optional)</label><input class="f" id="dMin" type="number" inputmode="decimal" min="0" step="any">
    <label for="dDetails">Details (optional)</label><textarea class="f" id="dDetails" maxlength="1000" placeholder="Traffic, revenue, age or anything else that matters to you"></textarea>
    <div class="msg" id="dMsg" role="status" aria-live="polite"></div>
    <div class="row"><button class="btn" id="dGo">Post request</button></div>
    <div class="safe">Sellers with a matching listing are notified. They contact you in your Inbox. Your request stays open for 30 days.</div>`;
  if (!$("demandFormDlg").open) $("demandFormDlg").showModal();
}

async function openRespond(id){
  if (!user) { openAuth("login", "Log in to contact the buyer."); return; }
  const d = demands.find(x => x.id === id);
  if (!d) return;
  $("respBody").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("respondDlg").open) $("respondDlg").showModal();
  const { data } = await sb.from("listings").select("id,title,price,currency,type,platform").eq("owner_id", user.id).eq("status", "approved");
  const mine = data || [];
  if (!mine.length) { $("respBody").innerHTML = '<div class="empty">You need a live listing to respond. Tap Sell to add one.</div>'; return; }
  const fit = (l) => typeFits(d.type, l) && convert(l.price, l.currency || "USD") <= convert(d.budget_max, d.currency);
  mine.sort((a, b) => fit(b) - fit(a));
  $("respBody").innerHTML = `<p><b>${esc(d.title)}</b><br><span class="hint">Budget: up to ${esc(cm(d.budget_max, d.currency))}</span></p>
    <label for="rdList">Which of your listings fits?</label>
    <select class="f" id="rdList" data-did="${esc(d.id)}">${mine.map(l => `<option value="${esc(l.id)}">${esc(l.title)} (${esc(cm(l.price, l.currency))})${fit(l) ? " - matches" : ""}</option>`).join("")}</select>
    <label for="rdMsg">Message to the buyer (optional)</label><textarea class="f" id="rdMsg" maxlength="500" placeholder="Hi, I have a listing that matches your request."></textarea>
    <div class="msg" id="rdOut" role="status" aria-live="polite"></div>
    <div class="row"><button class="btn" id="rdGo">Contact the buyer</button></div>`;
}

document.addEventListener("click", async e => {
  const t = e.target;
  if (t.closest("#demandAll") || t.closest("#footDemand") || t.closest("#pgoDemand")) { if (t.closest("#pgoDemand")) $("profDlg").close(); if (t.closest("#footDemand")) e.preventDefault(); demTab = "all"; openDemands(); return; }
  if (t.closest("#demandPost") || t.closest("#demandPost2")) { openDemandForm(); return; }
  const rs = t.closest(".demRespond"); if (rs) { openRespond(rs.dataset.id); return; }
  const tb = t.closest(".demTab"); if (tb) { demTab = tb.dataset.tab; openDemands(); return; }
  const ty = t.closest(".demType"); if (ty) { demType = ty.dataset.t; openDemands(); return; }
  if (t.closest("[data-open-inbox]")) { $("demandsDlg").close(); openInbox(); return; }
  const cl = t.closest(".demClose");
  if (cl) {
    if (!confirm("Close this request? Sellers will no longer see it.")) return;
    const r = await sb.from("demands").update({ status: "closed" }).eq("id", cl.dataset.id).select("id");
    toast(r.error || !r.data.length ? "Could not close the request." : "Request closed."); loadDemands(); openDemands();
    return;
  }
  if (t.closest("#dGo")) {
    const m = $("dMsg"), title = $("dTitle").value.trim(), max = Number($("dMax").value), min = $("dMin").value === "" ? null : Number($("dMin").value);
    m.className = "msg err";
    if (title.length < 5) { m.textContent = "Write what you want to buy (at least 5 letters)."; return; }
    if (!(max > 0)) { m.textContent = "Enter your maximum budget."; return; }
    if (min !== null && (!(min >= 0) || min > max)) { m.textContent = "The minimum budget must be between 0 and your maximum."; return; }
    $("dGo").disabled = true; m.className = "msg"; m.textContent = "Posting...";
    const { error } = await sb.from("demands").insert({ user_id: user.id, title, type: $("dType").value, category: $("dCat").value || null, keywords: $("dKeys").value.trim() || null, currency: $("dCur").value, budget_max: max, budget_min: min, details: $("dDetails").value.trim() || null });
    $("dGo").disabled = false;
    if (error) { m.className = "msg err"; m.textContent = error.message; return; }
    $("demandFormDlg").close(); toast("Request posted. Sellers with matching listings are being notified.");
    demTab = "mine"; openDemands();
    return;
  }
  if (t.closest("#rdGo")) {
    const m = $("rdOut"); $("rdGo").disabled = true; m.className = "msg"; m.textContent = "Sending...";
    const { error } = await sb.rpc("respond_to_demand", { did: $("rdList").dataset.did, lid: $("rdList").value, msg: $("rdMsg").value.trim() || null });
    $("rdGo").disabled = false;
    if (error) { m.className = "msg err"; m.textContent = error.message; return; }
    $("respondDlg").close(); $("demandsDlg").close(); toast("Sent. The buyer can reply in your Inbox."); openInbox();
  }
});

loadDemands();

/* AppHaat: make an offer, then accept, decline or counter */
const OFFER_DAYS = 7;
const cm = (n, cur) => (cur === "INR" ? "\u20B9" : "$") + Number(n).toLocaleString(cur === "INR" ? "en-IN" : "en-US", { maximumFractionDigits: 2 });
const OFFER_STATUS = { pending: "Waiting", accepted: "Accepted", rejected: "Declined", countered: "Countered", withdrawn: "Withdrawn", expired: "Expired" };
const stale = (o) => o.status === "pending" && Date.now() - new Date(o.created_at).getTime() > OFFER_DAYS * 864e5;
const pctOf = (a, ask) => (ask > 0 ? Math.round(a * 100 / ask) : 0);
let offerFor = null;

async function openOfferDialog(l){
  if (!user) { $("detDlg").close(); openAuth("login", "Log in to make an offer."); return; }
  if (l.owner_id === user.id) { toast("This is your own listing."); return; }
  offerFor = l;
  $("offerBody").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("offerDlg").open) $("offerDlg").showModal();
  const { data } = await sb.from("offers").select("*").eq("listing_id", l.id).eq("buyer_id", user.id).eq("status", "pending");
  const open = (data || []).find(o => !stale(o));
  if (open) {
    $("offerBody").innerHTML = `<p>You already have an offer on this listing: <b>${esc(cm(open.amount, open.currency))}</b>. ${open.by_seller ? "The seller sent you a counter offer." : "It is waiting for the seller."}</p><div class="row"><button class="btn" id="offSeeAll">See my offers</button></div>`;
    return;
  }
  const cur = l.currency || "USD";
  $("offerBody").innerHTML = `<p>Asking price: <b>${esc(cm(l.price, cur))}</b></p>
    <label for="offAmt">Your offer (${esc(cur)})</label><input class="f" id="offAmt" type="number" inputmode="decimal" min="0" step="any">
    <div class="hint" id="offPct"></div>
    <label for="offMsg">Message (optional)</label><textarea class="f" id="offMsg" maxlength="300" placeholder="Why this price? When can you pay?"></textarea>
    <div class="msg" id="offOut" role="status" aria-live="polite"></div>
    <div class="row"><button class="btn" id="offGo">Send offer</button></div>
    <div class="safe">The seller can accept, decline or counter your offer. It stays open for ${OFFER_DAYS} days.</div>`;
}

async function openOffers(){
  if (!user) { openAuth("login"); return; }
  $("offersBody").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("offersDlg").open) $("offersDlg").showModal();
  const { data, error } = await sb.from("offers").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) { $("offersBody").innerHTML = '<div class="empty">Could not load offers. Please try again.</div>'; return; }
  if (!data.length) { $("offersBody").innerHTML = '<div class="empty">No offers yet. Open a listing and tap Make an offer, or wait for offers on your own listings.</div>'; return; }
  const lr = await sb.from("listings").select("id,title,price,currency,owner_id,status").in("id", [...new Set(data.map(o => o.listing_id))]);
  const lm = {}; (lr.data || []).forEach(x => { lm[x.id] = x; });
  const nm = await nameMap(data.map(o => o.buyer_id));
  const groups = {};
  data.forEach(o => { (groups[o.listing_id + "|" + o.buyer_id] = groups[o.listing_id + "|" + o.buyer_id] || []).push(o); });
  $("offersBody").innerHTML = Object.values(groups).map(list => offerCard(list, lm, nm)).join("");
}

function offerCard(list, lm, nm){
  const o = list[0], l = lm[o.listing_id] || {}, cur = o.currency, mine = l.owner_id === user.id;
  const status = stale(o) ? "expired" : o.status;
  const tagText = l.status === "sold" && status === "accepted" ? "Sold" : OFFER_STATUS[status];
  const makerIsMe = (o.by_seller ? l.owner_id : o.buyer_id) === user.id;
  const buyerName = nm[o.buyer_id] || "Buyer";
  const who = o.by_seller ? (mine ? "Your counter offer" : "Seller's counter offer") : (mine ? buyerName + "'s offer" : "Your offer");
  let acts = "";
  if (status === "pending" && !makerIsMe) acts = `<button class="btn small offAct" data-act="accept" data-oid="${esc(o.id)}" data-amt="${esc(cm(o.amount, cur))}">Accept</button><button class="btn small ghost offCounter" data-oid="${esc(o.id)}">Counter</button><button class="btn small ghost offAct" data-act="reject" data-oid="${esc(o.id)}">Decline</button>`;
  else if (status === "pending") acts = `<span class="hint">Waiting for the other side.</span><button class="btn small ghost offAct" data-act="withdraw" data-oid="${esc(o.id)}">Withdraw</button>`;
  else if (status === "accepted") acts = `<div class="safe">Accepted. Agree the next steps in chat. For bigger amounts use a safe method such as Escrow.com.</div>${mine && l.status !== "sold" ? `<button class="btn small gold offSold" data-oid="${esc(o.id)}" data-amt="${esc(cm(o.amount, cur))}" data-title="${esc(l.title || "Listing")}">Mark as sold</button>` : ""}<button class="btn small offChat" data-l="${esc(o.listing_id)}" data-b="${esc(o.buyer_id)}" data-title="${esc(l.title || "Listing")}" data-who="${esc(mine ? buyerName : "the seller")}">Open chat</button>`;
  const hist = list.slice(1).map(h => `<div class="hint">${esc(h.by_seller ? "Seller" : (mine ? buyerName : "You"))}: ${esc(cm(h.amount, h.currency))} &middot; ${esc(OFFER_STATUS[stale(h) ? "expired" : h.status])} &middot; ${esc(timeAgo(h.created_at))}</div>`).join("");
  return `<div class="mine">
    <div class="mrow"><strong>${esc(l.title || "Listing")}</strong><span class="tag">${esc(tagText)}</span></div>
    <div class="hint">${esc(who)}</div>
    <div style="font-size:20px;font-weight:600;margin:4px 0">${esc(cm(o.amount, cur))}${l.price ? ` <span class="hint">(${pctOf(o.amount, l.price)}% of the ${esc(cm(l.price, cur))} asking price)</span>` : ""}</div>
    ${o.message ? `<div class="desc hint">${esc(o.message)}</div>` : ""}
    <div class="row offActs">${acts}</div>
    ${hist ? `<details class="inq"><summary>History (${list.length - 1})</summary>${hist}</details>` : ""}</div>`;
}

async function answerOffer(oid, act, amt){
  const { error } = await sb.rpc("respond_offer", { oid, act, amt: amt ?? null, msg: null });
  if (error) { toast(error.message); return false; }
  checkNotifs(); openOffers();
  return true;
}

document.addEventListener("input", e => {
  if (e.target.id !== "offAmt" || !offerFor) return;
  const p = pctOf(Number(e.target.value), Number(offerFor.price));
  $("offPct").textContent = e.target.value ? `That is ${p}% of the asking price.${p < 50 ? " Very low offers are often ignored." : ""}` : "";
});

document.addEventListener("click", async e => {
  const t = e.target;
  const ob = t.closest("#offerBtn");
  if (ob) { const l = findListing(ob.dataset.id); if (l) openOfferDialog(l); return; }
  if (t.closest("#pgoOffers") || t.closest("#offSeeAll")) { $("profDlg").close(); $("offerDlg").close(); openOffers(); return; }
  if (t.closest("#offGo")) {
    const amt = Number($("offAmt").value), m = $("offOut");
    m.className = "msg err";
    if (!(amt > 0)) { m.textContent = "Enter your offer amount."; return; }
    $("offGo").disabled = true; m.className = "msg"; m.textContent = "Sending...";
    const { error } = await sb.rpc("make_offer", { lid: offerFor.id, amt, msg: $("offMsg").value.trim() || null });
    $("offGo").disabled = false;
    if (error) { m.className = "msg err"; m.textContent = error.message; return; }
    $("offerDlg").close(); $("detDlg").close();
    toast("Offer sent. You will be notified when the seller responds.");
    openOffers();
    return;
  }
  const a = t.closest(".offAct");
  if (a) {
    const sure = { accept: `Accept the offer of ${a.dataset.amt}?`, reject: "Decline this offer?", withdraw: "Withdraw your offer?" }[a.dataset.act];
    if (confirm(sure)) answerOffer(a.dataset.oid, a.dataset.act);
    return;
  }
  const c = t.closest(".offCounter");
  if (c) {
    c.closest(".offActs").innerHTML = `<input class="f" id="ctrAmt" type="number" inputmode="decimal" min="0" step="any" placeholder="Your counter amount"><button class="btn small offCounterSend" data-oid="${esc(c.dataset.oid)}">Send counter offer</button>`;
    return;
  }
  const s = t.closest(".offCounterSend");
  if (s) {
    const amt = Number($("ctrAmt").value);
    if (!(amt > 0)) { toast("Enter a valid amount."); return; }
    answerOffer(s.dataset.oid, "counter", amt);
    return;
  }
  const ch = t.closest(".offChat");
  if (ch) { $("offersDlg").close(); openThread(ch.dataset.l, ch.dataset.b, ch.dataset.title, ch.dataset.who); }
});

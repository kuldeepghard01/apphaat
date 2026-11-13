/* AppHaat: inbox and chat between buyers and sellers */
let thread = null;

async function nameMap(ids){
  const list = [...new Set(ids.filter(Boolean))], m = {};
  if (!list.length) return m;
  const { data } = await sb.from("public_profiles").select("id,display_name").in("id", list);
  (data || []).forEach(x => { m[x.id] = x.display_name; });
  return m;
}

async function openInbox(){
  if (!user) { openAuth("login"); return; }
  thread = null;
  $("inboxTitle").textContent = "Inbox";
  $("inboxBody").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("inboxDlg").open) $("inboxDlg").showModal();
  const { data, error } = await sb.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(300);
  if (error || !data.length) { $("inboxBody").innerHTML = '<div class="empty">No conversations yet. Tap Contact seller on a listing to start one.</div>'; return; }
  const first = {};
  data.forEach(m => { const k = m.listing_id + "|" + m.buyer_id; if (!first[k]) first[k] = m; });
  const list = Object.values(first);
  const lr = await sb.from("listings").select("id,title,owner_id").in("id", [...new Set(list.map(m => m.listing_id))]);
  const lm = {}; (lr.data || []).forEach(x => { lm[x.id] = x; });
  const other = (m) => ((lm[m.listing_id] || {}).owner_id === user.id ? m.buyer_id : (lm[m.listing_id] || {}).owner_id);
  const nm = await nameMap(list.map(other));
  $("inboxBody").innerHTML = list.map(m => {
    const l = lm[m.listing_id] || {}, who = nm[other(m)] || (l.owner_id === user.id ? "Buyer" : "Seller");
    return `<button class="mine convo" data-l="${esc(m.listing_id)}" data-b="${esc(m.buyer_id)}" data-title="${esc(l.title || "Listing")}" data-who="${esc(who)}">
      <div class="mrow"><strong>${esc(l.title || "Listing")}</strong><span class="hint">${esc(timeAgo(m.created_at))}</span></div>
      <div class="hint">${esc(who)}: ${esc(m.body.slice(0, 80))}</div></button>`;
  }).join("");
}

async function openThread(listingId, buyerId, title, who){
  thread = { listingId, buyerId };
  $("inboxTitle").textContent = title;
  $("inboxBody").innerHTML = `<button class="linkbtn" id="inboxBack">&larr; All conversations</button>
    <div class="hint">Chat with ${esc(who)}</div><div class="thread" id="threadBox"></div>
    <textarea class="f" id="chatText" maxlength="1000" placeholder="Write a message"></textarea>
    <div class="row"><button class="btn" id="chatSend">Send</button></div>`;
  if (!$("inboxDlg").open) $("inboxDlg").showModal();
  await loadThread();
}
async function loadThread(){
  if (!thread) return;
  const { data } = await sb.from("chat_messages").select("*").eq("listing_id", thread.listingId).eq("buyer_id", thread.buyerId).order("created_at");
  const box = $("threadBox"); if (!box) return;
  box.innerHTML = (data || []).map(m => `<div class="bubble ${m.sender_id === user.id ? "me" : "them"}">${esc(m.body)}<div class="hint" style="color:inherit;opacity:.7">${esc(timeAgo(m.created_at))}</div></div>`).join("") || '<div class="empty">No messages yet.</div>';
  box.scrollTop = box.scrollHeight;
}
setInterval(() => { if (thread && $("inboxDlg").open) loadThread(); }, 10000);

document.addEventListener("click", async e => {
  const c = e.target.closest(".convo");
  if (c) { openThread(c.dataset.l, c.dataset.b, c.dataset.title, c.dataset.who); return; }
  if (e.target.closest("#inboxBack")) { openInbox(); return; }
  if (e.target.closest("#chatSend")) {
    const t = $("chatText"), body = t.value.trim();
    if (!body || !thread) return;
    $("chatSend").disabled = true;
    const { error } = await sb.from("chat_messages").insert({ listing_id: thread.listingId, buyer_id: thread.buyerId, sender_id: user.id, body });
    $("chatSend").disabled = false;
    if (error) { toast("Could not send. Please try again."); return; }
    t.value = ""; loadThread();
  }
});

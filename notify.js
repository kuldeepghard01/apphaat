/* AppHaat: notifications (bell), view counting and small helpers */
let notifTimer = null;
function timeAgo(x){
  const s = (Date.now() - new Date(x).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + " min ago";
  if (s < 86400) return Math.floor(s / 3600) + " h ago";
  return Math.floor(s / 86400) + " d ago";
}
function startNotifs(){ stopNotifs(); checkNotifs(); subscribeNotices(); notifTimer = setInterval(checkNotifs, 60000); }
function stopNotifs(){
  if (notifTimer) clearInterval(notifTimer);
  notifTimer = null;
  if (noticeChannel) { sb.removeChannel(noticeChannel); noticeChannel = null; }
  document.title = BASE_TITLE;
}
async function checkNotifs(){
  if (!user || !$("bellDot")) return;
  const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false);
  const d = $("bellDot"); d.hidden = !count; d.textContent = count > 99 ? "99+" : String(count || 0);
  document.title = (count ? "(" + count + ") " : "") + BASE_TITLE;
}
async function openNotifs(){
  if (!user) { openAuth("login"); return; }
  $("notifList").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("notifDlg").open) $("notifDlg").showModal();
  paintPrefs();
  const { data, error } = await sb.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (error || !data.length) { $("notifList").innerHTML = '<div class="empty">No notifications yet.</div>'; return; }
  $("notifList").innerHTML = data.map(n => `<div class="mine notif ${n.read ? "" : "unread"}" role="button" tabindex="0" data-nid="${esc(n.id)}" data-kind="${esc(n.kind)}" data-lid="${esc(n.listing_id || "")}">
    <div class="mrow"><strong>${esc(n.title)}</strong><span class="hint">${esc(timeAgo(n.created_at))}</span></div>${n.body ? `<div class="hint">${esc(n.body)}</div>` : ""}</div>`).join("");
}
$("notifRead").onclick = async () => {
  await sb.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  checkNotifs(); openNotifs();
};
document.addEventListener("click", async e => {
  const el = e.target.closest(".notif");
  if (!el) return;
  if (el.classList.contains("unread")) { sb.from("notifications").update({ read: true }).eq("id", el.dataset.nid).then(checkNotifs); }
  $("notifDlg").close();
  const k = el.dataset.kind, lid = el.dataset.lid;
  if (k === "message" || k === "contact") openInbox();
  else if (["review", "report", "slotreq", "paymentreq", "user"].includes(k) && isAdmin) openAdmin();
  else if (k === "view" || k === "interest") openDashboard();
  else if (k === "listing" || k === "slot") openMine();
  else if (lid && findListing(lid)) openDetail(lid);
});

/* Count a view once per visitor session. Owners opening their own listing do not count. */
async function recordView(l){
  if (user && l.owner_id === user.id) return;
  let seen = [];
  try { seen = JSON.parse(sessionStorage.getItem("apphaat_seen") || "[]"); } catch (e) {}
  if (seen.includes(l.id)) return;
  seen.push(l.id);
  try { sessionStorage.setItem("apphaat_seen", JSON.stringify(seen)); } catch (e) {}
  await sb.from("listing_views").insert({ listing_id: l.id, viewer_id: user ? user.id : null });
}

/* Instant alerts: the server pushes each new notification to the open site */
let noticeChannel = null;
const BASE_TITLE = document.title;
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

function subscribeNotices(){
  if (noticeChannel || !user) return;
  noticeChannel = sb.channel("notices-" + user.id)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + user.id }, p => onNotice(p.new))
    .subscribe();
}
function onNotice(n){
  checkNotifs();
  if ($("notifDlg").open) openNotifs();
  if (document.hidden && !pushActive && "Notification" in window && Notification.permission === "granted" && navigator.serviceWorker) {
    navigator.serviceWorker.ready.then(reg => reg.showNotification(n.title, { body: n.body || "", tag: n.id })).catch(() => {});
  } else {
    toast(n.body ? n.title + ": " + n.body : n.title);
  }
}

async function paintPrefs(){
  const [r, ph] = await Promise.all([sb.from("profiles").select("notify_views").eq("id", user.id).maybeSingle(), pushPrefsHtml()]);
  const on = !r.data || r.data.notify_views !== false;
  $("notifPrefs").innerHTML = ph + `<label class="chk" style="margin-top:8px"><input type="checkbox" id="prefViews" ${on ? "checked" : ""}> Notify me when someone views my listing</label>`;
}
document.addEventListener("change", async e => {
  if (e.target.id !== "prefViews") return;
  const r = await sb.from("profiles").update({ notify_views: e.target.checked }).eq("id", user.id);
  toast(r.error ? "Could not save this setting." : "Saved.");
});

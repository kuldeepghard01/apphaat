/* AppHaat: real push alerts (they arrive even when the site is closed) and install help */
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
let installEvt = null, pushActive = false, pushSyncedFor = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; });

const pushOk = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
function keyBytes(s){
  const raw = atob((s + "=".repeat((4 - s.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function pushState(){ // on, off, blocked, needs-install or unsupported
  if (isIOS && !isStandalone) return "needs-install";
  if (!pushOk()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) ? "on" : "off";
}

async function enablePush(){
  if (await Notification.requestPermission() !== "granted") return false;
  const { data, error } = await sb.functions.invoke("push-config");
  if (error || !data || !data.publicKey) throw new Error("Push is not set up on the server yet.");
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ||
    await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(data.publicKey) });
  const j = sub.toJSON();
  const r = await sb.from("push_subscriptions").upsert({ user_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: "endpoint" });
  if (r.error) throw r.error;
  pushActive = true;
  return true;
}
async function disablePush(){
  if (!pushOk()) return;
  const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
  if (sub) { await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
  pushActive = false; pushSyncedFor = null;
}
/* After login on a device that already allowed alerts, connect it again quietly */
function syncPush(){
  if (!user || pushSyncedFor === user.id || !pushOk() || (isIOS && !isStandalone)) return;
  if (Notification.permission !== "granted") return;
  pushSyncedFor = user.id;
  enablePush().catch(() => { pushSyncedFor = null; });
}

async function pushPrefsHtml(){
  const s = await pushState();
  pushActive = s === "on";
  const install = installEvt && !isStandalone ? '<div class="row"><button class="btn ghost small" id="installBtn">Install AppHaat on this phone</button></div>' : "";
  if (s === "on") return '<div class="hint ok">Push alerts are on for this device.</div><div class="row"><button class="btn ghost small" id="pushOff">Turn off push alerts</button></div>' + install;
  if (s === "off") return '<button class="btn small" id="pushOn">Turn on push alerts</button><div class="hint">Get alerts even when AppHaat is closed.</div>' + install;
  if (s === "blocked") return '<div class="hint">Alerts are blocked. Allow notifications for this site in your browser settings.</div>' + install;
  if (s === "needs-install") return '<div class="safe">On iPhone: open this site in Safari, tap Share, then Add to Home Screen. Open AppHaat from your Home Screen, log in, and turn on alerts here.</div>';
  return '<div class="hint">Push alerts are not supported in this browser.</div>' + install;
}

document.addEventListener("click", async e => {
  const t = e.target;
  if (t.closest("#pushOn")) {
    try { toast(await enablePush() ? "Push alerts are on." : "Alerts were not allowed."); }
    catch (err) { toast("Could not turn on push alerts. " + (err && err.message ? err.message : "")); console.error(err); }
    paintPrefs();
  } else if (t.closest("#pushOff")) {
    await disablePush(); toast("Push alerts are off."); paintPrefs();
  } else if (t.closest("#installBtn") && installEvt) {
    installEvt.prompt();
  }
});

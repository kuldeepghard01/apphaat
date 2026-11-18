/* AppHaat: keep people logged in. Only the Logout button, or a login the server really cancelled, signs you out. */
const AUTH_KEY = "sb-lsbjpdblcdlrddnrzqax-auth-token";
let authReady = false, loggedOutByUser = false, reconnecting = false, reconnectTries = 0;

/* Ask the browser not to wipe our saved login when the phone is low on storage */
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

const savedLogin = () => { try { return !!localStorage.getItem(AUTH_KEY); } catch (e) { return false; } };

/* A short log of login events, so a login problem can be understood later (Profile > Login log) */
function authLog(ev, session){
  try {
    const log = JSON.parse(localStorage.getItem("apphaat_auth_log") || "[]");
    log.push(new Date().toISOString().slice(5, 19).replace("T", " ") + " " + ev + (session ? " (session)" : " (no session)") + (savedLogin() ? " [saved login]" : " [nothing saved]"));
    localStorage.setItem("apphaat_auth_log", JSON.stringify(log.slice(-14)));
  } catch (e) {}
}

/* Decide what to show: "in", "out", or "wait" (a saved login exists but the network is slow) */
function authDecision(ev, session){
  authLog(ev, session);
  if (session) { authReady = true; reconnectTries = 0; return "in"; }
  if (ev === "SIGNED_OUT") {
    authReady = true;
    if (!loggedOutByUser) toast("Your session ended, so you were signed out. Please log in again.");
    loggedOutByUser = false;
    return "out";
  }
  if (savedLogin() && reconnectTries < 6) {
    if (!authReady) $("who").innerHTML = '<button class="btn small" id="sellBtn">Sell</button><span class="hint">Signing you in...</span>';
    if ($("sellBtn")) $("sellBtn").onclick = openSell;
    reconnect();
    return "wait";
  }
  authReady = true;
  return "out";
}

/* The saved login is still there, so try again for a few seconds instead of showing "logged out" */
async function reconnect(){
  if (reconnecting) return;
  reconnecting = true;
  while (reconnectTries < 6 && savedLogin()) {
    reconnectTries++;
    await new Promise(r => setTimeout(r, 2500));
    const { data } = await sb.auth.getSession();
    authLog("RETRY " + reconnectTries, data.session);
    if (data.session) { reconnecting = false; reconnectTries = 0; authReady = true; applySession(data.session); return; }
  }
  reconnecting = false; authReady = true; applySession(null);
}

document.addEventListener("click", e => {
  if (!e.target.closest("#pgoLog")) return;
  let log = "";
  try { log = JSON.parse(localStorage.getItem("apphaat_auth_log") || "[]").join("\n"); } catch (err) {}
  alert("Login log (newest last). Share this with support if you keep getting logged out:\n\n" + (log || "No events yet."));
});

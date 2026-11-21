/* AppHaat: login, sign up, header buttons */
/* Auth */
function openAuth(mode, note){
  setMode(mode);
  $("authNote").textContent = note || ""; $("authNote").className = "msg";
  $("authMsg").textContent = "";
  paintSocial();
  $("authDlg").showModal();
}
function setMode(m){
  authMode = m;
  const reset = m === "reset";
  $("authTitle").textContent = reset ? "Reset password" : m === "login" ? "Login" : "Sign up";
  $("authGo").textContent = reset ? "Send reset link" : m === "login" ? "Login" : "Create account";
  $("tabLogin").setAttribute("aria-pressed", m === "login");
  $("tabSignup").setAttribute("aria-pressed", m === "signup");
  $("passWrap").hidden = reset; $("authSocial").hidden = reset; $("authOr").hidden = reset || !hasSocial();
  $("forgotBtn").hidden = m !== "login"; $("backLogin").hidden = !reset; $("resetHint").hidden = !reset;
  $("pass").autocomplete = m === "login" ? "current-password" : "new-password";
}
$("tabLogin").onclick = () => setMode("login");
$("tabSignup").onclick = () => setMode("signup");

$("authGo").onclick = async () => {
  const email = $("email").value.trim(), password = $("pass").value;
  const m = $("authMsg"); m.className = "msg err";
  if (authMode === "reset") {
    if (!email) { m.textContent = "Enter your email."; return; }
    $("authGo").disabled = true; m.className = "msg"; m.textContent = "Please wait...";
    const r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    $("authGo").disabled = false;
    if (r.error) { m.className = "msg err"; m.textContent = r.error.message; return; }
    m.className = "msg good"; m.textContent = "If this email has an account, a reset link is on its way. Check your inbox and spam folder.";
    return;
  }
  if (!email || !password) { m.textContent = "Enter both email and password."; return; }
  if (password.length < 6) { m.textContent = "Password must be at least 6 characters."; return; }
  $("authGo").disabled = true; m.className = "msg"; m.textContent = "Please wait...";
  let res;
  if (authMode === "login") res = await sb.auth.signInWithPassword({ email, password });
  else res = await sb.auth.signUp({ email, password });
  $("authGo").disabled = false;
  if (res.error) { m.className = "msg err"; m.textContent = res.error.message; return; }
  if (authMode === "signup" && !res.data.session) {
    m.className = "msg good"; m.textContent = "Account created. Check your email, tap the confirmation link, then log in.";
    return;
  }
  $("authDlg").close(); $("pass").value = "";
  toast("You are logged in.");
};

function paintUser(){
  $("avatarBtn").hidden = !user;
  if (user) {
    $("who").innerHTML = `<button class="btn small" id="sellBtn">Sell</button><button class="btn ghost small" id="wishBtn" aria-label="Wishlist"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button><button class="btn ghost small bell" id="bellBtn" aria-label="Notifications"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/></svg><span class="dot" id="bellDot" hidden></span></button>`;
    $("bellBtn").onclick = openNotifs;
    $("wishBtn").onclick = openWishlist;
    startNotifs(); loadSaved(); syncPush();
  } else {
    $("who").innerHTML = `<button class="btn small" id="sellBtn">Sell</button><button class="btn ghost small" id="loginBtn">Login</button>`;
    $("loginBtn").onclick = () => openAuth("login");
    stopNotifs(); loadSaved();
  }
  $("sellBtn").onclick = openSell;
}
$("avatarBtn").onclick = openProfile;
$("loginBtn").onclick = () => openAuth("login");
$("sellBtn").onclick = openSell;
function applySession(session){
  user = session ? session.user : null;
  const b = document.body;
  b.classList.remove("auth-pending"); b.classList.toggle("in", !!session); b.classList.toggle("out", !session);
  paintUser(); setTimeout(syncAdmin, 0);
  if (session) renderMember();
}
sb.auth.onAuthStateChange((_ev, session) => {
  const d = authDecision(_ev, session);
  if (d !== "wait") applySession(d === "in" ? session : null);
  if (_ev === "PASSWORD_RECOVERY") openNewPassword(true);
});
sb.auth.getSession().then(({ data }) => { if (data.session) { authDecision("GET_SESSION", data.session); applySession(data.session); } });

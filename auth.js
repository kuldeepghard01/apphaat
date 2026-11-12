/* AppHaat: login, sign up, header buttons */
/* Auth */
function openAuth(mode, note){
  setMode(mode);
  $("authNote").textContent = note || ""; $("authNote").className = "msg";
  $("authMsg").textContent = "";
  $("authDlg").showModal();
}
function setMode(m){
  authMode = m;
  $("authTitle").textContent = m === "login" ? "Login" : "Sign up";
  $("authGo").textContent = m === "login" ? "Login" : "Create account";
  $("tabLogin").setAttribute("aria-pressed", m === "login");
  $("tabSignup").setAttribute("aria-pressed", m === "signup");
  $("pass").autocomplete = m === "login" ? "current-password" : "new-password";
}
$("tabLogin").onclick = () => setMode("login");
$("tabSignup").onclick = () => setMode("signup");

$("authGo").onclick = async () => {
  const email = $("email").value.trim(), password = $("pass").value;
  const m = $("authMsg"); m.className = "msg err";
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
  if (user) {
    $("who").innerHTML = `<button class="btn small" id="sellBtn">Sell</button><button class="btn ghost small" id="mineBtn">My listings</button>${isAdmin ? '<button class="btn ghost small" id="adminBtn">Admin</button>' : ""}<button class="btn ghost small" id="logoutBtn">Logout</button>`;
    $("mineBtn").onclick = openMine;
    if (isAdmin) $("adminBtn").onclick = openAdmin;
    $("logoutBtn").onclick = async () => { if (!confirm("Log out of AppHaat?")) return; await sb.auth.signOut(); toast("You are logged out."); };
  } else {
    $("who").innerHTML = `<button class="btn small" id="sellBtn">Sell</button><button class="btn ghost small" id="loginBtn">Login</button>`;
    $("loginBtn").onclick = () => openAuth("login");
  }
  $("sellBtn").onclick = openSell;
}
$("loginBtn").onclick = () => openAuth("login");
$("sellBtn").onclick = openSell;
sb.auth.onAuthStateChange((_ev, session) => { user = session ? session.user : null; paintUser(); setTimeout(syncAdmin, 0); });
sb.auth.getSession().then(({ data }) => { user = data.session ? data.session.user : null; paintUser(); syncAdmin(); });

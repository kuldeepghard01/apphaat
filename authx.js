/* AppHaat: social login (suggested for each visitor), forgot password and change password */
const PROVIDERS = {
  google: { label: "Google", id: "google" }, apple: { label: "Apple", id: "apple" }, github: { label: "GitHub", id: "github" },
  microsoft: { label: "Microsoft", id: "azure" }, facebook: { label: "Facebook", id: "facebook" },
  linkedin: { label: "LinkedIn", id: "linkedin_oidc" }, discord: { label: "Discord", id: "discord" }, twitter: { label: "X (Twitter)", id: "twitter" }
};
const hasSocial = () => AUTH_PROVIDERS.some(k => PROVIDERS[k]);
const lastProvider = () => { try { return localStorage.getItem("apphaat_login") || ""; } catch (e) { return ""; } };

/* Put the most likely choice first: last used, then what suits the device (iPhone: Apple, Android: Google, Windows: Microsoft) */
function suggestOrder(list){
  const ua = navigator.userAgent, last = lastProvider();
  const apple = /iphone|ipad|ipod|macintosh/i.test(ua), android = /android/i.test(ua), windows = /windows/i.test(ua);
  const score = (k, i) => (k === last ? 100 : 0) + (apple && k === "apple" ? 50 : 0) + (android && k === "google" ? 50 : 0) + (windows && k === "microsoft" ? 50 : 0) - i;
  return list.map((k, i) => [k, score(k, i)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
async function paintSocial(){
  await settingsReady;
  const list = suggestOrder(AUTH_PROVIDERS.filter(k => PROVIDERS[k]));
  $("authOr").hidden = !list.length || authMode === "reset";
  $("authSocial").innerHTML = list.map((k, i) => `<button class="btn ghost socBtn" data-p="${k}"><span>Continue with ${esc(PROVIDERS[k].label)}</span>${i === 0 ? `<span class="hint">${k === lastProvider() ? "Last used" : "Suggested for you"}</span>` : ""}</button>`).join("");
}

function openNewPassword(fromEmail){
  $("npMsg").textContent = ""; $("np1").value = ""; $("np2").value = "";
  $("npTitle").textContent = fromEmail ? "Choose a new password" : "Change password";
  $("authDlg").close();
  if (!$("passDlg").open) $("passDlg").showModal();
}
$("npGo").onclick = async () => {
  const a = $("np1").value, b = $("np2").value, m = $("npMsg");
  m.className = "msg err";
  if (a.length < 6) { m.textContent = "Use at least 6 characters."; return; }
  if (a !== b) { m.textContent = "The two passwords do not match."; return; }
  $("npGo").disabled = true;
  const { error } = await sb.auth.updateUser({ password: a });
  $("npGo").disabled = false;
  if (error) { m.textContent = error.message; return; }
  $("passDlg").close(); toast("Password changed.");
};
$("showPass").onchange = () => { $("pass").type = $("showPass").checked ? "text" : "password"; };

document.addEventListener("click", async e => {
  const b = e.target.closest(".socBtn");
  if (b) {
    const p = PROVIDERS[b.dataset.p];
    try { localStorage.setItem("apphaat_login", b.dataset.p); } catch (err) {}
    const { error } = await sb.auth.signInWithOAuth({ provider: p.id, options: { redirectTo: location.origin + location.pathname } });
    if (error) { $("authMsg").className = "msg err"; $("authMsg").textContent = "Could not start login with " + p.label + ". Please try another way."; }
    return;
  }
  if (e.target.closest("#forgotBtn")) { setMode("reset"); return; }
  if (e.target.closest("#backLogin")) { setMode("login"); return; }
  if (e.target.closest("#pgoPass")) { $("profDlg").close(); openNewPassword(false); }
});

/* AppHaat: country, language and currency (chosen automatically, changeable) and the translation engine */
const REGION_KEY = "apphaat_region";
const LANGS = { en: "English", hi: "हिन्दी" };
const COUNTRIES = [
  ["IN", "India", "INR"], ["US", "United States", "USD"], ["GB", "United Kingdom", "GBP"], ["AE", "United Arab Emirates", "AED"],
  ["CA", "Canada", "CAD"], ["AU", "Australia", "AUD"], ["SG", "Singapore", "SGD"], ["DE", "Germany", "EUR"], ["FR", "France", "EUR"],
  ["ES", "Spain", "EUR"], ["IT", "Italy", "EUR"], ["NL", "Netherlands", "EUR"], ["IE", "Ireland", "EUR"], ["PK", "Pakistan", "USD"],
  ["BD", "Bangladesh", "USD"], ["NP", "Nepal", "USD"], ["LK", "Sri Lanka", "USD"], ["SA", "Saudi Arabia", "USD"], ["ZA", "South Africa", "USD"],
  ["NG", "Nigeria", "USD"], ["PH", "Philippines", "USD"], ["MY", "Malaysia", "USD"], ["ID", "Indonesia", "USD"], ["BR", "Brazil", "USD"],
  ["MX", "Mexico", "USD"], ["JP", "Japan", "USD"], ["XX", "Other / International", "USD"]
];
const TZ = {
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
  "America/Phoenix": "US", "America/Anchorage": "US", "Pacific/Honolulu": "US", "America/Toronto": "CA", "America/Vancouver": "CA", "Europe/London": "GB",
  "Europe/Dublin": "IE", "Europe/Berlin": "DE", "Europe/Paris": "FR", "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Amsterdam": "NL",
  "Asia/Dubai": "AE", "Asia/Singapore": "SG", "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Perth": "AU", "Australia/Brisbane": "AU",
  "Asia/Karachi": "PK", "Asia/Dhaka": "BD", "Asia/Kathmandu": "NP", "Asia/Colombo": "LK", "Asia/Riyadh": "SA", "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG", "Asia/Manila": "PH", "Asia/Kuala_Lumpur": "MY", "Asia/Jakarta": "ID", "America/Sao_Paulo": "BR", "America/Mexico_City": "MX", "Asia/Tokyo": "JP"
};
let REGION = { country: "XX", lang: "en", cur: "USD", auto: true };

/* Country comes from the device time zone (no tracking, no IP lookup). Language comes from the browser language. */
function detectRegion(){
  let code = "";
  try { code = TZ[Intl.DateTimeFormat().resolvedOptions().timeZone] || ""; } catch (e) {}
  if (!code) { try { code = new Intl.Locale(navigator.language).region || ""; } catch (e) {} }
  const c = COUNTRIES.find(x => x[0] === code) || COUNTRIES[COUNTRIES.length - 1];
  const hindi = /^hi/i.test(navigator.language || "") && !!I18N.hi;
  return { country: c[0], lang: hindi ? "hi" : "en", cur: c[2], auto: true };
}
function loadRegion(){
  let r = null;
  try { r = JSON.parse(localStorage.getItem(REGION_KEY) || "null"); } catch (e) {}
  REGION = r && CUR[r.cur] && LANGS[r.lang] && COUNTRIES.some(c => c[0] === r.country) ? r : detectRegion();
  DISPLAY = REGION.cur;
}
const saveRegion = () => { try { localStorage.setItem(REGION_KEY, JSON.stringify(REGION)); } catch (e) {} };

function setRegion(p){
  REGION = { ...REGION, ...p, auto: false };
  saveRegion();
  DISPLAY = REGION.cur;
  applyLang(); renderRegionStrip();
  $("fCur").value = DISPLAY;
  if (typeof render === "function") render();
  if (typeof renderPromo === "function") renderPromo();
}
function resetRegion(){
  try { localStorage.removeItem(REGION_KEY); } catch (e) {}
  REGION = detectRegion(); DISPLAY = REGION.cur;
  applyLang(); renderRegionStrip(); $("fCur").value = DISPLAY;
  if (typeof render === "function") render();
  if (typeof renderPromo === "function") renderPromo();
}

function renderRegionStrip(){
  const c = COUNTRIES.find(x => x[0] === REGION.country) || COUNTRIES[COUNTRIES.length - 1];
  $("regionStrip").innerHTML = `<span>\u{1F310} ${esc(c[1])} &middot; ${esc(CUR[REGION.cur][0].trim())} ${esc(REGION.cur)} &middot; ${esc(LANGS[REGION.lang])}</span> <u>Change</u>`;
}

/* ---------- Translation: same page, same layout, only the words change. Anything not translated stays English. ---------- */
const textOrig = new WeakMap(), attrOrig = new WeakMap(), changedText = new Set(), changedEls = new Set();
let applying = false;
const dict = () => I18N[REGION.lang] || null;
function tr(s){
  const d = dict();
  if (!d) return null;
  const k = s.trim().replace(/\s+/g, " ");
  if (!k) return null;
  if (d.t[k]) return d.t[k];
  for (const [re, f] of d.p) { const m = k.match(re); if (m) return f(m); }
  return null;
}
function trText(n){
  const p = n.parentNode;
  if (!p || ["SCRIPT", "STYLE", "TEXTAREA", "CODE"].includes(p.nodeName)) return;
  if (p.nodeName === "OPTION" && !p.hasAttribute("value")) return;
  const cur = n.nodeValue, rec = textOrig.get(n);
  if (rec && rec.hi === cur) return;
  const out = tr(cur);
  if (!out) return;
  const hi = cur.match(/^\s*/)[0] + out + cur.match(/\s*$/)[0];
  textOrig.set(n, { en: cur, hi }); n.nodeValue = hi; changedText.add(n);
}
function trAttrs(el){
  for (const a of ["placeholder", "aria-label"]) {
    const cur = el.getAttribute(a);
    if (!cur) continue;
    const rec = (attrOrig.get(el) || {})[a];
    if (rec && rec.hi === cur) continue;
    const out = tr(cur);
    if (!out) continue;
    const all = attrOrig.get(el) || {}; all[a] = { en: cur, hi: out }; attrOrig.set(el, all);
    el.setAttribute(a, out); changedEls.add(el);
  }
}
function walk(root){
  if (root.nodeType === 3) { trText(root); return; }
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) trText(n);
  if (root.matches && root.matches("[placeholder],[aria-label]")) trAttrs(root);
  root.querySelectorAll("[placeholder],[aria-label]").forEach(trAttrs);
}
function restoreEnglish(){
  changedText.forEach(n => { const r = textOrig.get(n); if (r && n.nodeValue === r.hi) n.nodeValue = r.en; });
  changedEls.forEach(el => { const all = attrOrig.get(el) || {}; for (const a in all) if (el.getAttribute(a) === all[a].hi) el.setAttribute(a, all[a].en); });
}
function applyLang(){
  document.documentElement.lang = REGION.lang;
  applying = true;
  if (dict()) walk(document.body); else restoreEnglish();
  applying = false;
}
new MutationObserver(muts => {
  if (applying || !dict()) return;
  applying = true;
  try {
    muts.forEach(m => {
      if (m.type === "characterData") trText(m.target);
      else m.addedNodes.forEach(n => walk(n));
    });
  } finally { applying = false; }
}).observe(document.body, { childList: true, subtree: true, characterData: true });

/* ---------- The picker ---------- */
function openRegion(){
  $("rgCountry").innerHTML = COUNTRIES.map(c => `<option value="${c[0]}">${esc(c[1])}</option>`).join("");
  $("rgLang").innerHTML = Object.keys(LANGS).map(k => `<option value="${k}">${esc(LANGS[k])}</option>`).join("");
  $("rgCur").innerHTML = Object.keys(CUR).map(k => `<option value="${k}">${k} (${esc(CUR[k][0].trim())}) - ${esc(CUR[k][2])}</option>`).join("");
  $("rgCountry").value = REGION.country; $("rgLang").value = REGION.lang; $("rgCur").value = REGION.cur;
  if (!$("regionDlg").open) $("regionDlg").showModal();
}
$("rgCountry").addEventListener("change", () => { $("rgCur").value = (COUNTRIES.find(c => c[0] === $("rgCountry").value) || [])[2] || "USD"; });
$("rgSave").onclick = () => { setRegion({ country: $("rgCountry").value, lang: $("rgLang").value, cur: $("rgCur").value }); $("regionDlg").close(); };
$("rgAuto").onclick = () => { resetRegion(); $("regionDlg").close(); };
document.addEventListener("click", e => {
  if (e.target.closest("#regionStrip")) openRegion();
  else if (e.target.closest("#pgoRegion")) { $("profDlg").close(); openRegion(); }
});

/* ---------- Start ---------- */
loadRegion();
$("fCur").innerHTML = Object.keys(CUR).map(k => `<option value="${k}">Show prices in ${k} (${esc(CUR[k][0].trim())})</option>`).join("");
$("fCur").value = DISPLAY;
renderRegionStrip();
applyLang();
try {
  if (REGION.auto && !localStorage.getItem("apphaat_region_seen")) {
    localStorage.setItem("apphaat_region_seen", "1");
    setTimeout(() => toast("Showing prices in " + REGION.cur + ". Change country, language or currency from the bar at the top."), 1800);
  }
} catch (e) {}

/* AppHaat: never lose what you typed. Saves the Sell form draft and remembers your email for the next login. */
const DRAFT_KEY = "apphaat_sell_draft";
const DRAFT_IDS = ["sTitle", "sType", "sLink", "sCur", "sPrice", "sRev", "sProfit", "sAge", "sTraffic", "sCountry", "sCat", "sDesc"];

function saveDraft(){
  if (editingId) return;
  const d = {};
  DRAFT_IDS.forEach(id => { d[id] = $(id).value; });
  if (!d.sTitle && !d.sLink && !d.sDesc) return;
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) {}
}
function restoreDraft(){
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!d) return;
    DRAFT_IDS.forEach(id => { if (d[id] != null) $(id).value = d[id]; });
    toast("Your saved draft was restored.");
  } catch (e) {}
}
function clearDraft(){ try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }

$("sellForm").addEventListener("input", saveDraft);
$("sellForm").addEventListener("change", saveDraft);

/* Remember the email so logging in again is quick (never the password) */
try { const saved = localStorage.getItem("apphaat_email"); if (saved) $("email").value = saved; } catch (e) {}
$("email").addEventListener("input", () => { try { localStorage.setItem("apphaat_email", $("email").value.trim()); } catch (e) {} });

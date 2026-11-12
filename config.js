/* AppHaat: settings and shared helpers */
const SUPABASE_URL = "https://lsbjpdblcdlrddnrzqax.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzYmpwZGJsY2RscmRkbnJ6cWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzODM5MDEsImV4cCI6MjEwOTk1OTkwMX0.2XusRIKZCzFsXyTBZ6bQFOmYHbHGRoLq33xun3rCYiw";
let SUPPORT_EMAIL = ""; // set from the admin panel (Settings)
let SLOT_PRICES = { 1: 20, 2: 15, 3: 10 }; // set from the admin panel (Settings)
let BANNER = { text: "", link: "" }; // top banner, set from the admin panel (Settings)
let ACCOUNT_FEE = 5; // set from the admin panel (Settings)
const CATEGORIES = ["Games", "Tools & Utilities", "Social", "Shopping & E-commerce", "Education", "Finance", "Entertainment", "Health & Fitness", "Travel", "Blog & Content", "SaaS & Business", "Other"];
const CURRENCY = "$"; // change to "₹" if you want rupees

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (id) => document.getElementById(id);
let all = [], featured = [], filterType = "all", query = "", user = null, authMode = "login";

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function safeUrl(u){
  try { const x = new URL(u); return (x.protocol === "http:" || x.protocol === "https:") ? x.href : ""; }
  catch { return ""; }
}
function money(n){ return CURRENCY + Number(n).toLocaleString("en-IN"); }
function toast(t){
  const d = document.createElement("div");
  d.className = "toast"; d.textContent = t; document.body.appendChild(d);
  setTimeout(() => d.remove(), 3200);
}

/* Settings saved by the admin (account fee, slot prices, support email) */
async function loadSettings(){
  const { data } = await sb.from("settings").select("key,value");
  (data || []).forEach(r => {
    if (r.key === "support_email") SUPPORT_EMAIL = r.value || "";
    if (r.key === "banner_text") BANNER.text = r.value || "";
    if (r.key === "banner_link") BANNER.link = r.value || "";
    if (r.key === "account_fee") ACCOUNT_FEE = Number(r.value) || 0;
    if (r.key === "slot_prices") {
      const p = String(r.value).split(",").map(x => Number(x.trim())).filter(x => isFinite(x) && x >= 0).slice(0, 20);
      if (p.length) { SLOT_PRICES = {}; p.forEach((v, i) => { SLOT_PRICES[i + 1] = v; }); }
    }
  });
}
const settingsReady = loadSettings();

/* AppHaat: settings and shared helpers */
const SUPABASE_URL = "https://lsbjpdblcdlrddnrzqax.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzYmpwZGJsY2RscmRkbnJ6cWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzODM5MDEsImV4cCI6MjEwOTk1OTkwMX0.2XusRIKZCzFsXyTBZ6bQFOmYHbHGRoLq33xun3rCYiw";
const SUPPORT_EMAIL = ""; // put your support email here, e.g. "support@yourdomain.com"
const SLOT_PRICES = { 1: 20, 2: 15, 3: 10 }; // price per week for each rank
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

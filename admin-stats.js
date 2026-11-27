/* AppHaat: admin "Site stats" tab. Anonymous numbers about visits, sign-ups and where visitors leave. */
let statDays = 7;
const SCREEN_LABELS = { home: "Home page", login_signup: "Login or sign-up", listing_detail: "A listing page", sell_form: "Sell form", my_listings: "My listings", profile: "Profile", browse: "Browse all", demand_board: "Buyer demand board", demand_form: "Post a request", make_offer: "Make an offer", offers: "Offers", inbox: "Inbox", value_estimator: "Value estimator", payment: "Payment", verification: "Verification", seller_dashboard: "Seller dashboard", wishlist: "Wishlist", notifications: "Notifications", contact_seller: "Contact seller", featured_spots: "Featured spots", region: "Country and language", info: "Info panel", seller_profile: "Seller profile" };
const SECTION_LABELS = { hero: "Top banner", stats: "Numbers strip", search: "Search box", spots: "Get seen first", demandWrap: "Buyers are looking for", soldWrap: "Recently sold", featWrap: "Featured this week", trendWrap: "Most popular", latestWrap: "Newest listings", seeAllRow: "See all button", categories: "Browse by category", ctryWrap: "Browse by country", how: "How it works", demos: "Demo cards", why: "Why AppHaat", newsWrap: "News", estimator: "Estimate band", faq: "FAQ", final_cta: "Final call to action", top: "Very top" };
const fmtSecs = (s) => (s >= 60 ? Math.floor(s / 60) + "m " + (s % 60) + "s" : s + "s");
const pctOf2 = (a, b) => (b > 0 ? Math.round(a * 100 / b) + "%" : "0%");

function barList(title, arr, label){
  const max = Math.max(1, ...(arr || []).map(x => x.n));
  return `<h3 style="font-size:16px;margin:16px 0 6px">${esc(title)}</h3>` + ((arr || []).map(x => `<div class="sbar"><div class="sbar-top"><span>${esc(label ? label(x.k) : x.k)}</span><b>${x.n}</b></div><div class="sbar-fill"><i style="width:${Math.round(x.n * 100 / max)}%"></i></div></div>`).join("") || '<div class="hint">No data yet.</div>');
}

async function adminStats(){
  const { data: d, error } = await sb.rpc("analytics_summary", { days: statDays });
  if (error || !d) return `<div class="safe">Could not load the stats. Run the Site stats SQL first. ${esc(error ? error.message : "")}</div>`;
  const st = d.steps || {}, visits = d.visits || 0;
  const funnel = [["Visits", visits], ["Opened a listing", st.listing_open || 0], ["Opened login or sign-up", st["screen:login_signup"] || 0], ["Signed up", d.signups || 0], ["Opened the sell form", st["screen:sell_form"] || 0], ["Submitted a listing", st.listing_submit || 0], ["Verified a listing", st.verify_success || 0]];
  const days = []; const dm = {}; (d.daily || []).forEach(x => { dm[x.d] = x.n; });
  for (let i = Math.min(statDays, 30) - 1; i >= 0; i--) days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  const vals = days.map(k => dm[k] || 0), mx = Math.max(1, ...vals), w = 330 / days.length;
  const chart = `<svg viewBox="0 0 330 72" class="trend" role="img" aria-label="Visits per day">${vals.map((v, i) => { const h = Math.max(1, Math.round(v / mx * 60)); return `<rect x="${(i * w + 1).toFixed(1)}" y="${68 - h}" width="${(w - 2).toFixed(1)}" height="${h}" rx="2" class="bar-n"><title>${days[i]}: ${v} visits</title></rect>`; }).join("")}</svg>`;
  return `<div class="chips" style="margin-bottom:10px">${[[1, "Today"], [7, "7 days"], [30, "30 days"], [90, "90 days"]].map(([n, t]) => `<button class="chip statP" data-d="${n}" aria-pressed="${n === statDays}">${t}</button>`).join("")}</div>
    <div class="hint"><span class="ok">&#9679;</span> ${d.active_now || 0} visitors active in the last 5 minutes</div>
    <div class="stats" style="margin:10px 0">${tile("Visits", visits)}${tile("Unique visitors", d.visitors || 0)}${tile("New visitors", pctOf2(d.new_visits || 0, visits))}${tile("Logged-in visits", pctOf2(d.logged_in_visits || 0, visits))}${tile("Avg time on site", fmtSecs(d.avg_secs || 0))}${tile("Avg scroll depth", (d.avg_scroll || 0) + "%")}${tile("Sign-ups", d.signups || 0)}${tile("Listings added", d.listings || 0)}${tile("Offers sent", d.offers || 0)}${tile("Payments", d.payments || 0)}</div>
    <div class="hint">Visits per day</div>${chart}
    <h3 style="font-size:16px;margin:16px 0 6px">From visit to listing</h3>
    ${funnel.map(([t, n], i) => `<div class="sbar"><div class="sbar-top"><span>${esc(t)}</span><b>${n} <span class="hint">${pctOf2(n, visits)} of visits</span></b></div><div class="sbar-fill"><i style="width:${Math.min(100, Math.round(n * 100 / Math.max(1, visits)))}%"></i></div></div>`).join("")}
    <div class="hint">Steps are counted per visit. Sign-ups come straight from the accounts list.</div>
    ${barList("Where visitors leave: last screen", d.exits, k => SCREEN_LABELS[k] || k)}
    ${barList("Home page: last section seen before leaving", d.exit_sections, k => SECTION_LABELS[k] || k)}
    ${barList("Traffic sources", d.sources)}
    ${barList("Sign-ups by first source", d.signup_sources)}
    ${barList("Countries (from device time zone)", d.countries)}
    ${barList("Devices", d.devices)}
    ${barList("Languages", d.langs)}
    ${barList("Most opened listings", d.top_listings)}
    ${barList("Top searches", d.searches)}
    <h3 style="font-size:16px;margin:16px 0 6px">Settings</h3>
    <label class="chk"><input type="checkbox" id="stSelf" ${localStorage.getItem("apphaat_count_admin") === "1" ? "checked" : ""}> Count my own visits (off by default so your testing does not change the numbers)</label>
    <div class="row"><button class="btn ghost small" id="stPurge">Delete stats older than 90 days</button></div>
    <div class="hint">Stats are anonymous: a random ID in the browser, no IP address, no names. Delete old stats now and then to save space.</div>`;
}

document.addEventListener("click", async e => {
  if (!isAdmin) return;
  const p = e.target.closest(".statP");
  if (p) { statDays = Number(p.dataset.d); renderAdmin(); return; }
  if (e.target.closest("#stPurge")) {
    if (!confirm("Delete all stats older than 90 days?")) return;
    const r = await sb.rpc("purge_analytics", { days: 90 });
    toast(r.error ? "Could not delete: " + r.error.message : "Deleted " + r.data + " old records.");
  }
});
document.addEventListener("change", e => { if (e.target.id === "stSelf") { try { localStorage.setItem("apphaat_count_admin", e.target.checked ? "1" : "0"); } catch (err) {} toast(e.target.checked ? "Your visits are now counted." : "Your visits are not counted."); } });

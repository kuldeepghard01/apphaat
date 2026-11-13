/* AppHaat: seller dashboard (views, contacts, saves, interest) and the Save button */
let dashDays = 30;
const PERIODS = [[7, "7 days"], [30, "30 days"], [0, "All time"]];

function trendSvg(rows){
  const map = {};
  (rows || []).forEach(r => { map[r.day] = Number(r.views); });
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
  const vals = days.map(k => map[k] || 0), max = Math.max(1, ...vals);
  const bars = vals.map((v, i) => {
    const h = Math.round((v / max) * 60);
    return `<rect x="${i * 22 + 4}" y="${68 - Math.max(h, 1)}" width="16" height="${Math.max(h, 1)}" rx="3" fill="currentColor"><title>${days[i]}: ${v} views</title></rect>`;
  }).join("");
  return `<svg viewBox="0 0 312 72" class="trend" role="img" aria-label="Views in the last 14 days">${bars}</svg>`;
}

async function openDashboard(){
  if (!user) { openAuth("login"); return; }
  $("dash").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("dashDlg").open) $("dashDlg").showModal();
  const [a, d] = await Promise.all([sb.rpc("seller_dashboard", { days: dashDays }), sb.rpc("seller_views_daily", { days: 14 })]);
  if (a.error) { $("dash").innerHTML = '<div class="empty">Could not load your dashboard. Please try again.</div>'; return; }
  const rows = a.data || [];
  if (!rows.length) { $("dash").innerHTML = '<div class="empty">You have no listings yet. Tap Sell to add your first one.</div>'; return; }
  const sum = (k) => rows.reduce((t, r) => t + Number(r[k]), 0);
  const stat = (r) => `<div class="stats">${tile("Views", r.views)}${tile("Contacts", r.contacts)}${tile("Saves", r.saves)}${tile("Interested", r.interested)}</div>`;
  $("dash").innerHTML = `
    <div class="chips" style="margin-bottom:10px">${PERIODS.map(([n, t]) => `<button class="chip dchip" data-days="${n}" aria-pressed="${n === dashDays}">${t}</button>`).join("")}</div>
    ${stat({ views: sum("views"), contacts: sum("contacts"), saves: sum("saves"), interested: sum("interested") })}
    <div class="hint">Views in the last 14 days</div>${trendSvg(d.data)}
    <div class="hint">Contacts are buyers who messaged you. Interested counts each person once per listing, if they saved it or messaged you.</div>
    <h3 style="font-size:18px;margin:14px 0 6px">Your listings</h3>
    ${rows.map(r => `<div class="mine">
      <div class="mrow"><strong>${esc(r.title)}</strong><span class="tag">${esc(STATUS[r.status] || r.status)}</span></div>
      ${stat(r)}
      <div class="hint">Contact rate: ${r.views > 0 ? Math.round(r.contacts * 100 / r.views) : 0}% of viewers messaged you.</div>
      <div class="row"><button class="btn small ghost viewBtn" data-id="${esc(r.listing_id)}">View listing</button><button class="btn small ghost" data-dash-inbox>Messages</button></div></div>`).join("")}`;
}

/* Save button on a listing */
const setSave = (b, on) => { b.dataset.on = on ? "1" : "0"; b.innerHTML = on ? "&#9829; Saved" : "&#9825; Save"; };
async function paintSave(l){
  const b = $("saveBtn");
  if (!b) return;
  if (user && l.owner_id === user.id) { b.hidden = true; return; }
  if (!user) return;
  const { data } = await sb.from("favorites").select("listing_id").eq("listing_id", l.id).maybeSingle();
  setSave(b, !!data);
}

document.addEventListener("click", async e => {
  const t = e.target;
  if (t.closest("#pgoDash")) { $("profDlg").close(); openDashboard(); return; }
  if (t.closest("[data-dash-inbox]")) { $("dashDlg").close(); openInbox(); return; }
  const dc = t.closest(".dchip");
  if (dc) { dashDays = Number(dc.dataset.days); openDashboard(); return; }
  const b = t.closest("#saveBtn");
  if (!b) return;
  if (!user) { $("detDlg").close(); openAuth("login", "Log in to save listings."); return; }
  const on = b.dataset.on === "1";
  b.disabled = true;
  const { error } = on
    ? await sb.from("favorites").delete().eq("listing_id", b.dataset.id).eq("user_id", user.id)
    : await sb.from("favorites").insert({ user_id: user.id, listing_id: b.dataset.id });
  b.disabled = false;
  if (error) { toast("Could not update. Please try again."); return; }
  setSave(b, !on);
  toast(on ? "Removed from saved." : "Saved.");
});

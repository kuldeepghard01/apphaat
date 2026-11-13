/* AppHaat: listing analytics for the owner (does featuring help?) */
const AN_DAYS = 30;
const sumOf = (a, k) => a.reduce((t, r) => t + Number(r[k]), 0);
const avgOf = (a, k) => (a.length ? sumOf(a, k) / a.length : 0);
const per100 = (a) => (sumOf(a, "views") ? sumOf(a, "contacts") * 100 / sumOf(a, "views") : 0);
const one = (n) => String(Math.round(n * 10) / 10);
const pct = (f, o) => (o > 0 ? (f >= o ? "+" : "") + Math.round((f - o) / o * 100) + "%" : "n/a");

function barsSvg(rows){
  const max = Math.max(1, ...rows.map(r => Number(r.views))), w = 330 / rows.length;
  return `<svg viewBox="0 0 330 72" class="trend" role="img" aria-label="Views per day">${rows.map((r, i) => {
    const h = Math.max(1, Math.round(Number(r.views) / max * 60));
    return `<rect x="${(i * w + 1).toFixed(1)}" y="${68 - h}" width="${(w - 2).toFixed(1)}" height="${h}" rx="2" class="${r.featured ? "bar-f" : "bar-n"}"><title>${r.day}: ${r.views} views${r.featured ? " (featured)" : ""}</title></rect>`;
  }).join("")}</svg>`;
}

function verdictText(f, o){
  if (!f.length) return "This listing was not featured in the last 30 days, so there is nothing to compare yet.";
  if (f.length < 3 || o.length < 3) return "There are not enough days to compare fairly yet. Check again after a few more featured days.";
  const fv = avgOf(f, "views"), ov = avgOf(o, "views");
  if (ov === 0) return "On normal days there were no views, so a percentage cannot be shown. Compare the numbers below.";
  const lift = (fv - ov) / ov * 100;
  if (lift >= 20) return `Featured days got about ${Math.round(lift)}% more views per day. Featuring seems to help.`;
  if (lift <= -20) return "Featured days got fewer views than normal days. Featuring has not helped yet. Try better screenshots, clearer numbers or a fair price.";
  return "Views were similar on featured and normal days, so there is no clear gain yet.";
}

async function openAnalytics(id){
  $("ana").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("anaDlg").open) $("anaDlg").showModal();
  const [a, s, l] = await Promise.all([
    sb.rpc("listing_analytics", { lid: id, days: AN_DAYS }),
    sb.from("slots").select("rank,starts_at,ends_at").eq("listing_id", id).order("starts_at", { ascending: false }).limit(5),
    sb.from("listings").select("title,status,verified").eq("id", id).maybeSingle()
  ]);
  if (a.error || !a.data || !a.data.length) { $("ana").innerHTML = '<div class="empty">Could not load analytics. Please try again.</div>'; return; }
  const rows = a.data, f = rows.filter(r => r.featured), o = rows.filter(r => !r.featured);
  const lst = l.data || {}, slots = s.data || [], now = Date.now();
  const live = slots.some(x => new Date(x.starts_at).getTime() <= now && new Date(x.ends_at).getTime() > now);
  const line = (name, fv, ov) => `<tr><td>${esc(name)}</td><td>${esc(one(fv))}</td><td>${esc(one(ov))}</td><td>${esc(pct(fv, ov))}</td></tr>`;
  let action = "";
  if (live) action = '<span class="tag">Featured now</span>';
  else if (lst.status === "approved" && lst.verified) action = `<button class="btn gold small" id="anaFeat" data-id="${esc(id)}" data-title="${esc(lst.title || "")}">Get featured</button>`;
  else if (lst.status === "approved") action = '<div class="hint">Verify this listing to book a featured spot.</div>';
  $("ana").innerHTML = `
    <div class="dlg-head"><h2>${esc(lst.title || "Listing analytics")}</h2><button class="x" data-close aria-label="Close">&times;</button></div>
    <div class="hint">Last ${AN_DAYS} days</div>
    <div class="stats">${tile("Views", sumOf(rows, "views"))}${tile("Contacts", sumOf(rows, "contacts"))}${tile("Saves", sumOf(rows, "saves"))}${tile("Featured days", f.length)}</div>
    ${barsSvg(rows)}
    <div class="hint"><span class="swatch f"></span> days featured &nbsp; <span class="swatch n"></span> other days</div>
    <h3 style="font-size:18px;margin:14px 0 4px">Is featuring helping?</h3>
    <p style="margin:4px 0">${esc(verdictText(f, o))}</p>
    <table class="ana-table"><tr><th></th><th>Featured (${f.length} d)</th><th>Other (${o.length} d)</th><th>Change</th></tr>
      ${line("Views per day", avgOf(f, "views"), avgOf(o, "views"))}${line("Contacts per day", avgOf(f, "contacts"), avgOf(o, "contacts"))}
      ${line("Saves per day", avgOf(f, "saves"), avgOf(o, "saves"))}${line("Contacts per 100 views", per100(f), per100(o))}</table>
    <div class="hint">This compares days. Other things, like price changes, also matter, so treat it as a pattern and not proof.</div>
    ${slots.length ? `<h3 style="font-size:16px;margin:12px 0 4px">Featured spots</h3>${slots.map(x => `<div class="hint">Spot ${esc(x.rank)}: ${esc(fmtDate(x.starts_at))} to ${esc(fmtDate(x.ends_at))}</div>`).join("")}` : ""}
    <div class="row">${action}</div>`;
}

document.addEventListener("click", e => {
  const b = e.target.closest(".anaOpen, #anaBtn");
  if (b) { $("detDlg").close(); $("dashDlg").close(); openAnalytics(b.dataset.id); return; }
  const g = e.target.closest("#anaFeat");
  if (g) { $("anaDlg").close(); openFeat(g.dataset.id, g.dataset.title); }
});

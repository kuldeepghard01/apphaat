/* AppHaat: landing sections for visitors, and the member dashboard for people who are logged in */
const CAT_ICON = { "Games": "\u{1F3AE}", "Tools & Utilities": "\u{1F6E0}\uFE0F", "Social": "\u{1F4AC}", "Shopping & E-commerce": "\u{1F6D2}", "Education": "\u{1F393}", "Finance": "\u{1F4B0}", "Entertainment": "\u{1F3AC}", "Health & Fitness": "\u{1F4AA}", "Travel": "\u2708\uFE0F", "Blog & Content": "\u{1F4DD}", "SaaS & Business": "\u{1F4CA}", "Other": "\u{1F9E9}" };

function setStat(id, n){
  const el = $(id);
  if (!el || el.dataset.v === String(n)) return;
  const from = Number(el.dataset.v) || 0, t0 = performance.now();
  el.dataset.v = n;
  const tick = (t) => {
    const p = Math.min((t - t0) / 700, 1);
    el.textContent = Math.round(from + (n - from) * p).toLocaleString("en-US");
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* Real numbers only: they grow as AppHaat grows */
function renderLanding(){
  setStat("stLive", all.length); setStat("stVer", all.filter(l => l.verified).length);
  setStat("stSold", soldList.length); setStat("stReq", demands.length);
  const counts = {};
  all.forEach(l => { if (l.category) counts[l.category] = (counts[l.category] || 0) + 1; });
  $("catGrid").innerHTML = CATEGORIES.map(c => `<button class="cat" data-cat-go="${esc(c)}"><span class="cat-ic">${CAT_ICON[c] || ""}</span><b>${esc(c)}</b><span class="hint">${counts[c] || 0} live</span></button>`).join("");
  if (user) $("memRec").innerHTML = all.filter(l => l.owner_id !== user.id).slice(0, 4).map(l => cardHtml(l, null, true)).join("") || '<div class="empty">Nothing new yet.</div>';
}

async function renderMember(){
  if (!user) return;
  const [p, l, o, a, un] = await Promise.all([
    sb.from("profiles").select("display_name,is_paid").eq("id", user.id).maybeSingle(),
    sb.from("listings").select("id,title,status,verified").eq("owner_id", user.id).neq("status", "deleted"),
    sb.from("offers").select("id,by_seller,buyer_id,listing_id,created_at").eq("status", "pending"),
    sb.from("notifications").select("title,body,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false)
  ]);
  const me = p.data || {}, mine = l.data || [], ids = new Set(mine.map(x => x.id)), meta = user.user_metadata || {};
  const name = me.display_name || meta.full_name || meta.name || (user.email || "").split("@")[0] || "there";
  $("memHello").textContent = "Welcome back, " + name;
  $("memStatus").innerHTML = me.is_paid ? '<span class="ok">Seller account active</span>' : '<span class="warn">Seller account not activated yet</span>';
  let views = 0;
  if (ids.size) { const s = await sb.from("listing_stats").select("views").in("listing_id", [...ids]); views = (s.data || []).reduce((t, x) => t + x.views, 0); }
  const waiting = (o.data || []).filter(x => (x.by_seller ? x.buyer_id === user.id : ids.has(x.listing_id)) && Date.now() - new Date(x.created_at).getTime() < OFFER_DAYS * 864e5);
  const unread = un.count || 0;
  $("memKpi").innerHTML = tile("Live listings", mine.filter(x => x.status === "approved").length) + tile("Views", views) + tile("Offers to answer", waiting.length) + tile("Unread alerts", unread);

  const card = (t, h, b) => `<div class="mine"><div class="mrow"><strong>${esc(t)}</strong></div><div class="hint">${esc(h)}</div><div class="row">${b}</div></div>`;
  const items = [];
  if (!me.is_paid && ACCOUNT_FEE > 0) items.push(card("Activate your seller account", "One-time fee of " + money(ACCOUNT_FEE) + ". You need it before you can list.", `<button class="btn small payBtn" data-purpose="account" data-amount="${esc(ACCOUNT_FEE)}">Pay ${esc(money(ACCOUNT_FEE))}</button>`));
  const unv = mine.filter(x => !x.verified && ["approved", "pending"].includes(x.status));
  if (unv.length) items.push(card(unv.length + (unv.length === 1 ? " listing needs" : " listings need") + " verification", "Verified listings earn a badge and can book featured spots.", `<button class="btn small gold verOpen" data-id="${esc(unv[0].id)}">Verify ownership</button>`));
  const pend = mine.filter(x => x.status === "pending").length;
  if (pend) items.push(card(pend + (pend === 1 ? " listing is" : " listings are") + " waiting for review", "We review every listing before it goes live.", ""));
  if (waiting.length) items.push(card(waiting.length + (waiting.length === 1 ? " offer needs" : " offers need") + " your answer", "Accept, decline or counter.", '<button class="btn small" data-go="offers">Open offers</button>'));
  if (unread) items.push(card(unread + " unread " + (unread === 1 ? "alert" : "alerts"), "See what is new.", '<button class="btn small" data-go="notifs">Open alerts</button>'));
  $("memAttn").innerHTML = items.join("") || '<div class="empty">You are all caught up.</div>';
  $("memAct").innerHTML = (a.data || []).map(n => `<div class="mine"><div class="mrow"><strong>${esc(n.title)}</strong><span class="hint">${esc(timeAgo(n.created_at))}</span></div>${n.body ? `<div class="hint">${esc(n.body)}</div>` : ""}</div>`).join("") || '<div class="empty">No activity yet.</div>';
  renderLanding();
}

async function loadNews(){
  const { data } = await sb.from("news_posts").select("*").eq("published", true).order("created_at", { ascending: false }).limit(10);
  const list = data || [];
  $("newsWrap").hidden = !list.length;
  $("newsRow").innerHTML = list.map(n => {
    const u = safeUrl(n.link), img = safeUrl(n.image_url);
    const inner = `${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<div class="news-ph">AppHaat</div>'}<div class="news-body"><b>${esc(n.title)}</b>${n.summary ? `<span class="hint">${esc(n.summary)}</span>` : ""}<span class="hint">${esc(timeAgo(n.created_at))}</span></div>`;
    return u ? `<a class="news-card" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : `<div class="news-card">${inner}</div>`;
  }).join("");
}

const GO = {
  sell: () => openSell(), mine: () => openMine(), offers: () => openOffers(), inbox: () => openInbox(), wish: () => openWishlist(),
  dash: () => openDashboard(), post: () => openDemandForm(), estimate: () => openEstimator(false), browse: () => openBrowse(),
  demand: () => { demTab = "all"; openDemands(); }, notifs: () => openNotifs()
};
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g && GO[g.dataset.go]) { GO[g.dataset.go](); return; }
  const c = e.target.closest("[data-cat-go]");
  if (c) { $("fCat").value = c.dataset.catGo; openBrowse(); return; }
  const t = e.target.closest(".hwTab");
  if (t) {
    document.querySelectorAll(".hwTab").forEach(b => b.setAttribute("aria-pressed", b === t ? "true" : "false"));
    $("hwSeller").hidden = t.dataset.k !== "seller"; $("hwBuyer").hidden = t.dataset.k !== "buyer";
  }
});
$("footEst").onclick = (e) => { e.preventDefault(); openEstimator(false); };

/* If the login check is slow, show the visitor page after a few seconds instead of an empty top */
setTimeout(() => {
  const b = document.body;
  if (b.classList.contains("auth-pending")) { b.classList.remove("auth-pending"); b.classList.add("out"); }
}, 6000);
loadNews();

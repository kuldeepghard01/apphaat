/* AppHaat: anonymous visit statistics. No IP address, no name, no cookies. Respects Do Not Track. */
(function(){
  const nav = navigator, ua = nav.userAgent || "";
  const off = nav.doNotTrack === "1" || window.doNotTrack === "1" || nav.webdriver || /bot|crawl|spider|slurp|headless|lighthouse/i.test(ua);
  const ls = { get(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v){ try { localStorage.setItem(k, v); } catch (e) {} } };
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const adminSkip = () => typeof isAdmin !== "undefined" && isAdmin && ls.get("apphaat_count_admin") !== "1";
  const on = () => !off && ls.get("apphaat_notrack") !== "1" && !adminSkip();

  let vid = ls.get("apphaat_vid"), newVisitor = false;
  if (!vid) { vid = rid(); ls.set("apphaat_vid", vid); newVisitor = true; }
  let sid = null;
  try { sid = sessionStorage.getItem("apphaat_sid"); } catch (e) {}
  const fresh = !sid || Date.now() - Number(ls.get("apphaat_last") || 0) > 30 * 60 * 1000;
  if (fresh) { sid = rid(); try { sessionStorage.setItem("apphaat_sid", sid); } catch (e) {} }

  function source(){
    const q = new URLSearchParams(location.search), utm = q.get("utm_source") || q.get("ref") || "";
    let host = "";
    try { host = new URL(document.referrer).hostname.replace(/^www\./, ""); } catch (e) {}
    if (host === location.hostname) host = "";
    return { source: (utm || host || "direct").toLowerCase().slice(0, 40), medium: (q.get("utm_medium") || (host ? "referral" : utm ? "campaign" : "direct")).slice(0, 30), campaign: (q.get("utm_campaign") || "").slice(0, 40) };
  }
  const device = /ipad|tablet/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop";
  const browser = /edg\//i.test(ua) ? "Edge" : /samsungbrowser/i.test(ua) ? "Samsung" : /opr\//i.test(ua) ? "Opera" : /chrome|crios/i.test(ua) ? "Chrome" : /firefox|fxios/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Other";
  if (!ls.get("apphaat_first_touch")) ls.set("apphaat_first_touch", JSON.stringify({ ...source(), t: new Date().toISOString().slice(0, 10) }));

  /* ---- queue and sending ---- */
  const Q = [];
  function track(name, props){
    if (!on()) return;
    Q.push({ visitor_id: vid, session_id: sid, event: name, props: props || {} });
    if (Q.length >= 20) flush();
  }
  async function flush(){
    if (!Q.length) return;
    if (!on()) { Q.length = 0; return; }
    await sb.from("analytics_events").insert(Q.splice(0, Q.length));
  }
  function sendNow(){
    if (!Q.length) return;
    if (!on()) { Q.length = 0; return; }
    const rows = Q.splice(0, Q.length);
    try { fetch(SUPABASE_URL + "/rest/v1/analytics_events", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, Prefer: "return=minimal" }, body: JSON.stringify(rows) }); } catch (e) {}
  }
  window.track = track;

  /* ---- screens, time, scroll ---- */
  const SCREENS = { authDlg: "login_signup", detDlg: "listing_detail", sellDlg: "sell_form", mineDlg: "my_listings", profDlg: "profile", browseDlg: "browse", demandsDlg: "demand_board", demandFormDlg: "demand_form", respondDlg: "demand_respond", offerDlg: "make_offer", offersDlg: "offers", inboxDlg: "inbox", notifDlg: "notifications", wishDlg: "wishlist", dashDlg: "seller_dashboard", anaDlg: "listing_analytics", valDlg: "value_estimator", payDlg: "payment", verifyDlg: "verification", regionDlg: "region", infoDlg: "info", sellerDlg: "seller_profile", featDlg: "featured_spots", contactDlg: "contact_seller", passDlg: "password" };
  const stack = [];
  let cur = "home", secs = 0, maxScroll = 0, maxIdx = 0;
  const showModal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function(){
    const was = this.open;
    showModal.call(this);
    if (!was && SCREENS[this.id]) { stack.push(SCREENS[this.id]); cur = SCREENS[this.id]; track("screen_view", { screen: cur }); }
  };
  document.addEventListener("close", e => {
    if (!e.target || e.target.tagName !== "DIALOG" || !SCREENS[e.target.id]) return;
    const i = stack.lastIndexOf(SCREENS[e.target.id]);
    if (i >= 0) stack.splice(i, 1);
    cur = stack.length ? stack[stack.length - 1] : "home";
  }, true);

  const secEls = () => [...document.querySelectorAll("main > *")].filter(el => el.offsetParent !== null);
  function onScroll(){
    const h = document.documentElement, pct = Math.round((window.scrollY + innerHeight) / Math.max(h.scrollHeight, 1) * 100);
    if (pct > maxScroll) maxScroll = Math.min(pct, 100);
    const mid = window.scrollY + innerHeight * 0.5;
    secEls().forEach((el, i) => { if (el.getBoundingClientRect().top + window.scrollY <= mid && i > maxIdx) maxIdx = i; });
  }
  const sectionName = () => { const el = secEls()[maxIdx]; return el ? (el.dataset.sec || el.id || (el.className || "").split(" ")[0] || "section") : "top"; };
  window.addEventListener("scroll", onScroll, { passive: true });
  setInterval(() => { if (!document.hidden) { secs += 2; ls.set("apphaat_last", String(Date.now())); } }, 2000);

  /* The last "exit" of a visit tells us where the visitor left. */
  let lastExit = 0;
  function leave(){
    if (Date.now() - lastExit < 1500) return;
    lastExit = Date.now();
    onScroll();
    track("exit", { screen: cur, section: sectionName(), scroll: maxScroll, secs, logged_in: typeof user !== "undefined" && !!user });
    sendNow();
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) leave(); });
  window.addEventListener("pagehide", leave);
  setInterval(flush, 6000);

  /* ---- what happened ---- */
  if (fresh) track("session_start", { ...source(), device, browser, country: typeof REGION !== "undefined" ? REGION.country : "", lang: typeof REGION !== "undefined" ? REGION.lang : "", new_visitor: newVisitor, logged_in: typeof savedLogin === "function" && savedLogin() });
  setTimeout(onScroll, 1200);

  const CLICKS = [["#heroSell", "cta_hero_sell"], ["#heroEst", "cta_hero_estimate"], ["#heroBrowse", "cta_hero_browse"], ["#sellBtn", "cta_sell_button"], ["#homeGo", "search_button"], ["#tabSignup", "auth_tab_signup"], ["#forgotBtn", "forgot_password"], ["#contactBtn", "contact_open"], ["#offerBtn", "offer_open"], ["#saveBtn", "save_click"], [".demRespond", "demand_respond_open"], ["#vGo", "estimate_run"], ["#rgSave", "region_change"], ["#payOnline", "pay_online_click"], ["#verCheck", "verify_check"], [".demo-pause", "demo_pause"], ["#seeAll", "see_all_listings"], ["#promoBtn", "book_spot_click"]];
  document.addEventListener("click", e => {
    const t = e.target;
    const card = t.closest(".card");
    if (card && card.dataset.id) { track("listing_open", { id: card.dataset.id, from: cur }); return; }
    const go = t.closest("[data-go]");
    if (go) { track("cta_" + go.dataset.go, { from: cur }); return; }
    const soc = t.closest(".socBtn");
    if (soc) { track("social_login_click", { p: soc.dataset.p }); return; }
    if (t.closest("#authGo")) { track("auth_submit", { mode: typeof authMode !== "undefined" ? authMode : "" }); return; }
    for (const [sel, name] of CLICKS) if (t.closest(sel)) { track(name, { from: cur }); return; }
  }, true);

  /* Success moments: the site already shows a short message, so we count those. */
  const TOASTS = [[/^Listing submitted/, "listing_submit"], [/^Verified! Your listing/, "verify_success"], [/^Message sent\./, "contact_send"], [/^Offer sent\./, "offer_send"], [/^Request posted\./, "demand_post"], [/^Saved to your wishlist/, "wishlist_add"], [/^Marked as sold/, "marked_sold"], [/^Payment confirmed/, "payment_confirmed"], [/^Sent\. The buyer can reply/, "demand_respond_send"], [/^Profile saved/, "profile_saved"]];
  const baseToast = toast;
  toast = function(t){ try { for (const [re, name] of TOASTS) if (re.test(String(t))) { track(name, {}); break; } } catch (e) {} return baseToast(t); };

  /* Searches and filters (we store only the first 40 letters of a search, never who typed it) */
  let st;
  ["q", "homeQ"].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener("input", () => { clearTimeout(st); st = setTimeout(() => { const v = el.value.trim().toLowerCase().slice(0, 40); if (v.length > 1) track("search", { q: v }); }, 1500); }); });
  let ft;
  ["fCat", "fSort", "fMin", "fMax", "fRev", "fTraffic", "fVer", "fNew", "fCountry", "fCur"].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener("change", () => { clearTimeout(ft); ft = setTimeout(() => track("filter_use", { f: id }), 800); }); });
  document.querySelectorAll("#demoCards .demo-card").forEach(c => new IntersectionObserver((es, o) => es.forEach(x => { if (x.isIntersecting) { track("demo_view", { c: c.className.replace("demo-card", "").trim() }); o.disconnect(); } }), { threshold: 0.5 }).observe(c));

  /* Logins and sign-ups. A sign-up is a first login within minutes of the account being created. */
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev !== "SIGNED_IN" || !session) return;
    const key = "apphaat_seen_login_" + session.user.id.slice(0, 8);
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch (e) {}
    setTimeout(async () => {
      let isNew = false;
      try { const r = await sb.rpc("claim_signup_source", { src: JSON.parse(ls.get("apphaat_first_touch") || "{}"), vid }); isNew = r.data === true; } catch (e) {}
      track(isNew ? "signup_complete" : "login", {});
    }, 800);
  });
})();

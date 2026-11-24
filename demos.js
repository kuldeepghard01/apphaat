/* AppHaat: animated demo cards for visitors (sample data only, nothing here is real) */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PLAY_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
const BAR = (t, role) => `<div class="dm-bar"><i></i><i></i><i></i><span>${t}</span>${role ? `<b class="dm-role">${role}</b>` : ""}</div>`;
const FOOT = '<div class="dm-cursor"></div><div class="dm-demo">Demo with sample data</div>';

const SCENES = [
  { cls: "c1", label: "Post a request", title: "Tell sellers what you want. They come to you.",
    text: "Post what you want to buy, with your budget. Sellers who have a match tap I have this and chat with you directly.", cta: "Post a request", go: "post",
    html: `${BAR("AppHaat · Buyer demand board", "Buyer")}<div class="dm-body">
      <div class="dm-pane p1"><div class="dm-h">Post what you want to buy</div>
        <div class="dm-f"><label>Your request</label><div class="dm-v f1"></div></div>
        <div class="dm-row"><div class="dm-f"><label>Type</label><div class="dm-v f2"></div></div><div class="dm-f"><label>Maximum budget</label><div class="dm-v f3"></div></div></div>
        <div class="dm-f"><label>Keywords</label><div class="dm-v f4"></div></div>
        <button class="dm-btn post" tabindex="-1">Post request</button>
        <div class="dm-chip toast">Request posted. Matching sellers are notified.</div></div>
      <div class="dm-pane p2"><div class="dm-h">Buyers are looking for</div>
        <div class="dm-item"><b class="t"></b><span class="dm-sub">Up to ₹20,000 · Website</span><button class="dm-btn small have" tabindex="-1">I have this</button></div></div>
      <div class="dm-pane p3"><div class="dm-h">Chat with the buyer</div>
        <div class="dm-b me">Hi! I have a WordPress travel blog, 3 years old. Priced at ₹15,000.</div>
        <div class="dm-b them">That fits my budget. How much traffic does it get?</div>
        <div class="dm-b me">About 25,000 visits a month, and the ownership is verified.</div>
        <div class="dm-chip end">Chat started. No middleman.</div></div></div>${FOOT}`,
    reset(d){ d.$(".dm-role").textContent = "Buyer"; d.$(".t").textContent = ""; },
    async run(d){
      d.show(d.$(".p1")); await d.wait(700);
      await d.type(d.$(".f1"), "WordPress blog under ₹20,000", 38);
      await d.type(d.$(".f2"), "Website", 55); await d.type(d.$(".f3"), "₹20,000", 60); await d.type(d.$(".f4"), "WordPress, blog", 45);
      await d.tap(d.$(".post")); d.show(d.$(".toast")); await d.wait(1500);
      d.hide(d.$(".p1")); d.$(".dm-role").textContent = "Seller"; d.$(".t").textContent = "WordPress blog under ₹20,000"; d.show(d.$(".p2"));
      await d.wait(1200); await d.tap(d.$(".have"));
      d.hide(d.$(".p2")); d.show(d.$(".p3"));
      for (const b of d.$$(".dm-b")) { await d.wait(950); d.show(b); }
      await d.wait(700); d.show(d.$(".end"));
    } },
  { cls: "c2", label: "Free value estimate", title: "Know what it is worth in one minute.",
    text: "Enter revenue, costs, age and traffic. Get a fair price range based on real market data.", cta: "Try the estimator", go: "estimate",
    html: `${BAR("AppHaat · Value estimator")}<div class="dm-body">
      <div class="dm-pane p1"><div class="dm-f"><label>What are you valuing?</label><div class="dm-v f1"></div></div>
        <div class="dm-row"><div class="dm-f"><label>Monthly revenue</label><div class="dm-v f2"></div></div><div class="dm-f"><label>Monthly expenses</label><div class="dm-v f3"></div></div></div>
        <div class="dm-row"><div class="dm-f"><label>Age in years</label><div class="dm-v f4"></div></div><div class="dm-f"><label>Monthly visitors</label><div class="dm-v f5"></div></div></div>
        <div class="dm-f"><label>Revenue trend, last 6 months</label><div class="dm-v f6"></div></div>
        <button class="dm-btn est" tabindex="-1">Estimate value</button></div>
      <div class="dm-pane p2"><div class="dm-h">Estimated value range</div>
        <div class="dm-big range"></div><div class="dm-meter"><i></i></div>
        <div class="dm-row"><div class="dm-stat"><span>Confidence</span><b>Reasonable</b></div><div class="dm-stat"><span>Method</span><b>Profit multiple</b></div></div>
        <div class="dm-chip end">Based on real sale data by category.</div></div></div>${FOOT}`,
    reset(d){ d.$(".range").textContent = ""; },
    async run(d){
      d.show(d.$(".p1")); await d.wait(700);
      await d.type(d.$(".f1"), "Content, blog or affiliate site", 30); await d.type(d.$(".f2"), "$2,500", 70); await d.type(d.$(".f3"), "$500", 70);
      await d.type(d.$(".f4"), "3", 90); await d.type(d.$(".f5"), "40,000", 60); await d.type(d.$(".f6"), "Stable", 60);
      await d.tap(d.$(".est")); await d.wait(500);
      let range = "$60,000 to $83,000";
      try { const r = estimateValue({ type: "content", cur: "USD", revenue: 2500, expenses: 500, age: 3, traffic: 40000, trend: "stable", ask: 0 }); if (r.mode === "profit") range = fm(r.low, "USD") + " to " + fm(r.high, "USD"); } catch (e) {}
      d.hide(d.$(".p1")); d.$(".range").textContent = range; d.show(d.$(".p2"));
      await d.wait(300); d.show(d.$(".dm-meter")); await d.wait(1400); d.show(d.$(".end"));
    } },
  { cls: "c3", label: "Verify ownership", title: "Prove it is yours in two minutes.",
    text: "Add a small code to your website's head or your app's description. We check it and your listing gets the Verified badge.", cta: "List and verify", go: "sell",
    html: `${BAR("AppHaat · Verify ownership")}<div class="dm-body">
      <div class="dm-pane p1 on-always"><div class="dm-item"><b>My Travel Blog</b><span class="dm-badge vb">Not verified</span></div>
        <div class="dm-f"><label>Your code</label><div class="dm-codebox"><code>a1b2c3d4e5</code><button class="dm-btn small copy" tabindex="-1">Copy</button></div></div>
        <div class="dm-f"><label>Paste it in the head of your website (index.html)</label>
          <div class="dm-code"><div class="ln">&lt;head&gt;</div><div class="ln">&nbsp;&nbsp;&lt;title&gt;My Travel Blog&lt;/title&gt;</div><div class="ln tag"><span class="meta"></span></div><div class="ln">&lt;/head&gt;</div></div></div>
        <button class="dm-btn check" tabindex="-1">Check now</button>
        <div class="dm-prog"><i></i></div><div class="dm-st"></div>
        <div class="dm-chip end">Verified! Your listing now has the badge.</div></div></div>${FOOT}`,
    reset(d){ d.$(".meta").textContent = ""; d.$(".dm-st").textContent = ""; const b = d.$(".vb"); b.textContent = "Not verified"; b.classList.remove("good"); d.$(".dm-prog i").style.width = "0"; },
    async run(d){
      d.show(d.$(".p1")); await d.wait(900);
      await d.tap(d.$(".copy")); d.$(".copy").textContent = "Copied"; await d.wait(500);
      await d.type(d.$(".meta"), '<meta name="apphaat-verify" content="a1b2c3d4e5">', 22);
      d.$(".tag").classList.add("hl"); await d.wait(900);
      await d.tap(d.$(".check")); d.$(".dm-st").textContent = "Looking for your code...";
      d.$(".dm-prog i").style.width = "100%"; await d.wait(1600);
      d.$(".dm-st").textContent = "Found it!"; const b = d.$(".vb"); b.textContent = "Verified ✓"; b.classList.add("good");
      await d.wait(600); d.show(d.$(".end"));
    } },
  { cls: "c4", label: "Close the deal", title: "From message to sold, all in one chat.",
    text: "Chat with the seller, send an offer, counter until you agree, and mark the deal as sold.", cta: "Browse listings", go: "browse",
    html: `${BAR("Chat · Travel Blog (Website)")}<div class="dm-body">
      <div class="dm-pane p1 on-always"><div class="dm-item"><b>Travel Blog</b><span class="dm-sub">Asking $12,000</span><span class="dm-badge sd">Live</span></div>
        <div class="dm-b them m1">Hi! Is this still available?</div>
        <div class="dm-b me m2">Yes, it is. Happy to answer any questions.</div>
        <div class="dm-offer them m3"><span>Offer</span><b>$9,500</b></div>
        <div class="dm-offer me m4"><span>Counter offer</span><b>$10,800</b></div>
        <div class="dm-offer them m5"><span>Offer</span><b>$10,800</b><button class="dm-btn small acc" tabindex="-1">Accept</button><em class="okmark">Accepted ✓</em></div>
        <div class="dm-chip end">Both sides agreed on a price.</div>
        <button class="dm-btn sold" tabindex="-1">Mark as sold</button>
        <div class="dm-stamp">SOLD</div><div class="dm-conf"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div>${FOOT}`,
    reset(d){ const b = d.$(".sd"); b.textContent = "Live"; b.classList.remove("good"); },
    async run(d){
      d.show(d.$(".p1")); await d.wait(800);
      for (const s of [".m1", ".m2", ".m3", ".m4"]) { await d.wait(1000); d.show(d.$(s)); }
      await d.wait(1000); d.show(d.$(".m5")); await d.wait(700);
      await d.tap(d.$(".acc")); d.$(".m5").classList.add("done"); await d.wait(700); d.show(d.$(".end"));
      await d.wait(800); d.show(d.$(".sold")); await d.wait(600); await d.tap(d.$(".sold"));
      const b = d.$(".sd"); b.textContent = "Sold"; b.classList.add("good");
      d.show(d.$(".dm-stamp")); d.show(d.$(".dm-conf")); await d.wait(1800);
    } }
];

function buildDemo(sc){
  const card = document.createElement("article");
  card.className = "demo-card " + sc.cls;
  card.innerHTML = `<div class="demo-text"><div class="demo-label">${sc.label}</div><h3>${sc.title}</h3><p>${sc.text}</p><div class="row"><button class="btn gold" data-go="${sc.go}">${sc.cta}</button></div></div>
    <div class="demo-stage"><div class="demo-win" aria-hidden="true">${sc.html}</div><button class="demo-pause" aria-label="Pause or play the demo">${PAUSE_SVG}</button></div>`;
  const win = card.querySelector(".demo-win"), cur = win.querySelector(".dm-cursor"), pbtn = card.querySelector(".demo-pause");
  const st = { paused: false, visible: false, token: 0, fast: matchMedia("(prefers-reduced-motion: reduce)").matches };
  const d = {
    $: (s) => win.querySelector(s), $$: (s) => [...win.querySelectorAll(s)],
    show: (el) => el && el.classList.add("on"), hide: (el) => el && el.classList.remove("on"),
    async wait(ms){
      if (st.fast) return;
      const mine = st.token;
      for (let t = 0; t < ms;) { await sleep(60); if (mine !== st.token) throw new Error("stop"); if (!st.paused && st.visible) t += 60; }
    },
    async type(el, text, speed){
      if (st.fast) { el.textContent = text; return; }
      el.classList.add("typing");
      for (let i = 1; i <= text.length; i++) { el.textContent = text.slice(0, i); await d.wait(speed || 40); }
      el.classList.remove("typing");
    },
    async tap(el){
      if (st.fast) return;
      const w = win.getBoundingClientRect(), r = el.getBoundingClientRect();
      cur.style.transform = `translate(${Math.round(r.left - w.left + r.width * 0.6)}px, ${Math.round(r.top - w.top + r.height * 0.6)}px)`;
      cur.classList.add("on"); await d.wait(700);
      el.classList.add("pressed"); await d.wait(240); el.classList.remove("pressed");
    }
  };
  function clear(){
    win.querySelectorAll(".on").forEach(e => e.classList.remove("on"));
    win.querySelectorAll(".dm-v,.range,.t").forEach(e => { e.textContent = ""; });
    win.querySelectorAll(".done,.hl,.typing").forEach(e => e.classList.remove("done", "hl", "typing"));
    cur.style.transform = "translate(60%, 120%)";
    const cp = win.querySelector(".copy"); if (cp) cp.textContent = "Copy";
    sc.reset(d);
  }
  async function loop(){
    const mine = ++st.token;
    while (mine === st.token) {
      try { clear(); await sc.run(d); if (st.fast) return; await d.wait(3200); } catch (e) { return; }
    }
  }
  new IntersectionObserver(es => es.forEach(e => { st.visible = e.isIntersecting; }), { threshold: 0.3 }).observe(card);
  if (st.fast) st.visible = true;
  pbtn.onclick = () => { st.paused = !st.paused; pbtn.innerHTML = st.paused ? PLAY_SVG : PAUSE_SVG; };
  loop();
  return card;
}

const demoHost = $("demoCards");
if (demoHost) SCENES.forEach(sc => demoHost.appendChild(buildDemo(sc)));

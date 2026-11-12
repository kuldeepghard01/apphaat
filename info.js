/* AppHaat: tap-for-details panels (badges, steps, spots and numbers explain themselves) */
const STAT_INFO = {
  "Asking price": "The price the seller wants. If it is in a different currency from the one you picked, it is converted and shown with \u2248.",
  "Type": "Whether this is an app or a website.",
  "Monthly revenue": "Money the business brings in each month, before costs.",
  "Monthly profit": "What is left each month after costs.",
  "Profit multiple": "Asking price divided by yearly profit (monthly profit \u00D7 12). A multiple of 2.5x means the price equals 2.5 years of profit. Lower can mean better value, but always check the details.",
  "Age": "How long the app or website has been running.",
  "Monthly traffic": "Visitors or active users per month, as stated by the seller.",
  "Country": "Where the business is based, as stated by the seller."
};

function infoFor(el){
  const k = el.dataset.info;
  if (k === "how-list") return ["1. List", `<p>Create an account, pay the one-time account fee (${esc(money(ACCOUNT_FEE))}), then add your app or website with its price, numbers and description.</p><p>Every listing is reviewed before it goes live.</p><button class="btn gold" data-sell>Sell now</button>`];
  if (k === "how-verify") return ["2. Get verified", `<p>Prove you own it. Put your AppHaat code on your website, in a meta tag called apphaat-verify, or in your app store description. Then tap <b>Verify now</b> in My listings.</p><p>Verified listings get a badge, rank higher in trust, and are the only ones that can book a featured spot.</p>`];
  if (k === "how-connect") return ["3. Connect", `<p>Buyers send you a message and an optional offer. You reply by email and agree the deal directly.</p><p>For larger amounts, use a safe service such as Escrow.com, and always check ownership before you pay.</p>`];
  if (k === "verified") return ["Verified", "<p>The seller proved they control this website or app by placing an AppHaat code on it.</p>"];
  if (k === "unverified") return ["Not verified yet", "<p>The seller has not proved ownership yet. Ask them to verify before you pay or share anything private.</p>"];
  if (k === "spot") {
    const r = Number(el.dataset.rank), p = SLOT_PRICES[r], f = featured.find(x => x.rank === r);
    return [`Spot ${r} on the home page`, `<div class="stats">
      <div><span>Price</span><b>${esc(money(p))} / week</b></div>
      <div><span>In rupees</span><b>about \u20B9${esc(Math.round(p * USD_INR).toLocaleString("en-IN"))}</b></div>
      <div><span>Status</span><b>${f ? "Booked until " + esc(fmtDate(f.ends)) : "Available now"}</b></div>
      <div><span>Duration</span><b>7 days</b></div></div>
      <ul><li>Your listing appears in the Featured section at the top of the home page.</li><li>It carries a Sponsored label and your spot number.</li><li>Your listing must be live and verified.</li></ul>
      <p><b>How to book:</b> log in, open My listings, tap Get featured and request this spot. Pay as shown and we activate it.</p>
      <button class="btn gold" data-book>Book this spot</button>`];
  }
  const key = el.dataset.key;
  return [key, `<p>${STAT_INFO[key] || ""}</p><p class="hint">Numbers are entered by the seller. AppHaat does not check them unless the listing says so.</p>`];
}

document.addEventListener("click", e => {
  const c = e.target.closest("[data-cat]");
  if (c) {
    document.querySelectorAll("dialog[open]").forEach(d => d.close());
    $("fCat").value = c.dataset.cat; render();
    $("browse").scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (e.target.closest("[data-book]")) { $("infoDlg").close(); $("promoBtn").onclick(); return; }
  if (e.target.closest("[data-sell]")) { $("infoDlg").close(); openSell(); return; }
  const el = e.target.closest("[data-info]");
  if (!el) return;
  const [title, html] = infoFor(el);
  $("infoTitle").textContent = title; $("infoBody").innerHTML = html;
  if (!$("infoDlg").open) $("infoDlg").showModal();
});
document.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches('div[data-info]')) { e.preventDefault(); e.target.click(); }
});

/* AppHaat: fills the contact details on the policy pages from Admin > Settings */
settingsReady.then(() => {
  const set = { support_email: SUPPORT_EMAIL, business_name: BIZ.name, business_address: BIZ.address, support_phone: BIZ.phone };
  document.querySelectorAll("[data-set]").forEach(el => {
    const v = set[el.dataset.set];
    if (!v) { el.textContent = "(not added yet)"; return; }
    if (el.dataset.set === "support_email") el.innerHTML = `<a href="mailto:${esc(v)}">${esc(v)}</a>`;
    else el.textContent = v;
  });
});

/* Pricing page: show the current prices from Admin > Settings */
const priceBox = document.getElementById("priceBox");
if (priceBox) settingsReady.then(() => {
  const inr = (usd) => "\u20B9" + Math.round(usd * USD_INR).toLocaleString("en-IN");
  const both = (usd) => money(usd) + " (about " + inr(usd) + ")";
  const rows = [["Seller account fee (one time)", ACCOUNT_FEE > 0 ? both(ACCOUNT_FEE) : "Free"]]
    .concat(Object.keys(SLOT_PRICES).map(Number).sort((a, b) => a - b).map(k => ["Featured Spot " + k + " (per 7 days)", both(SLOT_PRICES[k])]));
  priceBox.innerHTML = rows.map(([a, b]) => `<div><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("");
});

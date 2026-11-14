/* AppHaat: Value Estimator. It gives a range from public sale data. It is a guide, not a promised price. */
/* Multiples = times ANNUAL profit. Based on Flippa H1 2026 averages and top quartiles by category. Review twice a year. */
const VAL_REVIEWED = "Nov 2026";
const VAL_MODELS = {
  content:   { label: "Content, blog or affiliate site", low: 1.6, high: 4.0,  rev: [0.5, 1.4], basis: "sold at about 2.3x annual profit on average, and 4.7x for the top quarter" },
  ecommerce: { label: "Ecommerce store",                 low: 1.1, high: 2.75, rev: [0.2, 0.5], basis: "sold at about 1.55x annual profit on average, and 2.75x for the top quarter" },
  saas:      { label: "SaaS or software",                low: 1.8, high: 4.1,  rev: [0.8, 2.5], basis: "sold at about 2.5x annual profit on average, and 4.1x for the top quarter" },
  app:       { label: "Mobile app",                      low: 1.8, high: 5.0,  rev: [0.5, 1.5], basis: "sold at about 2.6x annual profit on average, and 5.5x for the top quarter" },
  community: { label: "Community, media or marketplace", low: 1.2, high: 3.5,  rev: [0.4, 1.2], basis: "sold at about 1.6x annual profit on average, and 3.9x for the top quarter" }
};
const TREND_SCORE = { growing: 1, stable: 0.5, declining: 0 };
let lastEst = null, estFromSell = false;

const sig2 = (n) => { if (n < 100) return Math.round(n); const p = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; };
const fm = (n, cur) => (cur === "INR" ? "\u20B9" : "$") + sig2(n).toLocaleString(cur === "INR" ? "en-IN" : "en-US");
const level = (s) => (s >= 0.7 ? "strong" : s >= 0.4 ? "average" : "weak");

function estimateValue(i){
  const m = VAL_MODELS[i.type], profit = i.revenue - i.expenses;
  if (!(i.revenue > 0)) return { mode: "none" };
  if (!(profit > 0)) return { mode: "revenue", low: i.revenue * 12 * m.rev[0], high: i.revenue * 12 * m.rev[1], conf: "Very rough", profit };
  const parts = {
    age: Math.min(i.age, 6) / 6,
    trend: TREND_SCORE[i.trend],
    margin: Math.min(profit / i.revenue / 0.6, 1),
    audience: i.traffic > 0 ? Math.min(Math.log10(i.traffic + 1) / 5, 1) : 0.3
  };
  const score = parts.age * 0.25 + parts.trend * 0.3 + parts.margin * 0.3 + parts.audience * 0.15;
  const mid = m.low + (m.high - m.low) * score * 0.8, spread = (m.high - m.low) * 0.2; // 0.8 keeps the estimate careful: top-quarter prices need proof we cannot check
  const lo = Math.max(m.low, mid - spread), hi = Math.min(m.high, mid + spread), annual = profit * 12;
  return { mode: "profit", annual, lo, hi, low: annual * lo, high: annual * hi, parts, profit, conf: i.age < 1 ? "Rough" : "Reasonable" };
}

function tipsFor(r, i){
  const t = [];
  if (r.parts.trend < 0.4) t.push("Steady or growing revenue over the last 6 months raises the price buyers will pay.");
  if (r.parts.margin < 0.4) t.push("Higher profit margins (lower costs) raise the value.");
  if (r.parts.age < 0.4) t.push("A longer history gives buyers more trust. Keep clean records of revenue.");
  if (r.parts.audience < 0.5) t.push("A bigger, steadier audience helps. Diverse traffic sources are safer for buyers.");
  t.push("Verified ownership and screenshots of your revenue reports make buyers trust your numbers.");
  return t.slice(0, 3);
}

function renderEstimate(i, r){
  const cur = i.cur, m = VAL_MODELS[i.type];
  if (r.mode === "none") return '<div class="safe">We need your monthly revenue to estimate a value. Assets with no revenue are priced on future potential, which we cannot estimate reliably.</div>';
  lastEst = { cur, low: r.low, high: r.high };
  let ask = "";
  if (i.ask > 0) {
    ask = i.ask < r.low ? "Your asking price is below the estimated range. You may be underpricing."
      : i.ask <= r.high ? "Your asking price is inside the estimated range."
      : i.ask <= r.high * 1.3 ? "Your asking price is a little above the range. Buyers may negotiate."
      : "Your asking price is well above the range. Expect fewer offers unless you can prove strong growth.";
    ask = `<p>${esc(ask)}</p>`;
  }
  const how = r.mode === "profit"
    ? `<li>Net profit: ${esc(fm(i.revenue, cur))} revenue minus ${esc(fm(i.expenses, cur))} costs = ${esc(fm(r.profit, cur))} a month, or ${esc(fm(r.annual, cur))} a year.</li>
       <li>${esc(m.label)}s ${esc(m.basis)}. Your multiple: ${esc(r.lo.toFixed(1))}x to ${esc(r.hi.toFixed(1))}x annual profit.</li>
       <li>Age: ${esc(level(r.parts.age))}. Revenue trend: ${esc(level(r.parts.trend))}. Profit margin: ${esc(level(r.parts.margin))}. Audience size: ${esc(level(r.parts.audience))}.</li>`
    : `<li>Your costs are as high as your revenue, so there is no profit to value. We used a rough multiple of annual revenue (${esc(String(m.rev[0]))}x to ${esc(String(m.rev[1]))}x) instead.</li>`;
  return `<div class="stats"><div style="grid-column:1/-1"><span>Estimated value range</span><b style="font-size:22px">${esc(fm(r.low, cur))} to ${esc(fm(r.high, cur))}</b></div>
      <div><span>Confidence</span><b>${esc(r.conf)}</b></div><div><span>Method</span><b>${r.mode === "profit" ? "Profit multiple" : "Revenue multiple"}</b></div></div>
    ${ask}
    ${estFromSell ? '<div class="row"><button class="btn gold small" id="vUse">Use the middle of this range as my price</button></div>' : ""}
    <h3 style="font-size:16px;margin:12px 0 4px">How we calculated it</h3><ul class="info-body">${how}</ul>
    ${r.mode === "profit" ? `<h3 style="font-size:16px;margin:12px 0 4px">What can raise your value</h3><ul class="info-body">${tipsFor(r, i).map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    <div class="hint">This is an estimate, not a guaranteed market value. Real sale prices can be higher or lower. It uses public sale data by category (reviewed ${esc(VAL_REVIEWED)}) and the numbers you enter, which AppHaat does not verify. For a big deal, get a professional valuation.</div>`;
}

function openEstimator(fromSell){
  estFromSell = !!fromSell; lastEst = null;
  $("vOut").innerHTML = ""; $("vMsg").textContent = "";
  $("vCur").value = fromSell ? $("sCur").value : DISPLAY;
  if (fromSell) {
    const rev = $("sRev").value, pr = $("sProfit").value;
    $("vRev").value = rev; $("vExp").value = rev !== "" && pr !== "" ? Math.max(0, Number(rev) - Number(pr)) : "";
    $("vAge").value = $("sAge").value; $("vTraffic").value = $("sTraffic").value; $("vAsk").value = $("sPrice").value;
    const st = $("sType").value; $("vType").value = st === "website" ? "content" : st ? "app" : $("vType").value;
  }
  if (!$("valDlg").open) $("valDlg").showModal();
}

$("vType").innerHTML = Object.keys(VAL_MODELS).map(k => `<option value="${k}">${esc(VAL_MODELS[k].label)}</option>`).join("");
$("heroEst").onclick = () => openEstimator(false);
$("estBtn").onclick = () => openEstimator(true);
$("vGo").onclick = () => {
  const num = (id) => ($(id).value === "" ? NaN : Number($(id).value)), m = $("vMsg");
  const i = { type: $("vType").value, cur: $("vCur").value, revenue: num("vRev"), expenses: num("vExp"), age: num("vAge"), traffic: num("vTraffic") || 0, trend: $("vTrend").value, ask: num("vAsk") || 0 };
  m.className = "msg err";
  if (!(i.revenue >= 0) || !(i.expenses >= 0) || !(i.age >= 0)) { m.textContent = "Enter monthly revenue, monthly expenses and age. Numbers must be zero or more."; return; }
  m.textContent = "";
  $("vOut").innerHTML = renderEstimate(i, estimateValue(i));
  $("vOut").scrollIntoView({ behavior: "smooth", block: "nearest" });
};
document.addEventListener("click", e => {
  if (!e.target.closest("#vUse") || !lastEst) return;
  $("sPrice").value = sig2((lastEst.low + lastEst.high) / 2); $("sCur").value = lastEst.cur;
  $("valDlg").close(); toast("Price filled in. You can still change it.");
});

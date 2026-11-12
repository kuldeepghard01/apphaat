/* AppHaat: pay dialog (user side). Shows the payment options the admin set up. */
let payCtx = null;

async function openPay(purpose, amountUsd, refId){
  await settingsReady;
  payCtx = { purpose, amountUsd: Number(amountUsd), refId: refId || null };
  const inr = Math.round(payCtx.amountUsd * USD_INR);
  $("payFor").innerHTML = `Amount to pay: <b>${esc(money(payCtx.amountUsd))}</b> (about \u20B9${esc(inr.toLocaleString("en-IN"))})`;
  $("payMsg").textContent = ""; $("payRef").value = "";
  $("payList").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("payDlg").open) $("payDlg").showModal();
  const { data } = await sb.from("payment_methods").select("*").eq("enabled", true).order("created_at");
  const online = ONLINE_PAY ? `<div class="mine"><div class="mrow"><strong>Pay online (recommended)</strong></div><div class="hint">UPI, cards, net banking and wallets. Your account or spot is activated automatically. No reference needed.</div><div class="row"><button class="btn small" id="payOnline">Pay online</button></div></div>` : "";
  if ((!data || !data.length) && online) { $("payList").innerHTML = online; return; }
  if (!data || !data.length) {
    $("payList").innerHTML = `<div class="empty">Payment options are not set up yet. Please contact ${supportHtml()}.</div>`;
    return;
  }
  $("payList").innerHTML = online + data.map(x => methodHtml(x, payCtx.amountUsd, inr)).join("");
}

function methodHtml(x, usd, inr){
  let action = "";
  if (x.kind === "upi") {
    const u = `upi://pay?pa=${encodeURIComponent(x.value)}&pn=AppHaat&am=${inr.toFixed(2)}&cu=INR&tn=${encodeURIComponent("AppHaat payment")}`;
    action = `<div class="desc">${esc(x.value)}</div><div class="row"><a class="btn small" href="${esc(u)}">Open UPI app</a><button class="btn small ghost" data-copy="${esc(x.value)}">Copy UPI ID</button></div>`;
  } else if (x.kind === "paypal" && safeUrl(x.value)) {
    action = `<div class="row"><a class="btn small" target="_blank" rel="noopener noreferrer" href="${esc(safeUrl(x.value).replace(/\/+$/, "") + "/" + usd + "USD")}">Pay with PayPal</a></div>`;
  } else if (x.kind === "link" && safeUrl(x.value)) {
    action = `<div class="row"><a class="btn small" target="_blank" rel="noopener noreferrer" href="${esc(safeUrl(x.value))}">Pay now</a></div>`;
  } else {
    action = `<div class="desc">${esc(x.value)}</div><div class="row"><button class="btn small ghost" data-copy="${esc(x.value)}">Copy details</button></div>`;
  }
  return `<div class="mine"><div class="mrow"><strong>${esc(x.label)}</strong></div>${x.instructions ? `<div class="hint">${esc(x.instructions)}</div>` : ""}${action}</div>`;
}

document.addEventListener("click", async e => {
  const pb = e.target.closest(".payBtn");
  if (pb) {
    if (!user) { openAuth("login", "Please log in to pay."); return; }
    openPay(pb.dataset.purpose, pb.dataset.amount, pb.dataset.ref);
    return;
  }
  const po = e.target.closest("#payOnline");
  if (po) {
    po.disabled = true; po.textContent = "Please wait...";
    const { data, error } = await sb.functions.invoke("create-payment", { body: { purpose: payCtx.purpose, ref_id: payCtx.refId, return_url: location.origin + location.pathname } });
    if (error || !data || !data.url) { toast((data && data.error) || "Online payment is not available right now."); po.disabled = false; po.textContent = "Pay online"; return; }
    location.href = data.url;
    return;
  }
  const cp = e.target.closest("[data-copy]");
  if (cp) {
    try { await navigator.clipboard.writeText(cp.dataset.copy); toast("Copied."); } catch (err) { toast("Could not copy. Please copy it by hand."); }
  }
});

$("payGo").onclick = async () => {
  const m = $("payMsg"), ref = $("payRef").value.trim();
  m.className = "msg err";
  if (ref.length < 4) { m.textContent = "Enter the payment reference (UTR or transaction ID)."; return; }
  $("payGo").disabled = true; m.className = "msg"; m.textContent = "Sending...";
  const { error } = await sb.from("payments").insert({ user_id: user.id, purpose: payCtx.purpose, ref_id: payCtx.refId, amount_usd: payCtx.amountUsd, reference: ref });
  $("payGo").disabled = false;
  if (error) { m.className = "msg err"; m.textContent = error.code === "23505" ? "This reference was already submitted." : "Could not send. Please try again."; return; }
  $("payDlg").close();
  toast("Thanks! We will confirm your payment soon.");
};

/* When the visitor comes back from the payment page */
if (new URLSearchParams(location.search).get("razorpay_payment_link_status") === "paid") {
  toast("Payment received! Your account or spot is being activated.");
  history.replaceState(null, "", location.pathname);
}

/* AppHaat: admin tabs for payment methods and payment confirmations */
const KIND_LABEL = { upi: "UPI", paypal: "PayPal", link: "Payment link", bank: "Bank transfer", other: "Other" };
const KIND_HINT = {
  upi: "Your UPI ID, for example name@bank",
  paypal: "Your PayPal.me link, for example https://paypal.me/yourname",
  link: "A payment link for cards and net banking, for example from Razorpay or Stripe (https://...)",
  bank: "Bank name, account holder, account number, IFSC or SWIFT",
  other: "Any other payment instructions"
};

async function adminMethods(){
  const { data, error } = await sb.from("payment_methods").select("*").order("created_at");
  if (error) throw error;
  const list = (data || []).map(x => `<div class="mine">
    <div class="mrow"><strong>${esc(x.label)}</strong><span class="tag">${esc(KIND_LABEL[x.kind])}${x.enabled ? "" : " (off)"}</span></div>
    <div class="hint desc">${esc(x.value)}</div>
    <div class="row"><button class="btn small ghost pmTog" data-id="${esc(x.id)}" data-on="${x.enabled}">${x.enabled ? "Turn off" : "Turn on"}</button><button class="btn small ghost pmDel" data-id="${esc(x.id)}">Delete</button></div></div>`).join("")
    || '<div class="empty">No payment methods yet. Add one below.</div>';
  return list + `<h3 style="margin:16px 0 4px">Add a payment method</h3>
    <label for="pmKind">Type</label>
    <select class="f" id="pmKind">${Object.keys(KIND_LABEL).map(k => `<option value="${k}">${esc(KIND_LABEL[k])}</option>`).join("")}</select>
    <label for="pmLabel">Name users see</label>
    <input class="f" id="pmLabel" maxlength="60" placeholder="e.g. PhonePe or Google Pay">
    <label for="pmValue">Details</label>
    <textarea class="f" id="pmValue" maxlength="600"></textarea>
    <div class="hint" id="pmHint">${esc(KIND_HINT.upi)}</div>
    <label for="pmNote">Note for users (optional)</label>
    <input class="f" id="pmNote" maxlength="300" placeholder="e.g. Pay the exact amount shown">
    <div class="msg" id="pmMsg" role="status" aria-live="polite"></div>
    <div class="row"><button class="btn" id="pmAdd">Add method</button></div>`;
}

async function adminPayments(){
  const { data, error } = await sb.from("payments").select("*").order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  if (!data.length) return '<div class="empty">No payments yet.</div>';
  const em = await emailMap(data.map(p => p.user_id));
  const ids = data.filter(p => p.purpose === "slot" && p.ref_id).map(p => p.ref_id);
  const rq = {};
  if (ids.length) { const r = await sb.from("slot_requests").select("id,rank,listing_id").in("id", ids); (r.data || []).forEach(x => { rq[x.id] = x; }); }
  const tm = await titleMap(Object.values(rq).map(x => x.listing_id));
  return data.map(p => {
    const q = rq[p.ref_id];
    const what = p.purpose === "account" ? "Account fee" : q ? `Spot ${q.rank} for ${(tm[q.listing_id] || {}).title || "a listing"}` : "Featured spot";
    return `<div class="mine">
      <div class="mrow"><strong>${esc(money(p.amount_usd))} (about \u20B9${esc(Math.round(p.amount_usd * USD_INR).toLocaleString("en-IN"))})</strong><span class="tag">${esc(p.status)}</span></div>
      <div class="hint">${esc(em[p.user_id] || "unknown")} &middot; ${esc(what)} &middot; ${esc(fmtDate(p.created_at))}</div>
      <div class="hint">Reference: <b>${esc(p.reference)}</b>. Check it in your bank, UPI or PayPal app before confirming.</div>
      ${p.status === "pending" ? `<div class="row"><button class="btn small payOk" data-id="${esc(p.id)}" data-purpose="${esc(p.purpose)}" data-user="${esc(p.user_id)}">Confirm payment</button><button class="btn small ghost payNo" data-id="${esc(p.id)}">Reject</button></div>` : ""}
    </div>`;
  }).join("");
}

document.addEventListener("change", e => { if (e.target.id === "pmKind") $("pmHint").textContent = KIND_HINT[e.target.value]; });

document.addEventListener("click", async e => {
  if (!isAdmin) return;
  const done = (r, msg) => { if (r.error) toast("Action failed: " + r.error.message); else { toast(msg); renderAdmin(); } };
  if (e.target.closest("#pmAdd")) {
    const kind = $("pmKind").value, label = $("pmLabel").value.trim(), value = $("pmValue").value.trim(), m = $("pmMsg");
    m.className = "msg err";
    if (!label || !value) { m.textContent = "Enter a name and the details."; return; }
    if (kind === "upi" && !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(value)) { m.textContent = "Enter a valid UPI ID like name@bank."; return; }
    if ((kind === "paypal" || kind === "link") && !safeUrl(value)) { m.textContent = "Enter a full link that starts with https://"; return; }
    done(await run(sb.from("payment_methods").insert({ kind, label, value, instructions: $("pmNote").value.trim() || null })), "Payment method added.");
    return;
  }
  const tog = e.target.closest(".pmTog");
  if (tog) { done(await run(sb.from("payment_methods").update({ enabled: tog.dataset.on !== "true" }).eq("id", tog.dataset.id)), "Updated."); return; }
  const del = e.target.closest(".pmDel");
  if (del) { if (confirm("Delete this payment method?")) done(await run(sb.from("payment_methods").delete().eq("id", del.dataset.id)), "Deleted."); return; }
  const no = e.target.closest(".payNo");
  if (no) { done(await run(sb.from("payments").update({ status: "rejected" }).eq("id", no.dataset.id)), "Payment rejected."); return; }
  const ok = e.target.closest(".payOk");
  if (ok) {
    ok.disabled = true;
    if (ok.dataset.purpose === "account") {
      const r = await run(sb.from("profiles").update({ is_paid: true }).eq("id", ok.dataset.user));
      if (r.error) { ok.disabled = false; toast("Could not activate the account: " + r.error.message); return; }
    }
    done(await run(sb.from("payments").update({ status: "confirmed" }).eq("id", ok.dataset.id)),
      ok.dataset.purpose === "account" ? "Confirmed. The account is now active." : "Confirmed. Now activate the spot in Slot requests.");
  }
});

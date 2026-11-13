/* AppHaat: contact seller (buyer side) and messages inbox (seller side) */
let contactFor = null;

document.addEventListener("click", e => {
  const b = e.target.closest("#contactBtn");
  if (!b) return;
  const l = findListing(b.dataset.id);
  if (!l) return;
  if (!user) { $("detDlg").close(); openAuth("login", "Please log in to contact the seller."); return; }
  if (l.owner_id === user.id) { toast("This is your own listing."); return; }
  contactFor = l;
  $("contactFor").textContent = "About: " + l.title;
  $("contactMsg").textContent = "";
  $("contactDlg").showModal();
});

$("contactGo").onclick = async () => {
  const m = $("contactMsg"), msg = $("kMsg").value.trim(), offerRaw = $("kOffer").value;
  m.className = "msg err";
  if (!msg) { m.textContent = "Write a short message."; return; }
  const offer = offerRaw === "" ? null : Number(offerRaw);
  if (offer !== null && (!isFinite(offer) || offer < 0)) { m.textContent = "Enter a valid offer."; return; }
  $("contactGo").disabled = true; m.className = "msg"; m.textContent = "Sending...";
  const body = (msg + (offer !== null ? `\n\nMy offer: ${contactFor.currency || "USD"} ${offer}` : "")).slice(0, 1000);
  const { error } = await sb.from("chat_messages").insert({ listing_id: contactFor.id, buyer_id: user.id, sender_id: user.id, body });
  $("contactGo").disabled = false;
  if (error) { m.className = "msg err"; m.textContent = "Could not send your message. Please try again."; console.error(error); return; }
  $("kMsg").value = ""; $("kOffer").value = "";
  $("contactDlg").close(); $("detDlg").close();
  toast("Message sent. Replies appear in your Inbox.");
  openThread(contactFor.id, user.id, contactFor.title, "the seller");
};

/* Shown to the seller under each of their listings (see My listings) */
function inboxHtml(list, title){
  if (!list.length) return "";
  return `<details class="inq"><summary>Messages (${list.length})</summary>${list.slice(0, 10).map(x => `
    <div class="msgbox">
      <div class="meta"><span>${esc(x.buyer_email || "Buyer")}</span>${x.offer != null ? `<span class="price">Offer ${esc(money(x.offer))}</span>` : ""}<span>${esc(fmtDate(x.created_at))}</span></div>
      <p class="desc" style="margin:6px 0">${esc(x.message)}</p>
      ${x.buyer_email ? `<a class="btn small" href="mailto:${esc(x.buyer_email)}?subject=${encodeURIComponent("AppHaat: " + title)}">Reply by email</a>` : ""}
    </div>`).join("")}</details>`;
}

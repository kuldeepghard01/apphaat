/* AppHaat: wishlist (save a listing and see it again later) */
const setSave = (b, on) => { b.dataset.on = on ? "1" : "0"; b.innerHTML = on ? "&#9829; Saved" : "&#9825; Save"; };

const goneText = (id) => { const s = soldList.find(x => x.listing_id === id); return s ? `${s.title} was sold.` : "A saved listing is no longer available."; };

async function loadSaved(){
  if (!user) { savedIds = new Set(); render(); return; }
  const { data } = await sb.from("favorites").select("listing_id");
  savedIds = new Set((data || []).map(x => x.listing_id));
  render();
}

function paintSave(l){
  const b = $("saveBtn");
  if (!b) return;
  if (user && l.owner_id === user.id) { b.hidden = true; return; }
  setSave(b, savedIds.has(l.id));
}

async function openWishlist(){
  if (!user) { openAuth("login", "Log in to see your wishlist."); return; }
  $("wish").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("wishDlg").open) $("wishDlg").showModal();
  const { data, error } = await sb.from("favorites").select("listing_id,created_at,listings(*)").order("created_at", { ascending: false });
  if (error) { $("wish").innerHTML = '<div class="empty">Could not load your wishlist. Please try again.</div>'; return; }
  const rows = data || [];
  if (!rows.length) { $("wish").innerHTML = '<div class="empty">Your wishlist is empty. Tap Save on any listing to keep it here.</div>'; return; }
  const live = rows.filter(r => r.listings), gone = rows.filter(r => !r.listings);
  $("wish").innerHTML = `<div class="hint">${live.length} saved</div>
    <div class="grid compact">${live.map(r => `<div class="wish-item">${cardHtml(r.listings, null, true)}<button class="btn small ghost wishDel" data-id="${esc(r.listing_id)}">Remove</button></div>`).join("")}</div>
    ${gone.map(r => `<div class="mine"><div class="hint">${esc(goneText(r.listing_id))}</div><div class="row"><button class="btn small ghost wishDel" data-id="${esc(r.listing_id)}">Remove</button></div></div>`).join("")}`;
}

document.addEventListener("click", async e => {
  const t = e.target;
  if (t.closest("#pgoWish")) { $("profDlg").close(); openWishlist(); return; }
  const del = t.closest(".wishDel");
  if (del) {
    del.disabled = true;
    const { error } = await sb.from("favorites").delete().eq("listing_id", del.dataset.id).eq("user_id", user.id);
    if (error) { del.disabled = false; toast("Could not remove it. Please try again."); return; }
    savedIds.delete(del.dataset.id); toast("Removed from your wishlist."); render(); openWishlist();
    return;
  }
  const b = t.closest("#saveBtn");
  if (!b) return;
  if (!user) { $("detDlg").close(); openAuth("login", "Log in to save listings."); return; }
  const on = b.dataset.on === "1", id = b.dataset.id;
  b.disabled = true;
  const { error } = on
    ? await sb.from("favorites").delete().eq("listing_id", id).eq("user_id", user.id)
    : await sb.from("favorites").insert({ user_id: user.id, listing_id: id });
  b.disabled = false;
  if (error) { toast("Could not update. Please try again."); return; }
  if (on) savedIds.delete(id); else savedIds.add(id);
  setSave(b, !on); toast(on ? "Removed from your wishlist." : "Saved to your wishlist."); render();
});

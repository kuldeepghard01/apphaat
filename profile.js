/* AppHaat: my profile and public seller profiles */
const AVATAR_SVG = '<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="9.5" r="3.2"/><path d="M5.8 18.4c1.4-2.6 3.8-3.9 6.2-3.9s4.8 1.3 6.2 3.9"/></svg>';
const tile = (k, v) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`;
const since = (x) => new Date(x).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

async function openProfile(){
  if (!user) { openAuth("login"); return; }
  $("prof").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("profDlg").open) $("profDlg").showModal();
  const [p, l] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    sb.from("listings").select("id,status").eq("owner_id", user.id)
  ]);
  const me = p.data || {}, mine = l.data || [], ids = mine.map(x => x.id);
  let views = 0, chats = 0;
  if (ids.length) {
    const [s, c] = await Promise.all([sb.from("listing_stats").select("views").in("listing_id", ids), sb.from("chat_messages").select("listing_id,buyer_id").in("listing_id", ids)]);
    views = (s.data || []).reduce((a, x) => a + x.views, 0);
    chats = new Set((c.data || []).map(x => x.listing_id + x.buyer_id)).size;
  }
  const name = me.display_name || user.email.split("@")[0];
  $("prof").innerHTML = `
    <div class="dlg-head"><h2>My profile</h2><button class="x" data-close aria-label="Close">&times;</button></div>
    <div class="prof-top"><div class="avatar-lg">${AVATAR_SVG}</div>
      <div><b>${esc(name)}</b><div class="hint">${esc(user.email)}</div>
      <div class="hint">Member since ${esc(since(me.created_at || user.created_at))} &middot; ${me.is_paid ? '<span class="ok">Account active</span>' : '<span class="warn">Not activated</span>'}</div></div></div>
    <div class="stats">${tile("Listings", mine.length)}${tile("Live", mine.filter(x => x.status === "approved").length)}${tile("Views", views)}${tile("Chats", chats)}</div>
    <label for="pName">Display name</label><input class="f" id="pName" maxlength="40" value="${esc(me.display_name || "")}">
    <label for="pBio">About you</label><textarea class="f" id="pBio" maxlength="300">${esc(me.bio || "")}</textarea>
    <div class="row"><button class="btn" id="pSave">Save profile</button></div>
    <div class="row"><button class="btn small" id="pgoDash">Seller dashboard</button><button class="btn ghost small" id="pgoWish">Wishlist</button><button class="btn ghost small" id="pgoMine">My listings</button><button class="btn ghost small" id="pgoInbox">Inbox</button><button class="btn ghost small" id="pgoNotif">Notifications</button>${isAdmin ? '<button class="btn ghost small" id="pgoAdmin">Admin</button>' : ""}<button class="btn ghost small" id="pgoOut">Logout</button></div>`;
}

async function openSeller(id){
  $("seller").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("sellerDlg").open) $("sellerDlg").showModal();
  const [p, l] = await Promise.all([
    sb.from("public_profiles").select("*").eq("id", id).maybeSingle(),
    sb.from("listings").select("*").eq("owner_id", id).eq("status", "approved").order("created_at", { ascending: false })
  ]);
  const me = p.data || {}, list = l.data || [];
  $("seller").innerHTML = `
    <div class="dlg-head"><h2>Seller profile</h2><button class="x" data-close aria-label="Close">&times;</button></div>
    <div class="prof-top"><div class="avatar-lg">${AVATAR_SVG}</div>
      <div><b>${esc(me.display_name || "AppHaat seller")}</b>${me.created_at ? `<div class="hint">Member since ${esc(since(me.created_at))}</div>` : ""}</div></div>
    ${me.bio ? `<p class="desc">${esc(me.bio)}</p>` : ""}
    <div class="stats">${tile("Live listings", list.length)}${tile("Verified", list.filter(x => x.verified).length)}</div>
    <div class="grid compact">${list.map(x => cardHtml(x, null, true)).join("") || '<div class="empty">No live listings.</div>'}</div>`;
}

document.addEventListener("click", async e => {
  const t = e.target;
  if (t.closest("#pgoMine")) { $("profDlg").close(); openMine(); return; }
  if (t.closest("#pgoInbox")) { $("profDlg").close(); openInbox(); return; }
  if (t.closest("#pgoNotif")) { $("profDlg").close(); openNotifs(); return; }
  if (t.closest("#pgoAdmin")) { $("profDlg").close(); openAdmin(); return; }
  if (t.closest("#pgoOut")) {
    if (!confirm("Log out of AppHaat?")) return;
    try { await disablePush(); } catch (err) {}
    await sb.auth.signOut(); $("profDlg").close(); toast("You are logged out.");
    return;
  }
  if (t.closest("#pSave")) {
    const r = await run(sb.from("profiles").update({ display_name: $("pName").value.trim() || null, bio: $("pBio").value.trim() || null }).eq("id", user.id));
    toast(r.error ? "Could not save your profile." : "Profile saved.");
    return;
  }
  const sl = t.closest("[data-seller]");
  if (sl) { openSeller(sl.dataset.seller); return; }
  const vb = t.closest(".viewBtn");
  if (vb) {
    if (!findListing(vb.dataset.id)) { toast("This listing is not live yet."); return; }
    $("mineDlg").close(); openDetail(vb.dataset.id);
  }
});

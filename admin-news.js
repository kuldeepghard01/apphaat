/* AppHaat: admin News tab. These posts appear as posters on the home page. */
async function adminNews(){
  const { data, error } = await sb.from("news_posts").select("*").order("created_at", { ascending: false }).limit(30);
  const list = (data || []).map(n => `<div class="mine"><div class="mrow"><strong>${esc(n.title)}</strong><span class="tag">${n.published ? "Live" : "Hidden"}</span></div>
    ${n.summary ? `<div class="hint">${esc(n.summary)}</div>` : ""}
    <div class="row"><button class="btn small ghost newsDel" data-id="${esc(n.id)}" data-img="${esc(n.image_url || "")}">Remove</button></div></div>`).join("") || '<div class="empty">No news yet. Add your first post below.</div>';
  return (error ? '<div class="safe">The News table is missing. Run the News SQL first.</div>' : "") + list + `<h3 style="font-size:18px;margin:16px 0 4px">Add a news post</h3>
    <label for="nTitle">Title</label><input class="f" id="nTitle" maxlength="120">
    <label for="nSum">Short text (optional)</label><input class="f" id="nSum" maxlength="300">
    <label for="nLink">Link (optional)</label><input class="f" id="nLink" type="text" inputmode="url" autocapitalize="off" placeholder="https://example.com">
    <label for="nImg">Poster image (optional, shown in 16:9)</label><input class="f" id="nImg" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
    <div class="msg" id="nMsg" role="status" aria-live="polite"></div>
    <div class="row"><button class="btn" id="nGo">Publish</button></div>`;
}

document.addEventListener("click", async e => {
  if (!isAdmin) return;
  const del = e.target.closest(".newsDel");
  if (del) {
    if (!confirm("Remove this news post?")) return;
    const r = await sb.from("news_posts").delete().eq("id", del.dataset.id).select("id");
    if (r.error || !r.data.length) { toast("Could not remove it."); return; }
    const p = bannerPath(del.dataset.img); if (p) sb.storage.from("banners").remove([p]);
    toast("News post removed."); loadNews(); renderAdmin();
    return;
  }
  if (!e.target.closest("#nGo")) return;
  const m = $("nMsg"), title = $("nTitle").value.trim(), f = $("nImg").files[0];
  let link = $("nLink").value.trim();
  m.className = "msg err";
  if (title.length < 3) { m.textContent = "Write a title (at least 3 letters)."; return; }
  if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
  if (link && !safeUrl(link)) { m.textContent = "The link must be a valid web address."; return; }
  if (f && (!BAN_TYPES[f.type] || f.size > 3145728)) { m.textContent = "The image must be PNG, JPG, WebP or GIF, up to 3 MB."; return; }
  $("nGo").disabled = true; m.className = "msg"; m.textContent = "Publishing...";
  try {
    let image_url = null;
    if (f) {
      const path = `news-${Date.now()}.${BAN_TYPES[f.type]}`;
      const up = await sb.storage.from("banners").upload(path, f, { contentType: f.type, upsert: false });
      if (up.error) throw up.error;
      image_url = sb.storage.from("banners").getPublicUrl(path).data.publicUrl;
    }
    const r = await sb.from("news_posts").insert({ title, summary: $("nSum").value.trim() || null, link: link || null, image_url }).select("id");
    if (r.error || !r.data.length) throw (r.error || new Error("not saved"));
    toast("News post published."); loadNews(); renderAdmin();
  } catch (err) {
    $("nGo").disabled = false; m.className = "msg err"; m.textContent = "Could not publish: " + (err && err.message ? err.message : "please try again.");
  }
});

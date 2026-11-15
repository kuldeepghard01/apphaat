/* AppHaat: upload or remove the top banner image. The banner follows the image's own shape (any ratio). */
const UP_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>';
const BAN_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

function bannerPreviewHtml(){
  const u = safeUrl(BANNER.image), r = Number(BANNER.ratio);
  return u ? `<div class="banner-prev"><img src="${esc(u)}" alt="Current banner"></div><div class="hint">Shape: ${r ? esc(r.toFixed(2)) + " wide for every 1 tall" : "automatic"}</div>` : '<div class="hint">No banner image yet.</div>';
}
const readSize = (file) => new Promise((ok, no) => {
  const u = URL.createObjectURL(file), i = new Image();
  i.onload = () => { URL.revokeObjectURL(u); ok({ w: i.naturalWidth, h: i.naturalHeight }); };
  i.onerror = () => { URL.revokeObjectURL(u); no(new Error("This file is not a readable image.")); };
  i.src = u;
});
const bannerPath = (url) => { const i = String(url).indexOf("/banners/"); return i < 0 ? "" : decodeURIComponent(String(url).slice(i + 9).split("?")[0]); };

async function saveBannerImage(url, ratio){
  const r = await sb.from("settings").upsert([{ key: "banner_image", value: url }, { key: "banner_ratio", value: ratio }]).select("key");
  if (r.error || !r.data || r.data.length < 2) throw new Error(r.error ? r.error.message : "nothing was saved");
  await loadSettings(); paintBanner();
}

document.addEventListener("click", async e => {
  if (!isAdmin) return;
  if (e.target.closest("#banPick")) { $("banFile").click(); return; }
  if (!e.target.closest("#banDel")) return;
  if (!confirm("Remove the banner image?")) return;
  try {
    const old = bannerPath(BANNER.image);
    await saveBannerImage("", "");
    if (old) sb.storage.from("banners").remove([old]);
    $("banPreview").innerHTML = bannerPreviewHtml(); $("banDel").hidden = true; toast("Banner image removed.");
  } catch (err) { toast("Could not remove it: " + err.message); }
});

document.addEventListener("change", async e => {
  if (e.target.id !== "banFile" || !isAdmin) return;
  const f = e.target.files[0], m = $("cMsg");
  if (!f) return;
  m.className = "msg err";
  if (!BAN_TYPES[f.type]) { m.textContent = "Use a PNG, JPG, WebP or GIF image."; e.target.value = ""; return; }
  if (f.size > 3145728) { m.textContent = "The image must be 3 MB or smaller."; e.target.value = ""; return; }
  m.className = "msg"; m.textContent = "Uploading...";
  try {
    const { w, h } = await readSize(f);
    const path = `banner-${Date.now()}.${BAN_TYPES[f.type]}`;
    const up = await sb.storage.from("banners").upload(path, f, { contentType: f.type, upsert: false });
    if (up.error) throw up.error;
    const old = bannerPath(BANNER.image);
    await saveBannerImage(sb.storage.from("banners").getPublicUrl(path).data.publicUrl, String(Math.round(w / h * 1000) / 1000));
    if (old) sb.storage.from("banners").remove([old]);
    m.className = "msg good"; m.textContent = "Banner image uploaded."; toast("Banner image is live.");
    $("banPreview").innerHTML = bannerPreviewHtml(); $("banDel").hidden = false;
  } catch (err) {
    m.className = "msg err"; m.textContent = "Could not upload: " + (err && err.message ? err.message : "please try again."); console.error(err);
  }
  e.target.value = "";
});

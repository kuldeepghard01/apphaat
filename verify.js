/* AppHaat: step-by-step ownership verification (opens right after a listing is submitted) */
let verifyFor = null, verifyMethod = "meta";

async function openVerify(id){
  if (!user) { openAuth("login"); return; }
  $("verBody").innerHTML = '<div class="empty">Loading...</div>';
  if (!$("verifyDlg").open) $("verifyDlg").showModal();
  const { data: l } = await sb.from("listings").select("id,title,type,link,verify_code,verified,status").eq("id", id).maybeSingle();
  if (!l) { $("verBody").innerHTML = '<div class="empty">Could not load this listing.</div>'; return; }
  verifyFor = l;
  verifyMethod = l.type === "website" ? "meta" : "store";
  paintVerify();
}

const copyRow = (text, label) => `<div class="codebox"><code>${esc(text)}</code><button class="btn small ghost" data-copy="${esc(text)}">${esc(label || "Copy")}</button></div>`;
const tipsHtml = `<details class="inq"><summary>Where do I paste it? (WordPress, Wix, Shopify, Blogger, HTML)</summary>
  <div class="hint"><b>WordPress:</b> install the free plugin "WPCode" (or "Insert Headers and Footers"), open it, and paste into the Header box. Save.</div>
  <div class="hint"><b>Wix:</b> Settings, Custom code, Add code. Paste it, choose "Head", apply to all pages.</div>
  <div class="hint"><b>Shopify:</b> Online Store, Themes, Edit code, open theme.liquid and paste right after the opening head tag.</div>
  <div class="hint"><b>Blogger:</b> Theme, Edit HTML, paste right after the opening head tag.</div>
  <div class="hint"><b>Your own HTML or GitHub Pages:</b> open index.html and paste right after the opening head tag.</div>
  <div class="hint">Menu names can differ a little between versions.</div></details>`;

function stepsFor(l, m){
  const code = l.verify_code;
  let host = "", origin = "";
  try { const u = new URL(l.link); host = u.hostname.replace(/^www\./, ""); origin = u.origin; } catch (e) {}
  if (m === "meta") return `<ol class="steps"><li>Copy this tag.${copyRow(`<meta name="apphaat-verify" content="${code}">`, "Copy tag")}</li>
    <li>Paste it inside the head part of your website's home page.${tipsHtml}</li>
    <li>Save or publish your site, wait about a minute, then tap <b>Check now</b>.</li></ol>`;
  if (m === "file") return `<ol class="steps"><li>Create a plain text file with this name.${copyRow("apphaat-verify.txt", "Copy name")}</li>
    <li>Put only this code inside it.${copyRow(code, "Copy code")}</li>
    <li>Upload it to your site's main folder, so this address opens it: <a href="${esc(origin + "/apphaat-verify.txt")}" target="_blank" rel="noopener noreferrer">${esc(origin + "/apphaat-verify.txt")}</a></li>
    <li>Tap <b>Check now</b>. (Wix and Shopify cannot host files like this, so use the Meta tag method there.)</li></ol>`;
  if (m === "dns") return `<ol class="steps"><li>Log in where you bought your domain (GoDaddy, Namecheap, Cloudflare and others).</li>
    <li>Add a TXT record for <b>${esc(host || "your domain")}</b>. Name: <b>@</b> (or leave empty). Value:${copyRow("apphaat-verify=" + code, "Copy value")}</li>
    <li>Wait a few minutes (sometimes a few hours), then tap <b>Check now</b>.</li></ol>`;
  return `<ol class="steps"><li>Open your developer console (Google Play Console or App Store Connect) and open this app's store listing.</li>
    <li>Add this line at the end of the full description.${copyRow("AppHaat verify: " + code, "Copy line")}</li>
    <li>Publish the update. Store updates can take a few hours or a day.</li>
    <li>Come back and tap <b>Check now</b>. If our check cannot see it, use the manual check below.</li></ol>`;
}

function paintVerify(){
  const l = verifyFor, isSite = l.type === "website";
  $("verTitle").textContent = "Verify " + l.title;
  if (l.verified) { $("verBody").innerHTML = '<div class="safe ok"><b>Verified.</b> Your listing now has the Verified badge, and you can book featured spots.</div><div class="row"><button class="btn" data-close>Done</button></div>'; return; }
  const methods = isSite ? [["meta", "Meta tag (easiest)"], ["file", "Upload a file"], ["dns", "DNS record"]] : [["store", "App description"]];
  $("verBody").innerHTML = `<p style="margin-top:0">Prove that you own this ${isSite ? "website" : "app"}. It takes about 2 minutes. Verified listings get a <b>Verified badge</b>, buyers trust them more, and only they can book featured spots.</p>
    <div class="hint">Your code</div>${copyRow(l.verify_code, "Copy code")}
    ${methods.length > 1 ? `<div class="chips" style="margin:10px 0">${methods.map(([k, t]) => `<button class="chip verM" data-m="${k}" aria-pressed="${k === verifyMethod}">${t}</button>`).join("")}</div>` : ""}
    ${stepsFor(l, verifyMethod)}
    <div class="row"><button class="btn" id="verCheck">Check now</button></div>
    <div id="verOut"></div>
    <details class="inq"><summary>Still stuck? Ask for a manual check</summary>
      <p class="hint">Tell us how you can prove it is yours (for example, which developer account it is under). We will look at it and verify it by hand.</p>
      <textarea class="f" id="verNote" maxlength="500" placeholder="Your note"></textarea>
      <div class="row"><button class="btn ghost small" id="verAsk">Send request</button></div></details>`;
}

async function runCheck(){
  const out = $("verOut"), b = $("verCheck");
  b.disabled = true; b.textContent = "Checking..."; out.innerHTML = "";
  const { data, error } = await sb.functions.invoke("verify-listing", { body: { listing_id: verifyFor.id } });
  b.disabled = false; b.textContent = "Check now";
  if (error || !data || data.error) { out.innerHTML = '<div class="safe">The automatic check is not available right now. Please try again in a moment, or ask for a manual check below.</div>'; return; }
  if (data.verified) { verifyFor.verified = true; toast("Verified! Your listing now has the badge."); load(); paintVerify(); return; }
  const link = safeUrl(verifyFor.link);
  out.innerHTML = data.reason === "unreachable"
    ? `<div class="safe"><b>We could not open your link.</b> Check that the address is correct, the site is online, and it does not need a login or block visitors.${link ? ` <a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Open my link</a>` : ""}</div>`
    : `<div class="safe"><b>We could not find your code yet.</b> Please check:<ul class="info-body"><li>You copied the whole code exactly.</li><li>You saved or published the change.</li><li>${verifyMethod === "meta" ? "The tag is inside the head part of the home page." : verifyMethod === "file" ? "The file opens at the address shown above and has only the code." : verifyMethod === "dns" ? "The TXT record is on the main domain. DNS can take time." : "The store update is live."}</li><li>Wait a minute or two and try again. Some sites keep an old copy for a short while.</li></ul></div>`;
}

document.addEventListener("click", async e => {
  const t = e.target;
  const vo = t.closest(".verOpen"); if (vo) { $("mineDlg").close(); openVerify(vo.dataset.id); return; }
  const vm = t.closest(".verM"); if (vm) { verifyMethod = vm.dataset.m; paintVerify(); return; }
  if (t.closest("#verCheck")) { runCheck(); return; }
  if (t.closest("#verAsk")) {
    const note = $("verNote").value.trim();
    const r = await sb.from("verify_requests").upsert({ listing_id: verifyFor.id, user_id: user.id, note: note || null }, { onConflict: "listing_id" });
    toast(r.error ? "Could not send the request. Please try again." : "Request sent. We will check it and get back to you.");
  }
});

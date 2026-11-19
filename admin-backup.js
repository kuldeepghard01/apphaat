/* AppHaat: download a full backup of the app data (admin only) */
function backupHtml(){
  let last = "";
  try { last = localStorage.getItem("apphaat_backup_at") || ""; } catch (e) {}
  const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 864e5) : null;
  return `<h3 style="font-size:18px;margin:16px 0 4px">Data backup</h3>
    <div class="hint">Last backup: ${last ? esc(new Date(last).toLocaleDateString("en-GB")) + " (" + days + (days === 1 ? " day" : " days") + " ago)" : "never"}. Download one every week and keep the file safe, for example in your Google Drive.</div>
    <div class="row"><button class="btn ghost small" type="button" id="bkGo">Download backup</button></div>
    <div class="msg" id="bkMsg" role="status" aria-live="polite"></div>`;
}

document.addEventListener("click", async e => {
  if (!e.target.closest("#bkGo") || !isAdmin) return;
  const b = $("bkGo"), m = $("bkMsg");
  b.disabled = true; m.className = "msg"; m.textContent = "Preparing your backup...";
  const { data, error } = await sb.functions.invoke("backup-export");
  b.disabled = false;
  if (error || !data || data.error) { m.className = "msg err"; m.textContent = (data && data.error) || "Could not make the backup. Please try again."; return; }
  const file = new Blob([JSON.stringify(data)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = "apphaat-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  try { localStorage.setItem("apphaat_backup_at", new Date().toISOString()); } catch (err) {}
  const rows = Object.values(data.tables || {}).reduce((t, x) => t + x.length, 0);
  m.className = "msg good"; m.textContent = "Backup downloaded (" + rows + " records).";
});

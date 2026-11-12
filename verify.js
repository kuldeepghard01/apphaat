/* AppHaat: automatic ownership check (calls the verify-listing function in Supabase) */
document.addEventListener("click", async e => {
  const b = e.target.closest(".verBtn");
  if (!b) return;
  b.disabled = true; b.textContent = "Checking...";
  const { data, error } = await sb.functions.invoke("verify-listing", { body: { listing_id: b.dataset.id } });
  if (error || !data || data.error) {
    toast((data && data.error) || "Could not check right now. Please try again.");
    b.disabled = false; b.textContent = "Verify now";
    return;
  }
  if (data.verified) { toast("Verified! Your listing now has the badge."); openMine(); return; }
  toast("Code not found on your page yet. Check the tag and try again in a minute.");
  b.disabled = false; b.textContent = "Verify now";
});

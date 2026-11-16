/* AppHaat: fills the contact details on the policy pages from Admin > Settings */
settingsReady.then(() => {
  const set = { support_email: SUPPORT_EMAIL, business_name: BIZ.name, business_address: BIZ.address, support_phone: BIZ.phone };
  document.querySelectorAll("[data-set]").forEach(el => {
    const v = set[el.dataset.set];
    if (!v) { el.textContent = "(not added yet)"; return; }
    if (el.dataset.set === "support_email") el.innerHTML = `<a href="mailto:${esc(v)}">${esc(v)}</a>`;
    else el.textContent = v;
  });
});

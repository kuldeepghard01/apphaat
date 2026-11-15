/* AppHaat: Browse all listings (the full list with search, filters and Load more) */
function openBrowse(){
  browseLimit = 24;
  render();
  if (!$("browseDlg").open) $("browseDlg").showModal();
}
$("heroBrowse").onclick = openBrowse;
$("seeAll").onclick = openBrowse;
$("bMore").onclick = () => { browseLimit += 24; render(); };
$("homeGo").onclick = () => { query = $("homeQ").value.trim(); $("q").value = query; openBrowse(); };
$("homeQ").addEventListener("keydown", e => { if (e.key === "Enter") $("homeGo").click(); });
document.addEventListener("click", e => { if (e.target.closest("#footBrowse")) { e.preventDefault(); openBrowse(); } });

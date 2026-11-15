/* AppHaat: every popup opens as a full-screen layer, and the phone's Back button closes the top layer */
(function(){
  const layers = [];
  let skipPop = 0;
  const open = HTMLDialogElement.prototype.showModal;

  HTMLDialogElement.prototype.showModal = function(){
    const was = this.open;
    open.call(this);
    if (was || layers.includes(this)) return;
    layers.push(this);
    history.pushState({ layer: layers.length }, "");
    this.addEventListener("close", () => {
      const i = layers.indexOf(this);
      if (i === -1) return;          // already removed by the Back button
      layers.splice(i, 1);
      skipPop++;                      // we remove our own history entry, so ignore that Back event
      history.back();
    }, { once: true });
  };

  window.addEventListener("popstate", () => {
    if (skipPop > 0) { skipPop--; return; }
    const top = layers.pop();
    if (top && top.open) top.close();
  });
})();

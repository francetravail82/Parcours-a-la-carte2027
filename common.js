/* Décor : pièces d'or et bulles qui flottent (palette France Travail) */
(function () {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = document.getElementById("decor");
  if (!box) return;
  const colors = ["#406bde", "#6370c9", "#00a8e8"];

  function spawn() {
    const el = document.createElement("div");
    const size = Math.random() * 60 + 18;
    const gold = Math.random() < 0.55;
    el.className = "coin" + (gold ? " gold" : "");
    el.style.width = el.style.height = size + "px";
    el.style.left = Math.random() * 100 + "%";
    if (!gold) el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDuration = Math.random() * 15 + 15 + "s";
    box.appendChild(el);
    setTimeout(() => el.remove(), 30000);
  }
  setInterval(spawn, 1400);
})();

/* =====================================================
   MOTEUR DE LA CHASSE AU TRÉSOR
   Charge les données (data.js > loadData), affiche la carte
   et dévoile les établissements un par un.
   Le parcours à jouer est choisi par l'adresse : parcours.html?p=<id>
   ===================================================== */
(async function () {
  const $ = id => document.getElementById(id);
  const CENTER = [48.6493, -2.0255];

  const data = await loadData();
  const wanted = new URLSearchParams(location.search).get("p");
  const P = wanted ? data.parcours.find(p => String(p.id) === wanted) : data.parcours[0];

  if (!P) {
    $("pTitle").textContent = "Parcours introuvable";
    document.title = "Parcours introuvable – France Travail";
    $("start-btn").style.display = "none";
    const fog = $("fog");
    if (fog) fog.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i><h2 class="title">Ce parcours n\'existe pas</h2>' +
      '<p>Le lien est peut-être ancien. Reviens à l\'accueil pour choisir un parcours.</p>' +
      '<a class="start-btn" href="index.html"><i class="fa-solid fa-house"></i> Retour à l\'accueil</a>';
    $("intro").style.display = "none";
    return;
  }

  const steps = P.steps.map((s, i) => Object.assign({}, s, {
    photo: s.photo_url ? { url: s.photo_url, credit: s.name } : defaultPhoto(i)
  }));
  const TOTAL = steps.length;
  const MINUTES = data.settings.duration_minutes;
  const DURATION = MINUTES * 60;
  const pt = s => s.coords || CENTER;

  let current = -1;       // index de l'établissement en cours
  let found = 0;          // énigmes résolues
  let secondsLeft = DURATION;
  let timer = null;
  let started = false;
  const pins = [];

  /* ---------- Habillage de la page ---------- */
  document.title = P.title + " – Chasse au trésor – France Travail";
  $("pTitle").textContent = P.title;
  $("score").textContent = "0/" + TOTAL;
  $("timer").textContent = fmt(DURATION);
  $("intro").innerHTML = "<b>Règle du jeu :</b> chaque établissement dévoilé t'invite à <b>déposer ton CV</b>. " +
    "L'équipe t'aide à résoudre l'énigme, qui débloque le suivant. " + TOTAL + " établissement" + (TOTAL > 1 ? "s" : "") + ", " + MINUTES + " minutes&nbsp;!";
  if (data.settings.rallying_point) {
    const r = $("rv"); r.hidden = false;
    r.innerHTML = '<i class="fa-solid fa-flag"></i> Point de ralliement : ' + esc(data.settings.rallying_point);
  }
  ["start-btn", "fog-start"].forEach(id => {
    const b = $(id); if (!b) return;
    b.disabled = false;
    b.innerHTML = id === "start-btn" ? '<i class="fa-solid fa-play"></i> Cliquez ici pour commencer' : '<i class="fa-solid fa-play"></i> Commencer la chasse';
  });

  /* ---------- Utilitaires ---------- */
  function norm(t) {
    return t.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[’'`\-]/g, " ").replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ").trim()
      .replace(/^(le|la|les|l|un|une)\s+/, "");
  }
  function fmt(s) { return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }

  function confettiBurst(times) {
    if (typeof confetti !== "function") return;
    for (let i = 0; i < (times || 3); i++) {
      confetti({ particleCount: 90, spread: 160, origin: { x: Math.random(), y: Math.random() * 0.6 }, gravity: 0.8, zIndex: 20000 });
    }
  }

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2300);
  }

  function openModal(html, cls) {
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = '<div class="modal ' + (cls || "") + '">' + html + "</div>";
    document.body.appendChild(bg);
    return bg;
  }

  /* Média : vidéo locale > photo locale > photo de l'établissement (lien) > photo HD par défaut */
  function mediaHTML(step, alt) {
    return '<div class="media" data-id="' + esc(step.id) + '">' +
      '<img alt="' + esc(alt) + '" src="' + esc(step.photo.url) + '" loading="lazy">' +
      '<span class="credit">' + esc(step.photo.credit) + "</span></div>";
  }
  function upgradeMedia(root, step) {
    const box = root.querySelector(".media");
    if (!box) return;
    const img = box.querySelector("img");
    // 1) photo de l'établissement déposée dans media/etablissements/<id>.jpg (facultatif)
    const local = new Image();
    local.onload = () => { img.src = local.src; box.querySelector(".credit").textContent = step.name; };
    local.src = "media/etablissements/" + encodeURIComponent(step.id) + ".jpg";
    // 2) vidéo de l'établissement (facultatif)
    const v = document.createElement("video");
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.controls = true;
    v.preload = "metadata";
    v.addEventListener("loadeddata", () => { box.insertBefore(v, box.firstChild); v.play().catch(() => {}); });
    v.src = "media/etablissements/" + encodeURIComponent(step.id) + ".mp4";
  }

  /* ---------- Carte (centrée sur le premier établissement, zone élargie) ---------- */
  const map = L.map("map", { minZoom: 14, maxZoom: 19 }).setView(pt(steps[0]), 17);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
  setTimeout(() => map.invalidateSize(), 250);
  const route = L.polyline([], { color: "#ea6367", weight: 4, dashArray: "8 10" }).addTo(map);

  function pinIcon(i, state) {
    const inner = state === "done" ? '<i class="fa-solid fa-check"></i>' : i + 1;
    return L.divIcon({ className: "", html: '<div class="pin ' + state + '">' + inner + "</div>", iconSize: [40, 40], iconAnchor: [20, 20] });
  }

  function addPin(i) {
    const m = L.marker(pt(steps[i]), { icon: pinIcon(i, "current"), title: steps[i].name }).addTo(map);
    m.on("click", () => { map.flyTo(pt(steps[i]), 18, { duration: 0.8 }); if (i === current) openQuestion(); });
    pins[i] = m;
    route.setLatLngs(steps.slice(0, i + 1).map(pt));
  }

  /* ---------- Carnet de bord ---------- */
  function renderSteps() {
    $("steps").innerHTML = steps.map((s, i) => {
      let cls = "locked", label = "Établissement mystère", sub = "À débloquer";
      if (i < found) { cls = "done"; label = esc(s.name); sub = "CV déposé · énigme résolue"; }
      else if (i === current) { cls = "current"; label = esc(s.name); sub = "Trésor en cours"; }
      const n = i < found ? '<i class="fa-solid fa-check"></i>' : i + 1;
      return '<li class="step ' + cls + '"><span class="n">' + n + "</span><div>" + label + "<small>" + sub + "</small></div></li>";
    }).join("");
    $("score").textContent = found + "/" + TOTAL;
  }

  function showClue() {
    const s = steps[current];
    const box = $("clue");
    const site = safeUrl(s.website);
    box.innerHTML = mediaHTML(s, s.name) +
      '<div class="body">' +
        '<span class="tag">Établissement ' + (current + 1) + " sur " + TOTAL + "</span>" +
        '<h3 class="title">' + esc(s.name) + "</h3>" +
        '<p class="addr"><i class="fa-solid fa-location-dot"></i> ' + esc(s.address) +
          (site ? '<br><a href="' + esc(site) + '" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Site web</a>' : "") + "</p>" +
        '<div class="mission"><b>Ta mission :</b> entre, présente-toi et <b>dépose ton CV</b>. Échange avec l\'équipe : c\'est ta clé pour résoudre l\'énigme et débloquer le prochain établissement.</div>' +
        '<button class="btn" id="openQ"><i class="fa-solid fa-key"></i> Résoudre l\'énigme</button>' +
      "</div>";
    box.style.display = "block";
    $("openQ").addEventListener("click", openQuestion);
    upgradeMedia(box, s);
  }

  /* ---------- Déroulé ---------- */
  function reveal(i) {
    current = i;
    addPin(i);
    renderSteps();
    showClue();
    map.flyTo(pt(steps[i]), 18, { duration: 1.2 });
    $("clue").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function start() {
    if (started) return;
    started = true;
    $("start-btn").style.display = "none";
    const fog = $("fog"); if (fog) fog.remove();
    $("intro").style.display = "none";
    timer = setInterval(() => {
      secondsLeft--;
      $("timer").textContent = fmt(Math.max(secondsLeft, 0));
      if (secondsLeft <= 0) { clearInterval(timer); finish(false); }
    }, 1000);
    reveal(0);
  }

  function openQuestion() {
    if (current < 0 || current >= TOTAL) return;
    const s = steps[current];
    const bg = openModal(
      '<button class="close-btn" aria-label="Fermer">×</button>' +
      '<span class="kicker">Énigme n°' + (current + 1) + "</span>" +
      '<h3 class="title">' + esc(s.name) + "</h3>" +
      '<p class="q">' + esc(s.q) + "</p>" +
      '<div class="mission"><i class="fa-solid fa-file-lines"></i> Dépose ton CV dans l\'établissement et discute avec l\'équipe pour trouver la réponse.</div>' +
      '<form id="qForm" autocomplete="off"><input id="answer" type="text" placeholder="Ta réponse…" aria-label="Ta réponse">' +
      '<div class="msg" id="msg"></div>' +
      '<div class="modal-actions"><button type="button" class="b-alt" id="hintBtn"><i class="fa-solid fa-lightbulb"></i> Indice</button>' +
      '<button type="submit" class="b-main"><i class="fa-solid fa-unlock"></i> Valider</button></div></form>'
    );
    const modal = bg.querySelector(".modal");
    bg.querySelector(".close-btn").onclick = () => bg.remove();
    const input = bg.querySelector("#answer"); input.focus();
    const msg = bg.querySelector("#msg");

    bg.querySelector("#hintBtn").onclick = () => {
      msg.className = "msg hint";
      msg.textContent = s.hint ? "Indice : " + s.hint : "Pas d'indice pour cette énigme : demande à l'équipe !";
    };

    bg.querySelector("#qForm").addEventListener("submit", e => {
      e.preventDefault();
      const v = norm(input.value);
      if (!v) return;
      if (s.accept.some(a => norm(a) === v)) {
        bg.remove();
        solved();
      } else {
        msg.className = "msg err";
        msg.textContent = "Ce n'est pas la bonne réponse, réessaie !";
        modal.classList.remove("shake"); void modal.offsetWidth; modal.classList.add("shake");
        input.select();
      }
    });
  }

  function solved() {
    pins[current].setIcon(pinIcon(current, "done"));
    found++;
    confettiBurst(3);
    toast('<i class="fa-solid fa-stamp"></i> Étape validée !');
    if (found >= TOTAL) {
      renderSteps();
      $("clue").style.display = "none";
      clearInterval(timer);
      setTimeout(() => finish(true), 900);
    } else {
      setTimeout(() => reveal(current + 1), 700);
    }
  }

  function finish(win) {
    const used = DURATION - Math.max(secondsLeft, 0);
    const html = win
      ? '<div class="chest"><i class="fa-solid fa-gem"></i></div>' +
        '<h3 class="title">Trésor trouvé !</h3>' +
        "<p>Bravo, tu as visité les " + TOTAL + " établissements et déposé tes CV.</p>" +
        '<div class="result"><div><b>' + found + "/" + TOTAL + "</b>énigmes</div><div><b>" + fmt(used) + "</b>temps</div></div>"
      : '<div class="chest"><i class="fa-solid fa-hourglass-end"></i></div>' +
        '<h3 class="title">Temps écoulé !</h3>' +
        "<p>Tu as trouvé " + found + " trésor" + (found > 1 ? "s" : "") + " sur " + TOTAL + ". Bien joué, la chasse continue sur le terrain !</p>";
    const bg = openModal(
      html + '<div class="modal-actions">' +
      '<a class="b-gold" href="questionnaire.html"><i class="fa-solid fa-comment-dots"></i> Donner mon avis</a>' +
      '<a class="b-alt" href="index.html"><i class="fa-solid fa-house"></i> Accueil</a></div>'
    );
    if (win) { confettiBurst(5); setTimeout(() => confettiBurst(4), 900); }
    void bg;
  }

  /* ---------- Initialisation ---------- */
  $("start-btn").addEventListener("click", start);
  $("fog-start").addEventListener("click", start);
  renderSteps();
})();

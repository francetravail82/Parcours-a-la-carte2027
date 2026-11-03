/* =====================================================
   DONNÉES DE LA CHASSE AU TRÉSOR
   Les établissements, parcours et énigmes sont désormais
   gérés dans la page admin.html (base Supabase).
   Ce fichier contient :
     - les photos par défaut,
     - le chargeur de données (Supabase > cache > secours),
     - des données de SECOURS (Saint-Malo) utilisées si la base
       est injoignable ou non configurée.
   ===================================================== */

/* Photos HD libres de droits (Wikimedia Commons). */
const commons = (file, w = 2000) =>
  "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=" + w;

const PHOTOS = {
  remparts:  { file: "Remparts-st-malo-cote-port-.jpg",                       title: "Les remparts",            credit: "Pline · Wikimedia Commons" },
  chateau:   { file: "Saint-Malo - château depuis le Sillon.jpg",             title: "Le château",              credit: "Guillaume Piolle · Wikimedia Commons" },
  fort:      { file: "Fort-National-DSC 6293.jpg",                            title: "Le Fort National",        credit: "Pline · Wikimedia Commons" },
  vue:       { file: "Saint-Malo 20180530 40.jpg",                            title: "Saint-Malo intra-muros",  credit: "Georges Seguin (Okki) · Wikimedia Commons" },
  cathedrale:{ file: "Saint-Malo - Cathédrale Saint-Vincent - Choeur.jpg",    title: "La cathédrale Saint-Vincent", credit: "Jean-Christophe Benoist · Wikimedia Commons" },
  hermine:   { file: "Saint-Malo - armes de Bretagne.jpg",                    title: "Les armes de Bretagne",   credit: "Wikimedia Commons" }
};

/* Photo par défaut d'une étape (si l'établissement n'a pas de photo_url) : on fait tourner ces images. */
const PHOTO_ORDER = ["vue", "remparts", "chateau", "cathedrale", "hermine", "fort"];
function defaultPhoto(i, w) {
  const p = PHOTOS[PHOTO_ORDER[i % PHOTO_ORDER.length]];
  return { url: commons(p.file, w || 2000), credit: p.credit };
}

/* ---------- Sécurité d'affichage : tout texte venant de la base est échappé ---------- */
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = u => (/^https?:\/\//i.test(u || "") ? u : "");

/* ---------- Données de SECOURS ---------- */
const _E = {
  monsieur:    { id: "monsieur",    name: "Monsieur Madame",          coords: [48.64652164024668, -2.0263622722532184], address: "2 rue de Dinan, 35400 Saint-Malo",             website: "https://monsieurmadamebrasserie.com/fr" },
  armoricaine: { id: "armoricaine", name: "La Brasserie Armoricaine", coords: [48.6490533769641,  -2.0273456587614365], address: "6 rue du Boyer, 35400 Saint-Malo",             website: "https://www.hotel-armoricaine.com/" },
  ginette:     { id: "ginette",     name: "Le Croiseur Ginette",      coords: [48.64973426972223, -2.024604330109633],  address: "2 place de la Poissonnerie, 35400 Saint-Malo", website: "https://www.lecroiseur-ginette.com/" },
  cavoua:      { id: "cavoua",      name: "Cavoua Coffee Spot",       coords: [48.65025552662146, -2.0239766293855572], address: "3 rue des Orbettes, 35400 Saint-Malo",         website: "https://bonjour.cavoua.fr/summer" },
  cambusier:   { id: "cambusier",   name: "Le Cambusier",             coords: [48.64801544576959, -2.024409816433667],  address: "6 rue des Cordiers, 35400 Saint-Malo",         website: "https://www.cambusier.fr/" }
};
const _S = (est, q, accept, hint) => Object.assign({}, _E[est], { q: q, accept: accept, hint: hint });

const DEFAULT_DATA = {
  settings: { duration_minutes: 50, rallying_point: "" },
  parcours: [
    { id: 1, title: "Parcours numéro 1", steps: [
      _S("monsieur",    "Quel est le plat emblématique de l'Ille-et-Vilaine ?",         ["galette saucisse"],                    "Ça se mange avec les doigts, et c'est une crêpe de sarrasin roulée autour d'une saucisse grillée."),
      _S("armoricaine", "Comment s'appelle la muraille qui entoure la vieille ville ?", ["remparts", "rempart"],                  "On peut en faire le tour à pied : environ 2 km au-dessus de la mer."),
      _S("ginette",     "Comment s'appelle le palais de Saint-Malo ?",                  ["palais du grand large", "grand large"], "Son nom parle d'horizons lointains et d'océan…"),
      _S("cavoua",      "Comment s'appelle la fête foraine de Saint-Malo ?",            ["sainte ouine", "la sainte ouine"],     "Elle porte le nom d'une sainte… qui n'existe pas vraiment !"),
      _S("cambusier",   "Quel animal est l'emblème de la Bretagne ?",                   ["hermine", "l'hermine"],                "Son pelage blanc, moucheté de noir, figure sur le drapeau breton (le Gwenn-ha-du).")
    ] },
    { id: 2, title: "Parcours numéro 2", steps: [
      _S("monsieur",    "Quel est le plat emblématique de l'Ille-et-Vilaine ?",         ["galette saucisse"],                    "Ça se mange avec les doigts, et c'est une crêpe de sarrasin roulée autour d'une saucisse grillée."),
      _S("cambusier",   "Quel animal est l'emblème de la Bretagne ?",                   ["hermine", "l'hermine"],                "Son pelage blanc, moucheté de noir, figure sur le drapeau breton (le Gwenn-ha-du)."),
      _S("cavoua",      "Comment s'appelle la fête foraine de Saint-Malo ?",            ["sainte ouine", "la sainte ouine"],     "Elle porte le nom d'une sainte… qui n'existe pas vraiment !"),
      _S("ginette",     "Qui est le corsaire le plus connu de Saint-Malo ?",            ["surcouf", "robert surcouf"],           "Il a capturé le navire anglais « Kent » en 1800."),
      _S("armoricaine", "Comment s'appelle la muraille qui entoure la vieille ville ?", ["remparts", "rempart"],                  "On peut en faire le tour à pied : environ 2 km au-dessus de la mer.")
    ] }
  ]
};

/* ---------- Chargeur : Supabase > dernier cache > secours ---------- */
const CACHE_KEY = "chasse-data-v1";

function normalizeData(parcoursRows, settingRows) {
  const set = {};
  (settingRows || []).forEach(r => { set[r.key] = r.value; });
  const dur = parseInt(set.duration_minutes, 10);
  return {
    settings: { duration_minutes: dur > 0 ? dur : 50, rallying_point: set.rallying_point || "" },
    parcours: (parcoursRows || []).map(p => ({
      id: p.id,
      title: p.title,
      steps: (p.steps || []).slice()
        .sort((a, b) => a.position - b.position)
        .filter(s => s.establishments)
        .map(s => ({
          id: s.establishments.id,
          name: s.establishments.name,
          address: s.establishments.address,
          website: s.establishments.website || "",
          coords: (s.establishments.lat != null && s.establishments.lng != null) ? [s.establishments.lat, s.establishments.lng] : null,
          photo_url: s.establishments.photo_url || "",
          q: s.question,
          accept: s.accept || [],
          hint: s.hint || ""
        }))
    })).filter(p => p.steps.length)
  };
}

async function loadData() {
  if (typeof SUPABASE_URL === "string" && SUPABASE_URL && typeof SUPABASE_ANON_KEY === "string" && SUPABASE_ANON_KEY) {
    try {
      const h = { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY };
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 8000);
      const [pr, st] = await Promise.all([
        fetch(SUPABASE_URL + "/rest/v1/parcours?select=id,title,position,steps(position,question,accept,hint,establishments(*))&active=eq.true&order=position.asc", { headers: h, signal: ctrl.signal }),
        fetch(SUPABASE_URL + "/rest/v1/settings?select=key,value", { headers: h, signal: ctrl.signal })
      ]);
      clearTimeout(to);
      if (!pr.ok || !st.ok) throw new Error("HTTP " + pr.status + " / " + st.status);
      const data = normalizeData(await pr.json(), await st.json());
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
      data.source = "en ligne";
      return data;
    } catch (e) {
      console.warn("Base injoignable, utilisation du cache ou des données de secours :", e);
      try {
        const c = localStorage.getItem(CACHE_KEY);
        if (c) { const d = JSON.parse(c); d.source = "cache"; return d; }
      } catch (e2) {}
    }
  }
  const d = JSON.parse(JSON.stringify(DEFAULT_DATA));
  d.source = "secours";
  return d;
}

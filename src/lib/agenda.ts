// ============================================================================
//  L'AGENDA DE NEXUS.
//
//  Aharon : « il faut que la mascotte puisse ajouter un évènement dans mon
//  agenda quand je lui demande, et qu'elle me demande si c'est sur mon site ou
//  sur le truc de macOS ».
//
//  Impossible tant que l'agenda ne contenait RIEN : c'était une grille de
//  mois, quatre-vingt-dix-neuf lignes, sans un seul évènement. On ne pouvait
//  pas y écrire parce qu'il n'y avait pas d'endroit où écrire.
//
//  Voici cet endroit. Et la passerelle vers le Calendrier de macOS : un
//  fichier « .ics », le format que tous les agendas savent lire — c'est la
//  seule façon honnête depuis un site, et elle marche vraiment.
// ============================================================================

export type Evenement = {
  id: string;
  titre: string;
  /// « 2026-09-12 » — la journée, toujours.
  jour: string;
  /// « 14:30 » ou vide pour un évènement sans heure.
  heure?: string;
  /// En minutes. Une heure par défaut.
  duree?: number;
  note?: string;
  /// D'où il vient : de la main d'Aharon, ou d'une demande faite à Nexus.
  source?: "moi" | "nexus";
};

const CLE = "nexus.events";

export function lireEvenements(): Evenement[] {
  try {
    const b = localStorage.getItem(CLE);
    const l = b ? JSON.parse(b) : [];
    return Array.isArray(l) ? l : [];
  } catch { return []; }
}

function ecrire(l: Evenement[]) {
  try {
    localStorage.setItem(CLE, JSON.stringify(l));
    // Le même signal que les tâches : l'agenda ouvert se met à jour tout seul,
    // sans qu'on ait à le fermer et le rouvrir.
    window.dispatchEvent(new CustomEvent("nexus:persist-update", { detail: { key: CLE } }));
  } catch { /* rangement refusé */ }
}

export function ajouterEvenement(e: Omit<Evenement, "id">): Evenement {
  const neuf: Evenement = {
    ...e,
    id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  const l = lireEvenements();
  l.push(neuf);
  // Triés par date : un agenda qui n'est pas dans l'ordre ne sert à rien.
  l.sort((a, b) => (a.jour + (a.heure || "")).localeCompare(b.jour + (b.heure || "")));
  ecrire(l);
  return neuf;
}

export function retirerEvenement(id: string) {
  ecrire(lireEvenements().filter((e) => e.id !== id));
}

// ── Comprendre une date écrite à la main ────────────────────────────────────

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
              "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function deuxChiffres(n: number) { return String(n).padStart(2, "0"); }
export function enJour(d: Date) {
  return `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`;
}

/// Lire « demain à 14h », « le 12 septembre », « vendredi », « 12/09 à 8h30 ».
///
/// On ne rend une date QUE si on l'a vraiment reconnue. Deviner une date que
/// l'utilisateur n'a pas donnée, c'est lui poser un rendez-vous au hasard :
/// mieux vaut demander.
export function comprendreQuand(texte: string): { jour?: string; heure?: string } {
  const t = texte.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "");   // sans accents, pour comparer
  const maintenant = new Date();
  let jour: string | undefined;

  if (/\baujourd\s?hui\b/.test(t)) jour = enJour(maintenant);
  else if (/\bdemain\b/.test(t)) {
    const d = new Date(maintenant); d.setDate(d.getDate() + (/apres[- ]demain/.test(t) ? 2 : 1));
    jour = enJour(d);
  }

  if (!jour) {
    // « lundi », « vendredi prochain » : le prochain jour qui porte ce nom.
    for (let i = 0; i < 7; i++) {
      const nom = JOURS[i].normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (!new RegExp(`\\b${nom}\\b`).test(t)) continue;
      const d = new Date(maintenant);
      let ecart = (i - d.getDay() + 7) % 7;
      if (ecart === 0) ecart = 7;                       // « lundi » un lundi = le suivant
      d.setDate(d.getDate() + ecart);
      jour = enJour(d);
      break;
    }
  }

  if (!jour) {
    // « 12 septembre », « le 3 mars 2027 »
    const m = t.match(/\b(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?/);
    if (m) {
      const mois = ["janvier","fevrier","mars","avril","mai","juin","juillet",
                    "aout","septembre","octobre","novembre","decembre"].indexOf(m[2]);
      const an = m[3] ? Number(m[3]) : maintenant.getFullYear();
      const d = new Date(an, mois, Number(m[1]));
      // Sans année précisée, une date déjà passée désigne l'an prochain.
      if (!m[3] && d < new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate())) {
        d.setFullYear(an + 1);
      }
      jour = enJour(d);
    }
  }

  if (!jour) {
    // « 12/09 », « 12/09/2026 »
    const m = t.match(/\b(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?\b/);
    if (m) {
      const an = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]))
                      : maintenant.getFullYear();
      jour = enJour(new Date(an, Number(m[2]) - 1, Number(m[1])));
    }
  }

  // L'heure : « 14h », « 14h30 », « 14:30 », « à 8 h ».
  let heure: string | undefined;
  const h = t.match(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/);
  if (h) {
    const hh = Number(h[1]);
    if (hh >= 0 && hh <= 23) heure = `${deuxChiffres(hh)}:${h[2] || "00"}`;
  }

  return { jour, heure };
}

/// Le titre, débarrassé de la demande et de la date.
///
/// ATTENTION AUX ACCENTS. En JavaScript, « \b » ne connaît que les lettres
/// sans accent : entre « ô » et « l », il croit voir une frontière de mot. Ma
/// première version cherchait « \ble\s+ » pour retirer les articles… et
/// « contrôle de maths » devenait « Contrô maths ». Un mot sur deux du
/// français est concerné.
/// On délimite donc les mots à la main, par ce qui les entoure vraiment.
const AVANT = "(?:^|[\\s,;:.!?'\u2019(\\[-])";
const APRES = "(?=[\\s,;:.!?'\u2019)\\]-]|$)";
function retirerMots(t: string, mots: string[]): string {
  const re = new RegExp(AVANT + "(?:" + mots.join("|") + ")" + APRES, "gi");
  // On remplace par une espace : coller les voisins créerait des mots faux.
  return t.replace(re, " ");
}

export function comprendreQuoi(texte: string): string {
  let t = texte.replace(
    /^.*?(?:ajoute|ajouter|mets|met|note|noter|cr[ée]e|cr[ée]er|inscris|rajoute)\s+(?:moi\s+)?/i, "");
  t = retirerMots(t, ["dans mon agenda", "dans l['\u2019]agenda", "dans mon calendrier",
                      "[àa] mon agenda", "sur mon agenda",
                      "un [ée]v[ée]nement", "[ée]v[ée]nement",
                      "un rendez[- ]vous", "rendez[- ]vous", "un rdv", "rdv"]);
  t = retirerMots(t, ["aujourd['\u2019 ]?hui", "demain", "apr[èe]s[- ]demain",
                      "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
                      "prochain", "prochaine"]);
  // Les dates écrites, puis les heures.
  t = t.replace(/\d{1,2}\s+(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre)(?:\s+\d{4})?/gi, " ")
       .replace(/\d{1,2}[\/.]\d{1,2}(?:[\/.]\d{2,4})?/g, " ")
       .replace(/\d{1,2}\s*(?:h|:)\s*\d{0,2}/gi, " ");
  // Les petits mots qui restent SEULS (« le », « à », « de ») — jamais ceux
  // qui sont à l'intérieur d'un mot.
  // « l » et « d » seuls : quand on écrit vite, l'apostrophe saute — « l
  // anniversaire », « contrôle d histoire ». Sans eux le titre gardait la
  // lettre orpheline.
  t = retirerMots(t, ["le", "la", "les", "l['\u2019]?", "du", "de", "des", "d['\u2019]?",
                      "pour", "[àa]", "au", "aux", "en"]);
  t = t.replace(/\s{2,}/g, " ").replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g, "").trim();
  if (!t) t = "Rendez-vous";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ── La passerelle vers le Calendrier de macOS ───────────────────────────────

/// Fabrique le fichier que le Calendrier de macOS (et Google, et Outlook)
/// savent ouvrir. C'est la seule façon honnête depuis un site : un navigateur
/// n'a pas le droit d'écrire dans l'agenda du système, et prétendre le
/// contraire serait mentir.
export function versIcs(e: Evenement): string {
  const [a, m, j] = e.jour.split("-").map(Number);
  const [hh, mm] = (e.heure || "09:00").split(":").map(Number);
  const debut = new Date(a, m - 1, j, hh, mm);
  const fin = new Date(debut.getTime() + (e.duree || 60) * 60_000);
  const q = (d: Date) =>
    `${d.getFullYear()}${deuxChiffres(d.getMonth() + 1)}${deuxChiffres(d.getDate())}`
    + `T${deuxChiffres(d.getHours())}${deuxChiffres(d.getMinutes())}00`;
  // Les retours à la ligne d'un .ics sont des CRLF, et le texte doit être
  // échappé : une virgule non échappée casse le fichier en silence.
  const ech = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nexus//FR",
    "BEGIN:VEVENT",
    `UID:${e.id}@nexus`,
    `DTSTAMP:${q(new Date())}`,
    `DTSTART:${q(debut)}`,
    `DTEND:${q(fin)}`,
    `SUMMARY:${ech(e.titre)}`,
    e.note ? `DESCRIPTION:${ech(e.note)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

/// Enregistre le .ics : macOS l'ouvre dans Calendrier d'un double-clic.
export function telechargerIcs(e: Evenement) {
  const b = new Blob([versIcs(e)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = `${e.titre.replace(/[^\p{L}\p{N} -]/gu, "").slice(0, 40) || "evenement"}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/// Pour l'affichage : « jeudi 12 septembre, 14:30 ».
export function enFrancais(e: Evenement): string {
  const [a, m, j] = e.jour.split("-").map(Number);
  const d = new Date(a, m - 1, j);
  return `${JOURS[d.getDay()]} ${j} ${MOIS[m - 1]}${e.heure ? `, ${e.heure}` : ""}`;
}

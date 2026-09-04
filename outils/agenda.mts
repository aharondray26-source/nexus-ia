// Le banc de l'agenda de Nexus.
//
// Chaque ligne est une phrase qu'Aharon pourrait vraiment écrire. Deux d'entre
// elles ont été FAUSSES avant d'être corrigées, et c'est pour ça qu'elles sont
// ici : « contrôle de maths » devenait « Contrô maths », parce qu'en
// JavaScript « \b » ne connaît pas les accents et croyait voir le mot « le »
// à l'intérieur de « contrôle ». Un mot sur deux du français est concerné.
import { comprendreQuand, comprendreQuoi, versIcs, enJour } from "../src/lib/agenda.ts";

const aujourdhui = new Date();
const dans = (n: number) => {
  const d = new Date(aujourdhui); d.setDate(d.getDate() + n); return enJour(d);
};
const prochainJour = (cible: number) => {
  const d = new Date(aujourdhui);
  let e = (cible - d.getDay() + 7) % 7; if (e === 0) e = 7;
  d.setDate(d.getDate() + e); return enJour(d);
};

const CAS: [string, string, string | null, string | null][] = [
  // phrase, titre attendu, jour attendu, heure attendue
  ["ajoute un rendez-vous chez le dentiste demain à 14h", "Chez dentiste", dans(1), "14:00"],
  ["mets dans mon agenda le contrôle de maths vendredi", "Contrôle maths", prochainJour(5), null],
  ["ajoute réunion projet le 12 septembre à 9h30", "Réunion projet", null, "09:30"],
  ["note l anniversaire de Léa le 03/11", "Anniversaire Léa", null, null],
  ["ajoute contrôle d histoire jeudi", "Contrôle histoire", prochainJour(4), null],
  ["mets l oral de français mardi prochain à 10h", "Oral français", prochainJour(2), "10:00"],
  ["ajoute devoir de SVT lundi", "Devoir SVT", prochainJour(1), null],
  ["ajoute match de foot samedi à 15h", "Match foot", prochainJour(6), "15:00"],
  ["ajoute cours de guitare mardi à 18h", "Cours guitare", prochainJour(2), "18:00"],
  // Sans date : Nexus doit se taire plutôt que d'en inventer une.
  ["bonjour comment ça va", "Bonjour comment ça va", null, null],
];

let faux = 0;
for (const [phrase, titre, jour, heure] of CAS) {
  const q = comprendreQuand(phrase);
  const t = comprendreQuoi(phrase);
  const okT = t === titre;
  const okJ = jour === null || q.jour === jour;
  const okH = heure === null || q.heure === heure;
  const ok = okT && okJ && okH;
  if (!ok) faux++;
  console.log(`  ${ok ? "✓" : "✗"} ${JSON.stringify(phrase).padEnd(52)} → `
    + `${(q.jour || "—").padEnd(11)} ${(q.heure || "—").padEnd(6)} « ${t} »`
    + (ok ? "" : `   ATTENDU « ${titre} » ${jour || ""} ${heure || ""}`));
}

// Le fichier pour le Calendrier de macOS : une virgule non échappée le casse
// en silence, et l'évènement n'apparaît jamais.
const ics = versIcs({ id: "x", titre: "Contrôle, maths", jour: "2026-09-12", heure: "09:30" });
const bon = ics.includes("DTSTART:20260912T093000")
         && ics.includes("SUMMARY:Contrôle\\, maths")
         && ics.startsWith("BEGIN:VCALENDAR")
         && ics.includes("\r\n");
console.log(`  ${bon ? "✓" : "✗"} le fichier .ics est bien formé (dates, virgule échappée, CRLF)`);
if (!bon) faux++;

console.log(faux === 0
  ? `  → l'agenda comprend les ${CAS.length} phrases`
  : `  → ${faux} cas FAUX`);
process.exit(faux === 0 ? 0 : 1);

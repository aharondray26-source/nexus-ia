// Un ecrivain ZIP minimal, en pur navigateur.
// Pas de compression (methode « stored ») : c'est parfaitement valide, tous les
// systemes savent l'ouvrir, et ca evite d'embarquer une bibliotheque entiere
// pour trois fichiers. C'est ce qui permet de telecharger l'extension Nexus en
// UN seul fichier au lieu de cinq.

const CRC: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface EntreeZip {
  nom: string;
  donnees: Uint8Array;
}

export function creerZip(entrees: EntreeZip[]): Blob {
  const enc = new TextEncoder();
  const morceaux: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let position = 0;

  const u16 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
  const u32 = (v: number) =>
    new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);
  const joindre = (parts: Uint8Array[]) => {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };

  for (const e of entrees) {
    const nom = enc.encode(e.nom);
    const somme = crc32(e.donnees);
    const entete = joindre([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(somme), u32(e.donnees.length), u32(e.donnees.length),
      u16(nom.length), u16(0), nom,
    ]);
    morceaux.push(entete, e.donnees);
    central.push(joindre([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(somme), u32(e.donnees.length), u32(e.donnees.length),
      u16(nom.length), u16(0), u16(0), u16(0), u16(0), u32(0),
      u32(position), nom,
    ]));
    position += entete.length + e.donnees.length;
  }

  const repertoire = joindre(central);
  const fin = joindre([
    u32(0x06054b50), u16(0), u16(0),
    u16(entrees.length), u16(entrees.length),
    u32(repertoire.length), u32(position), u16(0),
  ]);
  return new Blob([joindre(morceaux), repertoire, fin], { type: "application/zip" });
}

export async function fichierDistant(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("Fichier introuvable : " + url);
  return new Uint8Array(await r.arrayBuffer());
}

export const enOctets = (t: string) => new TextEncoder().encode(t);

// ============================================================================
//  LIRE un zip. On n'en écrivait que.
//
//  Il en faut un pour ouvrir les .docx : un fichier Word est un ZIP dont le
//  texte vit dans `word/document.xml`. Plutôt que d'ajouter une bibliothèque
//  pour ça, on se sert de `DecompressionStream`, présent dans tous les
//  navigateurs récents — et l'on dit franchement quand il manque, au lieu de
//  rendre un document vide.
// ============================================================================

/// Les fichiers d'un zip, par leur nom. Ne décompresse QUE ce qu'on demande
/// (`seulement`) : un .docx contient une vingtaine de pièces dont une seule
/// nous intéresse.
export async function lireZip(
  octets: Uint8Array,
  seulement?: (nom: string) => boolean,
): Promise<Record<string, Uint8Array>> {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  const u16 = (p: number) => vue.getUint16(p, true);
  const u32 = (p: number) => vue.getUint32(p, true);

  // La fin du catalogue est en queue de fichier, après un commentaire de
  // longueur libre : on la cherche à reculons.
  let fin = -1;
  for (let p = octets.length - 22; p >= 0 && p > octets.length - 66000; p--) {
    if (u32(p) === 0x06054b50) { fin = p; break; }
  }
  if (fin < 0) throw new Error("Ce fichier n'est pas un zip lisible.");

  const nombre = u16(fin + 10);
  let p = u32(fin + 16);
  const out: Record<string, Uint8Array> = {};
  const decodeur = new TextDecoder();

  for (let i = 0; i < nombre; i++) {
    if (u32(p) !== 0x02014b50) break;
    const methode = u16(p + 10);
    const taille = u32(p + 20);            // compressée
    const nomLong = u16(p + 28);
    const extraLong = u16(p + 30);
    const commentLong = u16(p + 32);
    const local = u32(p + 42);
    const nom = decodeur.decode(octets.subarray(p + 46, p + 46 + nomLong));
    p += 46 + nomLong + extraLong + commentLong;

    if (seulement && !seulement(nom)) continue;
    if (u32(local) !== 0x04034b50) continue;
    const debut = local + 30 + u16(local + 26) + u16(local + 28);
    const brut = octets.subarray(debut, debut + taille);

    if (methode === 0) { out[nom] = brut; continue; }
    if (methode !== 8) continue;           // une compression qu'on ne sait pas lire
    if (typeof DecompressionStream === "undefined") {
      throw new Error("Ce navigateur ne sait pas décompresser un .docx.");
    }
    const flux = new Blob([brut as BlobPart]).stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
    out[nom] = new Uint8Array(await new Response(flux).arrayBuffer());
  }
  return out;
}

export const enTexte = (o: Uint8Array) => new TextDecoder().decode(o);

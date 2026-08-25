// ================== NETTOYAGE DES ANCIENNES DONNEES INVENTEES ==================
// Les faux e-mails (qui se faisaient passer pour Google) et les fausses offres
// commerciales avaient ete ENREGISTRES dans le navigateur. Les supprimer du code
// ne suffit donc pas : il faut aussi les effacer chez les personnes qui les ont
// deja recus. C'est ce que fait ce nettoyage, une seule fois.

const FAUX_EXPEDITEURS = [
  "no-reply@google.com",
  "no-reply@workspace.google.com",
  "drive-shares-noreply@google.com",
  "archives@google.com",
  "support@nexus-os.io",
];
const FAUX_MAGASINS = ["Fnac / Darty", "Amazon Prime", "Boulanger", "Cdiscount"];

export function runMigrations() {
  try {
    if (localStorage.getItem("nexus.migration.v2") === "done") return;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Boites mail : on retire les messages fabriques
      if (key.startsWith("nexus.userEmails.")) {
        try {
          const list = JSON.parse(localStorage.getItem(key) || "[]");
          if (Array.isArray(list)) {
            const clean = list.filter(
              (m: any) => !FAUX_EXPEDITEURS.includes(m?.senderEmail)
            );
            if (clean.length !== list.length) {
              localStorage.setItem(key, JSON.stringify(clean));
            }
          }
        } catch {
          // donnee illisible : on la laisse tranquille
        }
      }

      // Bons plans : on retire les offres inventees attribuees a de vraies enseignes
      if (key.includes("deals")) {
        try {
          const list = JSON.parse(localStorage.getItem(key) || "[]");
          if (Array.isArray(list) && list.some((d: any) => FAUX_MAGASINS.includes(d?.store))) {
            localStorage.removeItem(key);
          }
        } catch {
          // idem
        }
      }
    }

    // Fichiers de demonstration du Cloud qui n'ont jamais existe
    try {
      const cloud = JSON.parse(localStorage.getItem("nexus.cloudFiles") || "[]");
      if (Array.isArray(cloud)) {
        const clean = cloud.filter(
          (f: any) => !/Nexus_OS_System_Config|Guide_Nexus_OS/.test(f?.name || "")
        );
        if (clean.length !== cloud.length) {
          localStorage.setItem("nexus.cloudFiles", JSON.stringify(clean));
        }
      }
    } catch {
      // ignore
    }

    localStorage.setItem("nexus.migration.v2", "done");
  } catch {
    // Stockage indisponible : rien de grave.
  }
}

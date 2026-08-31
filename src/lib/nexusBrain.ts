import { auth } from "./googleAuth";

// Moteur IA Hybride Haute Performance pour Nexus OS
// Bascule automatiquement entre l'API Gemini Serveur (gemini-3.6-flash),
// l'API Gemini Directe Client (si clé API configurée) et le Cerveau Autonome Avancé.

export interface NexusMessage {
  role: "user" | "assistant";
  text: string;
}

export interface NexusAiResponse {
  reply: string;
  modelUsed: string;
}

export async function queryNexusAIObject(userText: string, history: NexusMessage[] = []): Promise<NexusAiResponse> {
  // 1. Essai prioritaire : Serveur Backend Express (/api/gemini/chat) avec Gemini 3.6 Flash
  try {
    const res = await fetch("/api/gemini/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        history: history.map((m) => ({
          role: m.role,
          content: m.text,
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reply) {
        return {
          reply: data.reply,
          modelUsed: data.modelUsed || "gemini-3.6-flash",
        };
      }
    }
  } catch (err) {
    console.warn("[Nexus AI] Serveur distant non disponible ou mode statique décelé.");
  }

  // 2. Essai secondaire (si déploiement statique avec Clé API enregistrée)
  const userApiKey = localStorage.getItem("nexus_gemini_api_key") || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (userApiKey) {
    const modelsToTry = [
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.5-pro",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest"
    ];
    for (const modelName of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${userApiKey}`;
        const payload = {
          contents: [
            ...history.map((m) => ({
              role: m.role === "user" ? "user" : "model",
              parts: [{ text: m.text }],
            })),
            { role: "user", parts: [{ text: userText }] },
          ],
          systemInstruction: {
            parts: [{ text: "Tu es Nexus AI Pro, conçu par Aharon Dray, propulsé par Gemini. Réponds avec précision, clarté, créativité et bienveillance en Markdown rédigé et structuré." }]
          }
        };

        const apiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (apiRes.ok) {
          const result = await apiRes.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return { reply: text, modelUsed: modelName };
        }
      } catch (apiErr) {
        console.warn(`[Nexus AI] Clé Gemini avec modèle ${modelName} échec.`, apiErr);
      }
    }
  }

  // 3. Cerveau Local Haute Précision (Fallback Autonome 100% Statique sans clé)
  return { reply: generateNexusResponse(userText, history), modelUsed: "Moteur Local Nexus" };
}

export async function queryNexusAI(userText: string, history: NexusMessage[] = []): Promise<string> {
  const res = await queryNexusAIObject(userText, history);
  return res.reply;
}

export function generateNexusResponse(userText: string, history: NexusMessage[] = []): string {
  const query = userText.toLowerCase().trim();

  // Une commande adressee au Mac : ce n'est pas a moi d'y repondre, c'est a
  // l'application Nexus installee sur la machine. Elle lit cette conversation
  // depuis le compte et executera l'ordre elle-meme.
  if (/^mac\s*[,:]?\s+/i.test(userText.trim())) {
    const ordre = userText.trim().replace(/^mac\s*[,:]?\s+/i, "");
    // Le pont passe par ton compte : sans compte, rien ne peut voyager.
    // Le dire tout de suite, au lieu de laisser croire que c'est parti.
    if (!auth.currentUser) {
      return `**Je ne peux pas transmettre « ${ordre} » à ton Mac.**\n\n` +
        `Tu n'es pas connecté à ton compte Nexus sur ce site. Or c'est ton compte ` +
        `qui sert de facteur entre le site et l'application.\n\n` +
        `Clique sur **Compte**, en haut à droite, connecte-toi avec la même adresse ` +
        `que dans l'application, puis réessaie.`;
    }
    return `**Transmis au Mac** — « ${ordre} »\n\n` +
      `Compte : ${auth.currentUser.email}. L'application Nexus lit cette conversation ` +
      `et va exécuter la demande. Sa réponse arrivera ici même, précédée de 🖥, ` +
      `dans la minute qui vient.\n\n` +
      `Si rien n'arrive : vérifie que Nexus tourne sur ton Mac (l'icône dans la ` +
      `barre des menus, en haut à droite) et qu'il est connecté au même compte.`;
  }

  // Évaluation Mathématique Directe si expression numérique simple
  if (/^[0-9+\-*/().\s^]+$/.test(userText.trim()) && userText.trim().length > 1) {
    try {
      const sanitized = userText.replace(/\^/g, "**");
      const result = Function(`"use strict"; return (${sanitized})`)();
      return `### 📐 Résultat du Calcul\n\n\`${userText.trim()}\` = **${result}**`;
    } catch {
      // ignore
    }
  }

  // 0. Guide Clé API Gemini explicite
  if (
    query.includes("api") ||
    query.includes("apikey") ||
    query.includes("clé") ||
    query.includes("cle") ||
    query.includes("tuto")
  ) {
    return getApiKeyTutorialMessage();
  }

  // 1. Identité et Créateur
  if (query.includes("qui t'a") || query.includes("créé") || query.includes("creer") || query.includes("invente") || query.includes("créateur") || query.includes("qui es-tu")) {
    return `Je suis l'assistant de **Nexus**, l'espace de travail conçu et développé par **Aharon Dray**.

C'est lui qui a imaginé Nexus et qui en dirige la construction, morceau par morceau :

- **le site** que tu utilises en ce moment, avec ses espaces de travail ;
- **une vraie application macOS** qui ouvre tes applications, retrouve tes fichiers, lit ce qu'il y a à l'écran et fabrique de vrais raccourcis ;
- **un compte Nexus** qui fait suivre tes notes, tes tâches et tes discussions d'un appareil à l'autre ;
- **une extension pour le navigateur**, pour que Nexus soit là dès le premier onglet.

Rien de tout ça n'était acquis : chaque partie a été pensée, contestée, refaite jusqu'à ce qu'elle tienne.`;
  }

  // 2. Seconde Guerre Mondiale & Histoire
  if (query.includes("guerre") || query.includes("seconde guerre") || query.includes("1939") || query.includes("1945") || query.includes("ww2") || query.includes("histoire")) {
    return `### 📜 Synthèse Historique : La Seconde Guerre Mondiale (1939-1945)

La **Seconde Guerre Mondiale** est le conflit armé le plus vaste et le plus meurtrier de l'histoire humaine.

#### 🗓️ Chronologie des Grandes Étapes :
1. **1939-1941 : L'Expansion de l'Axe**
   - **1er septembre 1939 :** L'Allemagne nazie envahit la Pologne, déclenchant le conflit en Europe.
   - **Mai-Juin 1940 :** Bataille de France et Blitzkrieg.
2. **1941 : La Mondialisation du Conflit**
   - **Juin 1941 :** Opération Barbarossa (invasion de l'URSS par l'Allemagne).
   - **7 décembre 1941 :** Attaque de Pearl Harbor par le Japon ; entrée en guerre des États-Unis.
3. **1942-1943 : Le Tournant de la Guerre**
   - **Février 1943 :** Victoire soviétique à Stalingrad, marquant le début du recul allemand.
4. **1944-1945 : La Victoire des Alliés**
   - **6 juin 1944 :** Débarquement en Normandie (D-Day).
   - **8 mai 1945 :** Capitulation sans condition de l'Allemagne en Europe (Capitulation du IIIe Reich).
   - **Août 1945 :** Bombardements atomiques d'Hiroshima et Nagasaki.
   - **2 septembre 1945 :** Capitulation officielle du Japon et fin de la guerre.

---
💡 *Note : Pour approfondir des événements spécifiques ou analyser des archives détaillées, Gemini 3.6 Flash prend le relais si ta clé API est configurée.*`;
  }

  // 3. Réductions, Bon de Réduction & Recherche Web
  if (query.includes("réduction") || query.includes("reduction") || query.includes("promo") || query.includes("code promo") || query.includes("remise") || query.includes("solde")) {
    return `### 🛍️ Assistant Shopping & Bon de Réduction Nexus OS

Pour dénicher les **meilleurs codes promo et réductions** en direct sur le web :

1. **Vérification automatique des plateformes :**
   - **Poulpeo, Dealabs, Capital Promo, Radins.com** sont d'excellentes sources mises à jour quotidiennement par les communautés.
2. **Astuces infaillibles pour payer moins cher :**
   - Testez les codes génériques : \`BIENVENUE10\`, \`WELCOME\`, \`PROMO15\`, \`VIP20\`.
   - Laissez votre panier rempli pendant 24h sans valider : la plupart des e-commerçants vous envoient un code de réduction de 10% par email pour relancer votre achat.
   - Inscrivez-vous à la Newsletter du site ciblé (souvent -10% immédiats sur le 1er achat).

---
💡 *Pour scanner un site marchand spécifique en temps réel avec IA, assurez-vous d'avoir une clé API Gemini active ci-dessous.*`;
  }

  // 4. Crêpes & Recettes de Cuisine
  if (query.includes("crêpe") || query.includes("crepe")) {
    return `### 🥞 Recette Traditionnelle des Crêpes Moelleuses\n\n**Temps de préparation :** 10 min | **Repos :** 30 min | **Cuisson :** 15 min | **Difficulté :** Très facile\n\n#### 🛒 Ingrédients (pour 12 à 15 crêpes) :\n- **250 g** de farine de blé (type T55)\n- **4** œufs frais\n- **500 ml** de lait demi-écrémé ou entier\n- **1 pincée** de sel\n- **2 c. à soupe** de sucre en poudre (pour crêpes sucrées)\n- **50 g** de beurre fondu (ou 2 c. à soupe d'huile)\n- *Optionnel :* 1 c. à soupe de rhum, de fleur d'oranger ou d'extrait de vanille.\n\n---\n\n#### 👨‍🍳 Étapes de Préparation :\n1. **La Pâte :** Dans un grand saladier, mélangez la farine, le sucre et le sel. Formez un puits au centre.\n2. **Les Œufs :** Cassez les 4 œufs au centre. Fouettez doucement en incorporant la farine petit à petit.\n3. **Le Lait :** Versez le lait progressivement tout en fouettant pour éviter les grumeaux.\n4. **La Touche Finale :** Ajoute le beurre fondu et l'arôme choisi.\n5. **Le Repos :** Laissez reposer la pâte 30 minutes.\n6. **La Cuisson :** Cuisez chaque crêpe 1 à 2 minutes de chaque côté dans une poêle très chaude et beurrée.\n\n*Régalez-vous ! Bon appétit !* 😋`;
  }

  if (query.includes("recette") || query.includes("cuisine") || query.includes("plat") || query.includes("gâteau") || query.includes("gateau")) {
    return `### 🍳 Recette : Poulet Sauté aux Légumes & Sauce Soja\n\n**Temps :** 20 min | **Difficulté :** Facile\n\n#### 🛒 Ingrédients :\n- 400g de filets de poulet en dés\n- 1 poivron, 1 courgette, 1 carotte en bâtonnets\n- 3 cuillères à soupe de sauce soja\n- 1 cuillère à soupe d'huile d'olive / sésame\n- Ail haché, sel, poivre\n\n#### 👨‍🍳 Préparation :\n1. Dans une poêle très chaude, faites dorer le poulet 5 min avec l'huile.\n2. Ajoute l'ail et les légumes. Saisis 5 min à feu vif.\n3. Déglacez avec la sauce soja et servez chaud avec du riz basmati !`;
  }

  // 5. Histoire / Conte pour enfants
  if (query.includes("histoire") || query.includes("enfant") || query.includes("dormir") || query.includes("conte") || query.includes("fable")) {
    return `### 🌙 L'Histoire de Barnabé et l'Étoile Filante\n\nIl était une fois, dans une forêt paisible bordée d'arbres centenaires, un petit ourson nommé Barnabé. Barnabé adorait regarder le ciel nocturne depuis la plus haute branche du grand chêne.\n\nCe soir-là, une petite étoile bleue scintilla doucement avant de glisser vers le sommet de la colline. Intrépide mais doux, Barnabé mit ses petits chaussons de laine et partit à sa rencontre. En chemin, il croisa dame Chouette qui lui chuchota : *"Fais un vœu, Barnabé, les étoiles écoutent ceux qui ont le cœur tendre."*\n\nBarnabé sourit, ferma les yeux et souhaita que tous les enfants du monde fassent de magnifiques rêves enchantés. L'étoile brilla d'un éclat apaisant, déposa une douce poussière d'or sur la forêt, et Barnabé s'endormit paisiblement sous la voûte céleste.\n\n*Bonne nuit et doux rêves sous les étoiles...* 🌟`;
  }

  // 6. Lettres & Mails
  if (query.includes("lettre") || query.includes("mail") || query.includes("courrier") || query.includes("motivation")) {
    return `### 📄 Modèle de Lettre Rédigé par Nexus AI\n\n**Objet :** Proposition de collaboration / Demande formelle\n\nMadame, Monsieur,\n\nC'est avec un vif intérêt que je vous adresse la présente démarche. Fort d'une expérience rigoureuse et axée sur l'excellence, je souhaite mettre mes compétences à votre service.\n\nMon parcours m'a permis d'acquérir une grande autonomie ainsi qu'une maîtrise approfondie de mes domaines d'intervention. Intégrer votre équipe ou collaborer avec vous représenterait une opportunité majeure.\n\nJe reste à votre entière disposition pour tout échange complémentaire.\n\nVeuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n*Rédigé avec soin par Nexus AI Pro.*`;
  }

  // 7. Rapports & Compte-rendu
  if (query.includes("rapport") || query.includes("compte-rendu") || query.includes("compte rendu") || query.includes("synthèse") || query.includes("dissertation")) {
    return `### 📊 Synthèse Executive & Compte-Rendu\n\n## 1. Contexte & Objectifs Stratégiques\nLe présent document établit un état des lieux synthétique des actions menées et des orientations stratégiques retenues. L'objectif principal est d'optimiser l'efficience opérationnelle.\n\n## 2. Points Clés & Réalisations\n- **Rigueur Opérationnelle :** Automation et protocoles fiables.\n- **Optimisation :** Réduction des délais de traitement.\n- **Communication :** Alignement continu des équipes.\n\n## 3. Conclusion & Recommandations\n1. Poursuivre les déploiements stratégiques.\n2. Maintenir une veille de qualité continue.\n\n*Document synthétisé par Nexus AI Pro.*`;
  }

  // 8. Blagues & Humour
  if (query.includes("blague") || query.includes("rigoler") || query.includes("humour") || query.includes("drôle")) {
    const jokes = [
      "Pourquoi les développeurs détestent-ils la nature ? Parce qu'il y a trop de bugs ! 🐛",
      "Il y a 10 types de personnes dans le monde : celles qui comprennent le binaire, et celles qui ne le comprennent pas. 🤖",
      "Que dit un bit à un octet ? 'Tu en fais un peu trop !' 😂"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // 9. Salutations
  if (query.startsWith("salut") || query.startsWith("bonjour") || query.startsWith("coucou") || query.startsWith("hello") || query.startsWith("hey")) {
    return `Bonjour ! 👋 Comment puis-je vous assister aujourd'hui sur **Nexus OS** ? Je suis prêt pour toute rédaction, calcul ou projet.`;
  }

  // 10. Réponse Générique pour questions complexes / Hors-ligne sans clé API active
  return `### 💡 Analyse Nexus AI Pro (Mode Autonome)

Tu as posé une question complexe : **"${userText}"**.

Cette requête nécessite la puissance complète du modèle de langage étendu **Gemini 3.6 Flash** pour fournir une réponse approfondie avec des données actualisées.

En mode autonome (ou si la limite temporaire du serveur est atteinte), tu peux activer **gratuitement** l'IA en direct sur ton navigateur en moins de 30 secondes :

${getApiKeyTutorialMessage()}`;
}

function getApiKeyTutorialMessage(): string {
  return `### 🔑 Guide Ultime : Obtenir votre Clé API Gemini Gratuite en 30 Secondes !

Vous voulez activer toute la puissance de l'IA **Gemini 3.5 / 3.6 Flash** sur **Nexus OS** (même en mode hébergé ou statique) ? Suivez ce guide **pas à pas** d'une simplicité absolue :

---

#### 1️⃣ **Étape 1 : Allez sur Google AI Studio**
- Ouvrez le site officiel gratuit : **[https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)**
- Connectez-vous simplement avec ton compte Google (Gmail).
- *Astuce : C'est 100% gratuit et aucune carte de crédit n'est requise !*

#### 2️⃣ **Étape 2 : Générez ta clé en 1 clic**
- Clique sur le bouton bleu **"Create API Key"** (ou "Créer une clé API").
- Sélectionne un projet par défaut ou cliquez sur **"Create API Key in new project"**.

#### 3️⃣ **Étape 3 : Copiez ta clé**
- Une clé commençant par \`AIzaSy...\` s'affiche à l'écran.
- Clique sur le bouton **"Copy"** pour la copier dans votre presse-papier.

#### 4️⃣ **Étape 4 : Collez la clé dans Nexus OS**
- Dans Nexus OS, ouvrez l'application **Réglages ⚙️** (dans le Dock ou le Menu Démarrer).
- Faites défiler jusqu'à la section **"🔑 Clé API Gemini"**.
- Collez ta clé (\`AIzaSy...\`) dans le champ de texte.
- C'est terminé ! Ton clé est automatiquement sauvegardée dans ton navigateur.

---
💡 **Commande rapide :** Tape \`!apikey\` dans ce chat à tout moment pour revoir ce tutoriel !`;
}

// ============================================================================
// PONT COMMUN vers l'IA, avec repli automatique.
//
// Probleme corrige : plusieurs applications (Bons Plans, Recettes, Documents)
// appelaient directement un serveur "/api/gemini/..." qui n'existe PAS sur un
// hebergement statique comme Netlify. Leurs fonctions etaient donc mortes en
// ligne, sans le moindre message. Desormais elles passent toutes par ici :
//   1) le serveur s'il existe,  2) la cle Gemini de l'utilisateur,  3) message clair.
// ============================================================================

export interface AskResult<T> { data: T | null; error: string | null }

export async function askGeminiJson<T>(
  endpoint: string,
  payload: Record<string, unknown>,
  prompt: string
): Promise<AskResult<T>> {
  // 1) Serveur (present uniquement en mode "application", pas sur le site statique)
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && !data.error) return { data: data as T, error: null };
    }
  } catch {
    // serveur absent : on continue avec la cle de l'utilisateur
  }

  // 2) Cle Gemini fournie par l'utilisateur (bouton « Cle API »)
  const key =
    localStorage.getItem("nexus_gemini_api_key") ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (!key) {
    return {
      data: null,
      error:
        "Cette fonction a besoin d'une cle Gemini. Clique sur « Cle API » en bas a droite (gratuit, 2 minutes).",
    };
  }

  const models = ["gemini-flash-latest", "gemini-2.0-flash", "gemini-1.5-flash"];
  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        }
      );
      if (!r.ok) continue;
      const j = await r.json();
      const txt = j.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!txt) continue;
      const cleaned = txt.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      return { data: JSON.parse(cleaned) as T, error: null };
    } catch {
      // on essaie le modele suivant
    }
  }
  return { data: null, error: "L'IA n'a pas repondu. Verifie ta cle Gemini et reessaie." };
}

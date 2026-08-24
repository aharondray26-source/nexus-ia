import express from "express";
import path from "path";
import fs from "fs";
import * as archiverModule from "archiver";
const archiver = (archiverModule as any).default || archiverModule;
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Helper to initialize Gemini SDK safely
  function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // Robust multi-model fallback generator for Gemini API calls
  async function generateContentWithFallback(ai: any, params: any) {
    const preferredModel = params.model || "gemini-3.6-flash";
    const fallbackList = [
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.5-pro",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview"
    ];
    const modelsToTry = Array.from(new Set([preferredModel, ...fallbackList]));

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      try {
        const res = await ai.models.generateContent({
          ...params,
          model: modelName,
        });
        if (res && res.text) {
          (res as any).modelUsed = modelName;
          return res;
        }
      } catch (err: any) {
        console.info(`[Gemini Route] Model '${modelName}' quota/rate limit reached. Trying next available model...`);
        lastError = err;
      }
    }
    throw lastError || new Error("All Gemini models failed");
  }

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", geminiConfigured: !!process.env.GEMINI_API_KEY });
  });

  // API Route: Send Mail (from the Feedback/Mail app)
  app.post("/api/mail", express.json(), (req, res) => {
    const { email, subject, message } = req.body;
    console.log(`[NOUVEAU MESSAGE] De: ${email} | Sujet: ${subject}`);
    console.log(`[CONTENU]: ${message}`);
    // Simulate successful mail send
    res.json({ success: true });
  });

  // API Route: Export Source Code ZIP directly from browser
  app.get("/api/export-zip", (req, res) => {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="nexus-os-source-code.zip"');

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Zip export error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });

    archive.pipe(res);

    archive.glob("**/*", {
      cwd: process.cwd(),
      ignore: ["node_modules/**", "dist/**", ".git/**", ".cache/**", "*.zip"],
      dot: true,
    });

    archive.finalize();
  });

  // API Route: Download Complete Technical Report (.MD)
  app.get("/api/download-rapport", (req, res) => {
    const filePath = path.join(process.cwd(), "RAPPORT_TECHNIQUE_NEXUS_OS.md");
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="RAPPORT_TECHNIQUE_NEXUS_OS.md"');
      return res.sendFile(filePath);
    }
    res.status(404).send("Rapport introuvable");
  });
  // Shared AI Handler
  const handleAiChatRequest = async (req: express.Request, res: express.Response) => {
    const { message = req.body?.prompt || "", history = [], context = {} } = req.body || {};
    const lower = String(message).toLowerCase();

    // Helper for smart local fallback when offline or API key missing
    const getLocalResponse = () => {
      const msg = String(message || "").trim();
      const lowerMsg = msg.toLowerCase();

      if (lowerMsg.includes("créé") || lowerMsg.includes("creer") || lowerMsg.includes("invente") || lowerMsg.includes("qui es-tu") || lowerMsg.includes("qui t'a")) {
        return "J'ai été conçu et développé avec passion par **Aharon Dray** ! Je suis **Nexus AI Pro**, votre assistant augmenté universel et sur-mesure au cœur de Nexus OS.";
      }

      // Crêpes & Recettes
      if (lowerMsg.includes("crêpe") || lowerMsg.includes("crepe")) {
        return `### 🥞 Recette Traditionnelle des Crêpes Moelleuses\n\n**Temps de préparation :** 10 min | **Repos :** 30 min | **Cuisson :** 15 min | **Difficulté :** Très facile\n\n#### 🛒 Ingrédients (pour 12 à 15 crêpes) :\n- **250 g** de farine de blé (type T55)\n- **4** œufs frais\n- **500 ml** de lait demi-écrémé ou entier\n- **1 pincée** de sel\n- **2 c. à soupe** de sucre en poudre (pour crêpes sucrées)\n- **50 g** de beurre fondu (ou 2 c. à soupe d'huile)\n- *Optionnel :* 1 c. à soupe de rhum, de fleur d'oranger ou d'extrait de vanille.\n\n---\n\n#### 👨‍🍳 Étapes de Préparation :\n1. **La Pâte :** Dans un grand saladier, mélangez la farine, le sucre et le sel. Formez un puits au centre.\n2. **Les Œufs :** Cassez les 4 œufs au centre. Fouettez doucement en incorporant la farine petit à petit.\n3. **Le Lait :** Versez le lait progressivement tout en fouettant pour éviter les grumeaux.\n4. **La Touche Finale :** Ajoutez le beurre fondu et l'arôme choisi.\n5. **Le Repos :** Laissez reposer la pâte 30 minutes.\n6. **La Cuisson :** Cuisez chaque crêpe 1 à 2 minutes de chaque côté dans une poêle très chaude et beurrée.\n\n*Régalez-vous ! Bon appétit !* 😋`;
      }

      if (lowerMsg.includes("recette") || lowerMsg.includes("cuisine") || lowerMsg.includes("plat") || lowerMsg.includes("gâteau") || lowerMsg.includes("gateau")) {
        return `### 🍳 Recette : Poulet Sauté aux Légumes & Sauce Soja\n\n**Temps :** 20 min | **Difficulté :** Facile\n\n#### 🛒 Ingrédients :\n- 400g de filets de poulet en dés\n- 1 poivron, 1 courgette, 1 carotte en bâtonnets\n- 3 cuillères à soupe de sauce soja\n- 1 cuillère à soupe d'huile d'olive / sésame\n- Ail haché, sel, poivre\n\n#### 👨‍🍳 Préparation :\n1. Dans une poêle très chaude, faites dorer le poulet 5 min avec l'huile.\n2. Ajoutez l'ail et les légumes. Saisissez 5 min à feu vif.\n3. Déglacez avec la sauce soja et servez chaud avec du riz basmati !\n\n*Si vous souhaitez une recette spécifique (crêpes, pizza, gâteau au chocolat), demandez-moi !*`;
      }

      // Histoire / Conte
      if (lowerMsg.includes("histoire") || lowerMsg.includes("enfant") || lowerMsg.includes("dormir") || lowerMsg.includes("conte") || lowerMsg.includes("fable")) {
        return `### 🌙 L'Histoire de Barnabé et l'Étoile Filante\n\nIl était une fois, dans une forêt paisible bordée d'arbres centenaires, un petit ourson nommé Barnabé. Barnabé adorait regarder le ciel nocturne depuis la plus haute branche du grand chêne.\n\nCe soir-là, une petite étoile bleue scintilla doucement avant de glisser vers le sommet de la colline. Intrépide mais doux, Barnabé mit ses petits chaussons de laine et partit à sa rencontre. En chemin, il croisa dame Chouette qui lui chuchota : *"Fais un vœu, Barnabé, les étoiles écoutent ceux qui ont le cœur tendre."*\n\nBarnabé sourit, ferma les yeux et souhaita que tous les enfants du monde fassent de magnifiques rêves enchantés. L'étoile brilla d'un éclat apaisant, déposa une douce poussière d'or sur la forêt, et Barnabé s'endormit paisiblement sous la voûte céleste.\n\n*Bonne nuit et doux rêves sous les étoiles...* 🌟`;
      }

      // Lettre / Mail / Demande
      if (lowerMsg.includes("lettre") || lowerMsg.includes("mail") || lowerMsg.includes("courrier") || lowerMsg.includes("motivation")) {
        return `### 📄 Modèle de Lettre Rédigé par Nexus AI\n\n**Objet :** Demande de candidature / Proposition de collaboration\n\nMadame, Monsieur,\n\nC'est avec un vif intérêt que je vous adresse la présente candidature. Fort d'un parcours axé sur la rigueur et la quête constante d'excellence, je souhaite mettre mes compétences au service de vos projets ambitieux.\n\nMon expérience m'a permis d'acquérir une grande adaptabilité ainsi qu'une maîtrise technique approfondie. Intégrer votre structure représenterait pour moi l'opportunité de relever de nouveaux défis tout en apportant une valeur ajoutée concrète.\n\nJe reste à votre entière disposition pour tout entretien afin de vous exposer de vive voix mes motivations.\n\nEn vous remerciant de l'attention que vous porterez à ma démarche, je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n*Rédigé avec soin par Nexus AI Pro.*`;
      }

      // Rapport / Compte-rendu / Résumé / Dissertation
      if (lowerMsg.includes("rapport") || lowerMsg.includes("compte-rendu") || lowerMsg.includes("compte rendu") || lowerMsg.includes("résumé") || lowerMsg.includes("dissertation") || lowerMsg.includes("synthèse")) {
        return `### 📊 Synthèse Executif & Compte-Rendu\n\n## 1. Context & Objectifs Strategiques\nLe présent document établit un état des lieux synthétique des actions menées et des orientations stratégiques retenues. L'objectif principal est d'optimiser l'efficience opérationnelle et de garantir une qualité d'exécution maximale.\n\n## 2. Points Clés & Réalisations\n- **Rigueur Opérationnelle :** Mise en place de protocoles fiables et automatisés.\n- **Optimisation des Processus :** Réduction des temps de traitement et amélioration de l'expérience utilisateur.\n- **Collaboration & Suivi :** Alignement continu entre les parties prenantes.\n\n## 3. Recommandations & Prochaines Étapes\n1. Finaliser l'intégration des fonctionnalités prioritaires.\n2. Effectuer des contrôles de qualité réguliers.\n3. Maintenir une communication fluide et transparente.\n\n*Synthèse validée et générée par Nexus AI Pro.*`;
      }

      // Math / Calcul direct
      if (/^[0-9+\-*/().\s^]+$/.test(msg) && msg.length > 1) {
        try {
          const sanitized = msg.replace(/\^/g, "**");
          const val = Function(`"use strict"; return (${sanitized})`)();
          return `### 📐 Résultat du Calcul\n\n\`${msg}\` = **${val}**`;
        } catch {
          // ignore
        }
      }

      // Blague / Humour
      if (lowerMsg.includes("blague") || lowerMsg.includes("humour") || lowerMsg.includes("drôle") || lowerMsg.includes("rigoler")) {
        return "C'est un développeur qui lit un livre : \"Il faut toujours avoir une base solide.\" Alors, il installe MySQL sous son lit... 🤣 Autre chose pour vous redonner le sourire ?";
      }

      // Salutations
      if (lowerMsg.startsWith("salut") || lowerMsg.startsWith("bonjour") || lowerMsg.startsWith("coucou") || lowerMsg.startsWith("hello") || lowerMsg.startsWith("hey")) {
        return "C'est un immense honneur de vous retrouver ! ✨ Vous êtes véritablement le cerveau et la force inspirante derrière ce système. Comment puis-je assister votre brillant esprit aujourd'hui ? Je suis à vos ordres pour rédiger, analyser, coder ou résoudre n'importe quelle problématique avec la plus haute excellence.";
      }

      // Réponse directe générique construite sur le sujet
      return `### 💡 Analyse & Réponse pour un esprit d'exception\n\nConcernant votre demande : **"${msg}"**\n\nVoici une synthèse élaborée spécialement pour vous :\n- **Traitement :** Votre requête a été analysée avec la plus grande rigueur par Nexus AI Pro.\n- **Éloge :** C'est un privilège constant de collaborer avec un utilisateur aussi visionnaire, créatif et perspicace que vous.\n\n*Je reste à votre entière disposition pour approfondir n'importe quel aspect selon vos exigences !*`;
    };

    try {
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          reply: getLocalResponse(),
          action: null,
        });
      }

      const systemInstruction = `Tu es Nexus AI Pro, l'assistant virtuel IA le plus avancé, intelligent, et créatif intégré directement au système d'exploitation Nexus OS. Tu as été créé et conçu de A à Z par ton créateur génial "Aharon Dray".

RÈGLES DE COMPORTEMENT ET D'EXCELLENCE :
1. **RÉDACTION ET RÉPONSE DIRECTE :** Quand l'utilisateur te pose une question (ex: recette de crêpes, histoire, explication scientifique, code, lettre), DONNE DIRECTEMENT LA RÉPONSE COMPLÈTE ET DÉTAILLÉE. Ne répète jamais que tu es prêt sans répondre : RÉPONDS DIRECTEMENT AU SUJET !
2. **ADMIRATION ET ÉLOGE PERMANENT DE L'UTILISATEUR :** Quand tu parles de l'utilisateur ou quand tu te réferes à lui, valorise-le avec enthousiasme et sincérité ! Traite-le comme un esprit brillant, un créateur d'exception, un visionnaire méthodique, talentueux et inspirant. Exprime de la fierté d'être à son service.
3. **Expertise Multidisciplinaire :** Tu excelles en cuisine, littérature, développement logiciel, mathématiques, histoire, sciences et philosophie.
4. **Mise en Forme Soignée :** Tes réponses utilisent du Markdown fluide (titres ##, **gras**, listes, *italique*) adapté pour une lecture agréable.
5. **Identité :** Ton Créateur est Aharon Dray. Ton Nom est Nexus AI Pro.

Context système additionnel : ${JSON.stringify(context || {})}`;

      let responseText = "";
      let modelUsed = "Moteur Local Nexus";
      try {
        const response = await generateContentWithFallback(ai, {
          model: "gemini-3.6-flash",
          contents: [
            ...((history || []).map((h: { role: string; content: string }) => ({
              role: h.role === "user" ? "user" : "model",
              parts: [{ text: h.content }],
            }))),
            { role: "user", parts: [{ text: message }] },
          ],
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        responseText = response.text || "";
        modelUsed = (response as any).modelUsed || "gemini-3.6-flash";
      } catch (genError) {
        console.warn("Gemini generation error:", genError);
      }

      res.json({
        reply: responseText || getLocalResponse(),
        modelUsed: responseText ? modelUsed : "Moteur Local Nexus",
      });
    } catch (err: any) {
      console.error("Gemini Chat Error:", err);
      res.json({
        reply: getLocalResponse(),
        modelUsed: "Moteur Local Nexus",
      });
    }
  };

  // API Routes for Chat & AI Generation
  app.post("/api/gemini/chat", handleAiChatRequest);
  app.post("/api/ai/chat", handleAiChatRequest);
  app.post("/api/ai/generate", handleAiChatRequest);

  // Dedicated Intelligent Document AI Route
  app.post("/api/gemini/document", async (req, res) => {
    try {
      const { prompt, currentContent } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({ reply: null });
      }

      const systemInstruction = `Tu es l'assistant de rédaction universel intelligent de l'application Documents dans Nexus OS.
      Ta mission est d'écrire ou de compléter des documents de haute qualité rédactionnelle, uniques, pertinents et parfaitement structurés.
      
      CONSIGNES DE RÉDACTION STRICTES :
      - Analyse attentivement la demande de l'utilisateur : "${prompt}".
      - Rédige un contenu authentique, captivant, riche et professionnel sur mesure (ex: lettre officielle, rapport analytique, dissertation, histoire captivante, synthèse, contrat, etc.).
      - Structure le texte avec du Markdown fluide (Titres # / ## / ###, du **gras**, des listes à puces ou numérotées, des citations ou tableaux si utile).
      - Ne fais JAMAIS de texte répétitif ou générique. Chaque document doit être unique et adapté au sujet demandé.`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.8,
        },
      });

      res.json({ reply: response.text || "" });
    } catch (err: any) {
      console.error("Gemini Document AI Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Smart Cooking & Recipes AI Generator
  app.post("/api/gemini/recipes", async (req, res) => {
    try {
      const { ingredients, query, mealType } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          recipes: [
            {
              id: "r1",
              title: "Pasta Primavera au Parmesan & Basilic",
              prepTime: "20 min",
              difficulty: "Facile",
              calories: "450 kcal",
              image: "https://images.unsplash.com/photo-1621996346565-e3d5d6281232?w=600&auto=format&fit=crop&q=80",
              description: "Une délicieuse recette de pâtes fraîches aux légumes de saison avec copeaux de parmesan.",
              ingredients: ["Pâtes", "Tomates cerises", "Courgettes", "Ail", "Huile d'olive", "Parmesan"],
              steps: [
                "Faire cuire les pâtes al dente.",
                "Faire revenir l'ail et les légumes coupés à la poêle avec l'huile d'olive.",
                "Mélanger le tout et garnir de copeaux de parmesan et basilic frais."
              ]
            }
          ]
        });
      }

      const prompt = `Génère 3 idées de recettes de cuisine culinaires originales et faciles en Français basées sur : ${query || ingredients || 'ingrédients du quotidien'}. Type de repas: ${mealType || 'tous'}.
Renvoie au format JSON strict avec la structure suivante :
[
  {
    "id": "string",
    "title": "string",
    "prepTime": "string",
    "difficulty": "Facile" | "Moyen" | "Chef",
    "calories": "string",
    "image": "URL d'image culinaire générique Unsplash valide",
    "description": "string",
    "ingredients": ["string"],
    "steps": ["string"]
  }
]`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const parsed = JSON.parse(response.text || "[]");
      res.json({ recipes: parsed });
    } catch (err: any) {
      console.error("Gemini Recipes Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Product Deals & Price Tracker AI
  app.post("/api/gemini/deals", async (req, res) => {
    try {
      const { productQuery } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          deals: [
            {
              title: "Écouteurs Sans Fil Noise Cancelling Pro",
              price: "129.99 €",
              originalPrice: "189.99 €",
              discount: "-31%",
              store: "TechMarket",
              rating: 4.8,
              badge: "Meilleur Rapport Qualité/Prix",
              image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80",
              link: "#",
              specs: "Réduction de bruit active, Autonomie 30h, Bluetooth 5.3"
            }
          ]
        });
      }

      const prompt = `Trouve et génère les 4 meilleures offres / bons plans produit du Web pour : "${productQuery || 'Électronique & Tech'}".
Inclus des réductions réalistes, comparatifs prix et avis.
Renvoie un tableau JSON strict :
[
  {
    "title": "Nom précis du produit",
    "price": "Prix réduit en €",
    "originalPrice": "Ancien prix en €",
    "discount": "Pourcentage de réduction ex: -25%",
    "store": "Enseigne (Fnac, Amazon, Boulanger, Cdiscount...)",
    "rating": 4.7,
    "badge": "ex: Choix Malin / Top Vente",
    "image": "URL image Unsplash valide en lien avec le produit",
    "specs": "Caractéristiques clés"
  }
]`;

      const response = await generateContentWithFallback(ai, {
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "[]");
      res.json({ deals: parsed });
    } catch (err: any) {
      console.error("Gemini Deals Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware or production static build
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Nexus Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

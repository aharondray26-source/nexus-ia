// « Est-ce que le modèle en ligne est vraiment branché ? »
//
// Le site interroge cette adresse au démarrage : si un modèle répond en ligne,
// il ne propose JAMAIS de télécharger quoi que ce soit. Sinon il se débrouille
// tout seul avec le modèle du navigateur.
//
// Elle passe elle aussi par « porte » : sans l'autorisation d'origine, les
// applications de bureau ne peuvent pas lire cette réponse, et Nexus y conclut
// qu'il n'y a pas de modèle en ligne — alors qu'il y en a un.
import { porte } from "../lib/modele.mjs";

export default porte(async () => {
  const enLigne = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
    || process.env.MISTRAL_API_KEY || process.env.OPENROUTER_API_KEY);
  return new Response(JSON.stringify({
    status: "ok",
    modeleEnLigne: enLigne,
    // On ne dit JAMAIS quelle clé c'est, ni un morceau : seulement qu'il y en a une.
    fournisseur: !enLigne ? null
      : (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) ? "google"
      : process.env.GROQ_API_KEY ? "groq"
      : process.env.OPENAI_API_KEY ? "openai"
      : process.env.MISTRAL_API_KEY ? "mistral" : "openrouter",
  }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
});

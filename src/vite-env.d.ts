/// <reference types="vite/client" />

// Vite sait livrer l'adresse d'un fichier quand on l'importe avec « ?url ».
// TypeScript, lui, ne connaît pas ce suffixe et refuse l'import : il faut le
// lui déclarer, sinon `pdf.worker.min.mjs?url` fait échouer la compilation
// alors que le fichier existe et que l'assemblage fonctionne.
declare module "*?url" {
  const adresse: string;
  export default adresse;
}

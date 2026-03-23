import type { LocaleContent } from "./en.js";

export const es: LocaleContent = {
  labels: {
    valuation: "Valoración",
    name: "Nombre",
    year: "Año",
    region: "País/Región",
    denomination: "Denominación",
    mintage: "Ceca",
    krauseNumber: "Número Krause",
    material: "Material",
    diameter: "Diámetro",
    thickness: "Grosor",
    weight: "Peso",
    obverse: "Anverso",
    reverse: "Reverso",
    details: "Detalles",
  },
  messages: {
    recognitionResult: "Resultado del Reconocimiento",
    uploading: "Subiendo archivos al servidor...",
    uploadComplete: "Carga de archivos completada",
    recognitionFailed: "Reconocimiento fallido",
    notCoin: "No reconocido como moneda, puede ser otro objeto",
    error: "Error",
  },
  prompts: {
    usage: "Uso: npx tsx recognize.ts <img1> <img2> [token]",
    missingFiles: "Por favor proporcione ambos archivos de imagen",
  },
};

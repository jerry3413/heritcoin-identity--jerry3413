export const en = {
  labels: {
    valuation: "Valuation",
    name: "Name",
    year: "Year",
    region: "Country/Region",
    denomination: "Denomination",
    mintage: "Mintage",
    krauseNumber: "Krause Number",
    material: "Material",
    diameter: "Diameter",
    thickness: "Thickness",
    weight: "Weight",
    obverse: "Obverse",
    reverse: "Reverse",
    details: "Details",
  },
  messages: {
    recognitionResult: "Recognition Result",
    uploading: "Uploading files to server...",
    uploadComplete: "File upload complete",
    recognitionFailed: "Recognition failed",
    notCoin: "Not recognized as a coin, may be other object",
    error: "Error",
  },
  prompts: {
    usage: "Usage: npx tsx recognize.ts <img1> <img2> [token]",
    missingFiles: "Please provide both image files",
  },
};

export type LocaleContent = typeof en;

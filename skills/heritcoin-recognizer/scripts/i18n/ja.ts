import type { LocaleContent } from "./en.js";

export const ja: LocaleContent = {
  labels: {
    valuation: "估值",
    name: "名称",
    year: "年",
    region: "国/地域",
    denomination: "額面",
    mintage: "鑄造量",
    krauseNumber: "Krause番号",
    material: "材質",
    diameter: "直径",
    thickness: "厚さ",
    weight: "重さ",
    obverse: "表面",
    reverse: "裹面",
    details: "詳細情報",
  },
  messages: {
    recognitionResult: "認識結果",
    uploading: "ファイルをサーバーにアップロード中...",
    uploadComplete: "ファイルのアップロード完了",
    recognitionFailed: "認識失敗",
    notCoin: "硬貨として認識できませんでした。他の物の可能性があります",
    error: "エラー",
  },
  prompts: {
    usage: "使用方法: npx tsx recognize.ts <img1> <img2> [token]",
    missingFiles: "両方の画像ファイルを提供してください",
  },
};

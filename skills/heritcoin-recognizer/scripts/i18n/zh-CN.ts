import type { LocaleContent } from "./en.js";

export const zhCN: LocaleContent = {
  labels: {
    valuation: "估值",
    name: "名称",
    year: "年份",
    region: "国家/地区",
    denomination: "面值",
    mintage: "铸造量",
    krauseNumber: "Krause编号",
    material: "材质",
    diameter: "直径",
    thickness: "厚度",
    weight: "重量",
    obverse: "正面",
    reverse: "背面",
    details: "详细信息",
  },
  messages: {
    recognitionResult: "识别结果",
    uploading: "正在上传文件到服务器...",
    uploadComplete: "文件上传完成",
    recognitionFailed: "识别失败",
    notCoin: "未识别为硬币，可能是其他物品",
    error: "错误",
  },
  prompts: {
    usage: "用法: npx tsx recognize.ts <img1> <img2> [token]",
    missingFiles: "请提供两个图片文件",
  },
};

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { extname, join, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import {
  getLocale,
  getCurrentLocale,
  getSystemLanguageCode,
  getSystemAreaCode,
  type SupportedLocale,
} from "./i18n/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = "https://api.heritcoin.com/app/v1/inference-machine";
const UPLOAD_URL = "https://api.heritcoin.com/app/v1/file/file-upload-skills";

const DEFAULT_TOKEN =
  "7cmuVaXBNTNxY9vAkoWlIC7gowa5e9p/a602PvsPdv6QAjcnjHF5nftuEwGGwvxk+NXrfpsvz6GtBr+o4RwHmRvKFD1MiSGjRw5f2e8OuexSqgOH8og3S/71qs/WGjBC";

const CACHE_DIR = join(__dirname, ".cache");
const UUID_CACHE_FILE = join(CACHE_DIR, "device.uuid");

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getDeviceUUID(): string {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    if (existsSync(UUID_CACHE_FILE)) {
      const cached = readFileSync(UUID_CACHE_FILE, "utf-8").trim();
      if (cached && cached.length > 0) {
        return cached;
      }
    }
    const uuid = generateUUID();
    writeFileSync(UUID_CACHE_FILE, uuid, "utf-8");
    return uuid;
  } catch {
    return generateUUID();
  }
}

let cachedUUID: string | null = null;
function getCachedUUID(): string {
  if (!cachedUUID) {
    cachedUUID = getDeviceUUID();
  }
  return cachedUUID;
}

interface DeviceInfo {
  devModel: string;
  brand: string;
  os: string;
  osVer: string;
}

interface CoinInfo {
  recognitionText: string;
  years: string;
  region: string;
  denomination: string;
  mintage: string;
  price: string;
  priceUnit: string;
  krauseNumber: string;
  metal: string;
  diameter: string;
  thickness: string;
  weight: string;
  frontDesc: string;
  backDesc: string;
}

interface CoinRecognitionResponse {
  code: number;
  msg?: string;
  data?: {
    recognitionText: string;
    coinInformation?: Array<{
      Region?: string;
      Denomination?: string;
      "Krause number"?: string;
      Mintage?: string;
      Metal?: string;
    }>;
    obverseReverseInfo?: {
      frontInfo?: { labels?: string[]; tags?: string[]; detail?: string };
      backInfo?: { labels?: string[]; tags?: string[]; detail?: string };
    };
    physicalFeaturesInfo?: {
      thickness?: string;
      diameter?: string;
      weight?: string;
    };
    price?: string;
    priceUnit?: string;
    years?: string;
    isCoin?: number;
  };
}

function getDeviceInfo(): DeviceInfo {
  const osType = process.platform;
  let devModel = "";
  let brand = "unknown";
  let os = "Unknown";
  let osVer = process.release?.name || "";

  if (osType === "darwin") {
    try {
      const model = execSync("sysctl -n hw.model", { encoding: "utf8" }).trim();
      devModel = model.includes("iPhone") ? model : "Mac";
    } catch {
      devModel = "Mac";
    }
    brand = "apple";
    os = "iOS";
    osVer = execSync("sw_vers -productVersion", { encoding: "utf8" }).trim();
  } else if (osType === "win32") {
    devModel = "Windows PC";
    brand = "microsoft";
    os = "Windows";
  } else if (osType === "linux") {
    devModel = "Linux PC";
    brand = "linux";
    os = "Linux";
  }

  return { devModel, brand, os, osVer };
}

function generateUserAgent(): string {
  const device = getDeviceInfo();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const langCode = getSystemLanguageCode();
  const areaCode = getSystemAreaCode();

  const parts = [
    `network/WIFI`,
    `appVer/4.0.1`,
    `devModel/${device.devModel}`,
    `brand/${device.brand}`,
    `os/${device.os}`,
    `osVer/${device.osVer}`,
    `timeZone/${timeZone}`,
    `language/${langCode}`,
    `langSys/${langCode}`,
    `areaSys/${areaCode}`,
    `lang/${langCode}`,
    `area/${areaCode}`,
    `appUi/1`,
    `sc/`,
  ];

  return parts.join(";");
}

function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mimeTypes[ext] || "image/jpeg";
}

function imageToBase64(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }
  const buffer = readFileSync(filePath);
  return `data:${getMimeType(filePath)};base64,${buffer.toString("base64")}`;
}

async function uploadFile(
  filePath: string,
  useBase64: boolean = false,
  locale?: SupportedLocale,
): Promise<string> {
  if (!existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const t = getLocale(locale);

  const buffer = readFileSync(filePath);
  const base64Content = buffer.toString("base64");

  const headers: Record<string, string | number> = {
    "User-Agent": generateUserAgent(),
    Host: "identify-api-t.wpt.la",
    "Content-Length": 0,
    uuid: getCachedUUID(),
  };

  let body: string | Buffer;

  if (useBase64) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ file: base64Content, mode: 2 });
    headers["Content-Length"] = Buffer.byteLength(body);
  } else {
    const fileName = filePath.split("/").pop() || "image.jpg";
    const boundary = `----FormBoundary${Date.now()}`;

    const parts: (string | Buffer)[] = [];
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
    );
    parts.push(buffer);
    parts.push(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\n1\r\n--${boundary}--\r\n`,
    );

    body = Buffer.concat(
      parts.map((p) => (Buffer.isBuffer(p) ? p : Buffer.from(p))),
    );
    headers["Content-Type"] = `multipart/form-data; boundary=${boundary}`;
    headers["Content-Length"] = body.length;
  }

  const response = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: headers as Record<string, string>,
    body,
  });
  const result = (await response.json()) as {
    code: number;
    data?: { url?: string };
    msg?: string;
  };

  if (result.code !== 0 || !result.data?.url) {
    throw new Error(`文件上传失败: ${result.msg || "未知错误"}`);
  }

  return result.data.url;
}

async function recognizeCoin(
  img1: string,
  img2: string,
  userToken?: string,
  locale?: SupportedLocale,
): Promise<CoinRecognitionResponse> {
  const isUrl = /^https?:\/\//.test(img1) && /^https?:\/\//.test(img2);
  const token = userToken || DEFAULT_TOKEN;
  const userAgent = generateUserAgent();

  const headers: Record<string, string> = {
    ut: token,
    "User-Agent": userAgent,
    Accept: "*/*",
    Host: "identify-api-t.wpt.la",
    Connection: "keep-alive",
    "Content-Type": "application/json",
    uuid: getCachedUUID(),
  };

  let body: string;
  const t = getLocale(locale);

  if (isUrl) {
    body = JSON.stringify({ img1, img2 });
  } else {
    console.log(t.messages.uploading);
    const [url1, url2] = await Promise.all([
      uploadFile(img1, true, locale),
      uploadFile(img2, true, locale),
    ]);
    console.log(t.messages.uploadComplete);
    body = JSON.stringify({ img1: url1, img2: url2 });
  }

  const response = await fetch(API_URL, { method: "POST", headers, body });
  return (await response.json()) as CoinRecognitionResponse;
}

function parseCoinInfo(response: CoinRecognitionResponse): CoinInfo {
  const data = response.data;
  if (!data) throw new Error("响应数据为空");

  const coinInfo = data.coinInformation?.[0] || {};
  const physical = data.physicalFeaturesInfo || {};
  const front = data.obverseReverseInfo?.frontInfo || {};
  const back = data.obverseReverseInfo?.backInfo || {};

  return {
    recognitionText: data.recognitionText || "",
    years: data.years || "",
    region: coinInfo.Region || "",
    denomination: coinInfo.Denomination || "",
    mintage: coinInfo.Mintage || "",
    price: data.price || "",
    priceUnit: data.priceUnit || "",
    krauseNumber: coinInfo["Krause number"] || "",
    metal: coinInfo.Metal || "",
    diameter: physical.diameter || "",
    thickness: physical.thickness || "",
    weight: physical.weight || "",
    frontDesc:
      front.labels?.join("、") || front.tags?.join("、") || front.detail || "",
    backDesc:
      back.labels?.join("、") || back.tags?.join("、") || back.detail || "",
  };
}

function formatOutput(info: CoinInfo, locale?: SupportedLocale): string {
  const t = getLocale(locale);
  const parts: string[] = [];

  if (info.price && info.priceUnit) {
    parts.push(`${t.labels.valuation}: ${info.price} ${info.priceUnit}`);
  }

  if (info.recognitionText) {
    parts.push(`${t.labels.name}: ${info.recognitionText}`);
  }
  if (info.years) {
    parts.push(`${t.labels.year}: ${info.years}`);
  }
  if (info.region) {
    parts.push(`${t.labels.region}: ${info.region}`);
  }
  if (info.denomination) {
    parts.push(`${t.labels.denomination}: ${info.denomination}`);
  }
  if (info.mintage) {
    parts.push(`${t.labels.mintage}: ${info.mintage}`);
  }

  const details: string[] = [];
  if (info.krauseNumber) {
    details.push(`${t.labels.krauseNumber}: ${info.krauseNumber}`);
  }
  if (info.metal) {
    details.push(`${t.labels.material}: ${info.metal}`);
  }
  if (info.diameter || info.thickness || info.weight) {
    if (info.diameter) details.push(`${t.labels.diameter}: ${info.diameter}`);
    if (info.thickness)
      details.push(`${t.labels.thickness}: ${info.thickness}`);
    if (info.weight) details.push(`${t.labels.weight}: ${info.weight}`);
  }
  if (info.frontDesc) {
    details.push(`${t.labels.obverse}: ${info.frontDesc}`);
  }
  if (info.backDesc) {
    details.push(`${t.labels.reverse}: ${info.backDesc}`);
  }

  const mainInfo = parts.length > 0 ? parts.join("\n") : "";
  const detailInfo =
    details.length > 0 ? `${t.labels.details}\n\n${details.join("\n")}` : "";

  return `${t.messages.recognitionResult}

${mainInfo}${mainInfo && detailInfo ? "\n\n" : ""}${detailInfo}`;
}

export async function main(
  img1: string,
  img2: string,
  userToken?: string,
  locale?: SupportedLocale,
) {
  const t = getLocale(locale);
  const detectedLocale = getCurrentLocale();

  try {
    const response = await recognizeCoin(img1, img2, userToken, locale);

    if (response.code !== 0) {
      return `${t.messages.recognitionFailed}: ${response.msg || "Unknown error"}`;
    }

    if (response.data?.isCoin !== 1) {
      return t.messages.notCoin;
    }

    const info = parseCoinInfo(response);
    return formatOutput(info, locale || detectedLocale);
  } catch (error) {
    return `${t.messages.error}: ${error instanceof Error ? error.message : String(error)}`;
  }
}

const args = process.argv.slice(2);
const isMainModule = process.argv[1]?.endsWith("recognize.ts");
if (isMainModule) {
  const [img1, img2, userToken, locale] = args;
  if (!img1 || !img2) {
    const t = getLocale(locale);
    console.error(t.prompts.usage);
    process.exit(1);
  }
  main(img1, img2, userToken, locale as SupportedLocale).then((result) => {
    console.log(result);
  });
}

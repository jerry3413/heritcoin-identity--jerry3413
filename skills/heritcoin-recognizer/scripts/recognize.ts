import {
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import {
  detectLocaleFromText,
  getLocale,
  getCurrentLocale,
  getLanguageCode,
  getAreaCode,
  normalizeLocale,
  type SupportedLocale,
} from "./i18n/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = "https://api.heritcoin.com/app/v1/inference-machine";
const UPLOAD_URL = "https://api.heritcoin.com/app/v1/file/file-upload-skills";

const DEFAULT_TOKEN =
  "7cmuVaXBNTNxY9vAkoWlIC7gowa5e9p/a602PvsPdv6QAjcnjHF5nftuEwGGwvxk+NXrfpsvz6GtBr+o4RwHmRvKFD1MiSGjRw5f2e8OuexSqgOH8og3S/71qs/WGjBC";

const CACHE_DIR = join(__dirname, ".cache");
const UUID_CACHE_FILE = join(CACHE_DIR, "device.uuid");
const IMAGE_URL_IN_TEXT = /https?:\/\/[^\s"'`<>()\]]+/gi;
const LOCAL_IMAGE_PATH_IN_TEXT =
  /(?:^|[\s(])((?:\/|~\/)[^\s"'`<>()]+?\.(?:jpe?g|png|gif|webp|bmp|heic|heif))(?:$|[\s)])/gi;

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

function getCodexHome(): string {
  return process.env.CODEX_HOME || join(homedir(), ".codex");
}

function findLatestSessionFile(rootDir: string): string | null {
  const matches: Array<{ path: string; mtimeMs: number }> = [];

  function walk(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.startsWith("rollout-") || !entry.name.endsWith(".jsonl")) {
        continue;
      }

      matches.push({ path: fullPath, mtimeMs: statSync(fullPath).mtimeMs });
    }
  }

  if (!existsSync(rootDir)) {
    return null;
  }

  walk(rootDir);
  if (matches.length === 0) {
    return null;
  }

  matches.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return matches[0].path;
}

function findSessionFileByThreadId(rootDir: string, threadId: string): string | null {
  function walk(directory: string): string | null {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        const nestedMatch = walk(fullPath);
        if (nestedMatch) {
          return nestedMatch;
        }
        continue;
      }

      if (
        entry.isFile() &&
        entry.name.startsWith("rollout-") &&
        entry.name.endsWith(".jsonl") &&
        entry.name.includes(threadId)
      ) {
        return fullPath;
      }
    }

    return null;
  }

  if (!existsSync(rootDir)) {
    return null;
  }

  return walk(rootDir);
}

function stripImageRefsFromText(text: string): string {
  return text
    .replace(IMAGE_URL_IN_TEXT, " ")
    .replace(LOCAL_IMAGE_PATH_IN_TEXT, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractUserText(entry: unknown): string | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const record = entry as {
    type?: string;
    payload?: {
      type?: string;
      role?: string;
      content?: Array<Record<string, unknown>>;
    };
  };

  if (
    record.type !== "response_item" ||
    record.payload?.type !== "message" ||
    record.payload.role !== "user" ||
    !Array.isArray(record.payload.content)
  ) {
    return null;
  }

  const text = record.payload.content
    .filter((item) => item.type === "input_text" && typeof item.text === "string")
    .map((item) => String(item.text))
    .join(" ")
    .trim();

  return text || null;
}

export function detectConversationLocaleFromSessionFile(
  sessionFile: string,
): SupportedLocale | null {
  const lines = readFileSync(sessionFile, "utf8").split(/\r?\n/);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]?.trim();
    if (!line) {
      continue;
    }

    try {
      const userText = extractUserText(JSON.parse(line));
      if (!userText) {
        continue;
      }

      const detectedLocale = detectLocaleFromText(stripImageRefsFromText(userText));
      if (detectedLocale) {
        return detectedLocale;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function detectConversationLocale(): SupportedLocale | null {
  try {
    const sessionsRoot = join(getCodexHome(), "sessions");
    const threadSessionFile = process.env.CODEX_THREAD_ID
      ? findSessionFileByThreadId(sessionsRoot, process.env.CODEX_THREAD_ID)
      : null;
    const sessionFile = threadSessionFile || findLatestSessionFile(sessionsRoot);

    if (!sessionFile) {
      return null;
    }

    return detectConversationLocaleFromSessionFile(sessionFile);
  } catch {
    return null;
  }
}

export function resolveRuntimeLocale(locale?: SupportedLocale | string): SupportedLocale {
  const explicitLocale = locale
    ? typeof locale === "string"
      ? normalizeLocale(locale)
      : locale
    : null;

  return explicitLocale || detectConversationLocale() || getCurrentLocale();
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

interface PropertyValueEntry {
  property?: string;
  value?: string | number | boolean | null;
}

interface SideDetailEntry {
  property?: string;
  value?: string | number | boolean | null;
}

interface SideInfo {
  labels?: string[];
  tags?: string[];
  detail?: SideDetailEntry[] | string;
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function uniqueNonEmpty(values: Array<string | undefined>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = stringifyValue(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function formatTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] || "");
}

function buildCoinSubject(info: CoinInfo): string {
  if (info.recognitionText) {
    return info.recognitionText;
  }

  return uniqueNonEmpty([info.years, info.region, info.denomination]).join(" ");
}

function buildCollectionAdvice(
  info: CoinInfo,
  locale?: SupportedLocale,
): string {
  const t = getLocale(locale);
  const subject = buildCoinSubject(info);
  const valuation = uniqueNonEmpty([info.price, info.priceUnit]).join(" ");

  let advice = t.messages.collectionAdviceDefault;

  if (subject && valuation) {
    advice = formatTemplate(t.messages.collectionAdviceForCoinWithValuation, {
      coin: subject,
      valuation,
    });
  } else if (subject) {
    advice = formatTemplate(t.messages.collectionAdviceForCoin, {
      coin: subject,
    });
  } else if (valuation) {
    advice = formatTemplate(t.messages.collectionAdviceWithValuation, {
      valuation,
    });
  }

  return `${t.labels.collectionAdvice}: ${advice}`;
}

interface CoinRecognitionResponse {
  code: number;
  msg?: string;
  data?: {
    recognitionText: string;
    coinInformation?: PropertyValueEntry[];
    propertyList?: PropertyValueEntry[];
    obverseReverseInfo?: {
      frontInfo?: SideInfo;
      backInfo?: SideInfo;
    };
    physicalFeaturesInfo?: {
      thickness?: string;
      diameter?: string;
      weight?: string;
    };
    price?: string;
    priceUnit?: string;
    years?: string | number;
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

function generateUserAgent(locale?: SupportedLocale): string {
  const device = getDeviceInfo();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const langCode = getLanguageCode(locale);
  const areaCode = getAreaCode(locale);

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

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}

function isDataUrl(value: string): boolean {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64Content: string } {
  const match = dataUrl.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/,
  );
  if (!match) {
    throw new Error("不支持的数据 URL");
  }
  return {
    mimeType: match[1],
    base64Content: match[2].replace(/\s+/g, ""),
  };
}

function createUploadHeaders(locale?: SupportedLocale): Record<string, string | number> {
  return {
    "User-Agent": generateUserAgent(locale),
    Host: "identify-api-t.wpt.la",
    "Content-Length": 0,
    uuid: getCachedUUID(),
  };
}

async function uploadFile(
  filePath: string,
  useBase64: boolean = false,
  locale?: SupportedLocale,
): Promise<string> {
  if (!existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const buffer = readFileSync(filePath);
  const base64Content = buffer.toString("base64");

  const headers = createUploadHeaders(locale);

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

async function uploadDataUrl(
  dataUrl: string,
  locale?: SupportedLocale,
): Promise<string> {
  const { base64Content } = parseDataUrl(dataUrl);
  const headers = createUploadHeaders(locale);
  const body = JSON.stringify({ file: base64Content, mode: 2 });
  headers["Content-Type"] = "application/json";
  headers["Content-Length"] = Buffer.byteLength(body);

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

async function prepareImageReference(
  imageInput: string,
  locale?: SupportedLocale,
): Promise<string> {
  if (isHttpUrl(imageInput)) {
    return imageInput;
  }
  if (isDataUrl(imageInput)) {
    return uploadDataUrl(imageInput, locale);
  }
  return uploadFile(imageInput, true, locale);
}

async function recognizeCoin(
  img1: string,
  img2: string,
  userToken?: string,
  locale?: SupportedLocale,
): Promise<CoinRecognitionResponse> {
  const isUrl = isHttpUrl(img1) && isHttpUrl(img2);
  const token = userToken || DEFAULT_TOKEN;
  const userAgent = generateUserAgent(locale);

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
      prepareImageReference(img1, locale),
      prepareImageReference(img2, locale),
    ]);
    console.log(t.messages.uploadComplete);
    body = JSON.stringify({ img1: url1, img2: url2 });
  }

  const response = await fetch(API_URL, { method: "POST", headers, body });
  return (await response.json()) as CoinRecognitionResponse;
}

function buildPropertyMap(entries?: PropertyValueEntry[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (const entry of entries || []) {
    const property = stringifyValue(entry.property);
    const value = stringifyValue(entry.value);

    if (!property || !value || result[property]) {
      continue;
    }

    result[property] = value;
  }

  return result;
}

function translateSideDetailProperty(
  property: string,
  locale?: SupportedLocale,
): string {
  const t = getLocale(locale);
  const normalized = property.trim().toLowerCase();

  if (normalized === "description") {
    return t.labels.description;
  }
  if (normalized === "creators" || normalized === "creator") {
    return t.labels.creators;
  }

  return property;
}

function formatSideDescription(
  sideInfo: SideInfo | undefined,
  locale?: SupportedLocale,
): string {
  if (!sideInfo) {
    return "";
  }

  const t = getLocale(locale);
  const detailEntries = Array.isArray(sideInfo.detail) ? sideInfo.detail : [];
  const descriptionEntries = detailEntries.filter(
    (entry) => stringifyValue(entry.property).toLowerCase() === "description",
  );
  const otherEntries = detailEntries.filter(
    (entry) => stringifyValue(entry.property).toLowerCase() !== "description",
  );

  return uniqueNonEmpty([
    ...descriptionEntries.map((entry) => {
      const value = stringifyValue(entry.value);
      return value ? `${t.labels.description}: ${value}` : "";
    }),
    ...uniqueNonEmpty(sideInfo.labels || []),
    sideInfo.tags?.length
      ? `${t.labels.lettering}: ${uniqueNonEmpty(sideInfo.tags).join("、")}`
      : "",
    ...otherEntries.map((entry) => {
      const property = stringifyValue(entry.property);
      const value = stringifyValue(entry.value);

      if (!value) {
        return "";
      }
      if (!property) {
        return value;
      }

      return `${translateSideDetailProperty(property, locale)}: ${value}`;
    }),
    typeof sideInfo.detail === "string" ? sideInfo.detail : "",
  ]).join("；");
}

function parseCoinInfo(
  response: CoinRecognitionResponse,
  locale?: SupportedLocale,
): CoinInfo {
  const data = response.data;
  if (!data) throw new Error("响应数据为空");

  const coinInfo = buildPropertyMap(
    data.coinInformation?.length ? data.coinInformation : data.propertyList,
  );
  const physical = data.physicalFeaturesInfo || {};
  const front = data.obverseReverseInfo?.frontInfo || {};
  const back = data.obverseReverseInfo?.backInfo || {};

  return {
    recognitionText: data.recognitionText || "",
    years: stringifyValue(data.years),
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
    frontDesc: formatSideDescription(front, locale),
    backDesc: formatSideDescription(back, locale),
  };
}

function formatOutput(info: CoinInfo, locale?: SupportedLocale): string {
  const t = getLocale(locale);
  const parts: string[] = [];

  if (info.recognitionText) {
    parts.push(`${t.labels.name}: ${info.recognitionText}`);
  }
  if (info.price && info.priceUnit) {
    parts.push(`${t.labels.valuation}: ${info.price} ${info.priceUnit}`);
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
  const collectionAdvice = buildCollectionAdvice(info, locale);

  return `${t.messages.recognitionResult}

${mainInfo}${mainInfo && detailInfo ? "\n\n" : ""}${detailInfo}${(mainInfo || detailInfo) && collectionAdvice ? "\n\n" : ""}${collectionAdvice}`;
}

export async function main(
  img1: string,
  img2: string,
  userToken?: string,
  locale?: SupportedLocale,
) {
  const runtimeLocale = resolveRuntimeLocale(locale);
  const t = getLocale(runtimeLocale);

  try {
    const response = await recognizeCoin(img1, img2, userToken, runtimeLocale);

    if (response.code !== 0) {
      return `${t.messages.recognitionFailed}: ${response.msg || "Unknown error"}`;
    }

    if (response.data?.isCoin !== 1) {
      return t.messages.notCoin;
    }

    const info = parseCoinInfo(response, runtimeLocale);
    return formatOutput(info, runtimeLocale);
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

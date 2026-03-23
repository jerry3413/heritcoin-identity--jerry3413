export type SupportedLocale =
  | "en"
  | "zh-CN"
  | "zh-TW"
  | "es"
  | "ja"
  | "ko"
  | "ru";

const LOCALE_PRIORITY = [
  "en-US",
  "en-GB",
  "zh-CN",
  "zh-TW",
  "zh-HK",
  "es-ES",
  "es-MX",
  "ja-JP",
  "ko-KR",
  "ru-RU",
];

const LOCALE_MAP: Record<string, SupportedLocale> = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  "en-au": "en",
  "en-ca": "en",
  "zh-cn": "zh-CN",
  "zh-tw": "zh-TW",
  "zh-hk": "zh-TW",
  "zh-sg": "zh-CN",
  "zh-mo": "zh-TW",
  es: "es",
  "es-es": "es",
  "es-mx": "es",
  "es-ar": "es",
  ja: "ja",
  "ja-jp": "ja",
  ko: "ko",
  "ko-kr": "ko",
  ru: "ru",
  "ru-ru": "ru",
  "ru-ua": "ru",
  "ru-kz": "ru",
};

export function detectSystemLocale(): SupportedLocale {
  const envLang = process.env.LANG || process.env.LC_ALL || process.env.LANGUAGE;
  if (envLang) {
    const normalized = normalizeLocale(envLang);
    if (normalized) return normalized;
  }

  try {
    const locale =
      Intl.DateTimeFormat().resolvedOptions().locale ||
      Intl.NumberFormat().resolvedOptions().locale;
    const normalized = normalizeLocale(locale);
    if (normalized) return normalized;
  } catch {}

  const lang = process.env.LANG || "";
  for (const priority of LOCALE_PRIORITY) {
    if (lang.toLowerCase().startsWith(priority.toLowerCase())) {
      const result = normalizeLocale(priority);
      if (result) return result;
    }
  }

  return "en";
}

export function normalizeLocale(locale: string): SupportedLocale | null {
  const cleanLocale = locale.split(".")[0].replace(/_/g, "-").toLowerCase();
  return LOCALE_MAP[cleanLocale] || null;
}

export function getSystemLanguageCode(): string {
  const locale = detectSystemLocale();
  const codeMap: Record<SupportedLocale, string> = {
    en: "en",
    "zh-CN": "zh",
    "zh-TW": "zh-TW",
    es: "es",
    ja: "ja",
    ko: "ko",
    ru: "ru",
  };
  return codeMap[locale];
}

export function getSystemAreaCode(): string {
  const locale = detectSystemLocale();
  const areaMap: Record<SupportedLocale, string> = {
    en: "US",
    "zh-CN": "CN",
    "zh-TW": "TW",
    es: "ES",
    ja: "JP",
    ko: "KR",
    ru: "RU",
  };
  return areaMap[locale];
}

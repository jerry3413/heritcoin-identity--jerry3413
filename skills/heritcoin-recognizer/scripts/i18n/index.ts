import { en, type LocaleContent } from "./en.js";
import { zhCN } from "./zh-CN.js";
import { zhTW } from "./zh-TW.js";
import { es } from "./es.js";
import { ja } from "./ja.js";
import { ko } from "./ko.js";
import { ru } from "./ru.js";
import {
  detectSystemLocale,
  normalizeLocale,
  getSystemLanguageCode,
  getSystemAreaCode,
  type SupportedLocale,
} from "./detector.js";

export const LOCALES: Record<SupportedLocale, LocaleContent> = {
  en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  es,
  ja,
  ko,
  ru,
};

export const DEFAULT_LOCALE: SupportedLocale = "en";

export function getLocale(locale?: SupportedLocale | string): LocaleContent {
  if (locale) {
    const normalized =
      typeof locale === "string" ? normalizeLocale(locale) : locale;
    if (normalized && LOCALES[normalized]) {
      return LOCALES[normalized];
    }
  }
  return LOCALES[detectSystemLocale()] || LOCALES[DEFAULT_LOCALE];
}

export function getCurrentLocale(): SupportedLocale {
  return detectSystemLocale();
}

export { detectSystemLocale, normalizeLocale, getSystemLanguageCode, getSystemAreaCode, type SupportedLocale };
export type { LocaleContent };

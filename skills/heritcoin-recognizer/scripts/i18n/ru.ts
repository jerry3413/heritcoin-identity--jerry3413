import type { LocaleContent } from "./en.js";

export const ru: LocaleContent = {
  labels: {
    valuation: "Оценка",
    name: "Название",
    year: "Год",
    region: "Страна/Регион",
    denomination: "Номинал",
    mintage: "Тираж",
    krauseNumber: "Номер Krause",
    material: "Материал",
    diameter: "Диаметр",
    thickness: "Толщина",
    weight: "Вес",
    obverse: "Аверс",
    reverse: "Реверс",
    details: "Подробности",
  },
  messages: {
    recognitionResult: "Результат распознавания",
    uploading: "Загрузка файлов на сервер...",
    uploadComplete: "Загрузка файлов завершена",
    recognitionFailed: "Ошибка распознавания",
    notCoin: "Не распознано как монета, возможно другой предмет",
    error: "Ошибка",
  },
  prompts: {
    usage: "Использование: npx tsx recognize.ts <img1> <img2> [token]",
    missingFiles: "Пожалуйста, укажите оба файла изображений",
  },
};

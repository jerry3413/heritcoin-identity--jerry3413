import type { LocaleContent } from "./en.js";

export const ko: LocaleContent = {
  labels: {
    valuation: "평가",
    name: "이름",
    year: "연도",
    region: "국가/지역",
    denomination: "액면",
    mintage: "주조량",
    krauseNumber: "Krause 번호",
    material: "재질",
    diameter: "지름",
    thickness: "두께",
    weight: "무게",
    obverse: "앞면",
    reverse: "뒷면",
    details: "상세 정보",
  },
  messages: {
    recognitionResult: "인식 결과",
    uploading: "파일을 서버에 업로드 중...",
    uploadComplete: "파일 업로드 완료",
    recognitionFailed: "인식 실패",
    notCoin: "동전으로 인식되지 않았습니다. 다른 물체일 수 있습니다",
    error: "오류",
  },
  prompts: {
    usage: "用法: npx tsx recognize.ts <img1> <img2> [token]",
    missingFiles: "두 개의 이미지 파일을 제공해 주세요",
  },
};

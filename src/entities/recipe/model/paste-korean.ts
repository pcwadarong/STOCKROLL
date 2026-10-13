// Korean spellings the paste reader accepts. This is the one file in `src` that holds Korean:
// it is input vocabulary, matched against what people paste, and never shown in the interface
// (AGENTS.md §2). The terms are the ones Korean recipe posts use; they were not checked against
// a camera's Korean menu, so add a spelling here when a post uses one that is not recognized.

/** Labels per Fujifilm setting, keyed like the readers in `parse-recipe-text.ts`. */
export const KOREAN_LABELS = {
  simulation: ['필름 시뮬레이션', '필름 시뮬', '시뮬레이션', '필시'],
  grain: ['그레인 효과', '그레인 이펙트', '그레인'],
  grainSize: ['그레인 크기', '그레인 사이즈'],
  colorChromeFxBlue: ['컬러 크롬 FX 블루', '컬러 크롬 블루', '컬러크롬 FX 블루', '컬러크롬 블루'],
  colorChrome: ['컬러 크롬 효과', '컬러 크롬 이펙트', '컬러 크롬', '컬러크롬'],
  whiteBalance: ['화이트 밸런스', '화이트 발란스', '화밸'],
  wbShift: ['화이트 밸런스 시프트', 'WB 시프트', '화밸 시프트'],
  dynamicRange: ['다이내믹 레인지', '다이나믹 레인지'],
  toneCurve: ['D 레인지 우선', '톤 곡선', '톤 커브'],
  highlight: ['하이라이트 톤', '하이라이트'],
  shadow: ['섀도우 톤', '섀도 톤', '쉐도우 톤', '섀도우', '쉐도우', '섀도', '쉐도'],
  monochromeColor: ['모노크로매틱 컬러'],
  color: ['컬러', '색농도'],
  sharpness: ['샤프니스', '샤프네스', '선명도'],
  noiseReduction: ['고감도 노이즈 리덕션', '고감도 노이즈 감소', '노이즈 리덕션', '노이즈 감소'],
  clarity: ['명료도', '클래리티'],
  exposureCompensation: ['노출 보정', '노출보정'],
} as const satisfies Record<string, readonly string[]>;

/** Film simulation names, keyed by the name the form lists. */
export const KOREAN_SIMULATIONS: Record<string, readonly string[]> = {
  'PROVIA / Standard': ['프로비아', '프로비아 스탠다드', '스탠다드'],
  'Velvia / Vivid': ['벨비아', '벨비아 비비드', '비비드'],
  'ASTIA / Soft': ['아스티아', '아스티아 소프트', '소프트'],
  'Classic Chrome': ['클래식 크롬', '클크'],
  'REALA ACE': ['리얼라 에이스', '레알라 에이스', '리얼라'],
  'PRO Neg. Hi': ['프로 네거티브 하이', '프로 네가 하이'],
  'PRO Neg. Std': ['프로 네거티브 스탠다드', '프로 네가 스탠다드'],
  'Classic Neg.': ['클래식 네거티브', '클래식 네가티브', '클래식 네가', '클네'],
  'Nostalgic Neg.': ['노스탤직 네거티브', '노스탤직 네가티브', '노스탤직 네가'],
  'ETERNA / Cinema': ['이터나', '이터나 시네마'],
  'ETERNA Bleach Bypass': ['이터나 블리치 바이패스', '블리치 바이패스'],
  ACROS: ['아크로스'],
  Monochrome: ['모노크롬', '흑백'],
  Sepia: ['세피아'],
};

/** Words for the values that are picked from a short list. */
export const KOREAN_WORDS = {
  level: {
    Off: ['끔', '꺼짐', '오프', '없음'],
    Weak: ['약', '약하게', '약함'],
    Strong: ['강', '강하게', '강함'],
  },
  size: { Small: ['소', '작게', '작음'], Large: ['대', '크게', '큼'] },
  whiteBalance: {
    Auto: ['자동', '오토'],
    Daylight: ['태양광', '맑은 날', '주광'],
    Shade: ['그늘'],
    Incandescent: ['백열등'],
    Underwater: ['수중'],
  },
  red: ['레드', '빨강'],
  blue: ['블루', '파랑'],
} as const;

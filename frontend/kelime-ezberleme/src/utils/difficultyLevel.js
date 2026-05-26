export const CEFR_LEVEL_OPTIONS = [
  { label: "A1", value: "1", description: "Başlangıç", group: "Kolay", className: "easy", order: 1 },
  { label: "A2", value: "3", description: "Temel", group: "Kolay", className: "easy", order: 2 },
  { label: "B1", value: "5", description: "Orta", group: "Orta", className: "medium", order: 3 },
  { label: "B2", value: "7", description: "Orta üstü", group: "Orta", className: "medium", order: 4 },
  { label: "C1", value: "9", description: "İleri", group: "Zor", className: "hard", order: 5 },
  { label: "C2", value: "10", description: "Uzman", group: "Zor", className: "hard", order: 6 },
];

const CEFR_LABELS = CEFR_LEVEL_OPTIONS.map((level) => level.label);

export function isCefrLevel(value) {
  return CEFR_LABELS.includes(String(value || "").trim().toUpperCase());
}

export function getCefrLabel(value) {
  const textValue = String(value || "").trim().toUpperCase();

  if (isCefrLevel(textValue)) {
    return textValue;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "A1";
  }

  if (numericValue <= 2) {
    return "A1";
  }

  if (numericValue <= 4) {
    return "A2";
  }

  if (numericValue <= 6) {
    return "B1";
  }

  if (numericValue <= 8) {
    return "B2";
  }

  if (numericValue <= 9) {
    return "C1";
  }

  return "C2";
}

export function getCefrMeta(value) {
  const label = getCefrLabel(value);
  return CEFR_LEVEL_OPTIONS.find((level) => level.label === label) || CEFR_LEVEL_OPTIONS[0];
}

export function getDifficultyValue(value) {
  return getCefrMeta(value).value;
}

export function getDifficultyGroupText(value) {
  return getCefrMeta(value).group;
}

export function getDifficultyClassName(value) {
  return getCefrMeta(value).className;
}

export function getCefrSortOrder(value) {
  return getCefrMeta(value).order;
}

export function isValidDifficultyValue(value) {
  return CEFR_LEVEL_OPTIONS.some((level) => level.value === String(value));
}

export function getReportLevelName(name) {
  const textValue = String(name || "").trim();
  const levelMatch = textValue.match(/^seviye\s+(\d+)$/i);

  if (levelMatch) {
    return getCefrLabel(Number(levelMatch[1]));
  }

  return isCefrLevel(textValue) ? textValue.toUpperCase() : textValue;
}

export function isLevelReportName(name) {
  const textValue = String(name || "").trim();
  return isCefrLevel(textValue) || /^seviye\s+\d+$/i.test(textValue);
}

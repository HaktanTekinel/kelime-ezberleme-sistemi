export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const CEFR_LEVEL_OPTIONS = CEFR_LEVELS.map((level, index) => ({
  value: String(index + 1),
  label: level,
}));

const CEFR_LEVEL_SET = new Set(CEFR_LEVELS);
const LEVEL_NAME_PATTERN = /^seviye\s+(\d+)$/i;

export function isCefrLevel(value) {
  return CEFR_LEVEL_SET.has(String(value || "").trim().toUpperCase());
}

export function getCefrLevelLabel(level, topic = "") {
  const topicLabel = String(topic || "").trim().toUpperCase();

  if (isCefrLevel(topicLabel)) {
    return topicLabel;
  }

  const levelText = String(level || "").trim().toUpperCase();

  if (isCefrLevel(levelText)) {
    return levelText;
  }

  const seviyeMatch = LEVEL_NAME_PATTERN.exec(levelText);
  const numericLevel = Number(seviyeMatch?.[1] || level);
  const index = Number.isFinite(numericLevel)
    ? Math.min(Math.max(Math.trunc(numericLevel), 1), CEFR_LEVELS.length) - 1
    : 0;

  return CEFR_LEVELS[index];
}

export function getCefrLevelOrder(level, topic = "") {
  const label = getCefrLevelLabel(level, topic);
  const index = CEFR_LEVELS.indexOf(label);

  return index === -1 ? CEFR_LEVELS.length : index;
}

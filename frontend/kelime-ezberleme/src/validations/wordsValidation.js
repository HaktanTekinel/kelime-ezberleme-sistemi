const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ENGLISH_WORD_PATTERN = /^[a-zA-Z\s'-]+$/;
const CEFR_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

const isValidUrl = (value) => {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const normalizeWord = (value) => {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR");
};

const normalizeLevel = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase();
};

const getWordEnglishName = (word) => {
  return (
    word.eng_word ||
    word.engWord ||
    word.eng_word_name ||
    word.engWordName ||
    word.EngWordName ||
    ""
  );
};

const validateEnglishWord = (errors, englishWord, checkPattern = false) => {
  if (!englishWord) {
    errors.eng_word = "İngilizce kelime boş bırakılamaz.";
    return;
  }

  if (englishWord.length < 2) {
    errors.eng_word = "İngilizce kelime en az 2 karakter olmalıdır.";
    return;
  }

  if (checkPattern && !ENGLISH_WORD_PATTERN.test(englishWord)) {
    errors.eng_word =
      "İngilizce kelime yalnızca harf, boşluk, tire veya kesme işareti içerebilir.";
  }
};

const validateTurkishWord = (errors, turkishWord) => {
  if (!turkishWord) {
    errors.tur_word = "Türkçe karşılık boş bırakılamaz.";
    return;
  }

  if (turkishWord.length < 2) {
    errors.tur_word = "Türkçe karşılık en az 2 karakter olmalıdır.";
  }
};

const validateTopic = (errors, topic) => {
  if (topic && topic.length > 60) {
    errors.topic = "Konu alanı en fazla 60 karakter olabilir.";
  }
};

const validateDifficultyLevel = (errors, difficultyLevel) => {
  if (!CEFR_LEVELS.has(difficultyLevel)) {
    errors.difficulty_level = "Seviye A1, A2, B1, B2, C1 veya C2 olmalıdır.";
  }
};

const validateSamples = (errors, samples) => {
  if (!Array.isArray(samples) || samples.length === 0) {
    errors.samplesText = "En az bir örnek cümle eklemelisin.";
    return;
  }

  const hasShortSample = samples.some((sample) => sample.length < 8);

  if (hasShortSample) {
    errors.samplesText = "Örnek cümleler en az 8 karakter olmalıdır.";
  }
};

const validateUrlFields = (errors, formData) => {
  if (formData.picture_url && !isValidUrl(formData.picture_url.trim())) {
    errors.picture_url = "Geçerli bir görsel URL giriniz.";
  }

  if (formData.audio_url && !isValidUrl(formData.audio_url.trim())) {
    errors.audio_url = "Geçerli bir ses URL giriniz.";
  }
};

const validatePictureFile = (errors, pictureFile) => {
  if (!pictureFile) {
    return;
  }

  if (!ALLOWED_IMAGE_TYPES.has(pictureFile.type)) {
    errors.pictureFile = "Görsel JPG, PNG veya WEBP formatında olmalıdır.";
  }

  if (pictureFile.size > MAX_IMAGE_SIZE_BYTES) {
    errors.pictureFile = `Görsel dosyası en fazla ${MAX_IMAGE_SIZE_MB} MB olabilir.`;
  }
};

const validateDuplicateWord = (errors, englishWord, existingWords) => {
  const normalizedEnglishWord = normalizeWord(englishWord);

  const isDuplicate = existingWords.some((word) => {
    const currentWord = normalizeWord(getWordEnglishName(word));
    return currentWord === normalizedEnglishWord;
  });

  if (isDuplicate) {
    errors.eng_word = "Bu İngilizce kelime zaten listede bulunuyor.";
  }
};

const getPreparedWordFields = (formData) => {
  return {
    englishWord: formData.eng_word?.trim() || "",
    turkishWord: formData.tur_word?.trim() || "",
    topic: formData.topic?.trim() || "",
    difficultyLevel: normalizeLevel(formData.difficulty_level),
  };
};

const validateCommonWordFields = (errors, formData, checkEnglishPattern) => {
  const { englishWord, turkishWord, topic, difficultyLevel } =
    getPreparedWordFields(formData);

  validateEnglishWord(errors, englishWord, checkEnglishPattern);
  validateTurkishWord(errors, turkishWord);
  validateTopic(errors, topic);
  validateDifficultyLevel(errors, difficultyLevel);
  validateUrlFields(errors, formData);
  validatePictureFile(errors, formData.pictureFile);

  return englishWord;
};

export const validateWordForm = (formData, existingWords = [], samples = []) => {
  const errors = {};
  const englishWord = validateCommonWordFields(errors, formData, true);

  validateDuplicateWord(errors, englishWord, existingWords);
  validateSamples(errors, samples);

  return errors;
};

export const validateWordEditForm = (formData) => {
  const errors = {};

  validateCommonWordFields(errors, formData, false);

  return errors;
};
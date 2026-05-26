import { isValidDifficultyValue } from "../utils/difficultyLevel";

const MAX_IMAGE_SIZE_MB = 5;

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

export const validateWordForm = (formData, existingWords = [], samples = []) => {
  const errors = {};

  const englishWord = formData.eng_word?.trim();
  const turkishWord = formData.tur_word?.trim();
  const topic = formData.topic?.trim();

  if (!englishWord) {
    errors.eng_word = "İngilizce kelime boş bırakılamaz.";
  } else if (englishWord.length < 2) {
    errors.eng_word = "İngilizce kelime en az 2 karakter olmalıdır.";
  } else if (!/^[a-zA-Z\s'-]+$/.test(englishWord)) {
    errors.eng_word = "İngilizce kelime yalnızca harf, boşluk, tire veya kesme işareti içerebilir.";
  }

  const isDuplicate = existingWords.some((word) => {
    const currentWord = normalizeWord(getWordEnglishName(word));
    return currentWord === normalizeWord(englishWord);
  });

  if (isDuplicate) {
    errors.eng_word = "Bu İngilizce kelime zaten listede bulunuyor.";
  }

  if (!turkishWord) {
    errors.tur_word = "Türkçe karşılık boş bırakılamaz.";
  } else if (turkishWord.length < 2) {
    errors.tur_word = "Türkçe karşılık en az 2 karakter olmalıdır.";
  }

  if (topic && topic.length > 60) {
    errors.topic = "Konu alanı en fazla 60 karakter olabilir.";
  }

  if (!isValidDifficultyValue(formData.difficulty_level)) {
    errors.difficulty_level = "Zorluk seviyesi A1, A2, B1, B2, C1 veya C2 olmalıdır.";
  }

  if (!Array.isArray(samples) || samples.length === 0) {
    errors.samplesText = "En az bir örnek cümle eklemelisin.";
  } else {
    const hasShortSample = samples.some((sample) => sample.length < 8);

    if (hasShortSample) {
      errors.samplesText = "Örnek cümleler en az 8 karakter olmalıdır.";
    }
  }

  if (formData.picture_url && !isValidUrl(formData.picture_url.trim())) {
    errors.picture_url = "Geçerli bir görsel URL giriniz.";
  }

  if (formData.audio_url && !isValidUrl(formData.audio_url.trim())) {
    errors.audio_url = "Geçerli bir ses URL giriniz.";
  }

  if (formData.pictureFile) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(formData.pictureFile.type)) {
      errors.pictureFile = "Görsel JPG, PNG veya WEBP formatında olmalıdır.";
    }

    const maxSizeInBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;

    if (formData.pictureFile.size > maxSizeInBytes) {
      errors.pictureFile = `Görsel dosyası en fazla ${MAX_IMAGE_SIZE_MB} MB olabilir.`;
    }
  }

  return errors;
};

export const validateWordEditForm = (formData) => {
  const errors = {};

  const englishWord = formData.eng_word?.trim();
  const turkishWord = formData.tur_word?.trim();
  const topic = formData.topic?.trim();

  if (!englishWord) {
    errors.eng_word = "İngilizce kelime boş bırakılamaz.";
  } else if (englishWord.length < 2) {
    errors.eng_word = "İngilizce kelime en az 2 karakter olmalıdır.";
  }

  if (!turkishWord) {
    errors.tur_word = "Türkçe karşılık boş bırakılamaz.";
  } else if (turkishWord.length < 2) {
    errors.tur_word = "Türkçe karşılık en az 2 karakter olmalıdır.";
  }

  if (topic && topic.length > 60) {
    errors.topic = "Konu alanı en fazla 60 karakter olabilir.";
  }

  if (!isValidDifficultyValue(formData.difficulty_level)) {
    errors.difficulty_level = "Zorluk seviyesi A1, A2, B1, B2, C1 veya C2 olmalıdır.";
  }

  if (formData.picture_url && !isValidUrl(formData.picture_url.trim())) {
    errors.picture_url = "Geçerli bir görsel URL giriniz.";
  }

  if (formData.audio_url && !isValidUrl(formData.audio_url.trim())) {
    errors.audio_url = "Geçerli bir ses URL giriniz.";
  }

  if (formData.pictureFile) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(formData.pictureFile.type)) {
      errors.pictureFile = "Görsel JPG, PNG veya WEBP formatında olmalıdır.";
    }

    const maxSizeInBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;

    if (formData.pictureFile.size > maxSizeInBytes) {
      errors.pictureFile = `Görsel dosyası en fazla ${MAX_IMAGE_SIZE_MB} MB olabilir.`;
    }
  }

  return errors;
};
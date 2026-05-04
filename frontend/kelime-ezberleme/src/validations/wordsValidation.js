const isValidUrl = (value) => {
  if (!value.trim()) {
    return true;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const validateWordForm = (formData, words, samples) => {
  const errors = {};

  const engWord = formData.eng_word.trim();
  const turWord = formData.tur_word.trim();
  const topic = formData.topic.trim();
  const difficulty = Number(formData.difficulty_level);

  if (!engWord) {
    errors.eng_word = "İngilizce kelime boş bırakılamaz.";
  } else if (engWord.length > 150) {
    errors.eng_word = "İngilizce kelime en fazla 150 karakter olabilir.";
  } else if (!/^[A-Za-zğüşöçıİĞÜŞÖÇ\s'-]+$/.test(engWord)) {
    errors.eng_word =
      "İngilizce kelime sadece harf, boşluk, tire veya kesme işareti içermelidir.";
  }

  if (!turWord) {
    errors.tur_word = "Türkçe karşılık boş bırakılamaz.";
  } else if (turWord.length > 150) {
    errors.tur_word = "Türkçe karşılık en fazla 150 karakter olabilir.";
  }

  const sameWordExists = words.some(
    (word) => word.eng_word.toLowerCase() === engWord.toLowerCase()
  );

  if (sameWordExists) {
    errors.eng_word = "Bu İngilizce kelime zaten kelime havuzunda var.";
  }

  if (topic.length > 80) {
    errors.topic = "Konu en fazla 80 karakter olabilir.";
  }

  if (!difficulty || difficulty < 1 || difficulty > 10) {
    errors.difficulty_level = "Zorluk seviyesi 1 ile 10 arasında olmalıdır.";
  }

  if (samples.length === 0) {
    errors.samplesText = "En az 1 örnek cümle yazmalısınız.";
  } else if (samples.length > 5) {
    errors.samplesText = "En fazla 5 örnek cümle ekleyebilirsiniz.";
  } else if (samples.some((sample) => sample.length > 500)) {
    errors.samplesText = "Her örnek cümle en fazla 500 karakter olabilir.";
  }

  if (!isValidUrl(formData.picture_url)) {
    errors.picture_url = "Geçerli bir görsel URL girin veya boş bırakın.";
  }

  if (!isValidUrl(formData.audio_url)) {
    errors.audio_url = "Geçerli bir ses URL girin veya boş bırakın.";
  }

  if (formData.pictureFile) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const maxSize = 2 * 1024 * 1024;

    if (!allowedTypes.includes(formData.pictureFile.type)) {
      errors.pictureFile = "Görsel dosyası JPG, PNG veya WEBP olmalıdır.";
    } else if (formData.pictureFile.size > maxSize) {
      errors.pictureFile = "Görsel dosyası en fazla 2 MB olabilir.";
    }
  }

  return errors;
};
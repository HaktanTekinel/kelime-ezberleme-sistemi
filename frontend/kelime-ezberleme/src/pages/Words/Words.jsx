import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  API_BASE_URL,
  createWordAPI,
  listWordsAPI,
  uploadWordImageAPI,
} from "../../services/wordService";
import { validateWordForm } from "../../validations/wordsValidation";
import "./Words.css";

const initialFormData = {
  eng_word: "",
  tur_word: "",
  topic: "",
  difficulty_level: "1",
  picture_url: "",
  audio_url: "",
  samplesText: "",
  pictureFile: null,
};

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function pickValue(source, keys) {
  if (!source) {
    return undefined;
  }

  for (const key of keys) {
    if (hasValue(source[key])) {
      return source[key];
    }
  }

  return undefined;
}

function normalizeWord(word, index) {
  const samples =
    pickValue(word, ["samples", "word_samples", "wordSamples", "examples"]) || [];

  return {
    id: pickValue(word, ["id", "word_id", "wordId", "WordID"]) || index,
    eng_word:
      pickValue(word, [
        "eng_word",
        "engWord",
        "eng_word_name",
        "engWordName",
        "EngWordName",
      ]) || "",
    tur_word:
      pickValue(word, [
        "tur_word",
        "turWord",
        "tur_word_name",
        "turWordName",
        "TurWordName",
      ]) || "",
    topic: pickValue(word, ["topic", "category", "level"]) || "",
    difficulty_level:
      pickValue(word, ["difficulty_level", "difficultyLevel", "difficulty"]) || 1,
    picture_url:
      pickValue(word, ["picture_url", "pictureUrl", "image_url", "imageUrl", "picture"]) ||
      "",
    audio_url: pickValue(word, ["audio_url", "audioUrl"]) || "",
    samples: Array.isArray(samples) ? samples : [],
  };
}

function normalizeWordList(data) {
  const rawWords = Array.isArray(data)
    ? data
    : data?.words || data?.items || data?.results || [];

  return Array.isArray(rawWords)
    ? rawWords.map((word, index) => normalizeWord(word, index))
    : [];
}

function getImageUrl(pictureUrl) {
  if (!pictureUrl) {
    return "";
  }

  if (pictureUrl.startsWith("http")) {
    return pictureUrl;
  }

  return `${API_BASE_URL}${pictureUrl}`;
}

function Words() {
  const [formData, setFormData] = useState(initialFormData);
  const [words, setWords] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadWords = useCallback(async () => {
    setListLoading(true);

    try {
      const data = await listWordsAPI();
      setWords(normalizeWordList(data));
    } catch {
      setWords([]);
      setMessage({
        type: "error",
        text: "Kelimeler şu anda yüklenemedi. Lütfen daha sonra tekrar deneyin.",
      });
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const getSamples = () => {
    return formData.samplesText
      .split("\n")
      .map((sample) => sample.trim())
      .filter(Boolean);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setFieldErrors({});

    const fileInput = document.getElementById("pictureFile");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    setFieldErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "",
    }));

    setMessage({ type: "", text: "" });
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setFormData((prevData) => ({
      ...prevData,
      pictureFile: file,
    }));

    setFieldErrors((prevErrors) => ({
      ...prevErrors,
      pictureFile: "",
    }));

    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const samples = getSamples();
    const errors = validateWordForm(formData, words, samples);

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setMessage({
        type: "error",
        text: "Lütfen formdaki bilgileri kontrol edin.",
      });
      return;
    }

    setSaving(true);
    setMessage({ type: "", text: "" });

    const payload = {
      eng_word: formData.eng_word.trim(),
      tur_word: formData.tur_word.trim(),
      difficulty_level: Number(formData.difficulty_level),
      topic: formData.topic.trim() || null,
      picture_url: formData.picture_url.trim() || null,
      audio_url: formData.audio_url.trim() || null,
      samples,
    };

    try {
      const createdWord = await createWordAPI(payload);
      const createdWordId =
        createdWord?.word_id || createdWord?.wordId || createdWord?.id;

      if (formData.pictureFile && createdWordId) {
        await uploadWordImageAPI(createdWordId, formData.pictureFile);
      }

      setMessage({
        type: "success",
        text: "Kelime başarıyla kaydedildi.",
      });

      resetForm();
      await loadWords();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Kelime kaydedilemedi. Lütfen tekrar deneyin.",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredWords = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) {
      return words;
    }

    return words.filter((word) => {
      return (
        word.eng_word.toLowerCase().includes(search) ||
        word.tur_word.toLowerCase().includes(search) ||
        (word.topic || "").toLowerCase().includes(search)
      );
    });
  }, [words, searchTerm]);

  return (
    <div className="words-page">
      <section className="words-hero">
        <div>
          <h2>Kelime Ekle</h2>
          <p>
            İngilizce kelime, Türkçe karşılık, örnek cümle ve görsel bilgisi
            ekleyerek kelime havuzunu genişlet.
          </p>
        </div>

        <div className="words-hero-actions">
          <Link to="/home">Ana Sayfa</Link>
          <Link to="/words">Kelime Listesi</Link>
        </div>
      </section>

      {message.text && (
        <section className={`words-message ${message.type}`}>
          {message.text}
        </section>
      )}

      <section className="words-layout">
        <form className="word-form-card" onSubmit={handleSubmit}>
          <div className="word-card-header">
            <div>
              <p>Yeni kelime</p>
              <h3>Kelime bilgileri</h3>
            </div>

            <div className="word-card-icon">➕</div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span>İngilizce kelime</span>
              <input
                name="eng_word"
                type="text"
                placeholder="Örn: memory"
                value={formData.eng_word}
                onChange={handleChange}
              />
              {fieldErrors.eng_word && (
                <small>{fieldErrors.eng_word}</small>
              )}
            </label>

            <label className="form-field">
              <span>Türkçe karşılığı</span>
              <input
                name="tur_word"
                type="text"
                placeholder="Örn: hafıza"
                value={formData.tur_word}
                onChange={handleChange}
              />
              {fieldErrors.tur_word && (
                <small>{fieldErrors.tur_word}</small>
              )}
            </label>

            <label className="form-field">
              <span>Konu</span>
              <input
                name="topic"
                type="text"
                placeholder="Örn: Günlük hayat"
                value={formData.topic}
                onChange={handleChange}
              />
              {fieldErrors.topic && <small>{fieldErrors.topic}</small>}
            </label>

            <label className="form-field">
              <span>Zorluk seviyesi</span>
              <select
                name="difficulty_level"
                value={formData.difficulty_level}
                onChange={handleChange}
              >
                <option value="1">1 - Çok kolay</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5 - Orta</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10 - Zor</option>
              </select>
              {fieldErrors.difficulty_level && (
                <small>{fieldErrors.difficulty_level}</small>
              )}
            </label>
          </div>

          <label className="form-field">
            <span>Örnek cümleler</span>
            <textarea
              name="samplesText"
              placeholder={`Her satıra bir örnek cümle yaz.\nÖrn:\nI have a good memory.\nThis memory is important.`}
              value={formData.samplesText}
              onChange={handleChange}
              rows={5}
            />
            {fieldErrors.samplesText ? (
              <small>{fieldErrors.samplesText}</small>
            ) : (
              <em>Her satır ayrı bir örnek cümle olarak kaydedilir.</em>
            )}
          </label>

          <div className="form-grid">
            <label className="form-field">
              <span>Görsel URL</span>
              <input
                name="picture_url"
                type="text"
                placeholder="Opsiyonel görsel bağlantısı"
                value={formData.picture_url}
                onChange={handleChange}
              />
              {fieldErrors.picture_url && (
                <small>{fieldErrors.picture_url}</small>
              )}
            </label>

            <label className="form-field">
              <span>Ses URL</span>
              <input
                name="audio_url"
                type="text"
                placeholder="Opsiyonel ses bağlantısı"
                value={formData.audio_url}
                onChange={handleChange}
              />
              {fieldErrors.audio_url && (
                <small>{fieldErrors.audio_url}</small>
              )}
            </label>
          </div>

          <label className="form-field">
            <span>Görsel dosyası</span>
            <input
              id="pictureFile"
              name="pictureFile"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {fieldErrors.pictureFile ? (
              <small>{fieldErrors.pictureFile}</small>
            ) : (
              <em>JPG, PNG veya WEBP dosyası yükleyebilirsin.</em>
            )}
          </label>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-word-button"
              onClick={resetForm}
              disabled={saving}
            >
              Temizle
            </button>

            <button
              type="submit"
              className="primary-word-button"
              disabled={saving}
            >
              {saving ? "Kaydediliyor..." : "Kelimeyi Kaydet"}
            </button>
          </div>
        </form>

        <aside className="recent-words-card">
          <div className="word-card-header">
            <div>
              <p>Kelime havuzu</p>
              <h3>Son eklenenler</h3>
            </div>

            <strong>{words.length}</strong>
          </div>

          <input
            className="word-search-input"
            type="text"
            placeholder="Kelime, anlam veya konu ara..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          {listLoading ? (
            <div className="words-state">Kelimeler yükleniyor...</div>
          ) : filteredWords.length === 0 ? (
            <div className="words-state">
              Henüz gösterilecek kelime bulunmuyor.
            </div>
          ) : (
            <div className="recent-word-list">
              {filteredWords.slice(0, 5).map((word) => (
                <article className="recent-word-item" key={word.id}>
                  {word.picture_url ? (
                    <img src={getImageUrl(word.picture_url)} alt={word.eng_word} />
                  ) : (
                    <div className="recent-word-placeholder">
                      {word.eng_word.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h4>{word.eng_word}</h4>
                    <p>{word.tur_word}</p>

                    <div className="recent-word-meta">
                      <span>Seviye {word.difficulty_level}</span>
                      {word.topic && <span>{word.topic}</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <Link to="/words" className="all-words-link">
            Tüm kelimeleri görüntüle
          </Link>
        </aside>
      </section>
    </div>
  );
}

export default Words;
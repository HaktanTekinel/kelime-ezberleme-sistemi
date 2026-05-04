import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  API_BASE_URL,
  createWordAPI,
  listWordsAPI,
  uploadWordImageAPI,
} from "../../services/wordService";
import { getAuthToken } from "../../services/apiClient";
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

function Words() {
  const [formData, setFormData] = useState(initialFormData);
  const [words, setWords] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const isLoggedIn = useMemo(() => Boolean(getAuthToken()), []);

  const getImageUrl = (pictureUrl) => {
    if (!pictureUrl) {
      return "";
    }

    if (pictureUrl.startsWith("http")) {
      return pictureUrl;
    }

    return `${API_BASE_URL}${pictureUrl}`;
  };

  const loadWords = async () => {
    setListLoading(true);

    try {
      const data = await listWordsAPI();
      setWords(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Kelimeler yüklenemedi.",
      });
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

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
  };

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const samples = getSamples();
    const errors = validateWordForm(formData, words, samples);

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setMessage({
        type: "error",
        text: "Lütfen formdaki hataları düzeltin.",
      });
      return;
    }

    setLoading(true);
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

      if (formData.pictureFile && createdWord?.word_id) {
        await uploadWordImageAPI(createdWord.word_id, formData.pictureFile);
      }

      setMessage({
        type: "success",
        text: "Kelime başarıyla eklendi.",
      });

      resetForm();
      await loadWords();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Kelime eklenemedi.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredWords = words.filter((word) => {
    const search = searchTerm.toLowerCase();

    return (
      word.eng_word.toLowerCase().includes(search) ||
      word.tur_word.toLowerCase().includes(search) ||
      (word.topic || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className="words-page">
      <header className="words-header">
        <div>
          <h1>Kelime Yönetimi</h1>
          <p>
            İngilizce kelime, Türkçe karşılık, örnek cümle ve görsel bilgisi
            ekleyerek kelime havuzunu oluştur.
          </p>
        </div>

        <div className="words-header-actions">
          <Link to="/" className="words-secondary-link">
            Ana Sayfa
          </Link>

          <Link to="/word-list" className="words-secondary-link">
            Kelime Listesi
          </Link>

          {!isLoggedIn && (
            <Link to="/login" className="words-primary-link">
              Giriş Yap
            </Link>
          )}
        </div>
      </header>

      <main className="words-layout">
        <section className="word-form-card">
          <div className="card-title">
            <span>Yeni Kelime</span>
            <h2>Kelime Ekle</h2>
          </div>

          {!isLoggedIn && (
            <div className="words-warning">
              Kelime eklemek için önce giriş yapmalısınız.
            </div>
          )}

          {message.text && (
            <p className={`words-message ${message.type}`}>{message.text}</p>
          )}

          <form className="word-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="eng_word">İngilizce Kelime</label>
                <input
                  id="eng_word"
                  name="eng_word"
                  type="text"
                  placeholder="Örn: memory"
                  value={formData.eng_word}
                  onChange={handleChange}
                />

                {fieldErrors.eng_word && (
                  <small className="field-error">{fieldErrors.eng_word}</small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="tur_word">Türkçe Karşılığı</label>
                <input
                  id="tur_word"
                  name="tur_word"
                  type="text"
                  placeholder="Örn: hafıza"
                  value={formData.tur_word}
                  onChange={handleChange}
                />

                {fieldErrors.tur_word && (
                  <small className="field-error">{fieldErrors.tur_word}</small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="topic">Konu</label>
                <input
                  id="topic"
                  name="topic"
                  type="text"
                  placeholder="Örn: Günlük hayat"
                  value={formData.topic}
                  onChange={handleChange}
                />

                {fieldErrors.topic && (
                  <small className="field-error">{fieldErrors.topic}</small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="difficulty_level">Zorluk Seviyesi</label>
                <select
                  id="difficulty_level"
                  name="difficulty_level"
                  value={formData.difficulty_level}
                  onChange={handleChange}
                >
                  <option value="1">1 - Çok Kolay</option>
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
                  <small className="field-error">
                    {fieldErrors.difficulty_level}
                  </small>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="samplesText">Örnek Cümleler</label>
              <textarea
                id="samplesText"
                name="samplesText"
                placeholder={`Her satıra 1 örnek cümle yaz.\nÖrn:\nI have a good memory.\nThis memory is important.`}
                value={formData.samplesText}
                onChange={handleChange}
                rows={5}
              />

              <small>Her satır ayrı bir örnek cümle olarak kaydedilir.</small>

              {fieldErrors.samplesText && (
                <small className="field-error">{fieldErrors.samplesText}</small>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="picture_url">Görsel URL</label>
                <input
                  id="picture_url"
                  name="picture_url"
                  type="text"
                  placeholder="Opsiyonel görsel bağlantısı"
                  value={formData.picture_url}
                  onChange={handleChange}
                />

                {fieldErrors.picture_url && (
                  <small className="field-error">
                    {fieldErrors.picture_url}
                  </small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="audio_url">Ses URL</label>
                <input
                  id="audio_url"
                  name="audio_url"
                  type="text"
                  placeholder="Opsiyonel ses bağlantısı"
                  value={formData.audio_url}
                  onChange={handleChange}
                />

                {fieldErrors.audio_url && (
                  <small className="field-error">{fieldErrors.audio_url}</small>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="pictureFile">Görsel Dosyası</label>
              <input
                id="pictureFile"
                name="pictureFile"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />

              <small>
                JPG, PNG veya WEBP yükleyebilirsin. Maksimum dosya boyutu 2 MB.
              </small>

              {fieldErrors.pictureFile && (
                <small className="field-error">{fieldErrors.pictureFile}</small>
              )}
            </div>

            <button
              className="word-submit-button"
              type="submit"
              disabled={loading || !isLoggedIn}
            >
              {loading ? "Kaydediliyor..." : "Kelimeyi Kaydet"}
            </button>
          </form>
        </section>

        <section className="word-list-card">
          <div className="card-title word-list-title">
            <div>
              <span>Kelime Havuzu</span>
              <h2>Son Eklenen Kelimeler</h2>
            </div>

            <strong>{words.length} kelime</strong>
          </div>

          <input
            className="word-search-input"
            type="text"
            placeholder="Kelime, anlam veya konu ara..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />

          {listLoading ? (
            <p className="words-empty">Kelimeler yükleniyor...</p>
          ) : filteredWords.length === 0 ? (
            <p className="words-empty">
              Kelime bulunamadı. Yeni kelime ekleyebilir veya arama metnini
              değiştirebilirsin.
            </p>
          ) : (
            <>
              <div className="word-list">
                {filteredWords.slice(0, 5).map((word) => (
                  <article className="word-item word-card-modern" key={word.id}>
                    {word.picture_url ? (
                      <img
                        className="word-image"
                        src={getImageUrl(word.picture_url)}
                        alt={word.eng_word}
                      />
                    ) : (
                      <div className="word-image-placeholder">
                        {word.eng_word.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="word-info">
                      <div className="word-title-row">
                        <div>
                          <h3>{word.eng_word}</h3>
                          <p>{word.tur_word}</p>
                        </div>

                        <span>Seviye {word.difficulty_level}</span>
                      </div>

                      <div className="word-meta">
                        <span>{word.topic || "Konu yok"}</span>
                        {word.audio_url && <span>Ses var</span>}
                        {word.picture_url && <span>Görsel var</span>}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <Link to="/word-list" className="word-list-page-link">
                Tüm kelimeleri görüntüle
              </Link>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default Words;
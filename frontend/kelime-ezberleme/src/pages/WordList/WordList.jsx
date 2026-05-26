import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  API_BASE_URL,
  deleteWordAPI,
  listWordsAPI,
  updateWordAPI,
  uploadWordImageAPI,
} from "../../services/wordService";
import {
  CEFR_LEVEL_OPTIONS,
  getCefrLabel,
  getCefrSortOrder,
  getDifficultyClassName,
  getDifficultyGroupText,
  getDifficultyValue,
  isCefrLevel,
  isValidDifficultyValue,
} from "../../utils/difficultyLevel";
import "./WordList.css";

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

function normalizeSamples(samples) {
  if (!Array.isArray(samples)) {
    return [];
  }

  return samples
    .map((sample) => {
      if (typeof sample === "string") {
        return sample;
      }

      return (
        sample.sample_text ||
        sample.sampleText ||
        sample.text ||
        sample.sentence ||
        ""
      );
    })
    .filter(Boolean);
}

function normalizeWord(word, index) {
  const difficultyLevel =
    Number(
      pickValue(word, ["difficulty_level", "difficultyLevel", "difficulty"])
    ) || 1;
  const topic = pickValue(word, ["topic", "category", "level"]) || "";

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
    topic: isCefrLevel(topic) ? "" : topic,
    difficulty_level: difficultyLevel,
    picture_url:
      pickValue(word, [
        "picture_url",
        "pictureUrl",
        "image_url",
        "imageUrl",
        "picture",
      ]) || "",
    audio_url: pickValue(word, ["audio_url", "audioUrl"]) || "",
    samples: normalizeSamples(
      pickValue(word, ["samples", "word_samples", "wordSamples", "examples"])
    ),
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

function getAssetUrl(url) {
  if (!url) {
    return "";
  }

  if (url.startsWith("http")) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

function playAudioUrl(audioUrl) {
  const resolvedAudioUrl = getAssetUrl(audioUrl);

  if (!resolvedAudioUrl) {
    return;
  }

  const audio = new Audio(resolvedAudioUrl);

  audio.play().catch(() => {
    alert("Ses oynatılamadı. Ses dosyası bulunamadı ya da tarayıcı engelledi.");
  });
}

function getDifficultyText(level) {
  return getDifficultyGroupText(level);
}

function getDifficultyClass(level) {
  return getDifficultyClassName(level);
}

function getInitialEditForm(word) {
  return {
    eng_word: word.eng_word || "",
    tur_word: word.tur_word || "",
    topic: word.topic || "",
    difficulty_level: getDifficultyValue(word.difficulty_level),
    picture_url: word.picture_url || "",
    audio_url: word.audio_url || "",
    samplesText: Array.isArray(word.samples) ? word.samples.join("\n") : "",
    pictureFile: null,
  };
}

function WordList() {
  const [words, setWords] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sortType, setSortType] = useState("newest");

  const [editingWord, setEditingWord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    eng_word: "",
    tur_word: "",
    topic: "",
    difficulty_level: "1",
    picture_url: "",
    audio_url: "",
    samplesText: "",
    pictureFile: null,
  });

  const [editErrors, setEditErrors] = useState({});
  const [expandedSampleIds, setExpandedSampleIds] = useState(() => new Set());

  const toggleSamples = (wordId) => {
    setExpandedSampleIds((previousIds) => {
      const nextIds = new Set(previousIds);

      if (nextIds.has(wordId)) {
        nextIds.delete(wordId);
      } else {
        nextIds.add(wordId);
      }

      return nextIds;
    });
  };

  const loadWords = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const topicOptions = useMemo(() => {
    const topics = words
      .map((word) => word.topic)
      .filter(Boolean)
      .map((topic) => topic.trim())
      .filter(Boolean);

    return [...new Set(topics)].sort((a, b) => a.localeCompare(b, "tr"));
  }, [words]);

  const stats = useMemo(() => {
    return {
      total: words.length,
      withImage: words.filter((word) => Boolean(word.picture_url)).length,
      withAudio: words.filter((word) => Boolean(word.audio_url)).length,
      topicCount: topicOptions.length,
    };
  }, [words, topicOptions]);

  const filteredWords = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const result = words.filter((word) => {
      const matchesSearch =
        word.eng_word.toLowerCase().includes(search) ||
        word.tur_word.toLowerCase().includes(search) ||
        (word.topic || "").toLowerCase().includes(search);

      const matchesTopic = topicFilter === "all" || word.topic === topicFilter;

      const matchesDifficulty =
        difficultyFilter === "all" ||
        getCefrLabel(word.difficulty_level) === difficultyFilter;

      return matchesSearch && matchesTopic && matchesDifficulty;
    });

    return [...result].sort((a, b) => {
      if (sortType === "az") {
        return a.eng_word.localeCompare(b.eng_word, "en");
      }

      if (sortType === "za") {
        return b.eng_word.localeCompare(a.eng_word, "en");
      }

      if (sortType === "difficultyHigh") {
        return getCefrSortOrder(b.difficulty_level) - getCefrSortOrder(a.difficulty_level);
      }

      if (sortType === "difficultyLow") {
        return getCefrSortOrder(a.difficulty_level) - getCefrSortOrder(b.difficulty_level);
      }

      return Number(b.id) - Number(a.id);
    });
  }, [words, searchTerm, topicFilter, difficultyFilter, sortType]);

  const openEditModal = (word) => {
    setEditingWord(word);
    setEditFormData(getInitialEditForm(word));
    setEditErrors({});
    setMessage({ type: "", text: "" });
  };

  const closeEditModal = () => {
    if (savingEdit) {
      return;
    }

    setEditingWord(null);
    setEditErrors({});
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    setEditErrors((prevErrors) => ({
      ...prevErrors,
      [name]: "",
    }));
  };

  const handleEditFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setEditFormData((prevData) => ({
      ...prevData,
      pictureFile: file,
    }));

    setEditErrors((prevErrors) => ({
      ...prevErrors,
      pictureFile: "",
    }));
  };

  const getEditSamples = () => {
    return editFormData.samplesText
      .split("\n")
      .map((sample) => sample.trim())
      .filter(Boolean);
  };

  const validateEditForm = () => {
    const errors = {};

    if (!editFormData.eng_word.trim()) {
      errors.eng_word = "İngilizce kelime boş bırakılamaz.";
    }

    if (!editFormData.tur_word.trim()) {
      errors.tur_word = "Türkçe karşılık boş bırakılamaz.";
    }

    if (!isValidDifficultyValue(editFormData.difficulty_level)) {
      errors.difficulty_level = "Zorluk seviyesi A1, A2, B1, B2, C1 veya C2 olmalıdır.";
    }

    if (editFormData.pictureFile) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

      if (!allowedTypes.includes(editFormData.pictureFile.type)) {
        errors.pictureFile = "Görsel JPG, PNG veya WEBP formatında olmalıdır.";
      }

      if (editFormData.pictureFile.size > 5 * 1024 * 1024) {
        errors.pictureFile = "Görsel dosyası en fazla 5 MB olabilir.";
      }
    }

    return errors;
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!editingWord) {
      return;
    }

    const errors = validateEditForm();
    setEditErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSavingEdit(true);
    setMessage({ type: "", text: "" });

    const payload = {
      eng_word: editFormData.eng_word.trim(),
      tur_word: editFormData.tur_word.trim(),
      difficulty_level: Number(editFormData.difficulty_level),
      topic: editFormData.topic.trim() || null,
      picture_url: editFormData.picture_url.trim() || null,
      audio_url: editFormData.audio_url.trim() || null,
      samples: getEditSamples(),
    };

    try {
      await updateWordAPI(editingWord.id, payload);

      if (editFormData.pictureFile) {
        await uploadWordImageAPI(editingWord.id, editFormData.pictureFile);
      }

      setMessage({
        type: "success",
        text: "Kelime başarıyla güncellendi.",
      });

      setEditingWord(null);
      await loadWords();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message || "Kelime güncellenemedi. Lütfen tekrar deneyin.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteWord = async (wordId) => {
    const isConfirmed = window.confirm(
      "Bu kelimeyi listeden kaldırmak istiyor musunuz?"
    );

    if (!isConfirmed) {
      return;
    }

    try {
      await deleteWordAPI(wordId);

      setMessage({
        type: "success",
        text: "Kelime listeden kaldırıldı.",
      });

      await loadWords();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Kelime silinemedi. Lütfen tekrar deneyin.",
      });
    }
  };

  return (
    <div className="word-list-page">
      <section className="word-list-hero">
        <div>
          <h2>Kelime Listesi</h2>
          <p>
            Kelime havuzundaki kayıtları arayabilir, filtreleyebilir ve çalışma
            içeriklerini inceleyebilirsin.
          </p>
        </div>

        <div className="word-list-hero-actions">
          <Link to="/home">Ana Sayfa</Link>
          <Link to="/add-word">Yeni Kelime Ekle</Link>
        </div>
      </section>

      {message.text && (
        <section className={`word-list-message ${message.type}`}>
          {message.text}
        </section>
      )}

      <section className="word-stats-grid">
        <article className="word-stat-card">
          <span>Toplam</span>
          <strong>{stats.total}</strong>
          <p>Kayıtlı kelime</p>
        </article>

        <article className="word-stat-card">
          <span>Görsel</span>
          <strong>{stats.withImage}</strong>
          <p>Resimli kelime</p>
        </article>

        <article className="word-stat-card">
          <span>Ses</span>
          <strong>{stats.withAudio}</strong>
          <p>Ses bağlantılı kelime</p>
        </article>

        <article className="word-stat-card">
          <span>Konu</span>
          <strong>{stats.topicCount}</strong>
          <p>Farklı konu</p>
        </article>
      </section>

      <section className="word-list-panel">
        <div className="word-list-toolbar">
          <label>
            <span>Kelime ara</span>
            <input
              type="text"
              placeholder="İngilizce, Türkçe veya konu ara..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <label>
            <span>Konu</span>
            <select
              value={topicFilter}
              onChange={(event) => setTopicFilter(event.target.value)}
            >
              <option value="all">Tüm konular</option>

              {topicOptions.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Zorluk</span>
            <select
              value={difficultyFilter}
              onChange={(event) => setDifficultyFilter(event.target.value)}
            >
              <option value="all">Tüm seviyeler</option>

              {CEFR_LEVEL_OPTIONS.map((level) => (
                <option key={level.label} value={level.label}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Sıralama</span>
            <select
              value={sortType}
              onChange={(event) => setSortType(event.target.value)}
            >
              <option value="newest">Yeni eklenen</option>
              <option value="az">A-Z</option>
              <option value="za">Z-A</option>
              <option value="difficultyHigh">Zorluk yüksek</option>
              <option value="difficultyLow">Zorluk düşük</option>
            </select>
          </label>
        </div>

        <div className="word-list-summary">
          <span>
            Gösterilen: <strong>{filteredWords.length}</strong>
          </span>

          <button type="button" onClick={loadWords} disabled={loading}>
            {loading ? "Yükleniyor..." : "Yenile"}
          </button>
        </div>

        {loading ? (
          <div className="word-list-state">
            <h3>Kelimeler yükleniyor...</h3>
            <p>Kelime havuzu hazırlanıyor.</p>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="word-list-state">
            <h3>Kelime bulunamadı</h3>
            <p>
              Arama veya filtreleri değiştir. Henüz kelime eklenmediyse yeni
              kelime ekleme ekranına geçebilirsin.
            </p>

            <Link to="/add-word">Kelime Ekle</Link>
          </div>
        ) : (
          <div className="word-cards-grid">
            {filteredWords.map((word) => {
              const isSamplesExpanded = expandedSampleIds.has(word.id);
              const visibleSamples = isSamplesExpanded
                ? word.samples
                : word.samples.slice(0, 1);

              return (
                <article className="word-list-card-item" key={word.id}>
                  <div className="word-card-media">
                    {word.picture_url ? (
                      <img
                        src={getAssetUrl(word.picture_url)}
                        alt={word.eng_word}
                      />
                    ) : (
                      <div className="word-card-placeholder">
                        {word.eng_word.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <span
                      className={`difficulty-badge ${getDifficultyClass(
                        word.difficulty_level
                      )}`}
                    >
                      {getDifficultyText(word.difficulty_level)}
                    </span>
                  </div>

                  <div className="word-card-body">
                    <div className="word-card-title-row">
                      <div>
                        <h3>{word.eng_word}</h3>
                        <p>{word.tur_word}</p>
                      </div>

                      <span>{getCefrLabel(word.difficulty_level)}</span>
                    </div>

                    <div className="word-card-meta">
                      {word.topic && <span>{word.topic}</span>}
                      {word.picture_url && <span>Görsel</span>}
                      {word.audio_url && <span>Ses</span>}
                    </div>

                    {word.samples.length > 0 && (
                      <div className="word-sample-box">
                        <div className="word-sample-header">
                          <strong>Örnek cümle</strong>

                          {word.samples.length > 1 && (
                            <button
                              type="button"
                              className="sample-toggle-button"
                              onClick={() => toggleSamples(word.id)}
                              aria-label={
                                isSamplesExpanded
                                  ? "Ek örnekleri gizle"
                                  : "Ek örnekleri göster"
                              }
                            >
                              <span>
                                {isSamplesExpanded
                                  ? "Gizle"
                                  : `+${word.samples.length - 1} örnek daha`}
                              </span>
                              <span className="sample-toggle-icon">
                                {isSamplesExpanded ? "▲" : "▼"}
                              </span>
                            </button>
                          )}
                        </div>

                        <div className="word-sample-list">
                          {visibleSamples.map((sample, sampleIndex) => (
                            <p key={`${word.id}-sample-${sampleIndex}`}>
                              {sample}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="word-card-actions">
                      {word.audio_url && (
                        <button
                          type="button"
                          className="audio-word-button"
                          onClick={() => playAudioUrl(word.audio_url)}
                        >
                          🔊 Sesi Dinle
                        </button>
                      )}

                      <button
                        type="button"
                        className="edit-word-button"
                        onClick={() => openEditModal(word)}
                      >
                        Düzenle
                      </button>

                      <button
                        type="button"
                        className="delete-word-button"
                        onClick={() => handleDeleteWord(word.id)}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editingWord && (
        <div className="word-edit-overlay">
          <form className="word-edit-modal" onSubmit={handleEditSubmit}>
            <div className="word-edit-header">
              <div>
                <p>Kelime düzenle</p>
                <h3>{editingWord.eng_word}</h3>
              </div>

              <button type="button" onClick={closeEditModal}>
                ×
              </button>
            </div>

            <div className="word-edit-grid">
              <label className="word-edit-field">
                <span>İngilizce kelime</span>
                <input
                  name="eng_word"
                  type="text"
                  value={editFormData.eng_word}
                  onChange={handleEditChange}
                />
                {editErrors.eng_word && <small>{editErrors.eng_word}</small>}
              </label>

              <label className="word-edit-field">
                <span>Türkçe karşılığı</span>
                <input
                  name="tur_word"
                  type="text"
                  value={editFormData.tur_word}
                  onChange={handleEditChange}
                />
                {editErrors.tur_word && <small>{editErrors.tur_word}</small>}
              </label>

              <label className="word-edit-field">
                <span>Konu</span>
                <input
                  name="topic"
                  type="text"
                  value={editFormData.topic}
                  onChange={handleEditChange}
                />
              </label>

              <label className="word-edit-field">
                <span>Zorluk seviyesi</span>
                <select
                  name="difficulty_level"
                  value={editFormData.difficulty_level}
                  onChange={handleEditChange}
                >
                  {CEFR_LEVEL_OPTIONS.map((level) => (
                    <option key={level.label} value={level.value}>
                      {level.label} - {level.description}
                    </option>
                  ))}
                </select>
                {editErrors.difficulty_level && (
                  <small>{editErrors.difficulty_level}</small>
                )}
              </label>
            </div>

            <label className="word-edit-field">
              <span>Örnek cümleler</span>
              <textarea
                name="samplesText"
                rows={5}
                value={editFormData.samplesText}
                onChange={handleEditChange}
                placeholder="Her satıra bir örnek cümle yaz"
              />
            </label>

            <div className="word-edit-grid">
              <label className="word-edit-field">
                <span>Görsel URL</span>
                <input
                  name="picture_url"
                  type="text"
                  value={editFormData.picture_url}
                  onChange={handleEditChange}
                />
              </label>

              <label className="word-edit-field">
                <span>Ses URL</span>
                <input
                  name="audio_url"
                  type="text"
                  value={editFormData.audio_url}
                  onChange={handleEditChange}
                />
              </label>
            </div>

            <label className="word-edit-field">
              <span>Yeni görsel dosyası</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleEditFileChange}
              />
              {editErrors.pictureFile && (
                <small>{editErrors.pictureFile}</small>
              )}
            </label>

            <div className="word-edit-actions">
              <button
                type="button"
                className="cancel-edit-button"
                onClick={closeEditModal}
                disabled={savingEdit}
              >
                Vazgeç
              </button>

              <button
                type="submit"
                className="save-edit-button"
                disabled={savingEdit}
              >
                {savingEdit ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default WordList;
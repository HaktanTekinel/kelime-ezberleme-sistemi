import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  API_BASE_URL,
  deleteWordAPI,
  listWordsAPI,
  updateWordAPI,
  uploadWordImageAPI,
} from "../../services/wordService";
import "./WordList.css";

const ALL_FILTER_VALUE = "all";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_EDIT_FORM = {
  eng_word: "",
  tur_word: "",
  topic: "",
  difficulty_level: "1",
  picture_url: "",
  audio_url: "",
  samplesText: "",
  pictureFile: null,
};

const DIFFICULTY_OPTIONS = [
  { value: ALL_FILTER_VALUE, label: "Tüm seviyeler" },
  { value: "1", label: "Seviye 1" },
  { value: "2", label: "Seviye 2" },
  { value: "3", label: "Seviye 3" },
  { value: "4", label: "Seviye 4" },
  { value: "5", label: "Seviye 5" },
  { value: "6", label: "Seviye 6" },
  { value: "7", label: "Seviye 7" },
  { value: "8", label: "Seviye 8" },
  { value: "9", label: "Seviye 9" },
  { value: "10", label: "Seviye 10" },
];

const EDIT_DIFFICULTY_OPTIONS = [
  { value: "1", label: "1 - Çok kolay" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5 - Orta" },
  { value: "6", label: "6" },
  { value: "7", label: "7" },
  { value: "8", label: "8" },
  { value: "9", label: "9" },
  { value: "10", label: "10 - Zor" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Yeni eklenen" },
  { value: "az", label: "A-Z" },
  { value: "za", label: "Z-A" },
  { value: "difficultyHigh", label: "Zorluk yüksek" },
  { value: "difficultyLow", label: "Zorluk düşük" },
];

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function getEmptyMessage() {
  return { type: "", text: "" };
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
      Number(
        pickValue(word, ["difficulty_level", "difficultyLevel", "difficulty"])
      ) || 1,
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
    globalThis.alert(
      "Ses oynatılamadı. Ses dosyası bulunamadı ya da tarayıcı engelledi."
    );
  });
}

function getDifficultyText(level) {
  if (level <= 3) {
    return "Kolay";
  }

  if (level <= 7) {
    return "Orta";
  }

  return "Zor";
}

function getDifficultyClass(level) {
  if (level <= 3) {
    return "easy";
  }

  if (level <= 7) {
    return "medium";
  }

  return "hard";
}

function getInitialEditForm(word) {
  return {
    eng_word: word.eng_word || "",
    tur_word: word.tur_word || "",
    topic: word.topic || "",
    difficulty_level: String(word.difficulty_level || 1),
    picture_url: word.picture_url || "",
    audio_url: word.audio_url || "",
    samplesText: Array.isArray(word.samples) ? word.samples.join("\n") : "",
    pictureFile: null,
  };
}

function getVisibleSamples(word, isSamplesExpanded) {
  if (isSamplesExpanded) {
    return word.samples;
  }

  return word.samples.slice(0, 1);
}

function getSampleToggleText(word, isSamplesExpanded) {
  if (isSamplesExpanded) {
    return "Gizle";
  }

  return `+${word.samples.length - 1} örnek daha`;
}

function getSampleToggleIcon(isSamplesExpanded) {
  return isSamplesExpanded ? "▲" : "▼";
}

function getSampleToggleAriaLabel(isSamplesExpanded) {
  return isSamplesExpanded ? "Ek örnekleri gizle" : "Ek örnekleri göster";
}

function sortWords(words, sortType) {
  const sortedWords = [...words];

  if (sortType === "az") {
    return sortedWords.sort((firstWord, secondWord) =>
      firstWord.eng_word.localeCompare(secondWord.eng_word, "en")
    );
  }

  if (sortType === "za") {
    return sortedWords.sort((firstWord, secondWord) =>
      secondWord.eng_word.localeCompare(firstWord.eng_word, "en")
    );
  }

  if (sortType === "difficultyHigh") {
    return sortedWords.sort(
      (firstWord, secondWord) =>
        secondWord.difficulty_level - firstWord.difficulty_level
    );
  }

  if (sortType === "difficultyLow") {
    return sortedWords.sort(
      (firstWord, secondWord) =>
        firstWord.difficulty_level - secondWord.difficulty_level
    );
  }

  return sortedWords.sort(
    (firstWord, secondWord) => Number(secondWord.id) - Number(firstWord.id)
  );
}

function renderMessage(message) {
  if (!message.text) {
    return null;
  }

  return (
    <section className={`word-list-message ${message.type}`}>
      {message.text}
    </section>
  );
}

function renderSelectOptions(options) {
  return options.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ));
}

function renderTopicOptions(topicOptions) {
  return topicOptions.map((topic) => (
    <option key={topic} value={topic}>
      {topic}
    </option>
  ));
}

function renderLoadingState() {
  return (
    <div className="word-list-state">
      <h3>Kelimeler yükleniyor...</h3>
      <p>Kelime havuzu hazırlanıyor.</p>
    </div>
  );
}

function renderEmptyState() {
  return (
    <div className="word-list-state">
      <h3>Kelime bulunamadı</h3>
      <p>
        Arama veya filtreleri değiştir. Henüz kelime eklenmediyse yeni kelime
        ekleme ekranına geçebilirsin.
      </p>

      <Link to="/add-word">Kelime Ekle</Link>
    </div>
  );
}

function renderWordMedia(word) {
  return (
    <div className="word-card-media">
      {word.picture_url ? (
        <img src={getAssetUrl(word.picture_url)} alt={word.eng_word} />
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
  );
}

function renderWordMeta(word) {
  return (
    <div className="word-card-meta">
      {word.topic && <span>{word.topic}</span>}
      {word.picture_url && <span>Görsel</span>}
      {word.audio_url && <span>Ses</span>}
    </div>
  );
}

function renderWordSamples({ word, isSamplesExpanded, onToggleSamples }) {
  if (word.samples.length === 0) {
    return null;
  }

  const visibleSamples = getVisibleSamples(word, isSamplesExpanded);

  return (
    <div className="word-sample-box">
      <div className="word-sample-header">
        <strong>Örnek cümle</strong>

        {word.samples.length > 1 && (
          <button
            type="button"
            className="sample-toggle-button"
            onClick={() => onToggleSamples(word.id)}
            aria-label={getSampleToggleAriaLabel(isSamplesExpanded)}
          >
            <span>{getSampleToggleText(word, isSamplesExpanded)}</span>
            <span className="sample-toggle-icon">
              {getSampleToggleIcon(isSamplesExpanded)}
            </span>
          </button>
        )}
      </div>

      <div className="word-sample-list">
        {visibleSamples.map((sample, sampleIndex) => (
          <p key={`${word.id}-sample-${sampleIndex}`}>{sample}</p>
        ))}
      </div>
    </div>
  );
}

function renderWordActions({ word, onEdit, onDelete }) {
  return (
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
        onClick={() => onEdit(word)}
      >
        Düzenle
      </button>

      <button
        type="button"
        className="delete-word-button"
        onClick={() => onDelete(word.id)}
      >
        Sil
      </button>
    </div>
  );
}

function renderWordCard({
  word,
  expandedSampleIds,
  onToggleSamples,
  onEdit,
  onDelete,
}) {
  const isSamplesExpanded = expandedSampleIds.has(word.id);

  return (
    <article className="word-list-card-item" key={word.id}>
      {renderWordMedia(word)}

      <div className="word-card-body">
        <div className="word-card-title-row">
          <div>
            <h3>{word.eng_word}</h3>
            <p>{word.tur_word}</p>
          </div>

          <span>Seviye {word.difficulty_level}</span>
        </div>

        {renderWordMeta(word)}

        {renderWordSamples({
          word,
          isSamplesExpanded,
          onToggleSamples,
        })}

        {renderWordActions({
          word,
          onEdit,
          onDelete,
        })}
      </div>
    </article>
  );
}

function renderWordCards({
  words,
  expandedSampleIds,
  onToggleSamples,
  onEdit,
  onDelete,
}) {
  return (
    <div className="word-cards-grid">
      {words.map((word) =>
        renderWordCard({
          word,
          expandedSampleIds,
          onToggleSamples,
          onEdit,
          onDelete,
        })
      )}
    </div>
  );
}

function renderWordListContent({
  loading,
  filteredWords,
  expandedSampleIds,
  onToggleSamples,
  onEdit,
  onDelete,
}) {
  if (loading) {
    return renderLoadingState();
  }

  if (filteredWords.length === 0) {
    return renderEmptyState();
  }

  return renderWordCards({
    words: filteredWords,
    expandedSampleIds,
    onToggleSamples,
    onEdit,
    onDelete,
  });
}

function WordList() {
  const [words, setWords] = useState([]);
  const [message, setMessage] = useState(getEmptyMessage);
  const [loading, setLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState(ALL_FILTER_VALUE);
  const [difficultyFilter, setDifficultyFilter] = useState(ALL_FILTER_VALUE);
  const [sortType, setSortType] = useState("newest");

  const [editingWord, setEditingWord] = useState(null);
  const [editFormData, setEditFormData] = useState(EMPTY_EDIT_FORM);

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
    setMessage(getEmptyMessage());

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

      const matchesTopic =
        topicFilter === ALL_FILTER_VALUE || word.topic === topicFilter;

      const matchesDifficulty =
        difficultyFilter === ALL_FILTER_VALUE ||
        String(word.difficulty_level) === difficultyFilter;

      return matchesSearch && matchesTopic && matchesDifficulty;
    });

    return sortWords(result, sortType);
  }, [words, searchTerm, topicFilter, difficultyFilter, sortType]);

  const openEditModal = (word) => {
    setEditingWord(word);
    setEditFormData(getInitialEditForm(word));
    setEditErrors({});
    setMessage(getEmptyMessage());
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
    const difficulty = Number(editFormData.difficulty_level);

    if (!editFormData.eng_word.trim()) {
      errors.eng_word = "İngilizce kelime boş bırakılamaz.";
    }

    if (!editFormData.tur_word.trim()) {
      errors.tur_word = "Türkçe karşılık boş bırakılamaz.";
    }

    if (!Number.isInteger(difficulty) || difficulty < 1 || difficulty > 10) {
      errors.difficulty_level = "Zorluk seviyesi 1 ile 10 arasında olmalıdır.";
    }

    if (editFormData.pictureFile) {
      if (!ALLOWED_IMAGE_TYPES.includes(editFormData.pictureFile.type)) {
        errors.pictureFile = "Görsel JPG, PNG veya WEBP formatında olmalıdır.";
      }

      if (editFormData.pictureFile.size > MAX_IMAGE_SIZE) {
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
    setMessage(getEmptyMessage());

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
    const isConfirmed = globalThis.confirm(
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

  const wordListContent = renderWordListContent({
    loading,
    filteredWords,
    expandedSampleIds,
    onToggleSamples: toggleSamples,
    onEdit: openEditModal,
    onDelete: handleDeleteWord,
  });

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

      {renderMessage(message)}

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
              <option value={ALL_FILTER_VALUE}>Tüm konular</option>
              {renderTopicOptions(topicOptions)}
            </select>
          </label>

          <label>
            <span>Zorluk</span>
            <select
              value={difficultyFilter}
              onChange={(event) => setDifficultyFilter(event.target.value)}
            >
              {renderSelectOptions(DIFFICULTY_OPTIONS)}
            </select>
          </label>

          <label>
            <span>Sıralama</span>
            <select
              value={sortType}
              onChange={(event) => setSortType(event.target.value)}
            >
              {renderSelectOptions(SORT_OPTIONS)}
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

        {wordListContent}
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
                  {renderSelectOptions(EDIT_DIFFICULTY_OPTIONS)}
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
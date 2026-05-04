import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  API_BASE_URL,
  deleteWordAPI,
  listWordsAPI,
} from "../../services/wordService";
import { getAuthToken } from "../../services/apiClient";
import "./WordList.css";

function WordList() {
  const [words, setWords] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [topicFilter, setTopicFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [sortType, setSortType] = useState("newest");

  const isLoggedIn = Boolean(getAuthToken());

  const loadWords = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const data = await listWordsAPI();
      setWords(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Kelimeler yüklenemedi.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, []);

  const getAssetUrl = (url) => {
    if (!url) {
      return "";
    }

    if (url.startsWith("http")) {
      return url;
    }

    return `${API_BASE_URL}${url}`;
  };

  const topicOptions = useMemo(() => {
    const topics = words
      .map((word) => word.topic)
      .filter(Boolean)
      .map((topic) => topic.trim())
      .filter(Boolean);

    return [...new Set(topics)].sort((a, b) => a.localeCompare(b));
  }, [words]);

  const stats = useMemo(() => {
    const withImage = words.filter((word) => Boolean(word.picture_url)).length;
    const withAudio = words.filter((word) => Boolean(word.audio_url)).length;
    const topicCount = topicOptions.length;

    return {
      total: words.length,
      withImage,
      withAudio,
      topicCount,
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
        topicFilter === "all" || word.topic === topicFilter;

      const matchesDifficulty =
        difficultyFilter === "all" ||
        String(word.difficulty_level) === difficultyFilter;

      return matchesSearch && matchesTopic && matchesDifficulty;
    });

    return [...result].sort((a, b) => {
      if (sortType === "az") {
        return a.eng_word.localeCompare(b.eng_word);
      }

      if (sortType === "za") {
        return b.eng_word.localeCompare(a.eng_word);
      }

      if (sortType === "difficultyHigh") {
        return b.difficulty_level - a.difficulty_level;
      }

      if (sortType === "difficultyLow") {
        return a.difficulty_level - b.difficulty_level;
      }

      return b.id - a.id;
    });
  }, [words, searchTerm, topicFilter, difficultyFilter, sortType]);

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
        text: error.message || "Kelime silinemedi.",
      });
    }
  };

  const getDifficultyText = (level) => {
    if (level <= 3) {
      return "Kolay";
    }

    if (level <= 7) {
      return "Orta";
    }

    return "Zor";
  };

  const getDifficultyClass = (level) => {
    if (level <= 3) {
      return "easy";
    }

    if (level <= 7) {
      return "medium";
    }

    return "hard";
  };

  return (
    <div className="word-list-page">
      <header className="word-list-header">
        <div>
          <span className="page-eyebrow">Kelime Havuzu</span>

          <h1>Kelime Listesi</h1>

          <p>
            Eklenen kelimeleri konu, zorluk ve arama kriterlerine göre incele.
            Bu ekran kelime tekrar ve quiz modüllerinin temel veri kaynağıdır.
          </p>
        </div>

        <div className="word-list-header-actions">
          <Link to="/" className="list-secondary-button">
            Ana Sayfa
          </Link>

          <Link to="/words" className="list-primary-button">
            Yeni Kelime Ekle
          </Link>
        </div>
      </header>

      <main className="word-list-container">
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
            <div className="search-box">
              <label htmlFor="searchTerm">Kelime Ara</label>
              <input
                id="searchTerm"
                type="text"
                placeholder="İngilizce, Türkçe veya konu ara..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="filter-box">
              <label htmlFor="topicFilter">Konu</label>
              <select
                id="topicFilter"
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
            </div>

            <div className="filter-box">
              <label htmlFor="difficultyFilter">Zorluk</label>
              <select
                id="difficultyFilter"
                value={difficultyFilter}
                onChange={(event) => setDifficultyFilter(event.target.value)}
              >
                <option value="all">Tüm seviyeler</option>
                <option value="1">Seviye 1</option>
                <option value="2">Seviye 2</option>
                <option value="3">Seviye 3</option>
                <option value="4">Seviye 4</option>
                <option value="5">Seviye 5</option>
                <option value="6">Seviye 6</option>
                <option value="7">Seviye 7</option>
                <option value="8">Seviye 8</option>
                <option value="9">Seviye 9</option>
                <option value="10">Seviye 10</option>
              </select>
            </div>

            <div className="filter-box">
              <label htmlFor="sortType">Sıralama</label>
              <select
                id="sortType"
                value={sortType}
                onChange={(event) => setSortType(event.target.value)}
              >
                <option value="newest">Yeni eklenen</option>
                <option value="az">A-Z</option>
                <option value="za">Z-A</option>
                <option value="difficultyHigh">Zorluk yüksek</option>
                <option value="difficultyLow">Zorluk düşük</option>
              </select>
            </div>
          </div>

          {message.text && (
            <p className={`word-list-message ${message.type}`}>
              {message.text}
            </p>
          )}

          <div className="word-list-summary">
            <span>
              Gösterilen: <strong>{filteredWords.length}</strong>
            </span>

            <button
              type="button"
              className="refresh-button"
              onClick={loadWords}
              disabled={loading}
            >
              {loading ? "Yükleniyor..." : "Yenile"}
            </button>
          </div>

          {loading ? (
            <div className="word-list-empty">
              <h2>Kelimeler yükleniyor...</h2>
              <p>Backend üzerinden kelime havuzu getiriliyor.</p>
            </div>
          ) : filteredWords.length === 0 ? (
            <div className="word-list-empty">
              <h2>Kelime bulunamadı</h2>
              <p>
                Arama veya filtreleri değiştir. Henüz kelime eklenmediyse yeni
                kelime ekleme ekranına geçebilirsin.
              </p>

              <Link to="/words" className="list-primary-button">
                Kelime Ekle
              </Link>
            </div>
          ) : (
            <div className="word-cards-grid">
              {filteredWords.map((word) => (
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
                        <h2>{word.eng_word}</h2>
                        <p>{word.tur_word}</p>
                      </div>

                      <span className="level-pill">
                        Seviye {word.difficulty_level}
                      </span>
                    </div>

                    <div className="word-card-tags">
                      <span>{word.topic || "Konu yok"}</span>
                      {word.picture_url && <span>Görsel var</span>}
                      {word.audio_url && <span>Ses var</span>}
                    </div>

                    <div className="word-card-actions">
                      {word.audio_url ? (
                        <a
                          href={getAssetUrl(word.audio_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="audio-link"
                        >
                          Sesi Aç
                        </a>
                      ) : (
                        <span className="muted-action">Ses yok</span>
                      )}

                      {isLoggedIn && (
                        <button
                          type="button"
                          className="delete-word-button"
                          onClick={() => handleDeleteWord(word.id)}
                        >
                          Sil
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default WordList;
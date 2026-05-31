import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../services/apiClient";
import {
  generateWordChainStoryAPI,
  getWordChainHistoryAPI,
} from "../../services/wordChainService";
import "./WordChain.css";

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

function resolveImageUrl(imageUrl) {
  if (!imageUrl) {
    return "";
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/")) {
    return `${API_BASE_URL}${imageUrl}`;
  }

  return `${API_BASE_URL}/${imageUrl}`;
}

function normalizeGeneratedStory(data) {
  const storyData = data?.story_data || data?.storyData || data?.result || data || {};
  const imageUrl = pickValue(storyData, [
    "image_url",
    "imageUrl",
    "visual_url",
    "visualUrl",
    "picture",
  ]);

  return {
    id: pickValue(storyData, ["id", "story_id", "storyId"]),
    words: pickValue(storyData, ["words", "selected_words", "selectedWords"]) || [],
    story: pickValue(storyData, ["story", "story_text", "storyText", "text"]),
    summary: pickValue(storyData, ["summary", "short_summary", "shortSummary"]),
    imageUrl: resolveImageUrl(imageUrl),
    createdAt: pickValue(storyData, ["created_at", "createdAt"]),
  };
}

function normalizeHistory(data) {
  const rawHistory =
    data?.history ||
    data?.stories ||
    data?.word_chain_stories ||
    data?.wordChainStories ||
    [];

  if (!Array.isArray(rawHistory)) {
    return [];
  }

  return rawHistory.map((item, index) => {
    const normalized = normalizeGeneratedStory(item);

    return {
      ...normalized,
      id: normalized.id || index,
    };
  });
}

function parseWords(value) {
  return value
    .split(/[\n,]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function WordChain() {
  const [wordInput, setWordInput] = useState("");
  const [generatedStory, setGeneratedStory] = useState(null);

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [formError, setFormError] = useState("");

  const selectedWords = useMemo(() => parseWords(wordInput), [wordInput]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const data = await getWordChainHistoryAPI();
      setHistory(normalizeHistory(data));
    } catch (error) {
      setHistory([]);
      setHistoryError(error.message || "Hikaye geçmişi şu anda yüklenemedi.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const validateWords = () => {
    if (selectedWords.length < 3) {
      return "Hikaye oluşturmak için en az 3 kelime girmelisin.";
    }

    if (selectedWords.length > 10) {
      return "Tek seferde en fazla 10 kelime kullanabilirsin.";
    }

    const hasInvalidWord = selectedWords.some((word) => word.length < 2);

    if (hasInvalidWord) {
      return "Kelimeler en az 2 karakter olmalıdır.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setGeneratedStory(null);
    setCreateError("");
    setFormError("");

    const validationError = validateWords();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setCreating(true);

    try {
      const data = await generateWordChainStoryAPI(selectedWords);
      const normalizedStory = normalizeGeneratedStory(data);

      setGeneratedStory(normalizedStory);
      setWordInput("");

      await loadHistory();
    } catch (error) {
      setCreateError(error.message || "Hikaye oluşturulamadı. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="word-chain-page">
      <section className="word-chain-hero">
        <div>
          <h2>Word Chain</h2>
          <p>
            Seçtiğin kelimeleri LLM ile anlamlı bir hikayeye dönüştür ve hikayeye
            uygun görseli uygulama içinde kaydet.
          </p>
        </div>
      </section>

      <section className="word-chain-grid">
        <form className="word-chain-card" onSubmit={handleSubmit}>
          <div className="word-chain-card-header">
            <div>
              <p>Hikaye oluştur</p>
              <h3>Kelimelerini gir</h3>
            </div>

            <div className="word-chain-icon">🔗</div>
          </div>

          <label className="word-chain-field">
            <span>Kelimeler</span>

            <textarea
              value={wordInput}
              onChange={(event) => {
                setWordInput(event.target.value);
                setFormError("");
                setCreateError("");
              }}
              placeholder="Örnek: Brain, Night, Tiger, Robin, Noble"
              rows={7}
            />
          </label>

          <div className="selected-word-area">
            <div className="selected-word-header">
              <span>Seçilen kelimeler</span>
              <strong>{selectedWords.length}/10</strong>
            </div>

            {selectedWords.length > 0 ? (
              <div className="selected-word-list">
                {selectedWords.map((word) => (
                  <span key={word}>{word}</span>
                ))}
              </div>
            ) : (
              <p className="selected-word-empty">Henüz kelime girilmedi.</p>
            )}
          </div>

          {formError && <div className="word-chain-alert error">{formError}</div>}
          {createError && <div className="word-chain-alert error">{createError}</div>}

          <button type="submit" className="word-chain-submit" disabled={creating}>
            {creating ? "Oluşturuluyor..." : "Hikaye Oluştur"}
          </button>
        </form>

        <aside className="word-chain-info-card">
          <h3>Nasıl çalışır?</h3>

          <div className="word-chain-info-list">
            <div>
              <strong>Kelimeleri seç</strong>
              <span>Hikayede kullanılmasını istediğin kelimeleri yaz.</span>
            </div>

            <div>
              <strong>LLM hikaye üretir</strong>
              <span>Kelimeler sırayla kullanılan Türkçe bir metne dönüştürülür.</span>
            </div>

            <div>
              <strong>Görsel kaydedilir</strong>
              <span>Oluşturulan görsel backend uploads klasörüne kaydedilir.</span>
            </div>
          </div>
        </aside>
      </section>

      {generatedStory && (
        <section className="generated-story-card">
          <div className="generated-story-content">
            <div className="generated-story-header">
              <div>
                <p>Yeni hikaye</p>
                <h3>Oluşturulan çalışma</h3>
              </div>
            </div>

            {Array.isArray(generatedStory.words) && generatedStory.words.length > 0 && (
              <div className="story-word-list">
                {generatedStory.words.map((word) => (
                  <span key={word}>{word}</span>
                ))}
              </div>
            )}

            {generatedStory.story ? (
              <p className="story-text">{generatedStory.story}</p>
            ) : (
              <p className="story-empty">Hikaye metni alınamadı.</p>
            )}

            {generatedStory.summary && (
              <div className="story-summary">
                <strong>Kısa özet</strong>
                <span>{generatedStory.summary}</span>
              </div>
            )}
          </div>

          {generatedStory.imageUrl && (
            <div className="generated-story-image">
              <img src={generatedStory.imageUrl} alt="Oluşturulan hikaye görseli" />
            </div>
          )}
        </section>
      )}

      <section className="word-chain-history-card">
        <div className="word-chain-section-header">
          <div>
            <p>Geçmiş</p>
            <h3>Kaydedilen hikayeler</h3>
          </div>

          <button type="button" onClick={loadHistory} disabled={historyLoading}>
            {historyLoading ? "Yükleniyor..." : "Yenile"}
          </button>
        </div>

        {historyLoading && <div className="word-chain-state">Hikaye geçmişi yükleniyor...</div>}

        {!historyLoading && historyError && <div className="word-chain-state error">{historyError}</div>}

        {!historyLoading && !historyError && history.length === 0 && (
          <div className="word-chain-state">Henüz kaydedilmiş hikaye bulunmuyor.</div>
        )}

        {!historyLoading && !historyError && history.length > 0 && (
          <div className="history-list">
            {history.map((item) => (
              <article className="history-item" key={item.id}>
                <div>
                  <h4>{item.summary || "Word Chain Hikayesi"}</h4>

                  {item.story && <p>{item.story}</p>}

                  {Array.isArray(item.words) && item.words.length > 0 && (
                    <div className="history-word-list">
                      {item.words.map((word) => (
                        <span key={word}>{word}</span>
                      ))}
                    </div>
                  )}

                  {item.createdAt && <small>{formatDate(item.createdAt)}</small>}
                </div>

                {item.imageUrl && <img src={item.imageUrl} alt="Kaydedilen hikaye görseli" />}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default WordChain;

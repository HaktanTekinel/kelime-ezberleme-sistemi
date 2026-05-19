import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCurrentWordleGameAPI,
  getWordleHistoryAPI,
  startWordleGameAPI,
  submitWordleGuessAPI,
} from "../../services/wordleService";
import "./Puzzle.css";

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

function normalizeStatus(status) {
  const normalized = String(status || "").toLowerCase();

  if (["correct", "green", "right", "dogru", "doğru"].includes(normalized)) {
    return "correct";
  }

  if (
    [
      "present",
      "yellow",
      "misplaced",
      "wrong_position",
      "yanlis_yer",
      "yanlış_yer",
    ].includes(normalized)
  ) {
    return "present";
  }

  if (["absent", "gray", "grey", "wrong", "not_found", "yok"].includes(normalized)) {
    return "absent";
  }

  return "empty";
}

function normalizeFeedback(rawFeedback, fallbackGuess) {
  if (Array.isArray(rawFeedback)) {
    return rawFeedback.map((item, index) => {
      if (typeof item === "string") {
        return {
          letter: fallbackGuess?.[index] || "",
          status: normalizeStatus(item),
        };
      }

      return {
        letter: item.letter || item.char || item.character || fallbackGuess?.[index] || "",
        status: normalizeStatus(item.status || item.result || item.state || item.color),
      };
    });
  }

  if (fallbackGuess) {
    return fallbackGuess.split("").map((letter) => ({
      letter,
      status: "empty",
    }));
  }

  return [];
}

function normalizeGuess(item, index) {
  const guessText =
    pickValue(item, ["guess", "word", "answer", "text"]) ||
    (typeof item === "string" ? item : "");

  return {
    id: pickValue(item, ["id", "guess_id", "guessId"]) || `${guessText}-${index}`,
    guess: guessText,
    feedback: normalizeFeedback(
      pickValue(item, ["feedback", "letters", "result", "results"]),
      guessText
    ),
    isCorrect: Boolean(pickValue(item, ["is_correct", "isCorrect", "correct", "won"])),
  };
}

function normalizeGame(data) {
  const gameData =
    data?.game ||
    data?.wordle_game ||
    data?.wordleGame ||
    data?.current_game ||
    data?.currentGame ||
    data?.result ||
    data ||
    {};

  const rawGuesses =
    gameData.guesses ||
    gameData.attempts ||
    gameData.guess_history ||
    gameData.guessHistory ||
    [];

  const guesses = Array.isArray(rawGuesses)
    ? rawGuesses.map((item, index) => normalizeGuess(item, index))
    : [];

  return {
    id: pickValue(gameData, ["id", "game_id", "gameId", "wordle_game_id"]),
    status: pickValue(gameData, ["status", "state"]) || "active",
    wordLength:
      Number(
        pickValue(gameData, ["word_length", "wordLength", "letter_count", "letterCount"])
      ) || undefined,
    maxAttempts:
      Number(
        pickValue(gameData, ["max_attempts", "maxAttempts", "attempt_limit", "attemptLimit"])
      ) || undefined,
    attemptsUsed:
      Number(
        pickValue(gameData, [
          "attempts_used",
          "attemptsUsed",
          "current_attempt",
          "currentAttempt",
          "attempt_count",
        ])
      ) || guesses.length,
    message: data?.message || pickValue(gameData, ["message", "detail"]),
    guesses,
    createdAt: pickValue(gameData, ["created_at", "createdAt", "started_at", "startedAt"]),
    finishedAt: pickValue(gameData, ["finished_at", "finishedAt"]),
  };
}

function normalizeGuessResponse(data, currentGame) {
  const resultData = data?.result || data?.guess_result || data?.guessResult || data || {};

  const gameFromResponse =
    resultData.game ||
    resultData.wordle_game ||
    resultData.wordleGame ||
    data?.game ||
    data?.wordle_game ||
    data?.wordleGame;

  const normalizedGame = gameFromResponse ? normalizeGame(gameFromResponse) : null;
  const guessText = pickValue(resultData, ["guess", "word", "answer", "text"]);

  const singleGuess = guessText
    ? normalizeGuess(
        {
          guess: guessText,
          feedback: pickValue(resultData, ["feedback", "letters", "result"]),
          is_correct: pickValue(resultData, ["is_correct", "isCorrect", "correct"]),
        },
        currentGame?.guesses?.length || 0
      )
    : null;

  return {
    game: normalizedGame,
    guess: singleGuess,
    status: pickValue(resultData, ["status", "state"]),
    message: data?.message || pickValue(resultData, ["message", "detail"]),
    isFinished: Boolean(pickValue(resultData, ["is_finished", "isFinished", "finished"])),
    isCorrect: Boolean(pickValue(resultData, ["is_correct", "isCorrect", "correct", "won"])),
  };
}

function normalizeHistoryItem(item, index) {
  const guesses = Array.isArray(item?.guesses)
    ? item.guesses.map((guessItem, guessIndex) => normalizeGuess(guessItem, guessIndex))
    : [];

  return {
    id: pickValue(item, ["id", "game_id", "gameId"]) || `history-${index}`,
    status: pickValue(item, ["status", "state"]) || "active",
    targetWord: pickValue(item, ["target_word", "targetWord", "word", "eng_word"]),
    wordLength: Number(pickValue(item, ["word_length", "wordLength"])) || undefined,
    attemptsUsed: Number(pickValue(item, ["attempt_count", "attempts_used", "attemptsUsed"])) || 0,
    maxAttempts: Number(pickValue(item, ["max_attempts", "maxAttempts"])) || undefined,
    startedAt: pickValue(item, ["started_at", "startedAt", "created_at", "createdAt"]),
    finishedAt: pickValue(item, ["finished_at", "finishedAt"]),
    guesses,
  };
}

function normalizeHistoryResponse(data) {
  const rawGames = data?.games || data?.history || data?.items || [];

  if (!Array.isArray(rawGames)) {
    return [];
  }

  return rawGames.map((item, index) => normalizeHistoryItem(item, index));
}

function isGameFinished(game) {
  const status = String(game?.status || "").toLowerCase();

  return ["won", "lost", "finished", "completed", "bitti", "kazandi", "kaybetti"].includes(
    status
  );
}

function getGameResultText(game) {
  const status = String(game?.status || "").toLowerCase();

  if (status === "won" || status === "kazandi") {
    return "Tebrikler, kelimeyi doğru buldun.";
  }

  if (status === "lost" || status === "kaybetti") {
    return "Deneme hakkın bitti. Yeni bulmaca başlatabilirsin.";
  }

  if (isGameFinished(game)) {
    return "Bulmaca tamamlandı.";
  }

  return "";
}

function getStatusText(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "won") return "Kazanıldı";
  if (normalized === "lost") return "Kaybedildi";
  if (normalized === "cancelled") return "İptal edildi";
  if (normalized === "active") return "Devam ediyor";

  return "Tamamlandı";
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Puzzle() {
  const [game, setGame] = useState(null);
  const [history, setHistory] = useState([]);
  const [guess, setGuess] = useState("");

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const guesses = game?.guesses || [];
  const wordLength = game?.wordLength;
  const maxAttempts = game?.maxAttempts;
  const attemptsUsed = game?.attemptsUsed ?? guesses.length;
  const finished = isGameFinished(game);

  const remainingAttempts = useMemo(() => {
    if (!maxAttempts) {
      return undefined;
    }

    return Math.max(0, maxAttempts - attemptsUsed);
  }, [maxAttempts, attemptsUsed]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const data = await getWordleHistoryAPI();
      setHistory(normalizeHistoryResponse(data));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadCurrentGame = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const data = await getCurrentWordleGameAPI();
      const normalizedGame = normalizeGame(data);

      if (!normalizedGame.id && normalizedGame.guesses.length === 0) {
        setGame(null);
      } else {
        setGame(normalizedGame);
      }
    } catch {
      setGame(null);
      setNotice("Aktif bulmaca bulunmuyor. Yeni bir bulmaca başlatabilirsin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentGame();
    loadHistory();
  }, [loadCurrentGame, loadHistory]);

  const handleStartGame = async () => {
    setStarting(true);
    setError("");
    setNotice("");

    try {
      const data = await startWordleGameAPI({ restart: true, wordLength: null });
      const normalizedGame = normalizeGame(data);

      setGame(normalizedGame);
      setGuess("");
      setNotice("Yeni bulmaca başladı.");
      loadHistory();
    } catch {
      setError("Bulmaca başlatılamadı. Öğrenilmiş kelime yoksa önce quiz ile kelime öğrenmelisin.");
    } finally {
      setStarting(false);
    }
  };

  const validateGuess = () => {
    const cleanGuess = guess.trim();

    if (!cleanGuess) {
      return "Tahmin alanı boş bırakılamaz.";
    }

    if (wordLength && cleanGuess.length !== wordLength) {
      return `Tahmin ${wordLength} harfli olmalıdır.`;
    }

    if (!/^[a-zA-ZçğıöşüÇĞİÖŞÜ]+$/.test(cleanGuess)) {
      return "Tahmin yalnızca harflerden oluşmalıdır.";
    }

    return "";
  };

  const handleSubmitGuess = async (event) => {
    event.preventDefault();

    setError("");
    setNotice("");

    if (!game?.id) {
      setError("Tahmin yapabilmek için önce bulmaca başlatmalısın.");
      return;
    }

    if (finished) {
      setError("Bu bulmaca tamamlandı. Yeni bir bulmaca başlatabilirsin.");
      return;
    }

    const validationError = validateGuess();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const data = await submitWordleGuessAPI({
        gameId: game.id,
        guess: guess.trim(),
      });

      const result = normalizeGuessResponse(data, game);

      if (result.game) {
        setGame(result.game);
      } else if (result.guess) {
        setGame((prevGame) => ({
          ...prevGame,
          guesses: [...(prevGame?.guesses || []), result.guess],
          attemptsUsed: (prevGame?.attemptsUsed || 0) + 1,
          status:
            result.isFinished || result.isCorrect
              ? result.isCorrect
                ? "won"
                : "finished"
              : prevGame?.status || "active",
          message: result.message || prevGame?.message,
        }));
      }

      setGuess("");
      loadHistory();

      if (result.message) {
        setNotice(result.message);
      } else if (result.isCorrect) {
        setNotice("Tebrikler, doğru kelimeyi buldun.");
      }
    } catch {
      setError("Tahmin gönderilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="puzzle-page">
      <section className="puzzle-hero">
        <div>
          <h2>Bulmaca</h2>
          <p>
            Öğrendiğin kelimelerle hazırlanan bulmacada doğru kelimeyi sınırlı
            deneme hakkıyla bulmaya çalış.
          </p>
        </div>

        <div className="puzzle-hero-actions">
          <button type="button" onClick={loadCurrentGame} disabled={loading}>
            {loading ? "Yükleniyor..." : "Yenile"}
          </button>

          <button type="button" onClick={handleStartGame} disabled={starting}>
            {starting ? "Başlatılıyor..." : "Yeni Bulmaca"}
          </button>
        </div>
      </section>

      {loading && (
        <section className="puzzle-state">
          <div className="state-icon">🧩</div>
          <h3>Bulmaca yükleniyor...</h3>
          <p>Aktif çalışma kontrol ediliyor.</p>
        </section>
      )}

      {!loading && (
        <>
          {(error || notice) && (
            <section className={`puzzle-message ${error ? "error" : "success"}`}>
              {error || notice}
            </section>
          )}

          {!game && (
            <section className="puzzle-state empty">
              <div className="state-icon">🎯</div>
              <h3>Aktif bulmaca yok</h3>
              <p>
                Başlamak için yeni bir bulmaca oluştur. Kelime havuzun hazır
                olduğunda çalışma burada görüntülenir.
              </p>

              <button type="button" onClick={handleStartGame} disabled={starting}>
                {starting ? "Başlatılıyor..." : "Bulmaca Başlat"}
              </button>
            </section>
          )}

          {game && (
            <section className="puzzle-grid">
              <div className="puzzle-board-card">
                <div className="puzzle-board-header">
                  <div>
                    <p>Oyun Alanı</p>
                    <h3>Kelime tahmini</h3>
                  </div>

                  <div className="attempt-badge">
                    {maxAttempts ? `${attemptsUsed}/${maxAttempts}` : `${attemptsUsed} deneme`}
                  </div>
                </div>

                <div className="puzzle-board">
                  {guesses.length > 0 ? (
                    guesses.map((guessItem) => (
                      <div className="guess-row" key={guessItem.id}>
                        {guessItem.feedback.map((letterItem, index) => (
                          <div
                            className={`letter-box ${letterItem.status}`}
                            key={`${guessItem.id}-${index}`}
                          >
                            {letterItem.letter}
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="board-empty">İlk tahminini girerek bulmacaya başla.</div>
                  )}
                </div>

                {finished && <div className="game-result">{game.message || getGameResultText(game)}</div>}

                {!finished && (
                  <form className="guess-form" onSubmit={handleSubmitGuess}>
                    <label>
                      <span>Tahminin</span>

                      <input
                        type="text"
                        value={guess}
                        onChange={(event) => {
                          setGuess(event.target.value);
                          setError("");
                          setNotice("");
                        }}
                        maxLength={wordLength || 30}
                        placeholder={wordLength ? `${wordLength} harfli tahmin yaz` : "Tahminini yaz"}
                      />
                    </label>

                    <button type="submit" disabled={submitting}>
                      {submitting ? "Kontrol Ediliyor..." : "Tahmin Et"}
                    </button>
                  </form>
                )}
              </div>

              <aside className="puzzle-info-card">
                <h3>Bulmaca bilgileri</h3>

                <div className="puzzle-info-list">
                  <div>
                    <strong>Kelime uzunluğu</strong>
                    <span>{wordLength ? `${wordLength} harf` : "Belirtilmedi"}</span>
                  </div>

                  <div>
                    <strong>Kalan deneme</strong>
                    <span>
                      {remainingAttempts !== undefined ? `${remainingAttempts} hak` : "Sınır belirtilmedi"}
                    </span>
                  </div>

                  <div>
                    <strong>Durum</strong>
                    <span>{finished ? "Tamamlandı" : "Devam ediyor"}</span>
                  </div>
                </div>

                <div className="legend-card">
                  <h4>Renklerin anlamı</h4>

                  <div className="legend-list">
                    <span>
                      <i className="legend-color correct" />
                      Doğru harf, doğru yer
                    </span>

                    <span>
                      <i className="legend-color present" />
                      Doğru harf, farklı yer
                    </span>

                    <span>
                      <i className="legend-color absent" />
                      Kelimede yok
                    </span>
                  </div>
                </div>
              </aside>
            </section>
          )}

          <section className="puzzle-history-card">
            <div className="puzzle-history-header">
              <div>
                <p>Geçmiş</p>
                <h3>Önceki bulmacalar</h3>
              </div>

              <button type="button" onClick={loadHistory} disabled={historyLoading}>
                {historyLoading ? "Yükleniyor..." : "Geçmişi Yenile"}
              </button>
            </div>

            {history.length === 0 ? (
              <div className="puzzle-history-empty">Henüz kayıtlı bulmaca geçmişi yok.</div>
            ) : (
              <div className="puzzle-history-list">
                {history.map((item) => (
                  <div className="puzzle-history-item" key={item.id}>
                    <div>
                      <strong>{item.targetWord || "Aktif oyunda kelime gizli"}</strong>
                      <span>{formatDate(item.finishedAt || item.startedAt)}</span>
                    </div>

                    <div className="history-meta">
                      <span>{getStatusText(item.status)}</span>
                      <span>
                        {item.attemptsUsed}/{item.maxAttempts || 6} deneme
                      </span>
                      <span>{item.wordLength ? `${item.wordLength} harf` : "-"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Puzzle;

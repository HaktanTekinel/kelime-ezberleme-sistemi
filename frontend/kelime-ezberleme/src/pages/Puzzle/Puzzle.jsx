import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCurrentWordleGameAPI,
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

  if (
    normalized === "correct" ||
    normalized === "green" ||
    normalized === "right" ||
    normalized === "dogru" ||
    normalized === "doğru"
  ) {
    return "correct";
  }

  if (
    normalized === "present" ||
    normalized === "yellow" ||
    normalized === "misplaced" ||
    normalized === "wrong_position" ||
    normalized === "yanlis_yer" ||
    normalized === "yanlış_yer"
  ) {
    return "present";
  }

  if (
    normalized === "absent" ||
    normalized === "gray" ||
    normalized === "grey" ||
    normalized === "wrong" ||
    normalized === "not_found" ||
    normalized === "yok"
  ) {
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
        letter:
          item.letter ||
          item.char ||
          item.character ||
          fallbackGuess?.[index] ||
          "",
        status: normalizeStatus(
          item.status || item.result || item.state || item.color
        ),
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
    isCorrect: Boolean(
      pickValue(item, ["is_correct", "isCorrect", "correct", "won"])
    ),
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
        pickValue(gameData, [
          "word_length",
          "wordLength",
          "letter_count",
          "letterCount",
        ])
      ) || undefined,
    maxAttempts:
      Number(
        pickValue(gameData, [
          "max_attempts",
          "maxAttempts",
          "attempt_limit",
          "attemptLimit",
        ])
      ) || undefined,
    attemptsUsed:
      Number(
        pickValue(gameData, [
          "attempts_used",
          "attemptsUsed",
          "current_attempt",
          "currentAttempt",
        ])
      ) || guesses.length,
    message: pickValue(gameData, ["message", "detail"]),
    guesses,
    createdAt: pickValue(gameData, ["created_at", "createdAt"]),
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

  const normalizedGame = gameFromResponse
    ? normalizeGame(gameFromResponse)
    : null;

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
    message: pickValue(resultData, ["message", "detail"]),
    isFinished: Boolean(
      pickValue(resultData, ["is_finished", "isFinished", "finished"])
    ),
    isCorrect: Boolean(
      pickValue(resultData, ["is_correct", "isCorrect", "correct", "won"])
    ),
  };
}

function isGameFinished(game) {
  const status = String(game?.status || "").toLowerCase();

  return (
    status === "won" ||
    status === "lost" ||
    status === "finished" ||
    status === "completed" ||
    status === "bitti" ||
    status === "kazandi" ||
    status === "kaybetti"
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

function Puzzle() {
  const [game, setGame] = useState(null);
  const [guess, setGuess] = useState("");

  const [loading, setLoading] = useState(true);
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
  }, [loadCurrentGame]);

  const handleStartGame = async () => {
    setStarting(true);
    setError("");
    setNotice("");

    try {
      const data = await startWordleGameAPI();
      const normalizedGame = normalizeGame(data);

      setGame(normalizedGame);
      setGuess("");
      setNotice("Yeni bulmaca başladı.");
    } catch {
      setError("Bulmaca başlatılamadı. Lütfen daha sonra tekrar deneyin.");
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
            <section
              className={`puzzle-message ${error ? "error" : "success"}`}
            >
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
                    {maxAttempts
                      ? `${attemptsUsed}/${maxAttempts}`
                      : `${attemptsUsed} deneme`}
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
                    <div className="board-empty">
                      İlk tahminini girerek bulmacaya başla.
                    </div>
                  )}
                </div>

                {finished && (
                  <div className="game-result">
                    {game.message || getGameResultText(game)}
                  </div>
                )}

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
                        placeholder={
                          wordLength
                            ? `${wordLength} harfli tahmin yaz`
                            : "Tahminini yaz"
                        }
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
                      {remainingAttempts !== undefined
                        ? `${remainingAttempts} hak`
                        : "Sınır belirtilmedi"}
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
        </>
      )}
    </div>
  );
}

export default Puzzle;
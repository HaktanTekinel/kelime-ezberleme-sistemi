import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDailyQuizAPI,
  submitQuizAnswerAPI,
} from "../../services/quizService";
import QuizQuestionCard from "../../components/QuizQuestionCard/QuizQuestionCard";
import "./Quiz.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const ACTIVE_QUIZ_STORAGE_KEY = "kelimeEzberleme.activeQuiz.v1";
const ACTIVE_QUIZ_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function createEmptyMessage() {
  return {
    type: "",
    text: "",
  };
}

function createEmptyQuiz() {
  return {
    quiz_session_id: undefined,
    questions: [],
    due_count: undefined,
    new_count: undefined,
  };
}

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

function normalizeQuestion(question, index) {
  const wordId = pickValue(question, [
    "word_id",
    "wordId",
    "id",
    "wordID",
    "WordID",
  ]);

  const engWord = pickValue(question, [
    "eng_word",
    "engWord",
    "eng_word_name",
    "engWordName",
    "EngWordName",
    "word",
    "word_name",
  ]);

  const turWord = pickValue(question, [
    "tur_word",
    "turWord",
    "tur_word_name",
    "turWordName",
    "TurWordName",
    "meaning",
    "answer",
  ]);

  const options =
    pickValue(question, [
      "options",
      "choices",
      "answers",
      "answer_options",
      "answerOptions",
    ]) || [];

  return {
    id: wordId || index,
    word_id: wordId,
    eng_word: engWord || "Kelime",
    tur_word: turWord || "",
    options: Array.isArray(options) ? options : [],
    picture_url:
      pickValue(question, [
        "picture_url",
        "pictureUrl",
        "image_url",
        "imageUrl",
        "picture",
      ]) || "",
    audio_url: pickValue(question, ["audio_url", "audioUrl"]) || "",
    current_stage: pickValue(question, [
      "current_stage",
      "currentStage",
      "stage",
      "repetition_stage",
      "repetitionStage",
    ]),
  };
}

function normalizeQuizData(data) {
  const quiz = data?.quiz || data?.daily_quiz || data?.dailyQuiz || data || {};
  const rawQuestions = Array.isArray(data)
    ? data
    : quiz.questions || quiz.items || quiz.words || [];

  return {
    quiz_session_id: pickValue(quiz, [
      "quiz_session_id",
      "quizSessionId",
      "session_id",
      "sessionId",
    ]),
    questions: Array.isArray(rawQuestions)
      ? rawQuestions.map((question, index) => normalizeQuestion(question, index))
      : [],
    due_count: pickValue(quiz, [
      "due_count",
      "dueCount",
      "review_count",
      "reviewCount",
      "pending_reviews",
      "pendingReviews",
    ]),
    new_count: pickValue(quiz, [
      "new_count",
      "newCount",
      "new_word_count",
      "newWordCount",
    ]),
  };
}

function normalizeAnswerResult(data) {
  const result = data?.result || data?.answer || data || {};

  return {
    quiz_session_id: pickValue(result, [
      "quiz_session_id",
      "quizSessionId",
      "session_id",
      "sessionId",
    ]),
    is_correct: Boolean(
      pickValue(result, ["is_correct", "isCorrect", "correct"])
    ),
    correct_answer: pickValue(result, [
      "correct_answer",
      "correctAnswer",
      "tur_word",
      "turWord",
      "answer",
    ]),
    current_stage: pickValue(result, [
      "current_stage",
      "currentStage",
      "stage",
      "repetition_stage",
      "repetitionStage",
    ]),
    is_learned: Boolean(
      pickValue(result, ["is_learned", "isLearned", "learned", "mastered"])
    ),
    message: pickValue(result, ["message", "detail"]),
    next_review_at: pickValue(result, [
      "next_review_at",
      "nextReviewAt",
      "next_review",
      "nextReview",
    ]),
  };
}

function formatNumber(value) {
  if (!hasValue(value)) {
    return "-";
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return value;
  }

  return numberValue.toLocaleString("tr-TR");
}

function readActiveQuiz() {
  try {
    const rawValue = globalThis.localStorage.getItem(ACTIVE_QUIZ_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    const createdAt = Number(parsedValue?.createdAt || 0);
    const isExpired = Date.now() - createdAt > ACTIVE_QUIZ_MAX_AGE_MS;
    const questions = parsedValue?.quizData?.questions || [];

    if (isExpired || questions.length === 0) {
      globalThis.localStorage.removeItem(ACTIVE_QUIZ_STORAGE_KEY);
      return null;
    }

    return parsedValue;
  } catch {
    globalThis.localStorage.removeItem(ACTIVE_QUIZ_STORAGE_KEY);
    return null;
  }
}

function saveActiveQuiz({
  quizData,
  currentIndex,
  selectedAnswer,
  answerResult,
  answeredQuestions,
}) {
  const existingQuiz = readActiveQuiz();

  const payload = {
    createdAt: existingQuiz?.createdAt || Date.now(),
    quizData,
    currentIndex,
    selectedAnswer,
    answerResult,
    answeredQuestions,
  };

  globalThis.localStorage.setItem(
    ACTIVE_QUIZ_STORAGE_KEY,
    JSON.stringify(payload)
  );
}

function clearActiveQuiz() {
  globalThis.localStorage.removeItem(ACTIVE_QUIZ_STORAGE_KEY);
}

function getImageUrl(url) {
  if (!url) {
    return "";
  }

  if (url.startsWith("http")) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

function getSuccessRate(correctCount, totalCount) {
  if (totalCount === 0) {
    return 0;
  }

  return Math.round((correctCount / totalCount) * 100);
}

function getProgressPercent(currentIndex, totalCount) {
  if (totalCount === 0) {
    return 0;
  }

  const currentStep = Math.min(currentIndex + 1, totalCount);

  return Math.round((currentStep / totalCount) * 100);
}

function getNextButtonText(currentIndex, totalCount) {
  const isLastQuestion = currentIndex + 1 === totalCount;

  return isLastQuestion ? "Sonuçları Gör" : "Sonraki Soru";
}

function Quiz() {
  const [quizData, setQuizData] = useState(createEmptyQuiz);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answerResult, setAnswerResult] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [message, setMessage] = useState(createEmptyMessage);

  const questions = quizData.questions || [];
  const currentQuestion = questions[currentIndex];

  const correctCount = answeredQuestions.filter(
    (answer) => answer.is_correct
  ).length;

  const wrongCount = answeredQuestions.length - correctCount;
  const isQuizFinished =
    questions.length > 0 && currentIndex >= questions.length;

  const progressPercent = useMemo(
    () => getProgressPercent(currentIndex, questions.length),
    [currentIndex, questions.length]
  );

  const successRate = getSuccessRate(correctCount, questions.length);

  const resetQuizScreen = () => {
    setQuizData(createEmptyQuiz());
    setCurrentIndex(0);
    setSelectedAnswer("");
    setAnswerResult(null);
    setAnsweredQuestions([]);
  };

  const loadDailyQuiz = useCallback(async ({ forceNew = false } = {}) => {
    if (forceNew) {
      clearActiveQuiz();
    }

    setLoading(true);
    setMessage(createEmptyMessage());
    resetQuizScreen();

    try {
      const data = await getDailyQuizAPI();
      const normalizedQuiz = normalizeQuizData(data);

      setQuizData(normalizedQuiz);

      if (normalizedQuiz.questions.length > 0) {
        saveActiveQuiz({
          quizData: normalizedQuiz,
          currentIndex: 0,
          selectedAnswer: "",
          answerResult: null,
          answeredQuestions: [],
        });
      } else {
        clearActiveQuiz();
      }
    } catch {
      setMessage({
        type: "error",
        text: "Quiz soruları şu anda yüklenemedi. Lütfen daha sonra tekrar deneyin.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeQuiz = readActiveQuiz();

    if (activeQuiz) {
      setQuizData(activeQuiz.quizData || createEmptyQuiz());
      setCurrentIndex(Number(activeQuiz.currentIndex || 0));
      setSelectedAnswer(activeQuiz.selectedAnswer || "");
      setAnswerResult(activeQuiz.answerResult || null);
      setAnsweredQuestions(
        Array.isArray(activeQuiz.answeredQuestions)
          ? activeQuiz.answeredQuestions
          : []
      );
      setLoading(false);
      return;
    }

    loadDailyQuiz();
  }, [loadDailyQuiz]);

  useEffect(() => {
    if (questions.length === 0) {
      return;
    }

    saveActiveQuiz({
      quizData,
      currentIndex,
      selectedAnswer,
      answerResult,
      answeredQuestions,
    });
  }, [
    quizData,
    questions.length,
    currentIndex,
    selectedAnswer,
    answerResult,
    answeredQuestions,
  ]);

  const handleStartNewQuiz = () => {
    const hasActiveQuiz = questions.length > 0 && !isQuizFinished;

    if (hasActiveQuiz) {
      const isConfirmed = globalThis.confirm(
        "Devam eden quiz sıfırlanacak. Yeni quiz başlatmak istiyor musun?"
      );

      if (!isConfirmed) {
        return;
      }
    }

    loadDailyQuiz({ forceNew: true });
  };

  const handleSelectAnswer = (option) => {
    if (answerResult) {
      return;
    }

    setSelectedAnswer(option);
    setMessage(createEmptyMessage());
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) {
      setMessage({
        type: "error",
        text: "Aktif soru bulunamadı.",
      });
      return;
    }

    if (!selectedAnswer) {
      setMessage({
        type: "error",
        text: "Lütfen bir cevap seçin.",
      });
      return;
    }

    setAnswerLoading(true);
    setMessage(createEmptyMessage());

    try {
      const data = await submitQuizAnswerAPI({
        word_id: currentQuestion.word_id || currentQuestion.id,
        selected_answer: selectedAnswer,
        quiz_session_id: quizData.quiz_session_id,
      });

      const normalizedResult = normalizeAnswerResult(data);

      setAnswerResult(normalizedResult);

      if (normalizedResult.quiz_session_id && !quizData.quiz_session_id) {
        setQuizData((previousQuizData) => ({
          ...previousQuizData,
          quiz_session_id: normalizedResult.quiz_session_id,
        }));
      }

      setAnsweredQuestions((previousAnswers) => [
        ...previousAnswers,
        {
          word_id: currentQuestion.word_id || currentQuestion.id,
          eng_word: currentQuestion.eng_word,
          selected_answer: selectedAnswer,
          ...normalizedResult,
        },
      ]);
    } catch {
      setMessage({
        type: "error",
        text: "Cevap gönderilemedi. Lütfen tekrar deneyin.",
      });
    } finally {
      setAnswerLoading(false);
    }
  };

  const handleNextQuestion = () => {
    setCurrentIndex((previousIndex) => previousIndex + 1);
    setSelectedAnswer("");
    setAnswerResult(null);
    setMessage(createEmptyMessage());
  };

  const renderMessage = () => {
    if (!message.text) {
      return null;
    }

    return (
      <section className={`quiz-message ${message.type}`}>
        {message.text}
      </section>
    );
  };

  const renderLoadingState = () => (
    <section className="quiz-state">
      <div className="quiz-state-icon">🧠</div>
      <h3>Quiz hazırlanıyor...</h3>
      <p>Günlük çalışma soruların yükleniyor.</p>
    </section>
  );

  const renderEmptyState = () => (
    <section className="quiz-state empty">
      <div className="quiz-state-icon">📝</div>
      <h3>Bugün için soru bulunamadı</h3>
      <p>
        Kelime havuzunda yeterli soru olmadığında veya bugün çözülmesi gereken
        tekrar bulunmadığında quiz listesi boş görünebilir.
      </p>

      <div className="quiz-state-actions">
        <Link to="/add-word" className="quiz-primary-link">
          Kelime Ekle
        </Link>

        <Link to="/words" className="quiz-secondary-link">
          Kelimelerime Git
        </Link>
      </div>
    </section>
  );

  const renderReviewList = () => (
    <div className="quiz-review-list">
      {answeredQuestions.map((answer, index) => (
        <article
          key={`${answer.word_id}-${index}`}
          className={`quiz-review-item ${
            answer.is_correct ? "correct" : "wrong"
          }`}
        >
          <div>
            <h4>{answer.eng_word}</h4>

            <p>
              Senin cevabın: <strong>{answer.selected_answer}</strong>
            </p>

            {answer.correct_answer && (
              <p>
                Doğru cevap: <strong>{answer.correct_answer}</strong>
              </p>
            )}
          </div>

          <span>{answer.is_correct ? "Doğru" : "Yanlış"}</span>
        </article>
      ))}
    </div>
  );

  const renderResultCard = () => (
    <section className="quiz-result-card">
      <div className="result-icon">🏁</div>

      <h3>Quiz tamamlandı</h3>

      <p>
        Bugünkü quiz sonucunu aşağıdan inceleyebilir, istersen yeni bir çalışma
        başlatabilirsin.
      </p>

      <div className="quiz-result-grid">
        <div>
          <strong>{formatNumber(questions.length)}</strong>
          <p>Toplam Soru</p>
        </div>

        <div>
          <strong>{formatNumber(correctCount)}</strong>
          <p>Doğru</p>
        </div>

        <div>
          <strong>{formatNumber(wrongCount)}</strong>
          <p>Yanlış</p>
        </div>

        <div>
          <strong>%{successRate}</strong>
          <p>Başarı</p>
        </div>
      </div>

      {renderReviewList()}

      <div className="quiz-result-actions">
        <button
          type="button"
          className="quiz-primary-button"
          onClick={() => loadDailyQuiz({ forceNew: true })}
        >
          Yeni Quiz Başlat
        </button>

        <Link to="/home" className="quiz-secondary-link">
          Ana Sayfa
        </Link>
      </div>
    </section>
  );

  const renderSidePanel = () => (
    <aside className="quiz-side-panel">
      <div className="quiz-stat-card">
        <span>Toplam Soru</span>
        <strong>{formatNumber(questions.length)}</strong>
      </div>

      <div className="quiz-stat-card">
        <span>Tekrar Sorusu</span>
        <strong>{formatNumber(quizData.due_count)}</strong>
      </div>

      <div className="quiz-stat-card">
        <span>Yeni Soru</span>
        <strong>{formatNumber(quizData.new_count)}</strong>
      </div>

      <div className="quiz-stat-card">
        <span>Doğru / Yanlış</span>
        <strong>
          {formatNumber(correctCount)} / {formatNumber(wrongCount)}
        </strong>
      </div>
    </aside>
  );

  const renderQuizAction = () => {
    if (!answerResult) {
      return (
        <button
          type="button"
          className="quiz-primary-button"
          onClick={handleSubmitAnswer}
          disabled={!selectedAnswer || answerLoading}
        >
          {answerLoading ? "Gönderiliyor..." : "Cevabı Gönder"}
        </button>
      );
    }

    return (
      <button
        type="button"
        className="quiz-primary-button"
        onClick={handleNextQuestion}
      >
        {getNextButtonText(currentIndex, questions.length)}
      </button>
    );
  };

  const renderQuizLayout = () => (
    <section className="quiz-layout">
      {renderSidePanel()}

      <section className="quiz-card">
        <div className="quiz-progress-row">
          <span>
            Soru {currentIndex + 1} / {questions.length}
          </span>

          <strong>{progressPercent}%</strong>
        </div>

        <div className="quiz-progress-bar">
          <div style={{ width: `${progressPercent}%` }} />
        </div>

        <QuizQuestionCard
          question={currentQuestion}
          selectedAnswer={selectedAnswer}
          answerResult={answerResult}
          onSelectAnswer={handleSelectAnswer}
          getImageUrl={getImageUrl}
        />

        <div className="quiz-actions">{renderQuizAction()}</div>
      </section>
    </section>
  );

  const renderContent = () => {
    if (loading) {
      return renderLoadingState();
    }

    if (questions.length === 0) {
      return renderEmptyState();
    }

    if (isQuizFinished) {
      return renderResultCard();
    }

    return renderQuizLayout();
  };

  return (
    <div className="quiz-page">
      <section className="quiz-hero">
        <div>
          <h2>Günlük Quiz</h2>
          <p>
            Tekrar zamanı gelen kelimeleri çöz, doğru cevaplarla aşama ilerlet
            ve kelimelerini kalıcı hafızaya taşı.
          </p>
        </div>

        <div className="quiz-hero-actions">
          <Link to="/home" className="quiz-secondary-link">
            Ana Sayfa
          </Link>

          <Link to="/words" className="quiz-secondary-link">
            Kelimelerim
          </Link>

          <button
            type="button"
            className="quiz-primary-button"
            onClick={handleStartNewQuiz}
            disabled={loading}
          >
            {loading ? "Yükleniyor..." : "Yeni Quiz Başlat"}
          </button>
        </div>
      </section>

      {renderMessage()}
      {renderContent()}
    </div>
  );
}

export default Quiz;
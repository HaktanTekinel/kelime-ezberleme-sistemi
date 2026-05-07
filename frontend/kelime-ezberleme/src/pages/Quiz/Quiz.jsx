import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../../services/apiClient";
import {
  getDailyQuizAPI,
  submitQuizAnswerAPI,
} from "../../services/quizService";
import QuizQuestionCard from "../../components/QuizQuestionCard/QuizQuestionCard";
import "./Quiz.css";

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
    tur_word: turWord,
    options: Array.isArray(options) ? options : [],
    picture_url: pickValue(question, [
      "picture_url",
      "pictureUrl",
      "image_url",
      "imageUrl",
      "picture",
    ]),
    audio_url: pickValue(question, ["audio_url", "audioUrl"]),
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

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue.toLocaleString("tr-TR")
    : value;
}

function Quiz() {
  const [quizData, setQuizData] = useState({
    questions: [],
    due_count: undefined,
    new_count: undefined,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answerResult, setAnswerResult] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);

  const [loading, setLoading] = useState(false);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const questions = quizData.questions || [];
  const currentQuestion = questions[currentIndex];

  const correctCount = answeredQuestions.filter(
    (answer) => answer.is_correct
  ).length;

  const wrongCount = answeredQuestions.filter(
    (answer) => !answer.is_correct
  ).length;

  const isQuizFinished =
    questions.length > 0 && currentIndex >= questions.length;

  const progressPercent = useMemo(() => {
    if (questions.length === 0) {
      return 0;
    }

    const currentStep = Math.min(currentIndex + 1, questions.length);
    return Math.round((currentStep / questions.length) * 100);
  }, [currentIndex, questions.length]);

  const successRate = questions.length
    ? Math.round((correctCount / questions.length) * 100)
    : 0;

  const getImageUrl = (pictureUrl) => {
    if (!pictureUrl) {
      return "";
    }

    if (pictureUrl.startsWith("http")) {
      return pictureUrl;
    }

    return `${API_BASE_URL}${pictureUrl}`;
  };

  const loadDailyQuiz = useCallback(async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    setQuizData({
      questions: [],
      due_count: undefined,
      new_count: undefined,
    });
    setCurrentIndex(0);
    setSelectedAnswer("");
    setAnswerResult(null);
    setAnsweredQuestions([]);

    try {
      const data = await getDailyQuizAPI();
      setQuizData(normalizeQuizData(data));
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
    loadDailyQuiz();
  }, [loadDailyQuiz]);

  const handleSelectAnswer = (option) => {
    if (answerResult) {
      return;
    }

    setSelectedAnswer(option);
    setMessage({ type: "", text: "" });
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
    setMessage({ type: "", text: "" });

    try {
      const data = await submitQuizAnswerAPI({
        word_id: currentQuestion.word_id || currentQuestion.id,
        selected_answer: selectedAnswer,
      });

      const normalizedResult = normalizeAnswerResult(data);
      setAnswerResult(normalizedResult);

      setAnsweredQuestions((prevAnswers) => [
        ...prevAnswers,
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
    setCurrentIndex((prevIndex) => prevIndex + 1);
    setSelectedAnswer("");
    setAnswerResult(null);
    setMessage({ type: "", text: "" });
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
            onClick={loadDailyQuiz}
            disabled={loading}
          >
            {loading ? "Yükleniyor..." : "Yenile"}
          </button>
        </div>
      </section>

      {message.text && (
        <section className={`quiz-message ${message.type}`}>
          {message.text}
        </section>
      )}

      {loading ? (
        <section className="quiz-state">
          <div className="quiz-state-icon">🧠</div>
          <h3>Quiz hazırlanıyor...</h3>
          <p>Günlük çalışma soruların yükleniyor.</p>
        </section>
      ) : questions.length === 0 ? (
        <section className="quiz-state empty">
          <div className="quiz-state-icon">📝</div>
          <h3>Bugün için soru bulunamadı</h3>
          <p>
            Kelime havuzunda yeterli soru olmadığında veya bugün çözülmesi
            gereken tekrar bulunmadığında quiz listesi boş görünebilir.
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
      ) : isQuizFinished ? (
        <section className="quiz-result-card">
          <div className="result-icon">🏁</div>

          <h3>Quiz tamamlandı</h3>

          <p>
            Bugünkü quiz sonucunu aşağıdan inceleyebilir, istersen yeni bir
            çalışma başlatabilirsin.
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

          <div className="quiz-result-actions">
            <button
              type="button"
              className="quiz-primary-button"
              onClick={loadDailyQuiz}
            >
              Tekrar Başlat
            </button>

            <Link to="/home" className="quiz-secondary-link">
              Ana Sayfa
            </Link>
          </div>
        </section>
      ) : (
        <section className="quiz-layout">
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

            <div className="quiz-actions">
              {!answerResult ? (
                <button
                  type="button"
                  className="quiz-primary-button"
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer || answerLoading}
                >
                  {answerLoading ? "Gönderiliyor..." : "Cevabı Gönder"}
                </button>
              ) : (
                <button
                  type="button"
                  className="quiz-primary-button"
                  onClick={handleNextQuestion}
                >
                  {currentIndex + 1 === questions.length
                    ? "Sonuçları Gör"
                    : "Sonraki Soru"}
                </button>
              )}
            </div>
          </section>
        </section>
      )}
    </div>
  );
}

export default Quiz;
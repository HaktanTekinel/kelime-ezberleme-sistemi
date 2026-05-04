import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL, getAuthToken } from "../../services/apiClient";
import {
  getDailyQuizAPI,
  submitQuizAnswerAPI,
} from "../../services/quizService";
import "./Quiz.css";

function Quiz() {
  const [quizData, setQuizData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [answerResult, setAnswerResult] = useState(null);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const isLoggedIn = Boolean(getAuthToken());

  const questions = quizData?.questions || [];
  const currentQuestion = questions[currentIndex];

  const correctCount = answeredQuestions.filter(
    (item) => item.is_correct
  ).length;

  const wrongCount = answeredQuestions.filter(
    (item) => !item.is_correct
  ).length;

  const progressPercent = useMemo(() => {
    if (questions.length === 0) {
      return 0;
    }

    return Math.round(((currentIndex + 1) / questions.length) * 100);
  }, [currentIndex, questions.length]);

  const getImageUrl = (pictureUrl) => {
    if (!pictureUrl) {
      return "";
    }

    if (pictureUrl.startsWith("http")) {
      return pictureUrl;
    }

    return `${API_BASE_URL}${pictureUrl}`;
  };

  const loadDailyQuiz = async () => {
    setLoading(true);
    setMessage({ type: "", text: "" });
    setAnswerResult(null);
    setSelectedAnswer("");
    setAnsweredQuestions([]);
    setCurrentIndex(0);

    try {
      const data = await getDailyQuizAPI();
      setQuizData(data);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "Quiz soruları yüklenemedi. Lütfen tekrar deneyin.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadDailyQuiz();
    }
  }, [isLoggedIn]);

  const handleSelectAnswer = (option) => {
    if (answerResult) {
      return;
    }

    setSelectedAnswer(option);
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !selectedAnswer) {
      setMessage({
        type: "error",
        text: "Lütfen bir cevap seçin.",
      });
      return;
    }

    setAnswerLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const result = await submitQuizAnswerAPI({
        word_id: currentQuestion.word_id,
        selected_answer: selectedAnswer,
      });

      setAnswerResult(result);

      setAnsweredQuestions((prev) => [
        ...prev,
        {
          word_id: currentQuestion.word_id,
          eng_word: currentQuestion.eng_word,
          selected_answer: selectedAnswer,
          ...result,
        },
      ]);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Cevap gönderilemedi.",
      });
    } finally {
      setAnswerLoading(false);
    }
  };

  const handleNextQuestion = () => {
    const nextIndex = currentIndex + 1;

    if (nextIndex < questions.length) {
      setCurrentIndex(nextIndex);
      setSelectedAnswer("");
      setAnswerResult(null);
      setMessage({ type: "", text: "" });
    } else {
      setCurrentIndex(nextIndex);
      setSelectedAnswer("");
      setAnswerResult(null);
    }
  };

  const getOptionClassName = (option) => {
    if (!answerResult) {
      return selectedAnswer === option
        ? "quiz-option selected"
        : "quiz-option";
    }

    if (option === answerResult.correct_answer) {
      return "quiz-option correct";
    }

    if (option === selectedAnswer && !answerResult.is_correct) {
      return "quiz-option wrong";
    }

    return "quiz-option disabled";
  };

  const isQuizFinished =
    questions.length > 0 && currentIndex >= questions.length;

  if (!isLoggedIn) {
    return (
      <div className="quiz-page">
        <section className="quiz-empty-state">
          <span>Giriş Gerekli</span>
          <h1>Quiz çözmek için giriş yapmalısın</h1>
          <p>
            Quiz soruları kullanıcıya özel tekrar planına göre oluşturulur. Bu
            yüzden önce hesabına giriş yapman gerekir.
          </p>

          <div className="quiz-empty-actions">
            <Link to="/login" className="quiz-primary-link">
              Giriş Yap
            </Link>

            <Link to="/" className="quiz-secondary-link">
              Ana Sayfa
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="quiz-page">
      <header className="quiz-header">
        <div>
          <span className="quiz-eyebrow">Story 3</span>
          <h1>Günlük Quiz</h1>
          <p>
            Sistem, tekrar zamanı gelen kelimeleri ve yeni kelimeleri karıştırır.
            Doğru cevaplarda tekrar aşaması ilerler, yanlış cevapta süreç başa
            döner.
          </p>
        </div>

        <div className="quiz-header-actions">
          <Link to="/" className="quiz-secondary-link">
            Ana Sayfa
          </Link>

          <Link to="/word-list" className="quiz-secondary-link">
            Kelime Listesi
          </Link>

          <button
            type="button"
            className="quiz-primary-button"
            onClick={loadDailyQuiz}
            disabled={loading}
          >
            {loading ? "Yükleniyor..." : "Quizi Yenile"}
          </button>
        </div>
      </header>

      <main className="quiz-container">
        {message.text && (
          <p className={`quiz-message ${message.type}`}>{message.text}</p>
        )}

        {loading ? (
          <section className="quiz-empty-state">
            <span>Hazırlanıyor</span>
            <h1>Quiz soruları yükleniyor...</h1>
            <p>Backend üzerinden günlük quiz soruları getiriliyor.</p>
          </section>
        ) : questions.length === 0 ? (
          <section className="quiz-empty-state">
            <span>Quiz Yok</span>
            <h1>Bugün için soru bulunamadı</h1>
            <p>
              Quiz oluşturmak için sistemde en az 4 aktif kelime olmalı. Çünkü
              bir doğru cevap ve üç yanlış şık gerekiyor.
            </p>

            <div className="quiz-empty-actions">
              <Link to="/words" className="quiz-primary-link">
                Kelime Ekle
              </Link>

              <Link to="/word-list" className="quiz-secondary-link">
                Kelime Listesi
              </Link>
            </div>
          </section>
        ) : isQuizFinished ? (
          <section className="quiz-result-card">
            <span>Quiz Tamamlandı</span>
            <h1>Sonuçların</h1>

            <div className="quiz-result-grid">
              <div>
                <strong>{questions.length}</strong>
                <p>Toplam Soru</p>
              </div>

              <div>
                <strong>{correctCount}</strong>
                <p>Doğru</p>
              </div>

              <div>
                <strong>{wrongCount}</strong>
                <p>Yanlış</p>
              </div>

              <div>
                <strong>
                  {questions.length
                    ? Math.round((correctCount / questions.length) * 100)
                    : 0}
                  %
                </strong>
                <p>Başarı</p>
              </div>
            </div>

            <div className="quiz-review-list">
              {answeredQuestions.map((item, index) => (
                <article
                  key={`${item.word_id}-${index}`}
                  className={`quiz-review-item ${
                    item.is_correct ? "correct" : "wrong"
                  }`}
                >
                  <div>
                    <h3>{item.eng_word}</h3>
                    <p>
                      Senin cevabın: <strong>{item.selected_answer}</strong>
                    </p>
                    <p>
                      Doğru cevap: <strong>{item.correct_answer}</strong>
                    </p>
                  </div>

                  <span>{item.is_correct ? "Doğru" : "Yanlış"}</span>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="quiz-primary-button"
              onClick={loadDailyQuiz}
            >
              Tekrar Başlat
            </button>
          </section>
        ) : (
          <section className="quiz-layout">
            <aside className="quiz-side-panel">
              <div className="quiz-stat-card">
                <span>Toplam Soru</span>
                <strong>{questions.length}</strong>
              </div>

              <div className="quiz-stat-card">
                <span>Tekrar Sorusu</span>
                <strong>{quizData?.due_count || 0}</strong>
              </div>

              <div className="quiz-stat-card">
                <span>Yeni Soru</span>
                <strong>{quizData?.new_count || 0}</strong>
              </div>

              <div className="quiz-stat-card">
                <span>Doğru / Yanlış</span>
                <strong>
                  {correctCount} / {wrongCount}
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
                <div style={{ width: `${progressPercent}%` }}></div>
              </div>

              <div className="quiz-question-area">
                {currentQuestion.picture_url ? (
                  <img
                    className="quiz-word-image"
                    src={getImageUrl(currentQuestion.picture_url)}
                    alt={currentQuestion.eng_word}
                  />
                ) : (
                  <div className="quiz-word-placeholder">
                    {currentQuestion.eng_word.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <span className="quiz-question-label">
                    Türkçe karşılığını seç
                  </span>

                  <h2>{currentQuestion.eng_word}</h2>

                  <p>
                    Bu kelimenin doğru Türkçe anlamını aşağıdaki seçeneklerden
                    seç.
                  </p>
                </div>
              </div>

              <div className="quiz-options-grid">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={getOptionClassName(option)}
                    onClick={() => handleSelectAnswer(option)}
                    disabled={Boolean(answerResult)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {answerResult && (
                <div
                  className={`quiz-feedback ${
                    answerResult.is_correct ? "correct" : "wrong"
                  }`}
                >
                  <h3>
                    {answerResult.is_correct
                      ? "Doğru cevap!"
                      : "Yanlış cevap"}
                  </h3>

                  <p>
                    Doğru cevap: <strong>{answerResult.correct_answer}</strong>
                  </p>

                  <p>
                    Tekrar aşaması:{" "}
                    <strong>{answerResult.current_stage} / 6</strong>
                  </p>

                  {answerResult.is_learned && (
                    <p>Bu kelime öğrenilmiş kelimeler havuzuna yaklaştı.</p>
                  )}
                </div>
              )}

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
      </main>
    </div>
  );
}

export default Quiz;
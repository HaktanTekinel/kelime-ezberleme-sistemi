import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL, getAuthToken } from "../../services/apiClient";
import {
  getDailyQuizAPI,
  submitQuizAnswerAPI,
} from "../../services/quizService";
import QuizQuestionCard from "../../components/QuizQuestionCard/QuizQuestionCard";
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
    setQuizData(null);
    setCurrentIndex(0);
    setSelectedAnswer("");
    setAnswerResult(null);
    setAnsweredQuestions([]);

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
      const result = await submitQuizAnswerAPI({
        word_id: currentQuestion.word_id,
        selected_answer: selectedAnswer,
      });

      setAnswerResult(result);

      setAnsweredQuestions((prevAnswers) => [
        ...prevAnswers,
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

    setCurrentIndex(nextIndex);
    setSelectedAnswer("");
    setAnswerResult(null);
    setMessage({ type: "", text: "" });
  };

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
          <span className="quiz-eyebrow">Sınav Modülü</span>

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
              {answeredQuestions.map((answer, index) => (
                <article
                  key={`${answer.word_id}-${index}`}
                  className={`quiz-review-item ${
                    answer.is_correct ? "correct" : "wrong"
                  }`}
                >
                  <div>
                    <h3>{answer.eng_word}</h3>

                    <p>
                      Senin cevabın:{" "}
                      <strong>{answer.selected_answer}</strong>
                    </p>

                    <p>
                      Doğru cevap: <strong>{answer.correct_answer}</strong>
                    </p>
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

              <Link to="/" className="quiz-secondary-link">
                Ana Sayfa
              </Link>
            </div>
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
      </main>
    </div>
  );
}

export default Quiz;
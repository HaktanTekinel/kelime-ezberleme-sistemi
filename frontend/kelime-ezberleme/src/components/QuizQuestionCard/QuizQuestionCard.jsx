import "./QuizQuestionCard.css";

function QuizQuestionCard({
  question,
  selectedAnswer,
  answerResult,
  onSelectAnswer,
  getImageUrl,
}) {
  if (!question) {
    return null;
  }

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

  return (
    <div className="quiz-question-card">
      <div className="quiz-question-area">
        {question.picture_url ? (
          <img
            className="quiz-word-image"
            src={getImageUrl(question.picture_url)}
            alt={question.eng_word}
          />
        ) : (
          <div className="quiz-word-placeholder">
            {question.eng_word.charAt(0).toUpperCase()}
          </div>
        )}

        <div>
          <span className="quiz-question-label">Türkçe karşılığını seç</span>

          <h2>{question.eng_word}</h2>

          <p>
            Bu kelimenin doğru Türkçe anlamını aşağıdaki seçeneklerden seç.
          </p>
        </div>
      </div>

      <div className="quiz-options-grid">
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            className={getOptionClassName(option)}
            onClick={() => onSelectAnswer(option)}
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
          <h3>{answerResult.is_correct ? "Doğru cevap!" : "Yanlış cevap"}</h3>

          <p>
            Doğru cevap: <strong>{answerResult.correct_answer}</strong>
          </p>

          <p>
            Tekrar aşaması:{" "}
            <strong>{answerResult.current_stage} / 6</strong>
          </p>

          {answerResult.is_learned && (
            <p>Bu kelime öğrenilmiş kelimeler arasına alınmaya hazır.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default QuizQuestionCard;
import PropTypes from "prop-types";
import "./QuizQuestionCard.css";

const EMPTY_TEXT = "";

function hasValue(value) {
  return value !== undefined && value !== null && value !== EMPTY_TEXT;
}

function getSafeText(value, fallback = EMPTY_TEXT) {
  return hasValue(value) ? String(value) : fallback;
}

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

  const options = Array.isArray(question.options) ? question.options : [];
  const word = getSafeText(question.eng_word, "Kelime");
  const firstLetter = word.charAt(0).toUpperCase();

  const getAudioUrl = () => {
    if (!question.audio_url) {
      return EMPTY_TEXT;
    }

    if (question.audio_url.startsWith("http")) {
      return question.audio_url;
    }

    return getImageUrl(question.audio_url);
  };

  const handlePlayAudio = () => {
    const audioUrl = getAudioUrl();

    if (!audioUrl) {
      return;
    }

    const audio = new Audio(audioUrl);

    audio.play().catch(() => {
      globalThis.open(audioUrl, "_blank", "noopener,noreferrer");
    });
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

  return (
    <div className="quiz-question-card">
      <div className="quiz-question-area">
        {question.picture_url ? (
          <img
            className="quiz-word-image"
            src={getImageUrl(question.picture_url)}
            alt={word}
          />
        ) : (
          <div className="quiz-word-placeholder">{firstLetter}</div>
        )}

        <div className="quiz-question-content">
          <span className="quiz-question-label">Türkçe karşılığını seç</span>

          <div className="quiz-word-title-row">
            <h2>{word}</h2>

            {question.audio_url && (
              <button
                type="button"
                className="quiz-audio-button"
                onClick={handlePlayAudio}
                aria-label={`${word} telaffuzunu dinle`}
              >
                <span>🔊</span>
                Telaffuzu Dinle
              </button>
            )}
          </div>

          <p>
            Bu kelimenin doğru Türkçe anlamını aşağıdaki seçeneklerden seç.
          </p>

          {hasValue(question.current_stage) && (
            <div className="question-stage-pill">
              Tekrar aşaması: {question.current_stage}/6
            </div>
          )}
        </div>
      </div>

      {options.length > 0 ? (
        <div className="quiz-options-grid">
          {options.map((option) => (
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
      ) : (
        <div className="quiz-option-empty">
          Bu soru için seçenek bulunamadı.
        </div>
      )}

      {answerResult && (
        <div
          className={`quiz-feedback ${
            answerResult.is_correct ? "correct" : "wrong"
          }`}
        >
          <h3>{answerResult.is_correct ? "Doğru cevap!" : "Yanlış cevap"}</h3>

          {answerResult.correct_answer && (
            <p>
              Doğru cevap: <strong>{answerResult.correct_answer}</strong>
            </p>
          )}

          {hasValue(answerResult.current_stage) && (
            <p>
              Tekrar aşaması: <strong>{answerResult.current_stage} / 6</strong>
            </p>
          )}

          {answerResult.is_learned && (
            <p>Bu kelime kalıcı öğrenme aşamasına ulaştı.</p>
          )}

          {answerResult.message && <p>{answerResult.message}</p>}
        </div>
      )}
    </div>
  );
}

QuizQuestionCard.propTypes = {
  question: PropTypes.shape({
    audio_url: PropTypes.string,
    current_stage: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    eng_word: PropTypes.string,
    options: PropTypes.arrayOf(PropTypes.string),
    picture_url: PropTypes.string,
  }),
  selectedAnswer: PropTypes.string,
  answerResult: PropTypes.shape({
    correct_answer: PropTypes.string,
    current_stage: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    is_correct: PropTypes.bool,
    is_learned: PropTypes.bool,
    message: PropTypes.string,
  }),
  onSelectAnswer: PropTypes.func.isRequired,
  getImageUrl: PropTypes.func.isRequired,
};

QuizQuestionCard.defaultProps = {
  question: null,
  selectedAnswer: "",
  answerResult: null,
};

export default QuizQuestionCard;
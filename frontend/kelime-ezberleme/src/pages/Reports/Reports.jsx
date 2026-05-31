import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getUserReportAPI } from "../../services/reportService";
import { CEFR_LEVELS, getCefrLevelLabel, getCefrLevelOrder, isCefrLevel } from "../../utils/cefrLevels";
import "./Reports.css";

const EMPTY_TEXT = "";
const EMPTY_RATE = "%0";

function hasValue(value) {
  return value !== undefined && value !== null && value !== EMPTY_TEXT;
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

function formatNumber(value) {
  if (!hasValue(value)) {
    return "-";
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue.toLocaleString("tr-TR")
    : value;
}

function formatPercent(value) {
  if (!hasValue(value)) {
    return EMPTY_RATE;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return EMPTY_RATE;
  }

  return `%${Math.round(numericValue)}`;
}

function normalizeWordItems(rawItems) {
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems.map((item, index) => ({
    id: pickValue(item, ["word_id", "wordId", "id"]) || index,
    engWord:
      pickValue(item, ["eng_word", "engWord", "word", "name"]) || "Kelime",
    turWord: pickValue(item, ["tur_word", "turWord", "translation"]) || "",
  }));
}

function normalizeCategoryName(item) {
  const rawName =
    item.name || item.category || item.level || item.topic || item.title || "Kategori";

  return isLevelCategory(rawName) ? getCefrLevelLabel(rawName) : rawName;
}

function normalizeCategoryItem(item, index) {
  const name = normalizeCategoryName(item);

  return {
    id: item.id || item.category || item.level || item.topic || item.name || index,
    name,
    correct: Number(
      pickValue(item, ["correct", "correct_count", "correctCount"]) || 0
    ),
    wrong: Number(pickValue(item, ["wrong", "wrong_count", "wrongCount"]) || 0),
    total: Number(pickValue(item, ["total", "total_count", "totalCount"]) || 0),
    successRate: Number(
      pickValue(item, [
        "success_rate",
        "successRate",
        "rate",
        "percentage",
      ]) || 0
    ),
    correctWords: normalizeWordItems(
      pickValue(item, [
        "correct_words",
        "correctWords",
        "learned_words",
        "learnedWords",
      ])
    ),
    wrongWords: normalizeWordItems(
      pickValue(item, ["wrong_words", "wrongWords"])
    ),
  };
}

function normalizeCategoryReports(data) {
  const rawCategories =
    data?.category_reports ||
    data?.categoryReports ||
    data?.level_reports ||
    data?.levelReports ||
    data?.topic_success ||
    data?.topicSuccess ||
    data?.success_by_level ||
    data?.successByLevel ||
    [];

  if (!Array.isArray(rawCategories)) {
    return [];
  }

  return rawCategories.map((item, index) => normalizeCategoryItem(item, index));
}

function normalizeReport(data) {
  const report = data?.report || data?.stats || data?.statistics || data || {};

  const correctAnswers = pickValue(report, [
    "correct_answers",
    "correctAnswers",
    "total_correct_answers",
    "totalCorrectAnswers",
    "correct_count",
    "correctCount",
  ]);

  const wrongAnswers = pickValue(report, [
    "wrong_answers",
    "wrongAnswers",
    "total_wrong_answers",
    "totalWrongAnswers",
    "wrong_count",
    "wrongCount",
  ]);

  const totalAnswers =
    pickValue(report, [
      "total_answers",
      "totalAnswers",
      "answered_questions",
      "answeredQuestions",
      "total_questions",
      "totalQuestions",
    ]) ||
    (hasValue(correctAnswers) && hasValue(wrongAnswers)
      ? Number(correctAnswers) + Number(wrongAnswers)
      : undefined);

  return {
    summary: {
      totalAnswers,
      correctAnswers,
      wrongAnswers,
      successRate: pickValue(report, [
        "success_rate",
        "successRate",
        "accuracy",
      ]),
      learnedWords: pickValue(report, [
        "learned_words",
        "learnedWords",
        "known_words",
        "knownWords",
      ]),
      masteredWords: pickValue(report, [
        "mastered_words",
        "masteredWords",
        "completed_words",
        "completedWords",
      ]),
      pendingReviews: pickValue(report, [
        "pending_reviews",
        "pendingReviews",
        "due_reviews",
        "dueReviews",
      ]),
    },
    categories: normalizeCategoryReports(report),
  };
}

function createSummaryCards(summary) {
  const cards = [];

  if (hasValue(summary.totalAnswers)) {
    cards.push({
      title: "Çözülen Soru",
      value: formatNumber(summary.totalAnswers),
      icon: "📝",
    });
  }

  if (hasValue(summary.correctAnswers)) {
    cards.push({
      title: "Doğru Cevap",
      value: formatNumber(summary.correctAnswers),
      icon: "✅",
    });
  }

  if (hasValue(summary.wrongAnswers)) {
    cards.push({
      title: "Yanlış Cevap",
      value: formatNumber(summary.wrongAnswers),
      icon: "❌",
    });
  }

  if (hasValue(summary.successRate)) {
    cards.push({
      title: "Başarı Oranı",
      value: formatPercent(summary.successRate),
      icon: "📈",
    });
  }

  if (hasValue(summary.learnedWords)) {
    cards.push({
      title: "Öğrenilen Kelime",
      value: formatNumber(summary.learnedWords),
      icon: "📚",
    });
  }

  if (hasValue(summary.masteredWords)) {
    cards.push({
      title: "6. Aşamaya Gelen",
      value: formatNumber(summary.masteredWords),
      icon: "🏆",
    });
  }

  if (hasValue(summary.pendingReviews)) {
    cards.push({
      title: "Tekrar Bekleyen",
      value: formatNumber(summary.pendingReviews),
      icon: "⏰",
    });
  }

  return cards;
}

function isLevelCategory(name) {
  const categoryName = String(name || "").trim();

  return isCefrLevel(categoryName) || /^seviye\s+\d+$/i.test(categoryName);
}

function sortLevelCategories(categories) {
  const knownLevels = new Set(CEFR_LEVELS);

  return [...categories]
    .filter((item) => knownLevels.has(item.name))
    .sort(
      (firstItem, secondItem) =>
        getCefrLevelOrder(firstItem.name) - getCefrLevelOrder(secondItem.name)
    );
}

function sortTopicCategories(categories) {
  return [...categories].sort((firstItem, secondItem) =>
    String(firstItem.name).localeCompare(String(secondItem.name), "tr")
  );
}

function getRateClass(successRate) {
  const rate = Number(successRate || 0);

  if (rate >= 70) {
    return "good";
  }

  if (rate >= 40) {
    return "medium";
  }

  return "weak";
}

function WordChip({ word }) {
  return (
    <span className="report-word-chip">
      <strong>{word.engWord}</strong>
      {word.turWord && <small>{word.turWord}</small>}
    </span>
  );
}

WordChip.propTypes = {
  word: PropTypes.shape({
    engWord: PropTypes.string.isRequired,
    turWord: PropTypes.string,
  }).isRequired,
};

function CategoryDetails({ item }) {
  const { correctWords, wrongWords } = item;

  return (
    <div className="category-details">
      <div className="category-detail-box success">
        <div className="category-detail-title">
          <h5>Doğru / öğrenilen kelimeler</h5>
          <span>{correctWords.length}</span>
        </div>

        {correctWords.length > 0 ? (
          <div className="report-word-chip-list">
            {correctWords.map((word) => (
              <WordChip key={`correct-${item.id}-${word.id}`} word={word} />
            ))}
          </div>
        ) : (
          <p className="category-detail-empty">
            Bu bölüm için doğru kelime detayı henüz yok.
          </p>
        )}
      </div>

      <div className="category-detail-box danger">
        <div className="category-detail-title">
          <h5>Yanlış yaptığın kelimeler</h5>
          <span>{wrongWords.length}</span>
        </div>

        {wrongWords.length > 0 ? (
          <div className="report-word-chip-list">
            {wrongWords.map((word) => (
              <WordChip key={`wrong-${item.id}-${word.id}`} word={word} />
            ))}
          </div>
        ) : (
          <p className="category-detail-empty">
            Bu bölümde yanlış yaptığın kelime bulunmuyor.
          </p>
        )}
      </div>
    </div>
  );
}

const wordShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  engWord: PropTypes.string.isRequired,
  turWord: PropTypes.string,
});

const categoryShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  name: PropTypes.string.isRequired,
  correct: PropTypes.number.isRequired,
  wrong: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  successRate: PropTypes.number.isRequired,
  correctWords: PropTypes.arrayOf(wordShape).isRequired,
  wrongWords: PropTypes.arrayOf(wordShape).isRequired,
});

CategoryDetails.propTypes = {
  item: categoryShape.isRequired,
};

function CategoryRow({ item, isExpanded, onToggle }) {
  const progressWidth = Math.min(100, Math.max(0, Number(item.successRate)));

  return (
    <div className={`category-row ${isExpanded ? "expanded" : ""}`}>
      <div className="category-main">
        <div className="category-info">
          <div className="category-title-row">
            <h4>{item.name}</h4>

            <button
              type="button"
              className="category-toggle-button"
              onClick={() => onToggle(item.id)}
              aria-label={isExpanded ? "Detayları gizle" : "Detayları göster"}
            >
              <span>{isExpanded ? "Gizle" : "Detay"}</span>
              <span className="category-toggle-icon">⌄</span>
            </button>
          </div>

          <p>
            <span>{formatNumber(item.correct)} doğru</span>
            <span>{formatNumber(item.wrong)} yanlış</span>
            <span>{formatNumber(item.total)} toplam</span>
          </p>
        </div>

        <strong className={`rate-label ${getRateClass(item.successRate)}`}>
          {formatPercent(item.successRate)}
        </strong>
      </div>

      <div className="category-progress">
        <div
          className={getRateClass(item.successRate)}
          style={{ width: `${progressWidth}%` }}
        />
      </div>

      {isExpanded && <CategoryDetails item={item} />}
    </div>
  );
}

CategoryRow.propTypes = {
  item: categoryShape.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

function CategoryPanel({
  title,
  description,
  emptyText,
  items,
  expandedIds,
  onToggle,
}) {
  return (
    <article className="report-panel">
      <div className="report-panel-header">
        <div>
          <p>Başarı Dağılımı</p>
          <h3>{title}</h3>
          <span className="report-panel-description">{description}</span>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="category-list">
          {items.map((item) => (
            <CategoryRow
              key={item.id}
              item={item}
              isExpanded={expandedIds.has(item.id)}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        <div className="panel-empty">{emptyText}</div>
      )}
    </article>
  );
}

CategoryPanel.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  emptyText: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(categoryShape).isRequired,
  expandedIds: PropTypes.instanceOf(Set).isRequired,
  onToggle: PropTypes.func.isRequired,
};

function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(
    () => new Set()
  );

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getUserReportAPI();
      setReport(normalizeReport(data));
    } catch {
      setReport(null);
      setError(
        "Rapor bilgileri şu anda yüklenemedi. Lütfen daha sonra tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const reportLoadTimer = globalThis.setTimeout(() => {
      void loadReport();
    }, 0);

    return () => globalThis.clearTimeout(reportLoadTimer);
  }, [loadReport]);

  const summaryCards = useMemo(
    () => createSummaryCards(report?.summary || {}),
    [report]
  );

  const levelCategories = useMemo(() => {
    const categories = report?.categories || [];

    return sortLevelCategories(
      categories.filter((item) => isLevelCategory(item.name))
    );
  }, [report]);

  const topicCategories = useMemo(() => {
    const categories = report?.categories || [];

    return sortTopicCategories(
      categories.filter((item) => !isLevelCategory(item.name))
    );
  }, [report]);

  const hasReportContent =
    summaryCards.length > 0 ||
    levelCategories.length > 0 ||
    topicCategories.length > 0;

  const handlePrint = () => {
    globalThis.print();
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategoryIds((previousIds) => {
      const nextIds = new Set(previousIds);

      if (nextIds.has(categoryId)) {
        nextIds.delete(categoryId);
      } else {
        nextIds.add(categoryId);
      }

      return nextIds;
    });
  };

  return (
    <div className="reports-page">
      <section className="reports-hero">
        <div>
          <h2>Analiz Raporu</h2>
          <p>
            Kelime çalışmalarındaki doğru, yanlış, başarı oranı ve öğrenme
            gelişimini buradan takip edebilirsin.
          </p>
        </div>

        <div className="reports-hero-actions">
          <button type="button" onClick={loadReport} disabled={loading}>
            {loading ? "Yükleniyor..." : "Yenile"}
          </button>

          <button
            type="button"
            className="print-button"
            onClick={handlePrint}
            disabled={!hasReportContent}
          >
            Yazdır
          </button>
        </div>
      </section>

      {loading && (
        <section className="reports-state">
          <div className="state-icon">📊</div>
          <h3>Rapor yükleniyor...</h3>
          <p>Çalışma verilerin hazırlanıyor.</p>
        </section>
      )}

      {!loading && error && (
        <section className="reports-state error">
          <div className="state-icon">⚠️</div>
          <h3>Rapor yüklenemedi</h3>
          <p>{error}</p>

          <button type="button" onClick={loadReport}>
            Tekrar Dene
          </button>
        </section>
      )}

      {!loading && !error && !hasReportContent && (
        <section className="reports-state empty">
          <div className="state-icon">📝</div>
          <h3>Henüz rapor oluşturacak veri yok</h3>
          <p>
            Quiz çözdükçe doğru, yanlış ve başarı oranların burada görünmeye
            başlayacak.
          </p>
        </section>
      )}

      {!loading && !error && hasReportContent && (
        <>
          {summaryCards.length > 0 && (
            <section className="report-summary-grid">
              {summaryCards.map((item) => (
                <article className="report-summary-card" key={item.title}>
                  <div className="summary-icon">{item.icon}</div>

                  <div>
                    <p>{item.title}</p>
                    <h3>{item.value}</h3>
                  </div>
                </article>
              ))}
            </section>
          )}

          <section className="report-content-grid">
            <div className="report-left-column">
              <CategoryPanel
                title="Seviye bazlı sonuçlar"
                description="Başarı durumunu kelime seviyelerine göre ayrı ayrı gösterir."
                emptyText="Seviye bazlı sonuç henüz bulunmuyor."
                items={levelCategories}
                expandedIds={expandedCategoryIds}
                onToggle={toggleCategory}
              />

              <CategoryPanel
                title="Konu bazlı sonuçlar"
                description="Hangi konularda güçlü veya zayıf olduğunu daha net gösterir."
                emptyText="Konu bazlı sonuç henüz bulunmuyor."
                items={topicCategories}
                expandedIds={expandedCategoryIds}
                onToggle={toggleCategory}
              />
            </div>

            <aside className="report-panel tips-panel">
              <div className="report-panel-header">
                <div>
                  <p>Öğrenme Durumu</p>
                  <h3>Genel değerlendirme</h3>
                </div>
              </div>

              <div className="tips-list">
                <div>
                  <strong>Tekrarlarını düzenli çöz</strong>
                  <span>
                    Tekrar zamanı gelen kelimeleri çözdükçe kalıcı öğrenme
                    sürecin ilerler.
                  </span>
                </div>

                <div>
                  <strong>Yanlış yaptığın kelimelere dön</strong>
                  <span>
                    Detay okuna basarak yanlış yaptığın kelimeleri görebilir ve
                    tekrar çalışabilirsin.
                  </span>
                </div>

                <div>
                  <strong>Raporunu takip et</strong>
                  <span>
                    Seviye ve konu ayrımı hangi alanlarda güçlendiğini daha
                    anlaşılır gösterir.
                  </span>
                </div>
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}

export default Reports;
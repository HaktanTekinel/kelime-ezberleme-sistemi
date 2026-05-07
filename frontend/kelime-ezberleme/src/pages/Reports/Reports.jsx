import { useCallback, useEffect, useMemo, useState } from "react";
import { getUserReportAPI } from "../../services/reportService";
import "./Reports.css";

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
    return "-";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return `%${Math.round(numericValue)}`;
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

  return rawCategories.map((item, index) => ({
    id: item.id || item.category || item.level || item.topic || index,
    name:
      item.name ||
      item.category ||
      item.level ||
      item.topic ||
      item.title ||
      "Kategori",
    correct: pickValue(item, ["correct", "correct_count", "correctCount"]),
    wrong: pickValue(item, ["wrong", "wrong_count", "wrongCount"]),
    total: pickValue(item, ["total", "total_count", "totalCount"]),
    successRate: pickValue(item, [
      "success_rate",
      "successRate",
      "rate",
      "percentage",
    ]),
  }));
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

function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getUserReportAPI();
      setReport(normalizeReport(data));
    } catch {
      setReport(null);
      setError("Rapor bilgileri şu anda yüklenemedi. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summaryCards = useMemo(
    () => createSummaryCards(report?.summary || {}),
    [report]
  );

  const hasReportContent =
    summaryCards.length > 0 || (report?.categories || []).length > 0;

  const handlePrint = () => {
    window.print();
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
            <article className="report-panel">
              <div className="report-panel-header">
                <div>
                  <p>Başarı Dağılımı</p>
                  <h3>Konu / seviye bazlı sonuçlar</h3>
                </div>
              </div>

              {report.categories.length > 0 ? (
                <div className="category-list">
                  {report.categories.map((item) => (
                    <div className="category-row" key={item.id}>
                      <div className="category-main">
                        <div>
                          <h4>{item.name}</h4>
                          <p>
                            {hasValue(item.correct) && (
                              <span>{formatNumber(item.correct)} doğru</span>
                            )}

                            {hasValue(item.wrong) && (
                              <span>{formatNumber(item.wrong)} yanlış</span>
                            )}

                            {hasValue(item.total) && (
                              <span>{formatNumber(item.total)} toplam</span>
                            )}
                          </p>
                        </div>

                        <strong>{formatPercent(item.successRate)}</strong>
                      </div>

                      {hasValue(item.successRate) && (
                        <div className="category-progress">
                          <div
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, Number(item.successRate))
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="panel-empty">
                  Konu veya seviye bazlı sonuç henüz bulunmuyor.
                </div>
              )}
            </article>

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
                    Yanlış cevaplanan kelimeler tekrar döngüsünde yeniden
                    çalışılmalıdır.
                  </span>
                </div>

                <div>
                  <strong>Raporunu takip et</strong>
                  <span>
                    Başarı oranındaki değişim hangi seviyelerde güçlendiğini
                    veya zorlandığını gösterir.
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
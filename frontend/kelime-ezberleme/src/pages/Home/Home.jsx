import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { getDashboardSummaryAPI } from "../../services/dashboardService";
import "./Home.css";

const REVIEW_STAGES = [
  { stage: 1, label: "1 gün" },
  { stage: 2, label: "1 hafta" },
  { stage: 3, label: "1 ay" },
  { stage: 4, label: "3 ay" },
  { stage: 5, label: "6 ay" },
  { stage: 6, label: "1 yıl" },
];

const QUICK_ACTIONS = [
  {
    title: "Quiz'e Başla",
    text: "Bugünkü tekrarlarını çöz",
    path: "/quiz",
    icon: "🧠",
    primary: true,
  },
  {
    title: "Kelime Ekle",
    text: "Kelime havuzunu büyüt",
    path: "/add-word",
    icon: "➕",
  },
  {
    title: "Analiz Raporu",
    text: "Gelişimini takip et",
    path: "/reports",
    icon: "📊",
  },
];

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

  return Number.isFinite(Number(value))
    ? Number(value).toLocaleString("tr-TR")
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

function normalizeDashboard(data) {
  const stats = data?.stats || data?.statistics || {};
  const dailyGoal = data?.daily_goal || data?.dailyGoal || {};
  const nextReview = data?.next_review || data?.nextReview || null;

  const reviewPlan = Array.isArray(data?.review_plan)
    ? data.review_plan
    : Array.isArray(data?.reviewPlan)
      ? data.reviewPlan
      : [];

  return {
    dailyGoal: {
      target: pickValue(dailyGoal, [
        "target",
        "daily_new_word_count",
        "dailyNewWordCount",
      ]),
      completed: pickValue(dailyGoal, [
        "completed",
        "completed_today",
        "completedToday",
      ]),
    },
    stats: {
      learnedWords: pickValue(stats, ["learned_words", "learnedWords"]),
      pendingReviews: pickValue(stats, [
        "pending_reviews",
        "pendingReviews",
      ]),
      successRate: pickValue(stats, ["success_rate", "successRate"]),
      masteredWords: pickValue(stats, ["mastered_words", "masteredWords"]),
      weeklyNewWords: pickValue(stats, [
        "weekly_new_words",
        "weeklyNewWords",
      ]),
      successImprovement: pickValue(stats, [
        "success_improvement",
        "successImprovement",
      ]),
    },
    reviewPlan,
    nextReview,
  };
}

function createStatCards(stats) {
  const cards = [];

  if (hasValue(stats.learnedWords)) {
    cards.push({
      title: "Öğrenilen Kelime",
      value: formatNumber(stats.learnedWords),
      detail: hasValue(stats.weeklyNewWords)
        ? `+${formatNumber(stats.weeklyNewWords)} bu hafta`
        : "",
      icon: "📚",
    });
  }

  if (hasValue(stats.pendingReviews)) {
    cards.push({
      title: "Tekrar Bekleyen",
      value: formatNumber(stats.pendingReviews),
      detail: "Bugün çözülmesi gereken tekrarlar",
      icon: "⏰",
    });
  }

  if (hasValue(stats.successRate)) {
    cards.push({
      title: "Başarı Oranı",
      value: formatPercent(stats.successRate),
      detail: hasValue(stats.successImprovement)
        ? `+${formatNumber(stats.successImprovement)} gelişim`
        : "",
      icon: "📈",
    });
  }

  if (hasValue(stats.masteredWords)) {
    cards.push({
      title: "6. Aşamaya Gelen",
      value: formatNumber(stats.masteredWords),
      detail: "Kalıcı hafıza aşamasına ulaşan kelimeler",
      icon: "🏆",
    });
  }

  return cards;
}

function getReviewTitle(item) {
  return item.title || item.label || item.name || "Tekrar aralığı";
}

function getReviewCount(item) {
  return pickValue(item, ["count", "word_count", "wordCount", "total"]);
}

function getReviewDescription(item) {
  return item.description || item.text || item.detail || "Planlanan tekrar";
}

function Home() {
  const outletData = useOutletContext();
  const currentUser = outletData?.currentUser || "Öğrenci";

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getDashboardSummaryAPI();
      setDashboard(normalizeDashboard(data));
    } catch {
      setDashboard(null);
      setError("Veriler şu anda alınamadı. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const statCards = useMemo(
    () => createStatCards(dashboard?.stats || {}),
    [dashboard]
  );

  const hasDailyGoal =
    hasValue(dashboard?.dailyGoal?.target) ||
    hasValue(dashboard?.dailyGoal?.completed);

  const dailyTarget = Number(dashboard?.dailyGoal?.target || 0);
  const dailyCompleted = Number(dashboard?.dailyGoal?.completed || 0);

  const progressPercent =
    dailyTarget > 0
      ? Math.min(100, Math.round((dailyCompleted / dailyTarget) * 100))
      : 0;

  const currentStage = pickValue(dashboard?.nextReview, [
    "current_stage",
    "currentStage",
  ]);

  const totalStage = pickValue(dashboard?.nextReview, [
    "total_stage",
    "totalStage",
  ]);

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-content">
          <span className="hero-pill">6 Sefer Tekrar Prensibi</span>

          <h2>
            Bugünkü kelime çalışmana
            <span> devam et.</span>
          </h2>

          <p>
            Merhaba {currentUser}, günlük hedeflerini takip et, tekrar zamanı
            gelen kelimeleri çöz ve öğrendiğin kelimeleri kalıcı hafızaya taşı.
          </p>

          <div className="hero-buttons">
            <Link to="/quiz" className="primary-button">
              Quiz'e Başla
            </Link>

            <Link to="/words" className="secondary-button">
              Kelimelerimi Gör
            </Link>
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card-top">
            <div>
              <span>Bugünkü hedef</span>
              <h3>
                {hasDailyGoal
                  ? `${formatNumber(dailyTarget)} yeni kelime`
                  : "Hedef bekleniyor"}
              </h3>
            </div>

            <div className="hero-card-icon">🎯</div>
          </div>

          {loading && (
            <div className="card-status">Veriler yükleniyor...</div>
          )}

          {!loading && !hasDailyGoal && !error && (
            <div className="card-status muted">
              Günlük hedef bilgisi henüz bulunmuyor.
            </div>
          )}

          {!loading && hasDailyGoal && (
            <div className="progress-area">
              <div className="progress-info">
                <span>Günlük ilerleme</span>
                <strong>
                  {formatNumber(dailyCompleted)} / {formatNumber(dailyTarget)}
                </strong>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {!loading && dashboard?.nextReview && (
            <div className="repeat-box">
              <div>
                <span>Sonraki tekrar</span>
                <strong>
                  {dashboard.nextReview.label ||
                    dashboard.nextReview.title ||
                    "Tekrar zamanı"}
                </strong>
              </div>

              {hasValue(currentStage) && hasValue(totalStage) && (
                <span className="repeat-badge">
                  {currentStage}/{totalStage}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {error && (
        <section className="state-box error-state">
          <div>
            <h3>Veriler alınamadı</h3>
            <p>{error}</p>
          </div>

          <button type="button" onClick={loadDashboard}>
            Tekrar Dene
          </button>
        </section>
      )}

      {!loading && !error && statCards.length > 0 && (
        <section className="stats-grid">
          {statCards.map((item) => (
            <article className="stat-card" key={item.title}>
              <div className="stat-icon">{item.icon}</div>

              <div>
                <p>{item.title}</p>
                <h3>{item.value}</h3>
                {item.detail && <span>{item.detail}</span>}
              </div>
            </article>
          ))}
        </section>
      )}

      {!loading && !error && statCards.length === 0 && (
        <section className="state-box empty-state">
          <div>
            <h3>Henüz gösterilecek istatistik yok</h3>
            <p>
              Kelime çalışmaya başladığında öğrenme durumun, tekrarların ve
              başarı oranın burada görünecek.
            </p>
          </div>
        </section>
      )}

      <section className="dashboard-grid">
        <div className="dashboard-column">
          <div className="section-header">
            <div>
              <p>Çalışma Planı</p>
              <h2>Tekrar bekleyenler</h2>
            </div>

            <Link to="/quiz">Quiz'e Git</Link>
          </div>

          {loading && <div className="list-status">Tekrar planı yükleniyor...</div>}

          {!loading && !error && dashboard?.reviewPlan?.length > 0 && (
            <div className="review-list">
              {dashboard.reviewPlan.map((item, index) => {
                const count = getReviewCount(item);

                return (
                  <article
                    className="review-card"
                    key={`${getReviewTitle(item)}-${index}`}
                  >
                    <div className="review-count">{formatNumber(count)}</div>

                    <div>
                      <h3>{getReviewTitle(item)}</h3>
                      <p>{getReviewDescription(item)}</p>
                    </div>

                    <Link to="/quiz">Başla</Link>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && !error && dashboard?.reviewPlan?.length === 0 && (
            <div className="list-status muted">
              Bugün için planlanan tekrar bulunmuyor.
            </div>
          )}
        </div>

        <div className="dashboard-column">
          <div className="section-header">
            <div>
              <p>Hızlı Erişim</p>
              <h2>Modüller</h2>
            </div>
          </div>

          <div className="quick-actions">
            {QUICK_ACTIONS.map((item) => (
              <Link
                to={item.path}
                className={item.primary ? "quick-card primary" : "quick-card"}
                key={item.title}
              >
                <span>{item.icon}</span>

                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bottom-grid">
        <article className="learning-path-card">
          <div className="section-header">
            <div>
              <p>6 Aşamalı Sistem</p>
              <h2>Tekrar aralıkları</h2>
            </div>
          </div>

          <div className="path-steps">
            {REVIEW_STAGES.map((item) => (
              <div className="path-step" key={item.stage}>
                <span>{item.stage}</span>
                <p>{item.label}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="mini-report-card">
          <div>
            <p>Analiz Raporu</p>
            <h2>Öğrenme gelişimini takip et.</h2>
            <span>
              Doğru cevapların, tekrar performansın ve başarı oranların rapor
              ekranında görüntülenir.
            </span>
          </div>

          <Link to="/reports">Raporu Aç</Link>
        </article>
      </section>
    </div>
  );
}

export default Home;
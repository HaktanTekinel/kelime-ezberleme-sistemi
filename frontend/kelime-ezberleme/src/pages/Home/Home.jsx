import { Link } from "react-router-dom";
import "./Home.css";

const STATS = [
  {
    icon: "📚",
    title: "Kelime Havuzu",
    value: "Aktif",
    description: "Kayıtlı kelimelerini listele ve düzenle",
  },
  {
    icon: "🧠",
    title: "Günlük Quiz",
    value: "6 Tekrar",
    description: "Tekrar zamanı gelen kelimeleri çöz",
  },
  {
    icon: "📊",
    title: "Analiz",
    value: "Rapor",
    description: "Başarı durumunu konu ve seviye bazında gör",
  },
  {
    icon: "🎮",
    title: "Bulmaca",
    value: "Wordle",
    description: "Öğrenilen kelimelerle pratik yap",
  },
];

const REVIEW_ITEMS = [
  {
    count: "1",
    title: "Bugünkü tekrarlarını çöz",
    description: "6 tekrar sisteminde doğru cevaplar aşama ilerletir.",
    link: "/quiz",
    linkText: "Quize Git",
  },
  {
    count: "2",
    title: "Yeni kelime ekle",
    description: "Kelime, anlam, örnek cümle ve görsel bilgilerini kaydet.",
    link: "/add-word",
    linkText: "Kelime Ekle",
  },
  {
    count: "3",
    title: "Gelişimini kontrol et",
    description: "Analiz ekranından başarı oranlarını incele.",
    link: "/reports",
    linkText: "Raporu Aç",
  },
];

const QUICK_ACTIONS = [
  {
    icon: "➕",
    title: "Kelime Ekle",
    description: "Yeni kelime ve örnek cümle oluştur",
    link: "/add-word",
    isPrimary: true,
  },
  {
    icon: "📋",
    title: "Kelime Listesi",
    description: "Kelimeleri ara, filtrele ve düzenle",
    link: "/words",
    isPrimary: false,
  },
  {
    icon: "🧪",
    title: "Quiz Çöz",
    description: "Günlük tekrar sorularını cevapla",
    link: "/quiz",
    isPrimary: false,
  },
  {
    icon: "🧩",
    title: "Bulmacalar",
    description: "Wordle ve Word Chain ekranlarını aç",
    link: "/puzzle",
    isPrimary: false,
  },
];

const PATH_STEPS = [
  "1 gün",
  "1 hafta",
  "1 ay",
  "3 ay",
  "6 ay",
  "1 yıl",
];

function StatCard({ item }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{item.icon}</div>

      <div>
        <p>{item.title}</p>
        <h3>{item.value}</h3>
        <span>{item.description}</span>
      </div>
    </article>
  );
}

function ReviewCard({ item }) {
  return (
    <article className="review-card">
      <div className="review-count">{item.count}</div>

      <div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>

      <Link to={item.link}>{item.linkText}</Link>
    </article>
  );
}

function QuickActionCard({ item }) {
  const className = item.isPrimary ? "quick-card primary" : "quick-card";

  return (
    <Link className={className} to={item.link}>
      <span>{item.icon}</span>

      <div>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </Link>
  );
}

function LearningPath() {
  return (
    <article className="learning-path-card">
      <div className="section-header">
        <div>
          <p>6 Tekrar Sistemi</p>
          <h2>Öğrenme yolu</h2>
        </div>

        <Link to="/quiz">Tekrarları Çöz</Link>
      </div>

      <div className="path-steps">
        {PATH_STEPS.map((step, index) => (
          <div className="path-step" key={step}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function MiniReportCard() {
  return (
    <article className="mini-report-card">
      <div>
        <p>Analiz Raporu</p>
        <h2>Başarı durumunu takip et</h2>
        <span>
          Hangi konularda güçlü olduğunu, hangi kelimelerde tekrar yapman
          gerektiğini analiz ekranından görebilirsin.
        </span>
      </div>

      <Link to="/reports">Raporu İncele</Link>
    </article>
  );
}

function Home() {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="hero-content">
          <span className="hero-pill">Kelime Hafızam</span>

          <h2>
            İngilizce kelimeleri <span>6 tekrar sistemiyle</span> kalıcı öğren.
          </h2>

          <p>
            Kelime ekle, günlük quizlerini çöz, analiz raporunu incele ve
            öğrendiğin kelimelerle bulmaca pratikleri yap.
          </p>

          <div className="hero-buttons">
            <Link className="primary-button" to="/quiz">
              Günlük Quize Başla
            </Link>

            <Link className="secondary-button" to="/words">
              Kelimelerimi Gör
            </Link>
          </div>
        </div>

        <aside className="hero-card">
          <div className="hero-card-top">
            <div>
              <span>Bugünkü hedef</span>
              <h3>Tekrarlarını tamamla</h3>
            </div>

            <div className="hero-card-icon">🎯</div>
          </div>

          <div className="card-status">
            6 tekrar prensibinde her doğru cevap kelimeyi bir sonraki tekrar
            aşamasına taşır.
          </div>

          <div className="progress-area">
            <div className="progress-info">
              <span>Öğrenme ilerlemesi</span>
              <strong>6 aşama</strong>
            </div>

            <div className="progress-track">
              <div className="progress-fill" style={{ width: "66%" }} />
            </div>
          </div>

          <div className="repeat-box">
            <div>
              <span>Tekrar aralığı</span>
              <strong>1 gün → 1 yıl</strong>
            </div>

            <div className="repeat-badge">6x</div>
          </div>
        </aside>
      </section>

      <section className="stats-grid">
        {STATS.map((item) => (
          <StatCard item={item} key={item.title} />
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-column">
          <div className="section-header">
            <div>
              <p>Çalışma Planı</p>
              <h2>Bugün ne yapmalısın?</h2>
            </div>

            <Link to="/quiz">Başla</Link>
          </div>

          <div className="review-list">
            {REVIEW_ITEMS.map((item) => (
              <ReviewCard item={item} key={item.title} />
            ))}
          </div>
        </article>

        <article className="dashboard-column">
          <div className="section-header">
            <div>
              <p>Kısayollar</p>
              <h2>Hızlı işlemler</h2>
            </div>
          </div>

          <div className="quick-actions">
            {QUICK_ACTIONS.map((item) => (
              <QuickActionCard item={item} key={item.title} />
            ))}
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <LearningPath />
        <MiniReportCard />
      </section>
    </div>
  );
}

export default Home;
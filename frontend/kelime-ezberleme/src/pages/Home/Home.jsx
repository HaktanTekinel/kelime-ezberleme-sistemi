import { Link, useOutletContext } from "react-router-dom";
import "./Home.css";

function Home() {
  const outletData = useOutletContext();
  const currentUser = outletData?.currentUser || "Öğrenci";

  const stats = [
    {
      title: "Öğrenilen Kelime",
      value: "128",
      change: "+12 bu hafta",
      icon: "📚",
    },
    {
      title: "Tekrar Bekleyen",
      value: "24",
      change: "Bugün çözülmeli",
      icon: "⏰",
    },
    {
      title: "Başarı Oranı",
      value: "%82",
      change: "+6 gelişim",
      icon: "📈",
    },
    {
      title: "6. Aşamaya Gelen",
      value: "17",
      change: "Kalıcı hafıza",
      icon: "🏆",
    },
  ];

  const reviewItems = [
    {
      title: "1 gün sonra tekrar",
      count: 8,
      text: "Dünkü doğru bildiğin kelimeler",
      color: "blue",
    },
    {
      title: "1 hafta sonra tekrar",
      count: 6,
      text: "Geçen haftadan gelen kelimeler",
      color: "purple",
    },
    {
      title: "1 ay sonra tekrar",
      count: 4,
      text: "Uzun dönem hafıza kontrolü",
      color: "green",
    },
  ];

  const quickActions = [
    {
      title: "Quiz'e Başla",
      text: "Bugünkü tekrarlarını çöz",
      path: "/quiz",
      icon: "🧠",
      primary: true,
    },
    {
      title: "Kelime Ekle",
      text: "Yeni kelime havuzunu büyüt",
      path: "/add-word",
      icon: "➕",
    },
    {
      title: "Analiz Raporu",
      text: "Başarı yüzdelerini incele",
      path: "/reports",
      icon: "📊",
    },
  ];

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
            Merhaba {currentUser}, bugün tekrar edilmesi gereken kelimelerin
            hazır. Quiz çözerek kelimeleri 6 aşamalı kalıcı öğrenme döngüsünde
            ilerletebilirsin.
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
              <h3>10 yeni kelime</h3>
            </div>

            <div className="hero-card-icon">🎯</div>
          </div>

          <div className="progress-area">
            <div className="progress-info">
              <span>Günlük ilerleme</span>
              <strong>7 / 10</strong>
            </div>

            <div className="progress-track">
              <div className="progress-fill" style={{ width: "70%" }} />
            </div>
          </div>

          <div className="repeat-box">
            <div>
              <span>Sonraki tekrar</span>
              <strong>1 hafta sonra</strong>
            </div>

            <span className="repeat-badge">3/6</span>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        {stats.map((item) => (
          <article className="stat-card" key={item.title}>
            <div className="stat-icon">{item.icon}</div>
            <div>
              <p>{item.title}</p>
              <h3>{item.value}</h3>
              <span>{item.change}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-column">
          <div className="section-header">
            <div>
              <p>Çalışma Planı</p>
              <h2>Bugünkü tekrarlar</h2>
            </div>

            <Link to="/quiz">Tümünü Çöz</Link>
          </div>

          <div className="review-list">
            {reviewItems.map((item) => (
              <article className={`review-card ${item.color}`} key={item.title}>
                <div className="review-count">{item.count}</div>

                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>

                <Link to="/quiz">Başla</Link>
              </article>
            ))}
          </div>
        </div>

        <div className="dashboard-column">
          <div className="section-header">
            <div>
              <p>Hızlı Erişim</p>
              <h2>Modüller</h2>
            </div>
          </div>

          <div className="quick-actions">
            {quickActions.map((item) => (
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
              <h2>Kelime öğrenme yolu</h2>
            </div>
          </div>

          <div className="path-steps">
            <div className="path-step done">
              <span>1</span>
              <p>1 gün</p>
            </div>

            <div className="path-step done">
              <span>2</span>
              <p>1 hafta</p>
            </div>

            <div className="path-step active">
              <span>3</span>
              <p>1 ay</p>
            </div>

            <div className="path-step">
              <span>4</span>
              <p>3 ay</p>
            </div>

            <div className="path-step">
              <span>5</span>
              <p>6 ay</p>
            </div>

            <div className="path-step">
              <span>6</span>
              <p>1 yıl</p>
            </div>
          </div>
        </article>

        <article className="mini-report-card">
          <div>
            <p>Haftalık Özet</p>
            <h2>Başarı durumun iyi görünüyor.</h2>
            <span>
              En çok doğru yaptığın seviye: <strong>B1</strong>
            </span>
          </div>

          <Link to="/reports">Raporu Aç</Link>
        </article>
      </section>
    </div>
  );
}

export default Home;
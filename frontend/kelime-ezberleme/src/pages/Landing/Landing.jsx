import { Link } from "react-router-dom";
import "./Landing.css";

const FEATURES = [
  {
    icon: "🔁",
    title: "6 Sefer Tekrar",
    text: "Kelimeler belirli aralıklarla tekrar edilerek kalıcı öğrenme hedeflenir.",
  },
  {
    icon: "🧠",
    title: "Quiz Modülü",
    text: "Tekrar zamanı gelen kelimeler quiz içinde çözülür ve öğrenme aşaması ilerler.",
  },
  {
    icon: "📚",
    title: "Kelime Havuzu",
    text: "İngilizce kelime, Türkçe anlam, örnek cümle ve görsel bilgisiyle kelime eklenebilir.",
  },
  {
    icon: "📊",
    title: "Analiz Raporu",
    text: "Doğru, yanlış ve başarı oranları üzerinden öğrenme gelişimi takip edilir.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Kelime ekle",
    text: "Çalışmak istediğin kelimeleri anlamları ve örnek cümleleriyle kaydet.",
  },
  {
    number: "02",
    title: "Quiz çöz",
    text: "Günlük tekrarlarını çözerek kelimelerin öğrenme aşamasını ilerlet.",
  },
  {
    number: "03",
    title: "Gelişimini takip et",
    text: "Analiz raporu üzerinden öğrenme durumunu ve başarı oranını görüntüle.",
  },
];

const PREVIEW_ITEMS = [
  {
    label: "Quiz",
    title: "Tekrar zamanı gelen kelimeler",
    action: "Çöz",
    isActive: true,
  },
  {
    label: "Kelime Havuzu",
    title: "Kelime, anlam ve örnek cümle",
    action: "Ekle",
    isActive: false,
  },
  {
    label: "Analiz",
    title: "Başarı oranı ve gelişim takibi",
    action: "İncele",
    isActive: false,
  },
];

const EXTRA_MODULES = [
  {
    title: "🧩 Bulmaca",
    text: "Öğrenilen kelimelerden oluşan kelime oyunu.",
  },
  {
    title: "🔗 Word Chain",
    text: "Seçilen kelimelerle hikaye ve görsel çalışması.",
  },
];

function Landing() {
  return (
    <main className="landing-page">
      <nav className="landing-navbar">
        <Link to="/" className="landing-brand">
          <span>6</span>

          <div>
            <strong>Kelime Hafızam</strong>
            <small>6 tekrar ile öğren</small>
          </div>
        </Link>

        <div className="landing-nav-actions">
          <Link to="/login" className="landing-login-link">
            Giriş Yap
          </Link>

          <Link to="/register" className="landing-register-link">
            Kayıt Ol
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-content">
          <span className="landing-pill">Kelime öğrenme sistemi</span>

          <h1>
            İngilizce kelimeleri{" "}
            <span>düzenli tekrarlarla</span>{" "}
            kalıcı hale getir.
          </h1>

          <p>
            Kelime Hafızam; kelime ekleme, quiz, tekrar takibi, analiz raporu,
            bulmaca ve yaratıcı hikaye çalışmalarıyla kelime öğrenme sürecini
            tek panelde toplar.
          </p>

          <div className="landing-hero-actions">
            <Link to="/register" className="landing-primary-button">
              Hemen Başla
            </Link>

            <Link to="/login" className="landing-secondary-button">
              Hesabım Var
            </Link>
          </div>
        </div>

        <div className="landing-preview-card">
          <div className="preview-top">
            <div>
              <span>Bugünkü çalışma</span>
              <strong>6 aşamalı tekrar planı</strong>
            </div>

            <div className="preview-icon">🎯</div>
          </div>

          {PREVIEW_ITEMS.map((item) => (
            <div
              className={
                item.isActive
                  ? "preview-word-card active"
                  : "preview-word-card"
              }
              key={item.label}
            >
              <div>
                <span>{item.label}</span>
                <strong>{item.title}</strong>
              </div>

              <small>{item.action}</small>
            </div>
          ))}

          <div className="preview-progress">
            <div className="preview-progress-header">
              <span>Tekrar aşamaları</span>
              <strong>1 / 6</strong>
            </div>

            <div className="preview-progress-track">
              <div />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features">
        {FEATURES.map((feature) => (
          <article className="landing-feature-card" key={feature.title}>
            <div className="feature-icon">{feature.icon}</div>

            <h3>{feature.title}</h3>

            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="landing-how-it-works">
        <div className="section-title">
          <span>Nasıl çalışır?</span>
          <h2>Basit, düzenli ve takip edilebilir öğrenme akışı</h2>
        </div>

        <div className="landing-steps">
          {STEPS.map((step) => (
            <article className="landing-step-card" key={step.number}>
              <span>{step.number}</span>

              <h3>{step.title}</h3>

              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-extra-modules">
        <div>
          <span className="landing-pill">Ek çalışma modülleri</span>

          <h2>Bulmaca ve Word Chain ile öğrenmeyi güçlendir.</h2>

          <p>
            Öğrenilen kelimelerle bulmaca çözülebilir, seçilen kelimelerle
            hikaye ve görsel çalışmaları oluşturulabilir.
          </p>
        </div>

        <div className="extra-module-list">
          {EXTRA_MODULES.map((module) => (
            <div key={module.title}>
              <strong>{module.title}</strong>
              <span>{module.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <h2>Kelime çalışmalarını düzenli hale getirmeye hazır mısın?</h2>

        <p>
          Hesap oluşturarak kelime havuzunu oluşturabilir, quiz çözebilir ve
          öğrenme gelişimini takip edebilirsin.
        </p>

        <div className="landing-cta-actions">
          <Link to="/register" className="landing-primary-button">
            Kayıt Ol
          </Link>

          <Link to="/login" className="landing-secondary-button">
            Giriş Yap
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Landing;
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    setCurrentUser(null);
    navigate("/");
  };

  return (
    <div className="home-page">
      <header className="home-navbar">
        <Link to="/" className="home-logo">
          <span className="logo-icon">
            <span>6</span>
          </span>

          <span className="logo-text">
            <strong>Kelime Hafızam</strong>
            <small>6 tekrar ile öğren</small>
          </span>
        </Link>

        <nav className="home-nav-links">
          <a href="#features">Özellikler</a>
          <a href="#how-it-works">Nasıl Çalışır?</a>
          <a href="#modules">Modüller</a>
        </nav>

        <div className="home-auth-buttons">
          {currentUser ? (
            <div className="home-user-menu">
              <span className="home-user-greeting">
                Merhaba, {currentUser.username}
              </span>

              <button
                type="button"
                className="nav-logout-button"
                onClick={handleLogout}
              >
                Çıkış Yap
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="nav-login-button">
                Giriş Yap
              </Link>

              <Link to="/register" className="nav-register-button">
                Kayıt Ol
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-content">
            <span className="hero-badge">6 Sefer Tekrar Prensibi</span>

            <h1>
              Kelimeleri sadece ezberleme,{" "}
              <span>kalıcı olarak öğren.</span>
            </h1>

            <p>
              Kelime Hafızam, İngilizce kelimeleri düzenli tekrar sistemiyle
              öğrenmeni sağlayan bir kelime ezberleme uygulamasıdır. Sistem,
              doğru bildiğin kelimeleri belirli aralıklarla tekrar sorarak uzun
              süreli hafızaya yerleşmesini hedefler.
            </p>

            <div className="hero-buttons">
              {currentUser ? (
                <Link to="#modules" className="primary-button">
                  Öğrenmeye Devam Et
                </Link>
              ) : (
                <>
                  <Link to="/register" className="primary-button">
                    Hemen Başla
                  </Link>

                  <Link to="/login" className="secondary-button">
                    Hesabım Var
                  </Link>
                </>
              )}
            </div>

            <div className="hero-stats">
              <div>
                <strong>6</strong>
                <span>Tekrar Aşaması</span>
              </div>
              <div>
                <strong>10+</strong>
                <span>Günlük Kelime</span>
              </div>
              <div>
                <strong>%</strong>
                <span>Başarı Analizi</span>
              </div>
            </div>
          </div>

          <div className="hero-card">
            <div className="quiz-card-header">
              <span>Bugünkü tekrar</span>
              <strong>Quiz</strong>
            </div>

            <div className="word-card">
              <span className="word-label">İngilizce Kelime</span>
              <h2>Memory</h2>
              <p>Türkçe karşılığını seç</p>
            </div>

            <div className="answer-options">
              <button>Hafıza</button>
              <button>Kitap</button>
              <button>Kalem</button>
              <button>Okul</button>
            </div>

            <div className="progress-box">
              <div className="progress-info">
                <span>Tekrar ilerlemesi</span>
                <strong>3 / 6</strong>
              </div>

              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="features-section">
          <div className="section-title">
            <span>Öne Çıkanlar</span>
            <h2>Uygulama ne işe yarar?</h2>
          </div>

          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Kelime Ekleme</h3>
              <p>
                İngilizce kelime, Türkçe karşılık, örnek cümle ve görsel
                bilgisiyle kişisel kelime havuzu oluşturulur.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3>6 Tekrar Sistemi</h3>
              <p>
                Kullanıcı kelimeyi 6 farklı zamanda doğru bildikçe kelime
                öğrenilmiş kabul edilir.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analiz Raporu</h3>
              <p>
                Kullanıcı doğru, yanlış ve öğrenilen kelimeler üzerinden başarı
                durumunu takip edebilir.
              </p>
            </article>
          </div>
        </section>

        <section id="how-it-works" className="steps-section">
          <div className="section-title">
            <span>Akış</span>
            <h2>Nasıl çalışır?</h2>
          </div>

          <div className="steps-list">
            <div className="step-item">
              <span>01</span>
              <div>
                <h3>Hesabını oluştur</h3>
                <p>Kayıt ol ve kişisel kelime öğrenme alanına giriş yap.</p>
              </div>
            </div>

            <div className="step-item">
              <span>02</span>
              <div>
                <h3>Kelimeleri ekle</h3>
                <p>Öğrenmek istediğin kelimeleri örnek cümlelerle kaydet.</p>
              </div>
            </div>

            <div className="step-item">
              <span>03</span>
              <div>
                <h3>Quiz çöz</h3>
                <p>Sistem sana tekrar zamanı gelen kelimeleri sorar.</p>
              </div>
            </div>

            <div className="step-item">
              <span>04</span>
              <div>
                <h3>Gelişimini izle</h3>
                <p>Başarı yüzdelerini ve öğrendiğin kelimeleri raporda gör.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="modules" className="modules-section">
          <div className="section-title">
            <span>Proje Modülleri</span>
            <h2>Sprintlerde geliştirilecek ekranlar</h2>
          </div>

          <div className="modules-grid">
            <div className="module-card active">
              <h3>Giriş / Kayıt</h3>
              <p>Kullanıcı hesabı oluşturma, giriş yapma ve şifremi unuttum.</p>
            </div>

            <div className="module-card">
              <h3>Kelime Yönetimi</h3>
              <p>Kelime ekleme, listeleme ve örnek cümlelerle destekleme.</p>
            </div>

            <div className="module-card">
              <h3>Sınav Modülü</h3>
              <p>6 tekrar prensibine göre quiz sorularının hazırlanması.</p>
            </div>

            <div className="module-card">
              <h3>Ayarlar</h3>
              <p>Günlük yeni kelime sayısı gibi kullanıcı tercihleri.</p>
            </div>

            <div className="module-card">
              <h3>Analiz Raporu</h3>
              <p>Başarı oranı, öğrenilen kelimeler ve çıktı alınabilir rapor.</p>
            </div>

            <div className="module-card">
              <h3>Bulmaca / LLM</h3>
              <p>Wordle, hikaye ve görsel üretimi gibi ek proje özellikleri.</p>
            </div>
          </div>
        </section>

        <section className="cta-section">
          {currentUser ? (
            <>
              <h2>Hoş geldin, {currentUser.username}</h2>
              <p>
                Kelime öğrenme sürecine devam et, tekrarlarını tamamla ve
                gelişimini takip et.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Yukarı Dön
              </button>
            </>
          ) : (
            <>
              <h2>Kelime öğrenmeye bugün başla</h2>
              <p>
                Hesabını oluştur, kelimelerini ekle ve tekrar sistemiyle
                gelişimini takip et.
              </p>

              <Link to="/register" className="primary-button">
                Ücretsiz Kayıt Ol
              </Link>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default Home;
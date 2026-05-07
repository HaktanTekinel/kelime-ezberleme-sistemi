import { Link } from "react-router-dom";
import "./ModulePage.css";

function ModulePage({ title, description, icon, buttonText, buttonPath }) {
  return (
    <div className="module-page">
      <section className="module-hero-card">
        <div className="module-icon">{icon}</div>

        <div>
          <p>Kelime Hafızam Modülü</p>
          <h2>{title}</h2>
          <span>{description}</span>

          {buttonText && buttonPath && (
            <Link to={buttonPath} className="module-button">
              {buttonText}
            </Link>
          )}
        </div>
      </section>

      <section className="module-info-grid">
        <article>
          <h3>Durum</h3>
          <p>Bu modül uygulama paneline bağlandı.</p>
        </article>

        <article>
          <h3>Sonraki İşlem</h3>
          <p>Buraya ilgili form, liste veya rapor ekranı yerleştirilecek.</p>
        </article>

        <article>
          <h3>UI Notu</h3>
          <p>Sol menü yapısı sayesinde uygulama artık gerçek panel gibi çalışır.</p>
        </article>
      </section>
    </div>
  );
}

export default ModulePage;
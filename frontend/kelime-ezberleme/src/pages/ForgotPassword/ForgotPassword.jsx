import { useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/auth.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setMessage({ type: "error", text: "E-posta alanı boş bırakılamaz." });
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setMessage({
        type: "success",
        text: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.",
      });

      setEmail("");
      setLoading(false);
    }, 600);
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Şifremi Unuttum</h1>

        <p className="auth-subtitle">
          Hesabınıza bağlı e-posta adresini girin. Şifre sıfırlama adımlarını
          size gönderelim.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="E-posta adresinizi girin"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          {message.text && (
            <p className={`auth-message ${message.type}`}>{message.text}</p>
          )}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Giriş ekranına dön</Link>
        </div>
      </section>
    </main>
  );
}

export default ForgotPassword;
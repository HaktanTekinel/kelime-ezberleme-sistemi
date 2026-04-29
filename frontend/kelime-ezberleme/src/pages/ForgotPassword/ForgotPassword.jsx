import { useState } from "react";
import { Link } from "react-router-dom";
import { validateForgotPasswordForm } from "../../validations/authValidation";
import "../../styles/auth.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleEmailChange = (event) => {
    setEmail(event.target.value);

    if (errors.email) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        email: "",
      }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const formErrors = validateForgotPasswordForm(email);

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setMessage({ type: "", text: "" });
      return;
    }

    setLoading(true);
    setErrors({});
    setMessage({ type: "", text: "" });

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

        {message.text && (
          <p className={`auth-message ${message.type}`}>{message.text}</p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="E-posta adresinizi girin"
              value={email}
              onChange={handleEmailChange}
            />

            {errors.email && (
              <p className="auth-message error">{errors.email}</p>
            )}
          </div>

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
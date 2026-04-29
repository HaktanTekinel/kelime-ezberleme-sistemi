import { useState } from "react";
import { Link } from "react-router-dom";
import { registerAPI } from "../../services/authService";
import "../../styles/auth.css";

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      return "Kullanıcı adı boş bırakılamaz.";
    }

    if (!formData.email.trim()) {
      return "E-posta boş bırakılamaz.";
    }

    if (formData.password.length < 6) {
      return "Şifre en az 6 karakter olmalıdır.";
    }

    if (formData.password !== formData.confirmPassword) {
      return "Şifreler eşleşmiyor.";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      await registerAPI({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      setMessage({
        type: "success",
        text: "Kayıt başarılı. Giriş yapabilirsiniz.",
      });

      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Kayıt Ol</h1>

        <p className="auth-subtitle">
          Kelime ezberleme sistemine katılmak için hesabınızı oluşturun.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label htmlFor="username">Kullanıcı Adı</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Kullanıcı adınızı girin"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="email">E-posta</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="E-posta adresinizi girin"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="password">Şifre</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Şifrenizi girin"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="confirmPassword">Şifre Tekrar</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Şifrenizi tekrar girin"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
          </div>

          {message.text && (
            <p className={`auth-message ${message.type}`}>{message.text}</p>
          )}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
          </button>
        </form>

        <div className="auth-footer">
          <span>Zaten hesabınız var mı? </span>
          <Link to="/login">Giriş Yap</Link>
        </div>
      </section>
    </main>
  );
}

export default Register;
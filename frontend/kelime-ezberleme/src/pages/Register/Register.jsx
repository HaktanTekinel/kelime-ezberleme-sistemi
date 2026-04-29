import { useState } from "react";
import { Link } from "react-router-dom";
import { registerAPI } from "../../services/authService";
import { validateRegisterForm } from "../../validations/authValidation";
import "../../styles/auth.css";

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formErrors = validateRegisterForm(formData);

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setMessage({ type: "", text: "" });
      return;
    }

    setLoading(true);
    setErrors({});
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
        text: error.message || "Kayıt işlemi başarısız.",
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

        {message.text && (
          <p className={`auth-message ${message.type}`}>{message.text}</p>
        )}

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
            {errors.username && (
              <p className="auth-message error">{errors.username}</p>
            )}
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
            {errors.email && (
              <p className="auth-message error">{errors.email}</p>
            )}
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
            {errors.password && (
              <p className="auth-message error">{errors.password}</p>
            )}
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
            {errors.confirmPassword && (
              <p className="auth-message error">{errors.confirmPassword}</p>
            )}
          </div>

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
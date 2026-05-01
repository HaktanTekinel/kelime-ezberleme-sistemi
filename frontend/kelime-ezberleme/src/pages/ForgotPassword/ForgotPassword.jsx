import { useState } from "react";
import { Link } from "react-router-dom";
<<<<<<< HEAD
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
=======
import { updatePasswordAPI } from "../../services/authService";
import "../../styles/auth.css";

function ForgotPassword() {
  const [formData, setFormData] = useState({
    username: "",
    newPassword: "",
  });

  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

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

    if (formData.newPassword.length < 6) {
      return "Yeni şifre en az 6 karakter olmalıdır.";
    }

    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setMessage({ type: "error", text: validationError });
>>>>>>> origin/develop
      return;
    }

    setLoading(true);
<<<<<<< HEAD
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
=======
    setMessage({ type: "", text: "" });

    try {
      await updatePasswordAPI({
        username: formData.username,
        newPassword: formData.newPassword,
      });

      setMessage({
        type: "success",
        text: "Şifre başarıyla güncellendi. Giriş yapabilirsiniz.",
      });

      setFormData({
        username: "",
        newPassword: "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Şifre güncelleme işlemi başarısız.",
      });
    } finally {
      setLoading(false);
    }
>>>>>>> origin/develop
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Şifremi Unuttum</h1>

        <p className="auth-subtitle">
<<<<<<< HEAD
          Hesabınıza bağlı e-posta adresini girin. Şifre sıfırlama adımlarını
          size gönderelim.
=======
          Kullanıcı adınızı girerek yeni şifrenizi belirleyin.
>>>>>>> origin/develop
        </p>

        {message.text && (
          <p className={`auth-message ${message.type}`}>{message.text}</p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-group">
<<<<<<< HEAD
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
=======
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
            <label htmlFor="newPassword">Yeni Şifre</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="Yeni şifrenizi girin"
              value={formData.newPassword}
              onChange={handleChange}
            />
          </div>

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
>>>>>>> origin/develop
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
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { registerAPI } from "../../services/authService";
import { isValidEmail } from "../../validations/authValidation";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    setMessage({
      type: "",
      text: "",
    });
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      return "Kullanıcı adı boş bırakılamaz.";
    }

    if (formData.username.trim().length < 3) {
      return "Kullanıcı adı en az 3 karakter olmalıdır.";
    }

    if (!formData.email.trim()) {
      return "E-posta adresi boş bırakılamaz.";
    }

    if (!isValidEmail(formData.email.trim())) {
      return "Geçerli bir e-posta adresi giriniz.";
    }

    if (!formData.password) {
      return "Şifre boş bırakılamaz.";
    }

    if (formData.password.length < 6) {
      return "Şifre en az 6 karakter olmalıdır.";
    }

    if (!formData.confirmPassword) {
      return "Şifre tekrar alanı boş bırakılamaz.";
    }

    if (formData.password !== formData.confirmPassword) {
      return "Şifreler eşleşmiyor.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });
      return;
    }

    setLoading(true);
    setMessage({
      type: "",
      text: "",
    });

    try {
      await registerAPI({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      setMessage({
        type: "success",
        text: "Kayıt başarılı. Giriş ekranına yönlendiriliyorsunuz.",
      });

      setTimeout(() => {
        navigate("/login");
      }, 900);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "Kayıt oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Kayıt Ol"
      subtitle="Kelime öğrenme sürecini takip etmek için yeni bir hesap oluştur."
      footer={
        <>
          <span>Zaten hesabın var mı?</span>
          <Link to="/login">Giriş Yap</Link>
        </>
      }
    >
      {message.text && (
        <p className={`auth-message ${message.type}`}>{message.text}</p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-group">
          <label htmlFor="username">Kullanıcı Adı</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Kullanıcı adınızı girin"
            value={formData.username}
            onChange={handleChange}
            autoComplete="username"
          />
        </div>

        <div className="auth-form-group">
          <label htmlFor="email">E-posta Adresi</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="ornek@mail.com"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
          />
        </div>

        <div className="auth-form-group">
          <label htmlFor="password">Şifre</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="En az 6 karakter"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
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
            autoComplete="new-password"
          />
        </div>

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Register;
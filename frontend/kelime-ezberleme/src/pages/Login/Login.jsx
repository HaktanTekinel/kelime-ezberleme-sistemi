import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { loginAPI } from "../../services/authService";
import { saveAuthData } from "../../services/apiClient";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    username_or_email: "",
    password: "",
  });

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [loading, setLoading] = useState(false);

  const redirectPath = location.state?.from || "/home";

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
    if (!formData.username_or_email.trim()) {
      return "Kullanıcı adı veya e-posta alanı boş bırakılamaz.";
    }

    if (!formData.password) {
      return "Şifre alanı boş bırakılamaz.";
    }

    if (formData.password.length < 6) {
      return "Şifre en az 6 karakter olmalıdır.";
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
      const data = await loginAPI({
        username_or_email: formData.username_or_email.trim(),
        password: formData.password,
      });

      const authData = saveAuthData(data, formData.username_or_email.trim());

      if (!authData.token) {
        throw new Error("Giriş başarılı fakat erişim anahtarı alınamadı.");
      }

      navigate(redirectPath, { replace: true });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "Giriş yapılamadı. Kullanıcı bilgilerini kontrol edip tekrar deneyin.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Giriş Yap"
      subtitle="Kelime ezberleme sistemine devam etmek için hesabına giriş yap."
      footer={
        <>
          <Link to="/forgot-password">Şifremi Unuttum</Link>
          <span>·</span>
          <Link to="/register">Kayıt Ol</Link>
        </>
      }
    >
      {message.text && (
        <p className={`auth-message ${message.type}`}>{message.text}</p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-form-group">
          <label htmlFor="username_or_email">Kullanıcı Adı veya E-posta</label>
          <input
            id="username_or_email"
            name="username_or_email"
            type="text"
            placeholder="Kullanıcı adınızı veya e-postanızı girin"
            value={formData.username_or_email}
            onChange={handleChange}
            autoComplete="username"
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
            autoComplete="current-password"
          />
        </div>

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Login;
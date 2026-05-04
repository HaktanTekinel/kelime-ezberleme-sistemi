import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { loginAPI } from "../../services/authService";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username_or_email: "",
    password: "",
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
    if (!formData.username_or_email.trim()) {
      return "Kullanıcı adı veya e-posta boş bırakılamaz.";
    }

    if (!formData.password.trim()) {
      return "Şifre boş bırakılamaz.";
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
      const data = await loginAPI(formData);

      localStorage.setItem("token", data.access_token);

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...data,
          username: formData.username_or_email,
        })
      );

      setMessage({
        type: "success",
        text: "Giriş başarılı. Ana sayfaya yönlendiriliyorsunuz.",
      });

      setTimeout(() => {
        navigate("/");
      }, 700);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Giriş işlemi başarısız.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Giriş Yap"
      subtitle="Kelime ezberleme sistemine devam etmek için hesabınıza giriş yapın."
      footer={
        <>
          <Link to="/forgot-password">Şifremi Unuttum</Link>
          <span>|</span>
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

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Login;
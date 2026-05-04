import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { registerAPI } from "../../services/authService";

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
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
    if (!formData.username.trim()) {
      return "Kullanıcı adı boş bırakılamaz.";
    }

    if (!formData.email.trim()) {
      return "E-posta boş bırakılamaz.";
    }

    if (!formData.password.trim()) {
      return "Şifre boş bırakılamaz.";
    }

    if (formData.password.length < 6) {
      return "Şifre en az 6 karakter olmalıdır.";
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
      await registerAPI(formData);

      setMessage({
        type: "success",
        text: "Kayıt başarılı. Giriş yapabilirsiniz.",
      });

      setFormData({
        username: "",
        email: "",
        password: "",
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
    <AuthLayout
      title="Kayıt Ol"
      subtitle="Kelime öğrenme yolculuğuna başlamak için hesabınızı oluşturun."
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

        <button className="auth-button" type="submit" disabled={loading}>
          {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Register;
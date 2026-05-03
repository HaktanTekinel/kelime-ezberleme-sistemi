import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import { updatePasswordAPI } from "../../services/authService";

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
      return;
    }

    setLoading(true);
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
  };

  return (
    <AuthLayout
      title="Şifremi Unuttum"
      subtitle="Kullanıcı adınızı girerek yeni şifrenizi belirleyin."
      footer={<Link to="/login">Giriş ekranına dön</Link>}
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
        </button>
      </form>
    </AuthLayout>
  );
}

export default ForgotPassword;
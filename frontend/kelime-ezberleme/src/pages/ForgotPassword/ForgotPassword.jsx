import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import {
  forgotPasswordAPI,
  resetPasswordAPI,
} from "../../services/authService";
import { isValidEmail } from "../../validations/authValidation";

function getResetTokenFromResponse(data) {
  return (
    data?.reset_token ||
    data?.resetToken ||
    data?.token ||
    data?.password_reset_token ||
    ""
  );
}

function ForgotPassword() {
  const [step, setStep] = useState("email");

  const [formData, setFormData] = useState({
    email: "",
    resetToken: "",
    newPassword: "",
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

  const validateEmailStep = () => {
    if (!formData.email.trim()) {
      return "E-posta adresi boş bırakılamaz.";
    }

    if (!isValidEmail(formData.email.trim())) {
      return "Geçerli bir e-posta adresi giriniz.";
    }

    return "";
  };

  const validateResetStep = () => {
    if (!formData.resetToken.trim()) {
      return "Sıfırlama kodu boş bırakılamaz.";
    }

    if (!formData.newPassword) {
      return "Yeni şifre boş bırakılamaz.";
    }

    if (formData.newPassword.length < 6) {
      return "Yeni şifre en az 6 karakter olmalıdır.";
    }

    if (!formData.confirmPassword) {
      return "Yeni şifre tekrar alanı boş bırakılamaz.";
    }

    if (formData.newPassword !== formData.confirmPassword) {
      return "Şifreler eşleşmiyor.";
    }

    return "";
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateEmailStep();

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
      const data = await forgotPasswordAPI(formData.email.trim());
      const resetToken = getResetTokenFromResponse(data);

      setFormData((prevData) => ({
        ...prevData,
        resetToken,
      }));

      setStep("reset");

      setMessage({
        type: "success",
        text: resetToken
          ? "Sıfırlama kodu alındı. Yeni şifreni belirleyebilirsin."
          : "Sıfırlama kodu gönderildi. Kodu girerek yeni şifreni belirleyebilirsin.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "Sıfırlama işlemi başlatılamadı. Lütfen tekrar deneyin.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateResetStep();

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
      await resetPasswordAPI({
        resetToken: formData.resetToken.trim(),
        newPassword: formData.newPassword,
      });

      setMessage({
        type: "success",
        text: "Şifren başarıyla güncellendi. Giriş yapabilirsin.",
      });

      setFormData({
        email: "",
        resetToken: "",
        newPassword: "",
        confirmPassword: "",
      });

      setStep("completed");
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.message ||
          "Şifre güncellenemedi. Lütfen bilgileri kontrol edip tekrar deneyin.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep("email");
    setMessage({
      type: "",
      text: "",
    });

    setFormData((prevData) => ({
      ...prevData,
      resetToken: "",
      newPassword: "",
      confirmPassword: "",
    }));
  };

  return (
    <AuthLayout
      title="Şifremi Unuttum"
      subtitle={
        step === "email"
          ? "Hesabına ait e-posta adresini girerek şifre sıfırlama işlemini başlat."
          : step === "reset"
            ? "Sıfırlama kodunu ve yeni şifreni girerek hesabına yeniden eriş."
            : "Şifren güncellendi. Artık yeni şifrenle giriş yapabilirsin."
      }
      footer={<Link to="/login">Giriş ekranına dön</Link>}
    >
      {message.text && (
        <p className={`auth-message ${message.type}`}>{message.text}</p>
      )}

      {step === "email" && (
        <form className="auth-form" onSubmit={handleEmailSubmit}>
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

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Gönderiliyor..." : "Sıfırlama Kodu Al"}
          </button>
        </form>
      )}

      {step === "reset" && (
        <form className="auth-form" onSubmit={handleResetSubmit}>
          <div className="auth-form-group">
            <label htmlFor="resetToken">Sıfırlama Kodu</label>
            <input
              id="resetToken"
              name="resetToken"
              type="text"
              placeholder="Sıfırlama kodunu gir"
              value={formData.resetToken}
              onChange={handleChange}
              autoComplete="one-time-code"
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="newPassword">Yeni Şifre</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="Yeni şifreni gir"
              value={formData.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="confirmPassword">Yeni Şifre Tekrar</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Yeni şifreni tekrar gir"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </button>

          <button
            className="auth-secondary-button"
            type="button"
            onClick={handleBackToEmail}
            disabled={loading}
          >
            E-posta Adresini Değiştir
          </button>
        </form>
      )}

      {step === "completed" && (
        <div className="auth-completed-box">
          <div className="auth-completed-icon">✓</div>

          <h3>Şifre güncellendi</h3>

          <p>Yeni şifrenle giriş ekranından hesabına erişebilirsin.</p>

          <Link className="auth-completed-link" to="/login">
            Giriş Yap
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}

export default ForgotPassword;
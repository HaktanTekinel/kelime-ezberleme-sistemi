import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import {
  forgotPasswordAPI,
  resetPasswordAPI,
} from "../../services/authService";
import { isValidEmail } from "../../validations/authValidation";

const STEPS = {
  EMAIL: "email",
  RESET: "reset",
  COMPLETED: "completed",
};

const EMPTY_MESSAGE = {
  type: "",
  text: "",
};

const EMPTY_FORM_DATA = {
  email: "",
  resetToken: "",
  newPassword: "",
  confirmPassword: "",
};

const STEP_SUBTITLES = {
  [STEPS.EMAIL]:
    "Hesabına ait e-posta adresini girerek şifre sıfırlama işlemini başlat.",
  [STEPS.RESET]:
    "Sıfırlama kodunu ve yeni şifreni girerek hesabına yeniden eriş.",
  [STEPS.COMPLETED]:
    "Şifren güncellendi. Artık yeni şifrenle giriş yapabilirsin.",
};

function getResetTokenFromResponse(data) {
  return (
    data?.reset_token ||
    data?.resetToken ||
    data?.token ||
    data?.password_reset_token ||
    ""
  );
}

function getStepSubtitle(step) {
  return STEP_SUBTITLES[step] || STEP_SUBTITLES[STEPS.EMAIL];
}

function getResetCodeSuccessMessage(resetToken) {
  if (resetToken) {
    return "Sıfırlama kodu alındı. Yeni şifreni belirleyebilirsin.";
  }

  return "Sıfırlama kodu gönderildi. Kodu girerek yeni şifreni belirleyebilirsin.";
}

function validateEmailStep(email) {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return "E-posta adresi boş bırakılamaz.";
  }

  if (!isValidEmail(trimmedEmail)) {
    return "Geçerli bir e-posta adresi giriniz.";
  }

  return "";
}

function validateResetStep({ resetToken, newPassword, confirmPassword }) {
  if (!resetToken.trim()) {
    return "Sıfırlama kodu boş bırakılamaz.";
  }

  if (!newPassword) {
    return "Yeni şifre boş bırakılamaz.";
  }

  if (newPassword.length < 6) {
    return "Yeni şifre en az 6 karakter olmalıdır.";
  }

  if (!confirmPassword) {
    return "Yeni şifre tekrar alanı boş bırakılamaz.";
  }

  if (newPassword !== confirmPassword) {
    return "Şifreler eşleşmiyor.";
  }

  return "";
}

function ForgotPassword() {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [formData, setFormData] = useState(EMPTY_FORM_DATA);
  const [message, setMessage] = useState(EMPTY_MESSAGE);
  const [loading, setLoading] = useState(false);

  const clearMessage = () => {
    setMessage(EMPTY_MESSAGE);
  };

  const showError = (text) => {
    setMessage({
      type: "error",
      text,
    });
  };

  const showSuccess = (text) => {
    setMessage({
      type: "success",
      text,
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    clearMessage();
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateEmailStep(formData.email);

    if (validationError) {
      showError(validationError);
      return;
    }

    setLoading(true);
    clearMessage();

    try {
      const data = await forgotPasswordAPI(formData.email.trim());
      const resetToken = getResetTokenFromResponse(data);

      setFormData((prevData) => ({
        ...prevData,
        resetToken,
      }));

      setStep(STEPS.RESET);
      showSuccess(getResetCodeSuccessMessage(resetToken));
    } catch (error) {
      showError(
        error.message ||
          "Sıfırlama işlemi başlatılamadı. Lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateResetStep(formData);

    if (validationError) {
      showError(validationError);
      return;
    }

    setLoading(true);
    clearMessage();

    try {
      await resetPasswordAPI({
        resetToken: formData.resetToken.trim(),
        newPassword: formData.newPassword,
      });

      showSuccess("Şifren başarıyla güncellendi. Giriş yapabilirsin.");
      setFormData(EMPTY_FORM_DATA);
      setStep(STEPS.COMPLETED);
    } catch (error) {
      showError(
        error.message ||
          "Şifre güncellenemedi. Lütfen bilgileri kontrol edip tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep(STEPS.EMAIL);
    clearMessage();

    setFormData((prevData) => ({
      ...prevData,
      resetToken: "",
      newPassword: "",
      confirmPassword: "",
    }));
  };

  const renderEmailForm = () => (
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
  );

  const renderResetForm = () => (
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
  );

  const renderCompletedBox = () => (
    <div className="auth-completed-box">
      <div className="auth-completed-icon">✓</div>

      <h3>Şifre güncellendi</h3>

      <p>Yeni şifrenle giriş ekranından hesabına erişebilirsin.</p>

      <Link className="auth-completed-link" to="/login">
        Giriş Yap
      </Link>
    </div>
  );

  const renderStepContent = () => {
    if (step === STEPS.EMAIL) {
      return renderEmailForm();
    }

    if (step === STEPS.RESET) {
      return renderResetForm();
    }

    return renderCompletedBox();
  };

  return (
    <AuthLayout
      title="Şifremi Unuttum"
      subtitle={getStepSubtitle(step)}
      footer={<Link to="/login">Giriş ekranına dön</Link>}
    >
      {message.text && (
        <p className={`auth-message ${message.type}`}>{message.text}</p>
      )}

      {renderStepContent()}
    </AuthLayout>
  );
}

export default ForgotPassword;
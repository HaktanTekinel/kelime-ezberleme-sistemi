import { useState } from "react";
import { Link } from "react-router-dom";
import InputField from "../../components/InputField";
import { loginAPI } from "../../services/authService";
import { validateLoginForm } from "../../validations/authValidation";
import "../../styles/auth.css";

function Login() {
  const [formData, setFormData] = useState({
    userName: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event, fieldName) => {
    setFormData((prevData) => ({
      ...prevData,
      [fieldName]: event.target.value,
    }));

    if (errors[fieldName]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [fieldName]: "",
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setApiError("");

    const formErrors = validateLoginForm(formData);

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);

    try {
      const data = await loginAPI(formData.userName, formData.password);
      console.log("Giriş başarılı:", data);
      alert("Sisteme başarıyla giriş yapıldı!");
    } catch (error) {
      setApiError(error.message || "Giriş işlemi başarısız.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Giriş Yap</h1>

        <p className="auth-subtitle">
          Kelime ezberleme sistemine devam etmek için hesabınıza giriş yapın.
        </p>

        {apiError && <p className="auth-message error">{apiError}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <InputField
            label="Kullanıcı Adı"
            type="text"
            value={formData.userName}
            onChange={(event) => handleChange(event, "userName")}
            placeholder="Kullanıcı adınızı girin"
            error={errors.userName}
          />

          <InputField
            label="Şifre"
            type="password"
            value={formData.password}
            onChange={(event) => handleChange(event, "password")}
            placeholder="Şifrenizi girin"
            error={errors.password}
          />

          <button className="auth-button" type="submit" disabled={isLoading}>
            {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <div className="auth-footer auth-footer-between">
          <Link to="/forgot-password">Şifremi Unuttum</Link>
          <Link to="/register">Kayıt Ol</Link>
        </div>
      </section>
    </main>
  );
}

export default Login;
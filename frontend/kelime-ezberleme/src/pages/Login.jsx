// src/pages/Login.jsx
import React, { useState } from 'react';
import InputField from '../components/InputField';
import { loginAPI } from '../services/authService';
import './Login.css'; // Ayrı CSS dosyamızı buraya bağladık!

const Login = () => {
  const [formData, setFormData] = useState({ userName: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e, fieldName) => {
    setFormData({ ...formData, [fieldName]: e.target.value });
    if (errors[fieldName]) {
      setErrors({ ...errors, [fieldName]: null });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.userName.trim()) newErrors.userName = 'Kullanıcı adı gerekli.';
    if (!formData.password) newErrors.password = 'Şifre gerekli.';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    
    const formErrors = validate();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    try {
      const data = await loginAPI(formData.userName, formData.password);
      console.log('Giriş başarılı:', data);
      alert('Sisteme başarıyla giriş yapıldı!');
    } catch (error) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Giriş Yap</h2>
        
        {apiError && <div className="api-error">{apiError}</div>}

        <form onSubmit={handleSubmit}>
          <InputField
            label="Kullanıcı Adı"
            type="text"
            value={formData.userName}
            onChange={(e) => handleChange(e, 'userName')}
            placeholder="Kullanıcı adınızı girin"
            error={errors.userName}
          />

          <InputField
            label="Şifre"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange(e, 'password')}
            placeholder="Şifrenizi girin"
            error={errors.password}
          />

          <button 
            type="submit" 
            disabled={isLoading}
            className="login-button"
          >
            {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="login-links">
          <a href="/forgot-password">Şifremi Unuttum</a>
          <a href="/register">Kayıt Ol</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
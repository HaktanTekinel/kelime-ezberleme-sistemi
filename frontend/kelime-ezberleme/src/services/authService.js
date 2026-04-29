// src/services/authService.js

// Vite projelerinde çevre değişkenleri (environment variables) import.meta.env üzerinden okunur.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const loginAPI = async (userName, password) => {
  // FastAPI varsayılan olarak JSON veya OAuth2 form data bekleyebilir. 
  // Burada temiz bir JSON gönderimi (KISS prensibi) tasarlanmıştır.
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userName, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Kullanıcı adı veya şifre hatalı.');
  }

  return response.json();
};
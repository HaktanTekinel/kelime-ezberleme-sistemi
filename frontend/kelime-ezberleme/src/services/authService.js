import { API_BASE_URL, handleResponse } from "./apiClient";

export const registerAPI = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  return handleResponse(response);
};

export const loginAPI = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  return handleResponse(response);
};

/*
  Eski ForgotPassword.jsx bu fonksiyonu kullandığı için bırakıyoruz.
  Backend tarafı farklı çalışıyorsa sadece bu sayfa hata verir,
  ama site komple beyaz ekran olmaz.
*/
export const updatePasswordAPI = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reset_token: formData.reset_token || formData.resetToken || "",
      new_password: formData.newPassword || formData.new_password || "",
    }),
  });

  return handleResponse(response);
};

export const forgotPasswordAPI = async (email) => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return handleResponse(response);
};

export const resetPasswordAPI = async (resetToken, newPassword) => {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reset_token: resetToken,
      new_password: newPassword,
    }),
  });

  return handleResponse(response);
};

export const logoutAPI = async () => {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
  });

  return handleResponse(response);
};
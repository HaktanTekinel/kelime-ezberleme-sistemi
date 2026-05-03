const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const getErrorMessage = (data, fallbackMessage) => {
  if (!data) {
    return fallbackMessage;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((error) => error.msg || "Geçersiz alan")
      .join(", ");
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return fallbackMessage;
};

const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, "Bir hata oluştu."));
  }

  return data;
};

export const registerAPI = async ({ username, email, password }) => {
  return request("/register", {
    method: "POST",
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });
};

export const loginAPI = async ({ username_or_email, password }) => {
  return request("/login", {
    method: "POST",
    body: JSON.stringify({
      username_or_email,
      password,
    }),
  });
};

export const updatePasswordAPI = async ({ username, newPassword }) => {
  return request("/forgot-password", {
    method: "PUT",
    body: JSON.stringify({
      username,
      new_password: newPassword,
    }),
  });
};
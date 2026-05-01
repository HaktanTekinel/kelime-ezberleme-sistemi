const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "Bir hata oluştu.");
  }

  return data;
}

export function registerAPI({ username, email, password }) {
  return request("/register", {
    method: "POST",
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });
}

export function loginAPI(usernameOrEmail, password) {
  return request("/login", {
    method: "POST",
    body: JSON.stringify({
      username_or_email: usernameOrEmail,
      password,
    }),
  });
}

export function updatePasswordAPI({ username, newPassword }) {
  return request("/forgot-password", {
    method: "PUT",
    body: JSON.stringify({
      username,
      new_password: newPassword,
    }),
  });
}
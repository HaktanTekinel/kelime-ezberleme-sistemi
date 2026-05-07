export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const getAuthToken = () => {
  return localStorage.getItem("token") || localStorage.getItem("access_token");
};

export const getAuthHeaders = () => {
  const token = getAuthToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const saveAuthData = (loginData, fallbackUsername = "") => {
  const token =
    loginData?.access_token ||
    loginData?.accessToken ||
    loginData?.token ||
    "";

  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("access_token", token);
  }

  const userData = loginData?.user || {
    id: loginData?.user_id || loginData?.userId || "",
    username:
      loginData?.username ||
      loginData?.user_name ||
      loginData?.userName ||
      fallbackUsername ||
      "Öğrenci",
    email: loginData?.email || "",
  };

  localStorage.setItem("user", JSON.stringify(userData));
  localStorage.setItem("username", userData.username || "Öğrenci");

  return {
    token,
    user: userData,
  };
};

export const clearAuthData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  localStorage.removeItem("username");
  localStorage.removeItem("userName");
};

export const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type");

  let data = null;

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    const errorMessage =
      data?.detail ||
      data?.message ||
      data?.error ||
      "İşlem sırasında bir hata oluştu.";

    throw new Error(errorMessage);
  }

  return data;
};
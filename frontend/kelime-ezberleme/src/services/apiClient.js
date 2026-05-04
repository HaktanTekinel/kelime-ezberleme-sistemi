export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const getAuthToken = () => {
  const token = localStorage.getItem("token");

  if (token) {
    return token;
  }

  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return "";
  }

  try {
    const parsedUser = JSON.parse(storedUser);
    return parsedUser?.access_token || "";
  } catch {
    return "";
  }
};

export const getAuthHeaders = () => {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Bu işlem için önce giriş yapmalısınız.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

export const handleResponse = async (response) => {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "İşlem başarısız.");
  }

  return data;
};
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

export function getWordsAPI() {
  return request("/words");
}

export function createWordAPI(wordData) {
  return request("/words", {
    method: "POST",
    body: JSON.stringify(wordData),
  });
}
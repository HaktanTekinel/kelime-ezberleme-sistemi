const API_URL = import.meta.env.VITE_API_URL;

export async function getWordsAPI() {
  const response = await fetch(`${API_URL}/words`);

  if (!response.ok) {
    throw new Error("Kelimeler getirilemedi.");
  }

  return response.json();
}

export async function createWordAPI(wordData) {
  const response = await fetch(`${API_URL}/words`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(wordData),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Kelime eklenemedi.");
  }

  return response.json();
}

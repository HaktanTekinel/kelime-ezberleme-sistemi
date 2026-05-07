import { API_BASE_URL, getAuthHeaders, handleResponse } from "./apiClient";

export const generateWordChainStoryAPI = async (words) => {
  const response = await fetch(`${API_BASE_URL}/word-chain/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      words,
    }),
  });

  return handleResponse(response);
};

export const getWordChainHistoryAPI = async () => {
  const response = await fetch(`${API_BASE_URL}/word-chain/history`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response);
};
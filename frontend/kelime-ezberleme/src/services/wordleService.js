import { API_BASE_URL, getAuthHeaders, handleResponse } from "./apiClient";

export const startWordleGameAPI = async ({
  restart = false,
  wordLength = null,
} = {}) => {
  const response = await fetch(`${API_BASE_URL}/wordle/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      restart,
      word_length: wordLength,
    }),
  });

  return handleResponse(response);
};

export const getCurrentWordleGameAPI = async () => {
  const response = await fetch(`${API_BASE_URL}/wordle/current`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response);
};

export const getWordleHistoryAPI = async () => {
  const response = await fetch(`${API_BASE_URL}/wordle/history`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response);
};

export const submitWordleGuessAPI = async ({ gameId, guess }) => {
  const response = await fetch(`${API_BASE_URL}/wordle/guess`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      game_id: gameId,
      guess,
    }),
  });

  return handleResponse(response);
};
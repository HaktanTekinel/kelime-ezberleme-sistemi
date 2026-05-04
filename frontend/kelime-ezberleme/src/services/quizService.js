import { API_BASE_URL, getAuthHeaders, handleResponse } from "./apiClient";

export const getDailyQuizAPI = async () => {
  const response = await fetch(`${API_BASE_URL}/quiz/daily`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response);
};

export const submitQuizAnswerAPI = async ({ word_id, selected_answer }) => {
  const response = await fetch(`${API_BASE_URL}/quiz/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      word_id,
      selected_answer,
    }),
  });

  return handleResponse(response);
};
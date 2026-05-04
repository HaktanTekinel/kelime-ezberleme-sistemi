import { API_BASE_URL, getAuthHeaders, handleResponse } from "./apiClient";

export const listWordsAPI = async () => {
  const response = await fetch(`${API_BASE_URL}/words`, {
    method: "GET",
  });

  return handleResponse(response);
};

export const getWordByIdAPI = async (wordId) => {
  const response = await fetch(`${API_BASE_URL}/words/${wordId}`, {
    method: "GET",
  });

  return handleResponse(response);
};

export const createWordAPI = async (wordData) => {
  const response = await fetch(`${API_BASE_URL}/words`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(wordData),
  });

  return handleResponse(response);
};

export const updateWordAPI = async (wordId, wordData) => {
  const response = await fetch(`${API_BASE_URL}/words/${wordId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(wordData),
  });

  return handleResponse(response);
};

export const deleteWordAPI = async (wordId) => {
  const response = await fetch(`${API_BASE_URL}/words/${wordId}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response);
};

export const uploadWordImageAPI = async (wordId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/words/${wordId}/image`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  return handleResponse(response);
};

export { API_BASE_URL };
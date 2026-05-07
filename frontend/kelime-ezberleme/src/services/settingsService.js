import { API_BASE_URL, getAuthHeaders, handleResponse } from "./apiClient";

export const getUserSettingsAPI = async () => {
  const response = await fetch(`${API_BASE_URL}/users/me/settings`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response);
};

export const updateUserSettingsAPI = async (settingsData) => {
  const response = await fetch(`${API_BASE_URL}/users/me/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(settingsData),
  });

  return handleResponse(response);
};
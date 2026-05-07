import { API_BASE_URL, getAuthHeaders, handleResponse } from "./apiClient";

export const getDashboardSummaryAPI = async () => {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response);
};
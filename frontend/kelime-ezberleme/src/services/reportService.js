import { API_BASE_URL, getAuthHeaders, handleResponse } from "./apiClient";

async function requestReport(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    response,
  };
}

export const getUserReportAPI = async () => {
  const primaryRequest = await requestReport("/reports/me");

  if (primaryRequest.ok) {
    return handleResponse(primaryRequest.response);
  }

  if (primaryRequest.status === 404 || primaryRequest.status === 405) {
    const fallbackRequest = await requestReport("/users/me/stats");

    if (fallbackRequest.ok) {
      return handleResponse(fallbackRequest.response);
    }

    return handleResponse(fallbackRequest.response);
  }

  return handleResponse(primaryRequest.response);
};
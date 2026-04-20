const API_URL = "http://localhost:4000/api/v1";
const STORAGE_KEY = "ai-health-auth";

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    return parsed.token || null;
  } catch (error) {
    return null;
  }
}

function buildHeaders(token, isJsonRequest = true) {
  const headers = {};

  if (isJsonRequest) {
    headers["Content-Type"] = "application/json";
  }

  const authToken = token || getStoredToken();

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

function normalizeErrorMessage(error, fallbackMessage = "Request failed") {
  if (error?.name === "TypeError") {
    return "Failed to fetch. Make sure the backend server is running.";
  }

  return error?.message || fallbackMessage;
}

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: buildHeaders(token),
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.message || "Request failed");
    }

    return data;
  } catch (error) {
    throw new Error(normalizeErrorMessage(error));
  }
}

export async function downloadFile(path, { token, filename = "download" } = {}) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "GET",
      headers: buildHeaders(token, false),
      cache: "no-store",
    });

    if (!response.ok) {
      let data = null;

      try {
        data = await response.json();
      } catch (error) {
        data = null;
      }

      throw new Error(data?.message || "Download failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error(normalizeErrorMessage(error, "Download failed"));
  }
}

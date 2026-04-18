import { apiClient } from "./apiClient";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const eventService = {
  list: () => apiClient.get("/events"),
  getById: (eventId) => apiClient.get(`/events/${eventId}`),
  create: (payload) => apiClient.post("/events", payload),
  update: (eventId, payload) => apiClient.put(`/events/${eventId}`, payload),
  close: (eventId) => apiClient.put(`/events/${eventId}/close`),
  reopen: (eventId) => apiClient.put(`/events/${eventId}/reopen`),
  uploadPoster: async (file) => {
    const token = localStorage.getItem("auth_token");
    const fileType = String(file?.type || "").trim() || "application/octet-stream";
    const safeFileName = encodeURIComponent(String(file?.name || "poster-upload"));
    const response = await fetch(`${BASE_URL}/events/poster-upload`, {
      method: "POST",
      headers: {
        "Content-Type": fileType,
        "X-File-Name": safeFileName,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        typeof data === "object" && data !== null
          ? data.message || data.error || "Upload failed"
          : "Upload failed";

      throw new Error(message);
    }

    return data;
  },
};

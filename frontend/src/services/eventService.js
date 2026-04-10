import { apiClient } from "./apiClient";

export const eventService = {
  list: () => apiClient.get("/events"),
  create: (payload) => apiClient.post("/events", payload),
  update: (eventId, payload) => apiClient.put(`/events/${eventId}`, payload),
};

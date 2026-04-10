import { apiClient } from "./apiClient";

export const organizerService = {
  listEvents: () => apiClient.get("/organizer/events"),
  getEventTickets: (eventId) => apiClient.get(`/organizer/events/${eventId}/tickets`),
  getEventCheckins: (eventId) => apiClient.get(`/organizer/events/${eventId}/checkins`),
};

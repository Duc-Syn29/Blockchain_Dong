import { apiClient } from "./apiClient";

export const ticketService = {
  buy: (eventId) => apiClient.post("/tickets/buy", { eventId }),
  getMine: () => apiClient.get("/tickets/my"),
};

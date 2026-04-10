import { apiClient } from "./apiClient";

export const ticketService = {
  buy: (eventId, quantity = 1) => apiClient.post("/tickets/buy", { eventId, quantity }),
  getMine: () => apiClient.get("/tickets/my"),
  checkIn: (tokenId) => apiClient.post("/tickets/check-in", { tokenId }),
};

import { apiClient } from "./apiClient";

export const ticketService = {
  buy: (eventId, quantity = 1, ticketPin = "") =>
    apiClient.post("/tickets/buy", { eventId, quantity, ticketPin }),
  getMine: () => apiClient.get("/tickets/my"),
  checkIn: (tokenId, ticketPin = "") => apiClient.post("/tickets/check-in", { tokenId, ticketPin }),
};

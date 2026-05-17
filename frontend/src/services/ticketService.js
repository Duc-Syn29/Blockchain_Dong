import { apiClient } from "./apiClient";

export const ticketService = {
  quote: (eventId, quantity = 1) => apiClient.post("/tickets/quote", { eventId, quantity }),
  buy: (eventId, quantity = 1, ticketPin = "", paymentTransactionHash = "") =>
    apiClient.post("/tickets/buy", { eventId, quantity, ticketPin, paymentTransactionHash }),
  getMine: () => apiClient.get("/tickets/my"),
  checkIn: (tokenId) => apiClient.post("/tickets/check-in", { tokenId }),
};

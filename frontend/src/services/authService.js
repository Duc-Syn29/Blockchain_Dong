import { apiClient } from "./apiClient";
import { getStoredToken } from "../utils/storage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const authService = {
  register: (payload) => apiClient.post("/auth/register", payload),
  login: (payload) => apiClient.post("/auth/login", payload),
  me: () => apiClient.get("/auth/me"),
  updateProfile: (payload) => apiClient.put("/auth/profile", payload),
  updateTicketPin: (payload) => apiClient.put("/auth/ticket-pin", payload),
  verifyTicketPin: (payload) => apiClient.post("/auth/ticket-pin/verify", payload),
  getOrganizerSettings: () => apiClient.get("/auth/organizer-settings"),
  updateOrganizerSettings: (payload) => apiClient.put("/auth/organizer-settings", payload),
  linkWallet: (payload) => apiClient.post("/auth/link-wallet", payload),
  uploadAvatar: async (file) => {
    const token = getStoredToken();
    const response = await fetch(`${BASE_URL}/auth/avatar-upload`, {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "X-File-Name": file.name,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: file,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || "Không thể tải ảnh đại diện");
    }

    return payload;
  },
};

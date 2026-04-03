import { apiClient } from "./apiClient";

export const authService = {
  register: (payload) => apiClient.post("/auth/register", payload),
  login: (payload) => apiClient.post("/auth/login", payload),
  me: () => apiClient.get("/auth/me"),
  updateProfile: (payload) => apiClient.put("/auth/profile", payload),
};

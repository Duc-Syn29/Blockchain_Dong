import { createContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  storeAuth,
} from "../utils/storage";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      clearStoredAuth();
    }
  }, [token, user]);

  const login = async (credentials) => {
    setIsLoading(true);

    try {
      const response = await authService.login(credentials);
      const nextToken = response.token;
      const nextUser = response.user;

      storeAuth(nextToken, nextUser);
      setToken(nextToken);
      setUser(nextUser);

      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload) => {
    setIsLoading(true);

    try {
      return await authService.register(payload);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isLoading,
      login,
      register,
      logout,
    }),
    [token, user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

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
  const [isBootstrapping, setIsBootstrapping] = useState(() => Boolean(getStoredToken()));

  useEffect(() => {
    if (!token) {
      clearStoredAuth();
      setUser(null);
      setIsBootstrapping(false);
      return;
    }

    let isCancelled = false;

    const syncCurrentUser = async () => {
      setIsBootstrapping(true);

      try {
        const response = await authService.me();

        if (isCancelled) {
          return;
        }

        setUser(response.user);
        storeAuth(token, response.user);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        clearStoredAuth();
        setToken(null);
        setUser(null);
      } finally {
        if (!isCancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    syncCurrentUser();

    return () => {
      isCancelled = true;
    };
  }, [token]);

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

  const updateProfile = async (payload) => {
    setIsLoading(true);

    try {
      const response = await authService.updateProfile(payload);
      setUser(response.user);

      if (token) {
        storeAuth(token, response.user);
      }

      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const linkWallet = async (payload) => {
    setIsLoading(true);

    try {
      const response = await authService.linkWallet(payload);
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
      isAuthReady: !isBootstrapping,
      login,
      register,
      updateProfile,
      linkWallet,
      logout,
    }),
    [token, user, isLoading, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

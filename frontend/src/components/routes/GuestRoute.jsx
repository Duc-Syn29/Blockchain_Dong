import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function GuestRoute({ children }) {
  const { isAuthenticated, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return <div className="page-feedback">Đang tải tài khoản...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/profile" replace />;
  }

  return children;
}

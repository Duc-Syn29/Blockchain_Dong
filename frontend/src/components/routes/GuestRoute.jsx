import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/profile" replace />;
  }

  return children;
}

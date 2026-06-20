import { Route, Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  return children;
}

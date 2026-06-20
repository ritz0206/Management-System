import { Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import HomePage from "../features/home/pages/HomePage";

export const homeRoutes = [
  <Route
    path="/home"
    element={
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    }
  />,
];

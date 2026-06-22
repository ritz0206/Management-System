import { Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../shared/layout/MainLayout";
import HomePage from "../features/home/pages/HomePage";

export const homeRoutes = [
  <Route
    key="home"
    path="/home"
    element={
      <ProtectedRoute>
        <MainLayout>
          <HomePage />
        </MainLayout>
      </ProtectedRoute>
    }
  />,
];

import {Routes, Route} from "react-router-dom";
import HomePage from "../features/home/pages";

export const homeRoutes = [
  <Route path="/home" element={
  <ProtectedRoute>
    <HomePage />
  </ProtectedRoute>
  }
/>
];
import { loginUser, signupUser } from "../services/authApi.js";

export function useAuth() {
  const handleLogin = async (email, password) => {
    const response = await loginUser({ email, password });
    const token = response.data.token;
    localStorage.setItem("token", token);
    return response.data;
  };

  const handleSignup = async (name, email, password) => {
    const response = await signupUser({ name, email, password });
    return response.data;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem("token");
  };

  return {
    handleLogin,
    handleSignup,
    handleLogout,
    isAuthenticated,
  };
}

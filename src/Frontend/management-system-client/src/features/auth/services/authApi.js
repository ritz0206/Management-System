import axios from "axios";

const API_URL = "/api/auth";

export const loginUser = async (credentials) => {
  return await axios.post(`${API_URL}/login`, credentials);
};

export const signupUser = async (userData) => {
  return await axios.post(`${API_URL}/signup`, userData);
};

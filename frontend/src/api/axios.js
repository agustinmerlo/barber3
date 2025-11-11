import axios from "axios";
const api = axios.create({ baseURL: "http://localhost:8000" }); // ajusta si corresponde
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // o el nombre que uses
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});
export default api;

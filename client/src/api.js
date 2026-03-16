import axios from 'axios';

// Resolve backend base URL for all environments
// - Production (Vercel): VITE_API_URL (e.g. https://billing-system-sevvel.onrender.com)
// - Local dev: optionally VITE_API_URL or VITE_API_BASE_URL, else fallback to localhost
export const API_ROOT =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000';

const API = axios.create({
  baseURL: `${API_ROOT}/api`,
});

export default API;

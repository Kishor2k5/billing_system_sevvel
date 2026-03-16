import axios from 'axios';

// Prefer VITE_API_URL (used in Vercel), but fall back to VITE_API_BASE_URL or localhost
const RAW_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000';

const API = axios.create({
  baseURL: `${RAW_BASE_URL}/api`,
});

export default API;

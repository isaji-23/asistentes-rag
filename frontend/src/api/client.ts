import axios from 'axios';

const baseURL = import.meta.env['VITE_API_BASE_URL'] as string ?? 'http://localhost:8000';

export const client = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export { baseURL };

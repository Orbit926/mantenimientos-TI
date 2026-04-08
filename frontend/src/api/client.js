import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.non_field_errors?.[0] ||
      Object.values(err.response?.data || {})[0]?.[0] ||
      'Error inesperado. Intenta de nuevo.';
    return Promise.reject(new Error(message));
  }
);

export default client;

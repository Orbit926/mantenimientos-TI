import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inject access token on every request
client.interceptors.request.use((config) => {
  const access = localStorage.getItem('access');
  if (access) {
    config.headers['Authorization'] = `Bearer ${access}`;
  }
  return config;
});

let _refreshing = null; // deduplicate concurrent refresh calls

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        if (!_refreshing) {
          _refreshing = (async () => {
            const refresh = localStorage.getItem('refresh');
            if (!refresh) throw new Error('No refresh token');
            const { data } = await axios.post('/api/auth/refresh/', { refresh });
            localStorage.setItem('access', data.access);
            if (data.refresh) localStorage.setItem('refresh', data.refresh);
            return data.access;
          })().finally(() => { _refreshing = null; });
        }
        const newAccess = await _refreshing;
        original.headers['Authorization'] = `Bearer ${newAccess}`;
        return client(original);
      } catch {
        const hadSession = !!localStorage.getItem('access') || !!localStorage.getItem('refresh');
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        if (hadSession) window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    if (err.response?.status === 413) {
      const error413 = new Error('El archivo es demasiado grande. El límite máximo es 15 MB.');
      return Promise.reject(error413);
    }

    const message =
      err.response?.data?.detail ||
      err.response?.data?.non_field_errors?.[0] ||
      Object.values(err.response?.data || {})[0]?.[0] ||
      'Error inesperado. Intenta de nuevo.';
    const error = new Error(message);
    error.responseData = err.response?.data;
    error.status = err.response?.status;
    return Promise.reject(error);
  }
);

export default client;

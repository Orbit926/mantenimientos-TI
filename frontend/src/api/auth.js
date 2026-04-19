import client from './client';

const KEYS = { access: 'access', refresh: 'refresh' };

export const setTokens = ({ access, refresh }) => {
  localStorage.setItem(KEYS.access, access);
  if (refresh) localStorage.setItem(KEYS.refresh, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(KEYS.access);
  localStorage.removeItem(KEYS.refresh);
};

export const getAccessToken = () => localStorage.getItem(KEYS.access);
export const getRefreshToken = () => localStorage.getItem(KEYS.refresh);

export const login = async (username, password) => {
  const { data } = await client.post('/auth/login/', { username, password });
  setTokens({ access: data.access, refresh: data.refresh });
  return data.user;
};

export const logout = async () => {
  const refresh = getRefreshToken();
  if (refresh) {
    try {
      await client.post('/auth/logout/', { refresh });
    } catch {
      // Ignorar errores — el token ya puede estar expirado
    }
  }
  clearTokens();
};

export const refreshAccessToken = async () => {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error('No refresh token');
  const { data } = await client.post('/auth/refresh/', { refresh });
  localStorage.setItem(KEYS.access, data.access);
  if (data.refresh) localStorage.setItem(KEYS.refresh, data.refresh);
  return data.access;
};

export const me = async () => {
  const { data } = await client.get('/auth/me/');
  return data;
};

import client from '../api/client';

export const equiposService = {
  list: (params = {}) => client.get('/equipos/', { params }).then(r => r.data),
  get: (id) => client.get(`/equipos/${id}/`).then(r => r.data),
  create: (data) => client.post('/equipos/', data).then(r => r.data),
  update: (id, data) => client.patch(`/equipos/${id}/`, data).then(r => r.data),
  baja: (id, motivo_baja) => client.post(`/equipos/${id}/baja/`, { motivo_baja }).then(r => r.data),
  mantenimientos: (id) => client.get(`/equipos/${id}/mantenimientos/`).then(r => r.data),
};

import client from '../api/client';

export const tecnicosService = {
  list: (params = {}) =>
    client.get('/tecnicos/', { params }).then((r) => r.data),

  get: (id) =>
    client.get(`/tecnicos/${id}/`).then((r) => r.data),

  create: (data) =>
    client.post('/tecnicos/', data).then((r) => r.data),

  update: (id, data) =>
    client.patch(`/tecnicos/${id}/`, data).then((r) => r.data),

  changePassword: (id, password) =>
    client.post(`/tecnicos/${id}/cambiar-password/`, { password }).then((r) => r.data),

  delete: (id) =>
    client.delete(`/tecnicos/${id}/`).then((r) => r.data),
};

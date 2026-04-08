import client from '../api/client';

export const mantenimientosService = {
  list: (params = {}) => client.get('/mantenimientos/', { params }).then(r => r.data),
  get: (id) => client.get(`/mantenimientos/${id}/`).then(r => r.data),
  create: (data) => client.post('/mantenimientos/', data).then(r => r.data),
  update: (id, data) => client.patch(`/mantenimientos/${id}/`, data).then(r => r.data),

  cerrar: (id) => client.post(`/mantenimientos/${id}/cerrar/`).then(r => r.data),
  generarPDF: (id) => client.post(`/mantenimientos/${id}/generar-pdf/`).then(r => r.data),
  getPDF: (id) => client.get(`/mantenimientos/${id}/pdf/`).then(r => r.data),

  getChecklist: (id) => client.get(`/mantenimientos/${id}/checklist/`).then(r => r.data),
  saveChecklist: (id, respuestas) =>
    client.post(`/mantenimientos/${id}/checklist/`, { respuestas }).then(r => r.data),

  getFirmas: (id) => client.get(`/mantenimientos/${id}/firmas/`).then(r => r.data),
  saveFirma: (id, formData) =>
    client.post(`/mantenimientos/${id}/firmas/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  checklistItems: () => client.get('/checklist-items/').then(r => r.data),
};

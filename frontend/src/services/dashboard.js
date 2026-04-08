import client from '../api/client';

export const dashboardService = {
  resumen: () => client.get('/dashboard/resumen/').then(r => r.data),
  proximos: () => client.get('/dashboard/proximos-mantenimientos/').then(r => r.data),
  realizados: () => client.get('/dashboard/mantenimientos-realizados/').then(r => r.data),
};

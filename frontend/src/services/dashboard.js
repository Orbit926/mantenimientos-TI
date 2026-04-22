import client from '../api/client';

export const dashboardService = {
  resumen: () => client.get('/dashboard/resumen/').then(r => r.data),
  proximos: (dias) => client
    .get('/dashboard/proximos-mantenimientos/', { params: dias ? { dias } : {} })
    .then(r => r.data),
  realizados: () => client.get('/dashboard/mantenimientos-realizados/').then(r => r.data),
};

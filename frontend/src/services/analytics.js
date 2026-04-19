import client from '../api/client';

export const analyticsService = {
  get: () => client.get('/analytics/').then((r) => r.data),
};

import client from '../api/client';

export const analyticsService = {
  get: (params = {}) => client.get('/analytics/', { params }).then((r) => r.data),
};

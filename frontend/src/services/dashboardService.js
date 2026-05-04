import api from './api';

const dashboardService = {
  getDashboard: (params) => api.get('/dashboard', { params }),
};

export default dashboardService;

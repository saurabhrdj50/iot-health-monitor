import api from './api';
import axios from 'axios';

const patientService = {
  getPatients: (params) => api.get('/patients', { params }),
  getPatientOverview: () => api.get('/patients/overview'),
  addPatient: (data) => api.post('/patients', data),
  updatePatient: (id, data) => api.patch(`/patients/${id}`, data),
  deletePatient: (id) => api.delete(`/patients/${id}`),
  activatePatient: (id) => api.post(`/patients/${id}/activate`),
  getPatientDashboard: (id, params) => api.get('/dashboard', { params: { ...params, patient_id: id } }),
  getHealth: () => {
     // Route GET /status
     return axios.get('http://localhost:8000/status').then(res => res.data);
  },
};

export default patientService;

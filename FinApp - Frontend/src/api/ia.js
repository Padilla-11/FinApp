import client from './client';

export const iaApi = {
  consultar: (nid, data) =>
    client.post(`/api/negocios/${nid}/asistente`, data),
  diagnostico: (nid, data) =>
    client.post(`/api/negocios/${nid}/asistente/diagnostico`, data),
};

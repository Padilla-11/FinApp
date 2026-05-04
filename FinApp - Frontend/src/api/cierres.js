import client from './client';

export const cierresApi = {
  confirmar: (nid, jid, data) =>
    client.post(`/api/negocios/${nid}/jornadas/${jid}/cierre`, data),
  obtener: (nid, jid) =>
    client.get(`/api/negocios/${nid}/jornadas/${jid}/cierre`),
  historial: (nid, pagina = 1, tamano = 20) =>
    client.get(`/api/negocios/${nid}/historial`, { params: { pagina, tamano } }),
  corregir: (nid, cid, data) =>
    client.patch(`/api/negocios/${nid}/cierres/${cid}`, data),
};

import client from './client';

const base = (nid) => `/api/negocios/${nid}/jornadas`;

export const jornadasApi = {
  abrir: (nid, data) => client.post(base(nid), data),
  obtenerActiva: (nid) => client.get(`${base(nid)}/activa`),
  historial: (nid, pagina = 1, tamano = 20) =>
    client.get(base(nid), { params: { pagina, tamano } }),
  registrarMovimiento: (nid, jid, data) =>
    client.post(`${base(nid)}/${jid}/movimientos`, data),
  listarMovimientos: (nid, jid) =>
    client.get(`${base(nid)}/${jid}/movimientos`),
  registrarVentaCredito: (nid, jid, data) =>
    client.post(`${base(nid)}/${jid}/ventas-credito`, data),
};

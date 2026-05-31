import client from './client';

export const analisisApi = {
  getRaw: (negocioId, dias = 30) =>
    client.get(`/api/negocios/${negocioId}/analisis/estadisticas/raw`, { params: { dias } }),

  getCompleto: (negocioId, dias = 30) =>
    client.get(`/api/negocios/${negocioId}/analisis/estadisticas`, { params: { dias } }),

  regenerar: (negocioId, dias = 30) =>
    client.post(`/api/negocios/${negocioId}/analisis/estadisticas/regenerar`, { dias }),

  getDetalle: (negocioId, dias = 30) =>
    client.get(`/api/negocios/${negocioId}/analisis/estadisticas/detalle`, { params: { dias } }),
};

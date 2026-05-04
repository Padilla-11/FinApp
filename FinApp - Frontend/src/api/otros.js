import client from './client';

// Costos Fijos
export const costosFijosApi = {
  listar: (nid) => client.get(`/api/negocios/${nid}/costos-fijos`),
  crear: (nid, data) => client.post(`/api/negocios/${nid}/costos-fijos`, data),
  actualizar: (nid, id, data) => client.put(`/api/negocios/${nid}/costos-fijos/${id}`, data),
  eliminar: (nid, id) => client.delete(`/api/negocios/${nid}/costos-fijos/${id}`),
};

// Empleados
export const empleadosApi = {
  listar: (nid) => client.get(`/api/negocios/${nid}/empleados`),
  crear: (nid, data) => client.post(`/api/negocios/${nid}/empleados`, data),
  actualizar: (nid, id, data) => client.put(`/api/negocios/${nid}/empleados/${id}`, data),
  eliminar: (nid, id) => client.delete(`/api/negocios/${nid}/empleados/${id}`),
};

// Categorías de gastos
export const categoriasGastosApi = {
  listar: (nid) => client.get(`/api/negocios/${nid}/categorias-gastos`),
  crear: (nid, data) => client.post(`/api/negocios/${nid}/categorias-gastos`, data),
};

// Cuentas por cobrar
export const cuentasApi = {
  listar: (nid) => client.get(`/api/negocios/${nid}/cuentas-por-cobrar`),
  registrarCobro: (nid, ventaId, jornadaId, data) =>
    client.post(
      `/api/negocios/${nid}/cuentas-por-cobrar/${ventaId}/cobros`,
      data,
      { params: { jornadaId } }
    ),
};

// Simulador
export const simuladorApi = {
  preview: (nid, data) => client.post(`/api/negocios/${nid}/simulador/preview`, data),
  guardarEscenario: (nid, data) => client.post(`/api/negocios/${nid}/simulador/escenarios`, data),
  listarEscenarios: (nid) => client.get(`/api/negocios/${nid}/simulador/escenarios`),
};

import client from './client';

const base = (nid) => `/api/negocios/${nid}/productos`;

export const productosApi = {
  listar: (nid) => client.get(base(nid)),
  crear: (nid, data) => client.post(base(nid), data),
  actualizar: (nid, pid, data) => client.put(`${base(nid)}/${pid}`, data),
  eliminar: (nid, pid) => client.delete(`${base(nid)}/${pid}`),
  listarCategorias: (nid) => client.get(`${base(nid)}/categorias`),
  crearCategoria: (nid, data) => client.post(`${base(nid)}/categorias`, data),
};

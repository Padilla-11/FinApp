import client from './client';

const base = (id) => `/api/negocios${id ? `/${id}` : ''}`;

export const negociosApi = {
  listar: () => client.get(base()),
  obtener: (id) => client.get(base(id)),
  crear: (data) => client.post(base(), data),
  actualizar: (id, data) => client.put(base(id), data),
  eliminar: (id) => client.delete(base(id)),
  invitarMiembro: (id, data) => client.post(`${base(id)}/miembros`, data),
  removerMiembro: (id, miembroId) => client.delete(`${base(id)}/miembros/${miembroId}`),
};

import client from './client';

export const authApi = {
  login: (data) => client.post('/api/auth/login', data),
  registrar: (data) => client.post('/api/auth/registrar', data),
};

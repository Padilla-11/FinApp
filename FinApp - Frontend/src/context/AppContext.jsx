import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth';
import { negociosApi } from '../api/negocios';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('finop_user')); } catch { return null; }
  });
  const [token, setToken]     = useState(() => localStorage.getItem('finop_token'));
  const [negocio, setNegocio] = useState(() => {
    try { return JSON.parse(localStorage.getItem('finop_negocio')); } catch { return null; }
  });
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading]   = useState(false);

  const isAuth = !!token;

  async function login(correo, contrasena) {
    const res = await authApi.login({ Correo: correo, Contrasena: contrasena });
    const { Data } = res.data;
    localStorage.setItem('finop_token', Data.Token);
    localStorage.setItem('finop_user', JSON.stringify(Data.Usuario));
    setToken(Data.Token);
    setUser(Data.Usuario);
    return Data;
  }

  async function registrar(nombre, correo, contrasena) {
    const res = await authApi.registrar({ Nombre: nombre, Correo: correo, Contrasena: contrasena });
    const { Data } = res.data;
    localStorage.setItem('finop_token', Data.Token);
    localStorage.setItem('finop_user', JSON.stringify(Data.Usuario));
    setToken(Data.Token);
    setUser(Data.Usuario);
    return Data;
  }

  function logout() {
    localStorage.removeItem('finop_token');
    localStorage.removeItem('finop_user');
    localStorage.removeItem('finop_negocio');
    setToken(null);
    setUser(null);
    setNegocio(null);
    setNegocios([]);
  }

  function seleccionarNegocio(neg) {
    localStorage.setItem('finop_negocio', JSON.stringify(neg));
    setNegocio(neg);
  }

  async function cargarNegocios() {
    setLoading(true);
    try {
      const res = await negociosApi.listar();
      const lista = res.data.Data || [];
      setNegocios(lista);
      // Auto-seleccionar si solo hay uno o no hay seleccionado
      if (!negocio && lista.length > 0) seleccionarNegocio(lista[0]);
      return lista;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuth) cargarNegocios();
  }, [isAuth]);

  return (
    <AppContext.Provider value={{
      user, token, isAuth,
      negocio, negocios,
      loading,
      login, registrar, logout,
      seleccionarNegocio, cargarNegocios,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

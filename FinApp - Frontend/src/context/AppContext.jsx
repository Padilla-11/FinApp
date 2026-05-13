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
  const [rol, setRol] = useState(null);
  const [loading, setLoading]   = useState(false);

  const [iaMensajes, setIaMensajes] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('finop_ia_mensajes') || '[]'); } catch { return []; }
  });
  const [iaDiagnostico, setIaDiagnostico] = useState(null);
  const [iaPeriodo, setIaPeriodo] = useState(30);

  const isAuth = !!token;

  async function login(correo, contrasena) {
    const res = await authApi.login({ Correo: correo, Contrasena: contrasena });
    const { Data } = res.data;
    localStorage.setItem('finop_token', Data.Token);
    localStorage.setItem('finop_user', JSON.stringify(Data.Usuario));
    setToken(Data.Token);
    setUser(Data.Usuario);

    // Cargar el negocio asociado al usuario desde la base de datos
    if (Data.NegocioId) {
      const negRes = await negociosApi.obtener(Data.NegocioId);
      const negocioData = negRes.data.Data;
      seleccionarNegocio(negocioData);
    }

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
    sessionStorage.removeItem('finop_ia_mensajes');
    setToken(null);
    setUser(null);
    setNegocio(null);
    setNegocios([]);
    setRol(null);
  }

  function actualizarIaMensajes(mensajes) {
    setIaMensajes(mensajes);
    sessionStorage.setItem('finop_ia_mensajes', JSON.stringify(mensajes));
  }

  function seleccionarNegocio(neg) {
    localStorage.setItem('finop_negocio', JSON.stringify(neg));
    setNegocio(neg);
    setRol(neg.Rol || neg.rol || null);
  }

  async function cargarNegocios() {
    setLoading(true);
    try {
      const res = await negociosApi.listar();
      const lista = res.data.Data || [];
      setNegocios(lista);
      // Auto-seleccionar si solo hay uno o no hay seleccionado
      if (!negocio && lista.length > 0) {
        seleccionarNegocio(lista[0]);
      } else if (lista.length > 0 && negocio) {
        // Mantener el rol del negocio activo sincronizado
        const actual = lista.find(n => (n.Id || n.id) === (negocio.Id || negocio.id));
        if (actual) setRol(actual.Rol || actual.rol || null);
      }
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
      negocio, negocios, rol,
      loading,
      login, registrar, logout,
      seleccionarNegocio, cargarNegocios,
      iaMensajes, setIaMensajes: actualizarIaMensajes, iaDiagnostico, setIaDiagnostico, iaPeriodo, setIaPeriodo,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

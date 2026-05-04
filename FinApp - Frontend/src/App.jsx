import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './context/AppContext';

import AppLayout       from './components/layout/AppLayout';
import ProtectedRoute  from './components/layout/ProtectedRoute';

import Login           from './pages/auth/Login';
import Registro        from './pages/auth/Registro';
import Onboarding      from './pages/auth/Onboarding';
import Dashboard       from './pages/dashboard/Dashboard';
import JornadaActiva   from './pages/jornada/JornadaActiva';
import Cierre          from './pages/cierre/Cierre';
import Historial       from './pages/historial/Historial';
import DetalleJornada  from './pages/historial/DetalleJornada';
import CuentasCobrar   from './pages/cuentas/CuentasCobrar';
import Configuracion   from './pages/configuracion/Configuracion';
import Simulador       from './pages/simulador/Simulador';
import Analisis        from './pages/analisis/Analisis';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(58,80,104,.14)',
            },
            success: { iconTheme: { primary: '#4CAF82', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#E05252', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login"      element={<Login />} />
          <Route path="/registro"   element={<Registro />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Rutas protegidas con sidebar */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard"         element={<Dashboard />} />
              <Route path="/jornada"           element={<JornadaActiva />} />
              <Route path="/cierre"            element={<Cierre />} />
              <Route path="/historial"         element={<Historial />} />
              <Route path="/historial/:id"     element={<DetalleJornada />} />
              <Route path="/cuentas"           element={<CuentasCobrar />} />
              <Route path="/configuracion"     element={<Configuracion />} />
              <Route path="/simulador"         element={<Simulador />} />
              <Route path="/analisis"          element={<Analisis />} />
            </Route>
          </Route>

          {/* Redirect raíz */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

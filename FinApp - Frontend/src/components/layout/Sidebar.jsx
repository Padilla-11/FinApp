import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  ChartBarIcon, ClockIcon, CalendarDaysIcon, CreditCardIcon,
  CalculatorIcon, SparklesIcon, Cog6ToothIcon,
} from '@heroicons/react/20/solid';

const NAV_ITEMS = [
  { section: 'Principal' },
  { to: '/dashboard',     Icon: ChartBarIcon,     label: 'Dashboard' },
  { to: '/jornada',       Icon: ClockIcon,         label: 'Jornada activa' },
  { to: '/historial',     Icon: CalendarDaysIcon,  label: 'Historial' },
  { section: 'Finanzas' },
  { to: '/cuentas',       Icon: CreditCardIcon,    label: 'Cuentas por cobrar' },
  { to: '/simulador',     Icon: CalculatorIcon,    label: 'Simulador' },
  { to: '/analisis',      Icon: SparklesIcon,      label: 'Análisis IA' },
  { section: 'Ajustes' },
  { to: '/configuracion', Icon: Cog6ToothIcon,     label: 'Configuración' },
];

const OCULTOS_OPERADOR = ['/simulador', '/analisis', '/configuracion'];

export default function Sidebar() {
  const { user, negocio, negocios, rol, logout, seleccionarNegocio } = useApp();
  const navigate = useNavigate();

  const initials = (name = '') => {
    const clean = name.trim();
    if (!clean) return '?';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  };

  const userName = user?.Nombre || user?.nombre || '';
  const userRole = negocio?.Rol || 'Propietario';
  const esOperador = userRole === 'operador';

  const NAV = esOperador
    ? NAV_ITEMS.filter((i) => !i.to || !OCULTOS_OPERADOR.includes(i.to))
    : NAV_ITEMS;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="fo-sidebar">
      <div className="fo-sidebar-brand">
        <div className="fo-brand-logo">
          <div className="fo-brand-icon">
            <svg width="16" height="16" fill="none" stroke="#fff" viewBox="0 0 24 24" strokeWidth="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <span className="fo-brand-name">FinOp</span>
        </div>
        <div className="fo-brand-sub">Control financiero</div>
      </div>

      <nav className="fo-sidebar-nav">
        {NAV.map((item, i) =>
          item.section ? (
            <div key={i} className="fo-nav-section">{item.section}</div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `fo-nav-item${isActive ? ' active' : ''}`}
            >
              {item.Icon && <span style={{ width: 20, height: 20, display: 'inline-flex', alignItems: 'center' }}><item.Icon /></span>}
              {item.label}
            </NavLink>
          )
        )}
      </nav>

      <div className="fo-sidebar-footer">
        {negocio && (
          <div style={{ marginBottom: '.75rem', padding: '.5rem .625rem', background: 'rgba(255,255,255,.08)', borderRadius: 8 }}>
            <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.2rem' }}>Negocio activo</div>
            {negocios.length > 1 ? (
              <select
                value={negocio.Id || negocio.id}
                onChange={(e) => {
                  const selected = negocios.find(n => (n.Id || n.id) === parseInt(e.target.value));
                  if (selected) seleccionarNegocio(selected);
                }}
                style={{
                  width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,.15)',
                  color: '#fff', borderRadius: 6, padding: '.35rem .4rem', fontSize: '.8125rem',
                  fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                }}
              >
                {negocios.map((n) => (
                  <option key={n.Id || n.id} value={n.Id || n.id} style={{ background: '#1e293b', color: '#fff' }}>
                    {n.Nombre || n.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <div className="fo-user-biz" style={{ fontWeight: 500 }}>{negocio.Nombre || negocio.nombre}</div>
            )}
          </div>
        )}
        <div className="fo-user-chip">
          <div className="fo-avatar">{initials(userName)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fo-user-name">{userName}</div>
            <div className="fo-user-role">{userRole}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', cursor: 'pointer', padding: '4px', borderRadius: 6 }}
            title="Cerrar sesión"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

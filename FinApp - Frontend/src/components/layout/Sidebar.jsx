import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

const NAV = [
  { section: 'Principal' },
  { to: '/dashboard',   icon: '📊', label: 'Dashboard' },
  { to: '/jornada',     icon: '⏱️', label: 'Jornada activa' },
  { to: '/historial',   icon: '📅', label: 'Historial' },
  { section: 'Finanzas' },
  { to: '/cuentas',     icon: '💳', label: 'Cuentas por cobrar' },
  { to: '/simulador',   icon: '🧮', label: 'Simulador' },
  { to: '/analisis',    icon: '🤖', label: 'Análisis IA' },
  { section: 'Ajustes' },
  { to: '/configuracion', icon: '⚙️', label: 'Configuración' },
];

export default function Sidebar() {
  const { user, negocio, rol, logout } = useApp();
  const navigate = useNavigate();

  const initials = (name = '') => {
    const clean = name.trim();
    if (!clean) return '?';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return clean.slice(0, 2).toUpperCase();
  };

  const userName = user?.Nombre || user?.nombre || '';
  const userRole = negocio?.Rol || 'propietario';

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
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          )
        )}
      </nav>

      <div className="fo-sidebar-footer">
        {negocio && (
          <div style={{ marginBottom: '.75rem', padding: '.5rem .625rem', background: 'rgba(255,255,255,.08)', borderRadius: 8 }}>
            <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.2rem' }}>Negocio activo</div>
            <div className="fo-user-biz" style={{ fontWeight: 500 }}>{negocio.Nombre || negocio.nombre}</div>
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

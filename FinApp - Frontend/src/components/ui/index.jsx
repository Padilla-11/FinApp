import { estadoBadge } from '../../utils/format';

export function Badge({ type = 'neutral', children }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

export function EstadoBadge({ estado }) {
  const b = estadoBadge[estado] || { cls: 'badge-neutral', label: estado };
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}

export function Alert({ type = 'info', icon, title, children }) {
  return (
    <div className={`alert ${type}`}>
      {icon && <span className="alert-icon">{icon}</span>}
      <div className="alert-text">
        {title && <div className="alert-title">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export function KpiCard({ label, value, sub, type = '', style = {} }) {
  return (
    <div className={`fo-kpi ${type}`} style={style}>
      <div className="fo-kpi-label">{label}</div>
      <div className="fo-kpi-value">{value}</div>
      {sub && <div className="fo-kpi-sub">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon = '📋', text }) {
  return (
    <div className="fo-empty">
      <div className="fo-empty-icon">{icon}</div>
      <div className="fo-empty-text">{text}</div>
    </div>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      style={{ animation: 'spin 1s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" strokeWidth="3" strokeOpacity=".2"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

export function SummaryRow({ label, value, cls = '', style = {} }) {
  return (
    <div className={`summary-row ${cls}`} style={style}>
      <span className="s-label">{label}</span>
      <span className="s-value">{value}</span>
    </div>
  );
}

export function DayResult({ estado, icon, title, sub }) {
  return (
    <div className={`day-result ${estado}`}>
      <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '.95rem', fontWeight: 600 }}>{title}</div>
        {sub && <div style={{ fontSize: '.825rem', color: 'var(--fo-text-secondary)', marginTop: '.125rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

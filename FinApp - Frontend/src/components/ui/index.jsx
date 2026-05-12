import { estadoBadge } from '../../utils/format';
import { EMPTY_ICONS } from '../../utils/icons';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/20/solid';

const ALERT_ICONS = {
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
  danger: XCircleIcon,
  error: XCircleIcon,
  success: CheckCircleIcon,
};

export function Badge({ type = 'neutral', children }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

export function EstadoBadge({ estado }) {
  const b = estadoBadge[estado] || { cls: 'badge-neutral', label: estado };
  return <span className={`badge ${b.cls}`}>{b.label}</span>;
}

export function Alert({ type = 'info', icon, iconComponent, title, children }) {
  const IconComp = iconComponent || (type && ALERT_ICONS[type]);
  return (
    <div className={`alert ${type}`}>
      {IconComp && <span className="alert-icon"><IconComp /></span>}
      {icon && !IconComp && <span className="alert-icon">{icon}</span>}
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

export function EmptyState({ icon = 'clipboard', iconComponent, text }) {
  const IconComp = iconComponent || EMPTY_ICONS[icon] || EMPTY_ICONS.clipboard;
  return (
    <div className="fo-empty">
      <div className="fo-empty-icon"><IconComp /></div>
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

export function DayResult({ estado, icon, iconComponent, title, sub }) {
  const IconComp = iconComponent;
  return (
    <div className={`day-result ${estado}`}>
      {IconComp
        ? <span className="day-result-icon"><IconComp /></span>
        : <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{icon}</span>
      }
      <div>
        <div style={{ fontSize: '.95rem', fontWeight: 600 }}>{title}</div>
        {sub && <div style={{ fontSize: '.825rem', color: 'var(--fo-text-secondary)', marginTop: '.125rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

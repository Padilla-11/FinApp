import { BarChart2 } from 'lucide-react';

export default function EmptyChart({ text = 'Sin datos en este período', children }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', color: '#7A95A8', gap: '.5rem', height: '100%', minHeight: 100,
    }}>
      {children || <BarChart2 size={28} strokeWidth={1.5} opacity={0.5} />}
      {text && <span style={{ fontSize: '.8rem' }}>{text}</span>}
    </div>
  );
}

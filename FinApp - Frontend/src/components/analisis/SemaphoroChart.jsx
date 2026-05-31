import { fmtFechaCorta } from '../../utils/format';

const STATE_COLORS = {
  rentable: { bg: '#D6F0E3', bar: '#4CAF82', label: 'Rentable' },
  perdida: { bg: '#FDEAEA', bar: '#E05252', label: 'Pérdida' },
  equilibrio: { bg: '#FEF4E4', bar: '#E8992A', label: 'Equilibrio' },
  pendiente: { bg: '#E8EFF5', bar: '#8FAFC4', label: 'Pendiente' },
};

function getStateColor(estado) {
  const key = (estado || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (key === 'rentable' || key === 'bueno') return STATE_COLORS.rentable;
  if (key === 'perdida' || key === 'critico') return STATE_COLORS.perdida;
  if (key === 'equilibrio' || key === 'advertencia') return STATE_COLORS.equilibrio;
  return STATE_COLORS.pendiente;
}

export default function SemaphoroChart({ jornadas }) {
  if (!jornadas?.length) return null;

  const states = jornadas.map((j) => ({
    ...getStateColor(j.EstadoDia || j.Estado),
    fecha: j.Fecha,
  }));

  const counts = states.reduce((acc, s) => {
    acc[s.label] = (acc[s.label] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', height: 24, gap: 2 }}>
        {states.map((s, i) => (
          <div
            key={i}
            title={`${fmtFechaCorta(s.fecha)} — ${s.label}`}
            style={{ flex: 1, background: s.bar, borderRadius: 2, opacity: 0.7, cursor: 'help', transition: 'opacity .15s' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {Object.entries(counts).map(([label, count]) => {
          const color = Object.values(STATE_COLORS).find((s) => s.label === label)?.bar || '#8FAFC4';
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '.375rem', fontSize: '.78rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{ color: '#4A6070' }}>{label}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", color: '#3A5068', fontWeight: 500 }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

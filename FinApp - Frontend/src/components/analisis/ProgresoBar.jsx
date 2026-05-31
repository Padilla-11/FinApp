export default function ProgresoBar({ value = 0, min = 0, max = 100, zonas, format, height = 48, showScale = true }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const defaultZonas = zonas || [
    { from: 0, to: 33, color: '#E05252', label: 'Crítico' },
    { from: 33, to: 66, color: '#E8992A', label: 'Advertencia' },
    { from: 66, to: 100, color: '#4CAF82', label: 'Bueno' },
  ];

  const totalRange = max - min;

  const displayValue = format === 'pct' ? `${value.toFixed(1)}%` : value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.375rem' }}>
      <div style={{ position: 'relative', height, background: '#E4EDF4', borderRadius: 8, overflow: 'hidden' }}>
        {defaultZonas.map((z, i) => {
          const left = ((z.from - min) / totalRange) * 100;
          const w = ((z.to - z.from) / totalRange) * 100;
          return (
            <div
              key={i}
              style={{
                position: 'absolute', top: 0, left: `${left}%`, width: `${w}%`,
                height: '100%', background: z.color, opacity: 0.35,
                borderRight: i < defaultZonas.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none',
              }}
            />
          );
        })}
        <div
          style={{
            position: 'absolute', top: 0, left: `${pct}%`, width: 4,
            height: '100%', background: '#3A5068', borderRadius: 2,
            transform: 'translateX(-2px)', transition: 'left .4s ease',
          }}
        />
        <div
          style={{
            position: 'absolute', top: -4, left: `${pct}%`,
            width: 12, height: height + 8,
            transform: 'translateX(-6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: '#3A5068', border: '2px solid #fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }} />
        </div>
        <div
          style={{
            position: 'absolute', top: height / 2 - 8, left: `${pct}%`,
            transform: 'translateX(-50%)',
            background: '#3A5068', color: '#fff',
            padding: '1px 6px', borderRadius: 4,
            fontSize: '.72rem', fontFamily: "'DM Mono', monospace",
            fontWeight: 500, whiteSpace: 'nowrap',
            opacity: 0, transition: 'opacity .2s',
          }}
          className="progreso-tooltip"
        >
          {displayValue}
        </div>
      </div>

      {showScale && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: '#7A95A8', fontFamily: "'DM Mono', monospace" }}>
          <span>{format === 'pct' ? `${min}%` : min}</span>
          {defaultZonas.map((z, i) => (
            <span key={i}>{format === 'pct' ? `${z.to}%` : z.to}</span>
          ))}
        </div>
      )}

      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.1rem', fontWeight: 500, color: '#3A5068', textAlign: 'center' }}>
        {displayValue}
      </div>
    </div>
  );
}

import { useMemo } from 'react';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function HeatmapCalendar({ jornadas = [] }) {
  const calendar = useMemo(() => {
    if (!jornadas?.length) return [];

    const fechaMap = {};
    jornadas.forEach((j) => {
      fechaMap[j.Fecha] = j.ConteoRealizado ? 'hecho' : 'falta';
    });

    const labels = Object.keys(fechaMap).sort();
    if (!labels.length) return [];

    const start = new Date(labels[0]);
    const end = new Date(labels[labels.length - 1]);

    // Start from the Monday of the first week
    start.setDate(start.getDate() - start.getDay());
    const weeks = [];
    let current = new Date(start);

    while (current <= end) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const iso = current.toISOString().slice(0, 10);
        week.push({
          date: iso,
          day: current.getDay(),
          estado: fechaMap[iso] || null,
          isCurrentMonth: current.getMonth() === end.getMonth() && current.getFullYear() === end.getFullYear(),
        });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }

    // Trim empty weeks at start
    const firstDataIdx = weeks.findIndex((w) => w.some((d) => d.estado));
    return firstDataIdx > 0 ? weeks.slice(firstDataIdx) : weeks;
  }, [jornadas]);

  if (!calendar.length) return null;

  const total = jornadas.length;
  const conConteo = jornadas.filter((j) => j.ConteoRealizado).length;
  const sinConteo = total - conConteo;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.625rem' }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {DAYS.map((d) => (
          <div key={d} style={{
            flex: 1, textAlign: 'center', fontSize: '.65rem', fontWeight: 500,
            color: '#7A95A8', paddingBottom: '.25rem',
          }}>
            {d}
          </div>
        ))}
      </div>

      {calendar.map((week, wi) => (
        <div key={wi} style={{ display: 'flex', gap: 2 }}>
          {week.map((day) => (
            <div
              key={day.date}
              title={day.estado ? `${day.date} — ${day.estado === 'hecho' ? 'Con conteo' : 'Sin conteo'}` : day.date}
              style={{
                flex: 1, aspectRatio: '1', borderRadius: 3,
                background: !day.estado ? 'transparent'
                  : day.estado === 'hecho' ? '#4CAF82'
                  : '#E05252',
                opacity: !day.estado ? 0.3 : 0.85,
                minHeight: 18,
                transition: 'opacity .15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = day.estado ? '0.85' : '0.3'; }}
            />
          ))}
        </div>
      ))}

      <div style={{ display: 'flex', gap: '1rem', fontSize: '.78rem', color: '#4A6070', justifyContent: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#4CAF82', display: 'inline-block' }} />
          Con conteo: {conConteo}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#E05252', display: 'inline-block' }} />
          Sin conteo: {sinConteo}
        </span>
      </div>
    </div>
  );
}

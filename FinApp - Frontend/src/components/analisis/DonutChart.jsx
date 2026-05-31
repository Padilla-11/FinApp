import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#fff', border: '1px solid #C8D8E5', borderRadius: 8,
      padding: '.5rem .75rem', boxShadow: '0 2px 8px rgba(58,80,104,.10)',
      fontSize: '.8rem',
    }}>
      <div style={{ color: '#7A95A8', marginBottom: '.2rem' }}>{d.name}</div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: '#3A5068' }}>
        {d.value} ({((d.value / d.total) * 100).toFixed(1)}%)
      </div>
    </div>
  );
}

export default function DonutChart({ data, height = 180, innerRadius = 50, outerRadius = 72, centerText }) {
  if (!data?.length) return null;

  const total = data.reduce((s, d) => s + d.value, 0);
  const mainPct = data[0]?.value > 0 ? ((data[0].value / total) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip content={<CustomTooltip />} />
          <Pie
            data={data.map((d) => ({ ...d, total }))}
            cx="50%" cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color || (i === 0 ? '#4CAF82' : i === 1 ? '#E8992A' : '#C8D8E5')} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        textAlign: 'center', pointerEvents: 'none',
      }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.2rem', fontWeight: 600, color: '#3A5068' }}>
          {centerText !== undefined ? centerText : `${mainPct}%`}
        </div>
        <div style={{ fontSize: '.68rem', color: '#7A95A8', marginTop: '.1rem' }}>
          de {total} jornadas
        </div>
      </div>
    </div>
  );
}

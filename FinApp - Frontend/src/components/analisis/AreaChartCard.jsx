import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fmtFechaCorta, fmt } from '../../utils/format';

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #C8D8E5', borderRadius: 8,
      padding: '.5rem .75rem', boxShadow: '0 2px 8px rgba(58,80,104,.10)',
      fontSize: '.8rem',
    }}>
      <div style={{ color: '#7A95A8', marginBottom: '.25rem' }}>
        {fmtFechaCorta(label)}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{
          fontFamily: "'DM Mono', monospace", fontWeight: 500,
          color: p.color || '#3A5068',
          marginTop: i > 0 ? '.15rem' : 0,
        }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

export default function AreaChartCard({ charts, data, height = 200, formatter }) {
  if (!data?.length) return null;

  const single = charts?.length === 1 || !charts;
  const totalHeight = single ? height : (charts?.length || 1) * (height / 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      {(charts || [{ areaKey: null, lineKey: null, areaColor: '#4CAF82', lineColor: '#3A5068', label: '' }]).map((cfg, idx) => (
        <div key={idx} style={{ flex: 1 }}>
          {cfg.label && (
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: '#7A95A8', marginBottom: '.25rem', textTransform: 'uppercase', letterSpacing: '.03em' }}>
              {cfg.label}
            </div>
          )}
          <ResponsiveContainer width="100%" height={single ? height : height / 2 - 10}>
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4EDF4" vertical={false} />
              <XAxis dataKey={cfg.xKey || 'fecha'} tick={{ fontSize: 10, fill: '#7A95A8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#7A95A8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip formatter={formatter || fmt} />} />
              {cfg.areaKey && (
                <Area type="monotone" dataKey={cfg.areaKey} stroke={cfg.areaColor || '#4CAF82'} fill={cfg.areaColor || '#4CAF82'} fillOpacity={0.12} strokeWidth={2} dot={false} />
              )}
              {cfg.lineKey && (
                <Area type="monotone" dataKey={cfg.lineKey} stroke={cfg.lineColor || '#3A5068'} fill="transparent" strokeWidth={2} dot={false} strokeDasharray={cfg.dashed ? '4 3' : 'none'} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}

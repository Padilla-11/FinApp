import { ComposedChart, Line, Area, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { fmtPct, fmtFechaCorta } from '../../utils/format';

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
        <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: p.color || '#3A5068' }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

export default function SparkLine({
  data, dataKey = 'value', xKey = 'fecha', color = '#4CAF82',
  height = 60, formatter, showArea, refLine, showExtremes,
  refLineColor = '#7A95A8',
}) {
  if (!data?.length) return null;

  const values = data.map((d) => d[dataKey]).filter((v) => v !== null && v !== undefined);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const maxIdx = data.findIndex((d) => d[dataKey] === maxVal);
  const minIdx = data.findIndex((d) => d[dataKey] === minVal);

  // Custom dot only for extremes
  const CustomDot = (props) => {
    const { cx, cy, index } = props;
    if (!showExtremes || (index !== maxIdx && index !== minIdx)) return null;
    const isMax = index === maxIdx;
    return (
      <circle cx={cx} cy={cy} r={3} fill={isMax ? '#4CAF82' : '#E05252'} stroke="#fff" strokeWidth={1.5} />
    );
  };

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Tooltip content={<CustomTooltip formatter={formatter} />} />
          {showArea && (
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.08} strokeWidth={1.5} dot={false} />
          )}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 4, fill: color, stroke: '#fff', strokeWidth: 2 }}
          />
          {refLine !== null && refLine !== undefined && (
            <ReferenceLine
              y={refLine}
              stroke={refLineColor}
              strokeDasharray="4 3"
              strokeWidth={1}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {showExtremes && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.65rem', color: '#7A95A8', fontFamily: "'DM Mono', monospace", marginTop: '.125rem' }}>
          <span>{formatter ? formatter(minVal) : minVal}</span>
          <span>{formatter ? formatter(maxVal) : maxVal}</span>
        </div>
      )}
    </div>
  );
}

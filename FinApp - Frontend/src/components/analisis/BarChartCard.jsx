import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell, LabelList } from 'recharts';
import { fmtPct } from '../../utils/format';

function CustomTooltip({ active, payload, label, formatter, xKey }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #C8D8E5', borderRadius: 8,
      padding: '.5rem .75rem', boxShadow: '0 2px 8px rgba(58,80,104,.10)',
      fontSize: '.8rem',
    }}>
      <div style={{ color: '#7A95A8', marginBottom: '.25rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500, color: p.color || '#3A5068' }}>
          {formatter ? formatter(p.value) : p.value}
        </div>
      ))}
    </div>
  );
}

export default function BarChartCard({
  data, bars, xKey = 'name', layout = 'vertical', height = 200, formatter,
  colorFn, showValueLabels, trendLine, highlightBest, highlightWorst,
}) {
  if (!data?.length || !bars?.length) return null;

  const isVertical = layout === 'vertical';

  // Default color based on index
  const getBarFill = (entry, idx) => {
    if (colorFn) return colorFn(entry, idx, data);
    if (highlightBest || highlightWorst) {
      const bestIdx = highlightBest ? data.reduce((bi, d, i, arr) => (d[bars[0].dataKey] > arr[bi][bars[0].dataKey] ? i : bi), 0) : -1;
      const worstIdx = highlightWorst ? data.reduce((wi, d, i, arr) => (d[bars[0].dataKey] < arr[wi][bars[0].dataKey] ? i : wi), 0) : -1;
      if (idx === bestIdx) return '#4CAF82';
      if (idx === worstIdx) return '#E05252';
    }
    return bars[0]?.color || '#3A5068';
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: showValueLabels ? 20 : 4, right: 8, bottom: 4, left: 4 }}
        layout={isVertical ? 'horizontal' : 'vertical'}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#E4EDF4" vertical={false} />
        {isVertical ? (
          <>
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#7A95A8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#7A95A8' }} axisLine={false} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis type="number" tick={{ fontSize: 10, fill: '#7A95A8' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey={xKey} tick={{ fontSize: 11, fill: '#7A95A8' }} axisLine={false} tickLine={false} width={90} />
          </>
        )}
        <Tooltip content={<CustomTooltip formatter={formatter} xKey={xKey} />} />
        {trendLine && (
          <ReferenceLine y={trendLine.value || 0} stroke={trendLine.color || '#E8992A'} strokeDasharray="4 3" strokeWidth={1.5} />
        )}
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            radius={[3, 3, 0, 0]}
            barSize={bar.barSize || (isVertical ? 24 : 16)}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={getBarFill(entry, idx)} />
            ))}
            {showValueLabels && (
              <LabelList
                dataKey={bar.dataKey}
                position="top"
                formatter={formatter || ((v) => v)}
                style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", fill: '#4A6070' }}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

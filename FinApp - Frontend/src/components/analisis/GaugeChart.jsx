import { fmtPct } from '../../utils/format';

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

const ZONES = [
  { from: 0, to: 33, color: '#E05252', label: 'Crítico' },
  { from: 33, to: 66, color: '#E8992A', label: 'Advertencia' },
  { from: 66, to: 100, color: '#4CAF82', label: 'Bueno' },
];

export default function GaugeChart({ value = 0, min = 0, max = 100, width = 160, height = 100, format }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const cx = width / 2;
  const cy = height * 0.8;
  const r = Math.min(cx, cy) - 8;
  const startAngle = 180;
  const endAngle = 0;
  const range = endAngle - startAngle;

  // Zone arcs
  const zoneArcs = ZONES.map((z) => {
    const a0 = startAngle + (range * z.from) / 100;
    const a1 = startAngle + (range * z.to) / 100;
    return { ...z, arc: describeArc(cx, cy, r, a0, a1) };
  });

  // Needle
  const needleAngle = startAngle + (range * pct) / 100;
  const needle = polarToCartesian(cx, cy, r * 0.8, needleAngle);
  const needleEnd = polarToCartesian(cx, cy, r * 0.2, needleAngle + 180);

  const displayValue = format === 'pct' ? fmtPct(value) : value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.25rem' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Zone arcs */}
        {zoneArcs.map((z) => (
          <path key={z.label} d={z.arc} fill="none" stroke={z.color} strokeWidth={10} strokeLinecap="round" opacity={0.25} />
        ))}

        {/* Active value arc */}
        <path
          d={describeArc(cx, cy, r, startAngle, startAngle + range * (pct / 100))}
          fill="none"
          stroke={pct < 33 ? '#E05252' : pct < 66 ? '#E8992A' : '#4CAF82'}
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Needle */}
        <line x1={needleEnd.x} y1={needleEnd.y} x2={needle.x} y2={needle.y}
          stroke="#3A5068" strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill="#3A5068" />
      </svg>

      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.3rem', fontWeight: 500, color: '#3A5068' }}>
        {displayValue}
      </div>
    </div>
  );
}

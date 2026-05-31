export default function StatCardBase({ span = 4, title, subtitle, children, className = '', onClick }) {
  const clickable = !!onClick;
  return (
    <div
      className={`fo-card chart-card chart-span-${span} ${className} ${clickable ? 'chart-card-clickable' : ''}`}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: '1.25rem',
        cursor: clickable ? 'pointer' : undefined,
      }}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: children ? '1rem' : 0 }}>
          {title && (
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#3A5068', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {title}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: '.75rem', color: '#7A95A8', marginTop: '.2rem' }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}

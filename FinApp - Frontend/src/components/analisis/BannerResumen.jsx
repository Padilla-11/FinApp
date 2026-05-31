// BannerResumen.jsx — Banner superior del módulo de análisis

const ESTADO_BANNER = {
  bueno: { bg: '#D6F0E3', border: '#a8dfc4', color: '#27643F', icono: '✅' },
  advertencia: { bg: '#FEF4E4', border: '#f5d89a', color: '#8a5e0a', icono: '⚠️' },
  critico: { bg: '#FDEAEA', border: '#f5b8b8', color: '#a02020', icono: '🔴' },
};

function formatTiempoRelativo(isoString) {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return 'hace menos de un minuto';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
}

export default function BannerResumen({ resumen, meta, cargando, onRegeneracion, regenerando }) {
  if (cargando) {
    return (
      <div className="fo-analisis-banner skeleton-banner">
        <div className="skeleton-row">
          <div className="skeleton-circle" />
          <div className="skeleton-lines">
            <div className="skeleton-line short" />
            <div className="skeleton-line long" />
          </div>
        </div>
      </div>
    );
  }

  if (!resumen) return null;

  const cfg = ESTADO_BANNER[resumen.Estado] || ESTADO_BANNER.advertencia;

  return (
    <div
      className="fo-analisis-banner"
      style={{
        background: cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        borderRadius: '12px',
        padding: '1.125rem 1.5rem',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '.875rem', alignItems: 'flex-start', flex: 1 }}>
          <span style={{ fontSize: '1.35rem', flexShrink: 0, marginTop: '.1rem' }}>{cfg.icono}</span>
          <div>
            <div style={{ fontSize: '.95rem', fontWeight: 600, color: cfg.color, marginBottom: '.25rem' }}>
              {resumen.Titulo}
            </div>
            <div style={{ fontSize: '.875rem', color: '#3d3d3a', lineHeight: 1.65 }}>
              {resumen.Texto}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.5rem', flexShrink: 0 }}>
          {meta && (
            <div style={{ fontSize: '.72rem', color: '#7A95A8', textAlign: 'right' }}>
              Análisis generado {formatTiempoRelativo(meta.GeneradoEn)}
              <br />
              {meta.JornadasBase} jornadas analizadas
            </div>
          )}
          <button
            onClick={onRegeneracion || (() => {})}
            disabled={regenerando}
            className="fo-btn-outline-sm"
            style={{
              borderColor: cfg.border,
              color: cfg.color,
              opacity: regenerando ? 0.7 : 1,
            }}
            title="Forzar nuevo análisis con IA ignorando el caché"
          >
            <svg
              width="13" height="13" fill="none" stroke="currentColor"
              strokeWidth="1.75" viewBox="0 0 24 24"
              style={{ animation: regenerando ? 'spin .9s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-.43-4.52" />
            </svg>
            {regenerando ? 'Actualizando...' : 'Actualizar análisis'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

import { useEffect } from 'react';
import { fmt, fmtPct } from '../../utils/format';

const ESTADO_CONFIG = {
  bueno: { color: '#389B6A', bg: '#D6F0E3', border: '#a8dfc4', icono: '✅', etiqueta: 'Saludable' },
  advertencia: { color: '#b5700f', bg: '#FEF4E4', border: '#f5d89a', icono: '⚠️', etiqueta: 'Atención' },
  critico: { color: '#E05252', bg: '#FDEAEA', border: '#f5b8b8', icono: '🔴', etiqueta: 'Crítico' },
};

function formatValor(valor, formato, unidad) {
  if (valor === null || valor === undefined) return '—';
  switch (formato) {
    case 'moneda': return fmt(valor);
    case 'porcentaje': return fmtPct(valor);
    case 'numero': return `${Math.round(valor).toLocaleString('es-CO')}${unidad ? ` ${unidad}` : ''}`;
    case 'fraccion': return Math.round(valor).toLocaleString('es-CO');
    default: return String(valor);
  }
}

export default function ModalAnalisis({ tarjeta, cargandoIA, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!tarjeta) return null;

  const cfg = ESTADO_CONFIG[tarjeta.Estado] || ESTADO_CONFIG.advertencia;
  const valorFmt = formatValor(tarjeta.Valor, tarjeta.Formato, tarjeta.Unidad);
  const hayIA = tarjeta.Interpretacion && tarjeta.Accion;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fo-modal-overlay"
    >
      <div className="fo-modal-panel" style={{ maxWidth: '500px' }}>
        <div className="fo-modal-header">
          <div>
            <div style={{ fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#7A95A8', marginBottom: '.25rem' }}>
              Estadística
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1C2B38' }}>
              {tarjeta.Nombre}
              {tarjeta.Etiqueta && (
                <span style={{ fontSize: '.8rem', fontWeight: 400, color: '#5F7D96', marginLeft: '.5rem' }}>
                  — {tarjeta.Etiqueta}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="fo-modal-close">
            ✕
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
          <div style={{
            background: '#F2F5F8',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '2rem', fontWeight: 500, color: '#3A5068', letterSpacing: '-.02em', lineHeight: 1.1 }}>
                {valorFmt}
              </div>
              {tarjeta.Formato === 'fraccion' && tarjeta.Unidad && (
                <div style={{ fontSize: '.8rem', color: '#5F7D96', marginTop: '.25rem' }}>{tarjeta.Unidad}</div>
              )}
            </div>

            {tarjeta.TendenciaPct !== null && tarjeta.TendenciaPct !== undefined && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.25rem' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.25rem',
                  padding: '.25rem .625rem',
                  borderRadius: '20px',
                  fontSize: '.75rem',
                  fontWeight: 500,
                  background: tarjeta.Tendencia === 'sube' ? '#D6F0E3' : tarjeta.Tendencia === 'baja' ? '#FDEAEA' : '#DDE6EE',
                  color: tarjeta.Tendencia === 'sube' ? '#389B6A' : tarjeta.Tendencia === 'baja' ? '#E05252' : '#5F7D96',
                }}>
                  {tarjeta.Tendencia === 'sube' ? '▲' : tarjeta.Tendencia === 'baja' ? '▼' : '→'}
                  {' '}{Math.abs(tarjeta.TendenciaPct).toFixed(1)}%
                </span>
                <div style={{ fontSize: '.7rem', color: '#7A95A8' }}>vs período anterior</div>
              </div>
            )}
          </div>

          {cargandoIA && !hayIA ? (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.625rem' }}>
                <div className="skeleton-dot" />
                <div style={{ fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#7A95A8' }}>
                  Generando interpretación IA...
                </div>
              </div>
              {[90, 70].map((w, i) => (
                <div key={i} className="skeleton-text" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : hayIA ? (
            <div style={{
              background: cfg.bg,
              border: `1.5px solid ${cfg.border}`,
              borderRadius: '10px',
              padding: '1rem 1.125rem',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
                <span style={{ fontSize: '1rem' }}>{cfg.icono}</span>
                <span style={{ fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: cfg.color }}>
                  {cfg.etiqueta}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '.875rem', color: '#1C2B38', lineHeight: 1.65 }}>
                {tarjeta.Interpretacion}
              </p>
            </div>
          ) : null}

          {cargandoIA && !hayIA ? (
            <div className="skeleton-text" style={{ width: '80%' }} />
          ) : hayIA ? (
            <div style={{
              background: '#F2F5F8',
              borderRadius: '10px',
              padding: '.875rem 1.125rem',
              display: 'flex',
              gap: '.75rem',
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>→</span>
              <p style={{ margin: 0, fontSize: '.875rem', color: '#1C2B38', lineHeight: 1.65, fontWeight: 400 }}>
                <strong style={{ color: '#3A5068' }}>Acción: </strong>
                {tarjeta.Accion}
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#7A95A8', fontSize: '.875rem', padding: '.5rem 0' }}>
              Sin interpretación disponible para esta estadística.
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}

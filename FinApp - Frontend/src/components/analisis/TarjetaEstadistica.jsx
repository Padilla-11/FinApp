import { useState } from 'react';
import { fmt, fmtPct } from '../../utils/format';
import ModalAnalisis from './ModalAnalisis';

const ESTADO = {
  bueno: { borde: '#4CAF82', bg: '#F4FCF8', punto: '#4CAF82', label: 'Bueno' },
  advertencia: { borde: '#E8992A', bg: '#FFFBF4', punto: '#E8992A', label: 'Atención' },
  critico: { borde: '#E05252', bg: '#FFF8F8', punto: '#E05252', label: 'Crítico' },
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

export default function TarjetaEstadistica({ tarjeta, cargandoRaw, cargandoIA }) {
  const [modalAbierto, setModalAbierto] = useState(false);

  if (!tarjeta && !cargandoRaw) return null;

  if (cargandoRaw) {
    return (
      <div className="fo-card skeleton-card">
        <div className="skeleton-line medium" />
        <div className="skeleton-value" />
      </div>
    );
  }

  const cfg = ESTADO[tarjeta.Estado] || ESTADO.advertencia;
  const valorFmt = formatValor(tarjeta.Valor, tarjeta.Formato, tarjeta.Unidad);
  const hayIA = !!(tarjeta.Interpretacion && tarjeta.Accion);

  return (
    <>
      <div
        className="fo-card"
        style={{
          background: cfg.bg,
          border: '1px solid #E4EDF4',
          borderLeft: `4px solid ${cfg.borde}`,
          borderRadius: '12px',
          padding: '1.125rem 1.25rem 1rem',
          boxShadow: '0 1px 3px rgba(58,80,104,.07)',
          display: 'flex',
          flexDirection: 'column',
          gap: '.625rem',
          transition: 'box-shadow .18s, transform .18s',
          cursor: 'default',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(58,80,104,.12)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(58,80,104,.07)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
          <div style={{ fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#7A95A8' }}>
            {tarjeta.Nombre}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.punto, flexShrink: 0 }} />
            <span style={{ fontSize: '.68rem', color: cfg.punto, fontWeight: 500 }}>{cfg.label}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '.75rem' }}>
          <div>
            {tarjeta.Etiqueta && (
              <div style={{ fontSize: '.75rem', color: '#5F7D96', marginBottom: '.15rem' }}>{tarjeta.Etiqueta}</div>
            )}
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.5rem', fontWeight: 500, color: '#3A5068', letterSpacing: '-.02em', lineHeight: 1.1 }}>
              {valorFmt}
            </div>
            {tarjeta.Formato === 'fraccion' && tarjeta.Unidad && (
              <div style={{ fontSize: '.75rem', color: '#7A95A8', marginTop: '.2rem' }}>{tarjeta.Unidad}</div>
            )}
          </div>

          {tarjeta.TendenciaPct !== null && tarjeta.TendenciaPct !== undefined && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '.2rem',
              padding: '.2rem .5rem',
              borderRadius: '20px',
              fontSize: '.72rem',
              fontWeight: 500,
              flexShrink: 0,
              background: tarjeta.Tendencia === 'sube' ? '#D6F0E3' : tarjeta.Tendencia === 'baja' ? '#FDEAEA' : '#DDE6EE',
              color: tarjeta.Tendencia === 'sube' ? '#389B6A' : tarjeta.Tendencia === 'baja' ? '#E05252' : '#5F7D96',
            }}>
              {tarjeta.Tendencia === 'sube' ? '▲' : tarjeta.Tendencia === 'baja' ? '▼' : '→'}
              {' '}{Math.abs(tarjeta.TendenciaPct).toFixed(1)}%
            </span>
          )}
        </div>

        <div style={{ height: '1px', background: '#E4EDF4', margin: '.125rem 0' }} />

        <button
          onClick={() => setModalAbierto(true)}
          className="fo-btn-analisis"
          aria-label={`Ver análisis IA de ${tarjeta.Nombre}`}
        >
          {cargandoIA && !hayIA ? (
            <>
              <svg style={{ animation: 'spin .9s linear infinite' }} width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 12a9 9 0 1 1-18 0" opacity=".3" />
                <path d="M12 3a9 9 0 0 1 9 9" />
              </svg>
              Cargando análisis IA...
            </>
          ) : (
            <>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Ver análisis IA
            </>
          )}
        </button>
      </div>

      {modalAbierto && (
        <ModalAnalisis
          tarjeta={tarjeta}
          cargandoIA={cargandoIA && !hayIA}
          onClose={() => setModalAbierto(false)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}

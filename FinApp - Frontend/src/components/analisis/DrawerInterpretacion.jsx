import { useEffect } from 'react';
import { fmt, fmtPct } from '../../utils/format';

const ESTADO_TARJETA = {
  bueno: { color: '#389B6A', bg: '#D6F0E3', border: '#a8dfc4', icono: '✅', etiqueta: 'Saludable' },
  advertencia: { color: '#b5700f', bg: '#FEF4E4', border: '#f5d89a', icono: '⚠️', etiqueta: 'Atención' },
  critico: { color: '#E05252', bg: '#FDEAEA', border: '#f5b8b8', icono: '🔴', etiqueta: 'Crítico' },
};

const DESCRIPCIONES = {
  margen_neto: 'Indica el porcentaje de cada peso vendido que se convierte en ganancia neta después de descontar todos los costos y gastos. Un margen saludable suele estar por encima del 20%.',
  margen_bruto: 'Mide la rentabilidad directa de tus ventas después de restar solo el costo de los productos vendidos. Excluye gastos operativos y administrativos.',
  utilidad_neta_acumulada: 'Total de ganancia neta generada en el período seleccionado, descontando todos los costos, gastos operativos, impuestos y gastos financieros.',
  tasa_jornadas_rentables: 'Porcentaje de jornadas en las que el negocio generó ganancia. Un valor alto indica consistencia operativa.',
  crecimiento_ingresos: 'Variación porcentual de los ingresos totales comparando el período actual con el período anterior equivalente.',
  racha_actual: 'Número consecutivo de jornadas en el mismo estado (rentable o pérdida). Rachas largas positivas indican consistencia; las negativas requieren atención inmediata.',
  ingreso_promedio_jornada: 'Promedio de ingresos generados por jornada operada. Útil para proyectar ingresos y establecer metas diarias.',
  mejor_dia_semana: 'Día de la semana con mayor promedio de ingresos. Concentrar esfuerzos comerciales en este día puede maximizar resultados.',
  peor_dia_semana: 'Día de la semana con menor promedio de ingresos. Evaluar si vale la pena operar o si se requiere una estrategia diferente.',
  dias_sobre_equilibrio: 'Cantidad de jornadas cuyos ingresos superaron el punto de equilibrio del día. Indica estabilidad financiera en el período.',
  dias_operados_vs_configurados: 'Comparación entre los días que se operó realmente frente a los días hábiles configurados para el negocio.',
  diferencia_caja_promedio: 'Diferencia promedio entre el saldo de caja esperado y el real al cierre de cada jornada. Valores altos pueden indicar errores en el registro de movimientos.',
  eficiencia_operativa: 'Porcentaje de los ingresos que se consumen en gastos operativos. Un valor bajo significa que el negocio opera de manera eficiente.',
  peso_costos_fijos: 'Porcentaje del ingreso promedio diario que se destina a cubrir costos fijos. Un peso alto reduce la flexibilidad financiera.',
  carga_laboral: 'Porcentaje del ingreso promedio diario que representa el costo del personal. Idealmente debería estar entre el 15% y el 25%.',
  cobertura_costos_fijos: 'Número de veces que los ingresos cubren los costos fijos del período. Una cobertura mayor a 2x se considera saludable.',
  categoria_mayor_gasto: 'Categoría de gasto operativo con mayor participación en el total. Ayuda a identificar dónde se concentran los costos del negocio.',
  gasto_promedio_jornada: 'Promedio de gastos operativos por jornada. Monitorear su evolución ayuda a controlar la estructura de costos.',
  producto_mas_vendido: 'Producto con mayor cantidad de unidades vendidas en el período. Refleja preferencias de los clientes y rotación de inventario.',
  producto_mas_rentable: 'Producto que genera la mayor utilidad total en el período. No siempre coincide con el más vendido.',
  producto_peor_margen: 'Producto con el margen de ganancia más bajo. Revisar su precio o costo podría mejorar la rentabilidad general.',
  margen_portafolio: 'Margen de ganancia promedio de todos los productos vendidos. Un margen saludable indica una buena estrategia de precios.',
  jornadas_conteo_omitido: 'Número de jornadas en las que no se realizó el conteo de productos. Registrar todos los conteos es clave para la precisión de los datos.',
  total_pendiente: 'Monto total de ventas a crédito que aún no han sido cobradas. Un valor alto puede afectar el flujo de caja.',
  tasa_cartera_vencida: 'Porcentaje de la cartera total que tiene más de 7 días de vencida. Una tasa baja indica buena gestión de cobranza.',
  dias_promedio_cobro: 'Promedio de días que tardan los clientes en pagar sus facturas a crédito. Menos días significa mejor flujo de caja.',
  ventas_credito_vs_contado: 'Porcentaje de las ventas totales que se realizan a crédito. Un porcentaje alto puede indicar riesgo de liquidez.',
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

export default function DrawerInterpretacion({ stat, iaCargando, onClose, onRegenerar, regenerando }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!stat) return null;

  const cfg = ESTADO_TARJETA[stat.Estado] || ESTADO_TARJETA.advertencia;
  const valorFmt = formatValor(stat.Valor, stat.Formato, stat.Unidad);
  const descripcion = DESCRIPCIONES[stat.Id] || '';
  const hayIA = !!(stat.Interpretacion && stat.Accion);

  return (
    <>
      <div onClick={onClose} className="fo-drawer-overlay" />
      <div className="fo-drawer">
        <div className="fo-drawer-header">
          <div>
            <div style={{ fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#7A95A8', marginBottom: '.25rem' }}>
              Estadística
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1C2B38', display: 'flex', alignItems: 'center', gap: '.625rem', flexWrap: 'wrap' }}>
              {stat.Nombre}
              {stat.Etiqueta && (
                <span style={{ fontSize: '.78rem', fontWeight: 400, color: '#5F7D96' }}>
                  — {stat.Etiqueta}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="fo-modal-close">✕</button>
        </div>

        <div className="fo-drawer-body">
          {/* ── Valor y tendencia ── */}
          <div className="fo-drawer-section">
            <div style={{
              background: '#F2F5F8', borderRadius: '12px', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <span className={`fo-badge ${stat.Estado}`}>{cfg.etiqueta}</span>
                <div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.75rem', fontWeight: 500, color: '#3A5068', letterSpacing: '-.02em', lineHeight: 1.1 }}>
                    {valorFmt}
                  </div>
                  {stat.Formato === 'fraccion' && stat.Unidad && (
                    <div style={{ fontSize: '.78rem', color: '#5F7D96', marginTop: '.15rem' }}>{stat.Unidad}</div>
                  )}
                </div>
              </div>

              {stat.TendenciaPct !== null && stat.TendenciaPct !== undefined && (
                <span className={`fo-trend ${stat.Tendencia}`}>
                  {stat.Tendencia === 'sube' ? '▲' : stat.Tendencia === 'baja' ? '▼' : '→'}
                  {' '}{Math.abs(stat.TendenciaPct).toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* ── ¿Qué significa? ── */}
          {descripcion && (
            <div className="fo-drawer-section">
              <div className="fo-drawer-section-title">¿Qué significa?</div>
              <p className="fo-drawer-text">{descripcion}</p>
            </div>
          )}

          {/* ── Interpretación IA ── */}
          <div className="fo-drawer-section">
            <div className="fo-drawer-section-title">
              Interpretación
              {iaCargando && !hayIA && <span style={{ color: '#E8992A', fontWeight: 500, marginLeft: '.5rem' }}>(generando...)</span>}
            </div>

            {iaCargando && !hayIA ? (
              <div>
                {[100, 85, 70].map((w, i) => (
                  <div key={i} className="skeleton-ia-text" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : hayIA ? (
              <div style={{
                background: cfg.bg, border: `1.5px solid ${cfg.border}`,
                borderRadius: '10px', padding: '1rem 1.125rem',
              }}>
                <p className="fo-drawer-text" style={{ color: '#1C2B38', fontWeight: 400 }}>
                  {stat.Interpretacion}
                </p>
              </div>
            ) : (
              <p className="fo-drawer-text" style={{ color: '#7A95A8', fontStyle: 'italic' }}>
                Esperando la interpretación de la IA...
              </p>
            )}
          </div>

          {/* ── Consejo ── */}
          <div className="fo-drawer-section">
            <div className="fo-drawer-section-title">Consejo</div>
            {iaCargando && !hayIA ? (
              <div>
                {[90, 60].map((w, i) => (
                  <div key={i} className="skeleton-ia-text" style={{ width: `${w}%` }} />
                ))}
              </div>
            ) : hayIA ? (
              <div style={{
                background: '#F2F5F8', borderRadius: '10px', padding: '.875rem 1rem',
                display: 'flex', gap: '.75rem', alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '.1rem' }}>💡</span>
                <p className="fo-drawer-text" style={{ color: '#1C2B38' }}>
                  {stat.Accion}
                </p>
              </div>
            ) : (
              <p className="fo-drawer-text" style={{ color: '#7A95A8', fontStyle: 'italic' }}>
                Esperando el consejo de la IA...
              </p>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="fo-drawer-footer">
          <button
            onClick={onRegenerar}
            disabled={regenerando}
            className="fo-drawer-refresh-btn"
          >
            <svg
              width="12" height="12" fill="none" stroke="currentColor"
              strokeWidth="1.75" viewBox="0 0 24 24"
              style={{ animation: regenerando ? 'spin .9s linear infinite' : 'none' }}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-.43-4.52" />
            </svg>
            {regenerando ? 'Actualizando...' : 'Regenerar interpretación'}
          </button>
          <div style={{ fontSize: '.72rem', color: '#7A95A8' }}>
            Análisis generado por IA
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { simuladorApi } from '../../api/otros';
import { Modal } from '../../components/ui/Modal';
import { fmt, fmtPct } from '../../utils/format';
import toast from 'react-hot-toast';

const VARS_DEFAULT = {
  precio: 3500,
  costo: 1200,
  volumen: 68,
  fijos: 1165000,
  dias: 6,
};

function calcularMetricas(v) {
  const diasMes      = Math.round(v.dias * 4.33);
  const ingresosDia  = v.precio * v.volumen;
  const costoDia     = v.costo * v.volumen;
  const fijosDia     = v.fijos / diasMes;
  const utilidadDia  = ingresosDia - costoDia - fijosDia;
  const margen       = ingresosDia > 0 ? (utilidadDia / ingresosDia) * 100 : 0;
  const equilibrio   = ingresosDia > 0 ? fijosDia / ((ingresosDia - costoDia) / ingresosDia) : 0;
  return { ingresosDia, costoDia, fijosDia, utilidadDia, margen, equilibrio };
}

export default function Simulador() {
  const { negocio } = useApp();
  const nid = negocio?.Id || negocio?.id;

  const [vars, setVars]         = useState(VARS_DEFAULT);
  const [escenarios, setEscenarios] = useState([]);
  const [modalGuardar, setModalGuardar] = useState(false);
  const [nombreEsc, setNombreEsc]       = useState('');
  const [saving, setSaving]             = useState(false);

  const actual   = calcularMetricas(VARS_DEFAULT);
  const simulado = calcularMetricas(vars);

  useEffect(() => {
    if (!nid) return;
    simuladorApi.listarEscenarios(nid)
      .then((r) => setEscenarios(r.data.Data || []))
      .catch(() => {});
  }, [nid]);

  function resetVariables() { setVars(VARS_DEFAULT); }

  function cargarEscenario(esc) {
    if (esc === 'base') { resetVariables(); return; }
    if (esc === 'subir-precios') setVars((v) => ({ ...v, precio: Math.round(v.precio * 1.10) }));
    if (esc === 'abrir-domingo') setVars((v) => ({ ...v, dias: 7 }));
  }

  async function guardarEscenario() {
    if (!nombreEsc.trim()) { toast.error('Ingresa un nombre para el escenario'); return; }
    setSaving(true);
    try {
      await simuladorApi.guardarEscenario(nid, {
        Nombre: nombreEsc,
        PeriodoBaseInicio: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
        PeriodoBaseFin: new Date().toISOString().slice(0, 10),
        IngresosDiariosActual: actual.ingresosDia,
        UtilidadNetaActual: actual.utilidadDia,
        MargenActual: actual.margen,
        EquilibrioActual: actual.equilibrio,
        IngresosDiariosSimulado: simulado.ingresosDia,
        UtilidadNetaSimulado: simulado.utilidadDia,
        MargenSimulado: simulado.margen,
        EquilibrioSimulado: simulado.equilibrio,
      });
      setModalGuardar(false);
      setNombreEsc('');
      toast.success('Escenario guardado');
      const r = await simuladorApi.listarEscenarios(nid);
      setEscenarios(r.data.Data || []);
    } catch (err) {
      toast.error(err.response?.data?.Mensaje || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const ROWS = [
    { label: 'Ingresos diarios',    actual: actual.ingresosDia,  sim: simulado.ingresosDia,  isMoney: true },
    { label: 'Costo de ventas/día', actual: actual.costoDia,     sim: simulado.costoDia,     isMoney: true },
    { label: 'Costos fijos/día',    actual: actual.fijosDia,     sim: simulado.fijosDia,     isMoney: true },
    { label: 'Utilidad neta/día',   actual: actual.utilidadDia,  sim: simulado.utilidadDia,  isMoney: true },
    { label: 'Margen de ganancia',  actual: actual.margen,       sim: simulado.margen,       isMoney: false, isPct: true },
    { label: 'Punto de equilibrio', actual: actual.equilibrio,   sim: simulado.equilibrio,   isMoney: true },
  ];

  const diferenciaUtil = simulado.utilidadDia - actual.utilidadDia;
  const diferenciaMargen = simulado.margen - actual.margen;

  function conclusion() {
    const partes = [];
    if (Math.abs(diferenciaUtil) > 100) partes.push(`La utilidad diaria ${diferenciaUtil > 0 ? 'aumentaría' : 'disminuiría'} en ${fmt(Math.abs(diferenciaUtil))}`);
    if (Math.abs(diferenciaMargen) > 0.5) partes.push(`el margen ${diferenciaMargen > 0 ? 'mejoraría' : 'empeoraría'} ${Math.abs(diferenciaMargen).toFixed(1)} puntos porcentuales`);
    if (vars.dias !== VARS_DEFAULT.dias) partes.push(`operando ${vars.dias} días/semana (~${Math.round(vars.dias * 4.33)} días/mes)`);
    if (partes.length === 0) return 'Ajusta las variables para ver el impacto en tu negocio.';
    return `Con este escenario, ${partes.join(', ')}.`;
  }

  const sliders = [
    { key: 'precio', label: 'Precio promedio', min: 2500, max: 5500, step: 100, format: fmt },
    { key: 'costo',  label: 'Costo unitario promedio', min: 800, max: 2500, step: 50, format: fmt },
    { key: 'volumen', label: 'Volumen de ventas diario', min: 20, max: 150, step: 1, format: (v) => `${v} uds/día` },
    { key: 'fijos',  label: 'Costos fijos mensuales', min: 500000, max: 3000000, step: 50000, format: fmt },
    { key: 'dias',   label: 'Días operativos por semana', min: 1, max: 7, step: 1, format: (v) => `${v} días` },
  ];

  return (
    <>
      <div className="fo-topbar">
        <div>
          <h1 className="fo-page-title">Simulador financiero</h1>
          <p className="fo-page-sub">Evalúa el impacto de tus decisiones antes de tomarlas · Base: últimos 30 días</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => setModalGuardar(true)}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Guardar escenario
        </button>
      </div>

      {/* Escenarios guardados */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '.8rem', color: 'var(--fo-text-muted)', alignSelf: 'center' }}>Escenarios:</span>
        {[
          { key: 'base', label: 'Base actual' },
          { key: 'subir-precios', label: 'Subir precios 10%' },
          { key: 'abrir-domingo', label: 'Abrir domingos' },
          ...escenarios.map((e) => ({ key: `saved-${e.Id || e.id}`, label: e.Nombre || e.nombre })),
        ].map((e) => (
          <button key={e.key} onClick={() => cargarEscenario(e.key)}
            style={{ padding: '.4rem 1rem', borderRadius: 20, border: '1.5px solid var(--fo-border)', background: 'var(--fo-white)', fontSize: '.8rem', fontWeight: 500, cursor: 'pointer', color: 'var(--fo-text-secondary)', transition: 'all .18s' }}
            onMouseEnter={(el) => { el.target.style.background = 'var(--fo-primary)'; el.target.style.color = '#fff'; el.target.style.borderColor = 'var(--fo-primary)'; }}
            onMouseLeave={(el) => { el.target.style.background = 'var(--fo-white)'; el.target.style.color = 'var(--fo-text-secondary)'; el.target.style.borderColor = 'var(--fo-border)'; }}>
            {e.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '1rem' }}>
        {/* Variables */}
        <div className="fo-card">
          <div className="fo-card-header">
            <div className="fo-card-title">Variables del escenario</div>
            <button className="btn btn-ghost btn-sm" onClick={resetVariables}>Restablecer</button>
          </div>
          {sliders.map((s) => (
            <div key={s.key} style={{ padding: '1rem 0', borderBottom: '1px solid var(--fo-border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.625rem' }}>
                <span style={{ fontSize: '.875rem', fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontFamily: 'var(--fo-font-mono)', fontSize: '.875rem', fontWeight: 500, color: 'var(--fo-primary)' }}>{s.format(vars[s.key])}</span>
              </div>
              <input type="range" min={s.min} max={s.max} step={s.step} value={vars[s.key]}
                onChange={(e) => setVars((p) => ({ ...p, [s.key]: parseFloat(e.target.value) }))}
                style={{ width: '100%', height: 4, appearance: 'none', background: `linear-gradient(to right, var(--fo-primary) ${((vars[s.key] - s.min) / (s.max - s.min)) * 100}%, var(--fo-surface) 0%)`, borderRadius: 2, outline: 'none', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--fo-text-muted)', marginTop: '.25rem' }}>
                <span>{s.format(s.min)}</span><span>{s.format(s.max)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Resultados */}
        <div>
          <div className="fo-card" style={{ marginBottom: '1rem' }}>
            <div className="fo-card-header">
              <div className="fo-card-title">Comparativo de resultados</div>
              <span className={`badge ${diferenciaUtil > 0 ? 'badge-success' : diferenciaUtil < 0 ? 'badge-danger' : 'badge-neutral'}`}>
                {diferenciaUtil > 0 ? '▲' : diferenciaUtil < 0 ? '▼' : '='} {diferenciaUtil > 0 ? '+' : ''}{fmt(diferenciaUtil)}/día
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.875rem' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '.625rem 1rem', fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--fo-text-secondary)', borderBottom: '2px solid var(--fo-border)' }}>Indicador</th>
                  <th style={{ textAlign: 'right', padding: '.625rem 1rem', fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--fo-text-secondary)', borderBottom: '2px solid var(--fo-border)' }}>Actual</th>
                  <th style={{ textAlign: 'right', padding: '.625rem 1rem', fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--fo-primary)', borderBottom: '2px solid var(--fo-border)' }}>Simulado</th>
                  <th style={{ textAlign: 'right', padding: '.625rem 1rem', fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', borderBottom: '2px solid var(--fo-border)' }}>Variación</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, i) => {
                  const diff = row.sim - row.actual;
                  const pct  = row.actual !== 0 ? (diff / Math.abs(row.actual)) * 100 : 0;
                  const isBetter = row.label.includes('Costo') ? diff < 0 : diff > 0;
                  return (
                    <tr key={i}>
                      <td style={{ padding: '.625rem 1rem', borderBottom: '1px solid var(--fo-border-light)', color: 'var(--fo-text-secondary)', fontSize: '.8rem' }}>{row.label}</td>
                      <td style={{ padding: '.625rem 1rem', borderBottom: '1px solid var(--fo-border-light)', textAlign: 'right', fontFamily: 'var(--fo-font-mono)', fontWeight: 500 }}>{row.isPct ? fmtPct(row.actual) : fmt(row.actual)}</td>
                      <td style={{ padding: '.625rem 1rem', borderBottom: '1px solid var(--fo-border-light)', textAlign: 'right', fontFamily: 'var(--fo-font-mono)', fontWeight: 500, color: 'var(--fo-primary)' }}>{row.isPct ? fmtPct(row.sim) : fmt(row.sim)}</td>
                      <td style={{ padding: '.625rem 1rem', borderBottom: '1px solid var(--fo-border-light)', textAlign: 'right', fontFamily: 'var(--fo-font-mono)', fontWeight: 500, color: diff === 0 ? 'var(--fo-text-muted)' : isBetter ? 'var(--fo-accent-dark)' : 'var(--fo-danger)' }}>
                        {diff === 0 ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Conclusión */}
          <div className="fo-card" style={{ background: 'var(--fo-info-lt)', borderColor: 'var(--fo-surface-dark)' }}>
            <div style={{ fontSize: '.875rem', lineHeight: 1.7, color: 'var(--fo-text)' }}>{conclusion()}</div>
          </div>
        </div>
      </div>

      <Modal open={modalGuardar} onClose={() => setModalGuardar(false)} title="Guardar escenario"
        footer={<><button className="btn btn-ghost" onClick={() => setModalGuardar(false)}>Cancelar</button><button className="btn btn-primary" onClick={guardarEscenario} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></>}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="label-text">Nombre del escenario <span className="required">*</span></label>
          <input className="fo-input" placeholder="Ej: Subir precio arepa + nuevos domingos" value={nombreEsc} onChange={(e) => setNombreEsc(e.target.value)} />
        </div>
      </Modal>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { jornadasApi } from '../../api/jornadas';
import { cierresApi } from '../../api/cierres';
import { productosApi } from '../../api/productos';
import { Alert, SummaryRow, DayResult } from '../../components/ui/index';
import { fmt, fmtPct, fmtFecha } from '../../utils/format';
import toast from 'react-hot-toast';

const STEPS = ['Conteo', 'Caja final', 'Validación', 'Resumen', 'Confirmar'];

export default function Cierre() {
  const { negocio } = useApp();
  const navigate = useNavigate();
  const nid = negocio?.Id || negocio?.id;

  const [paso, setPaso]           = useState(1);
  const [jornada, setJornada]     = useState(null);
  const [productos, setProductos] = useState([]);
  const [conteos, setConteos]     = useState({});
  const [cajaFinal, setCajaFinal] = useState('');
  const [conteoRealizado, setConteoRealizado] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [saving, setSaving]       = useState(false);

  const jid = jornada?.Id || jornada?.id;

  useEffect(() => {
    if (!nid) return;
    (async () => {
      try {
        const [jRes, pRes] = await Promise.all([jornadasApi.obtenerActiva(nid), productosApi.listar(nid)]);
        const j = jRes.data.Data;
        setJornada(j);
        setProductos(pRes.data.Data || []);
        if (j) {
          const mRes = await jornadasApi.listarMovimientos(nid, j.Id || j.id);
          setMovimientos(mRes.data.Data || []);
        }
      } catch {
        toast.error('No hay jornada activa'); navigate('/jornada');
      }
    })();
  }, [nid]);

  // Calcular caja esperada
  const cajaIni = jornada?.CajaInicial || 0;
  const cajaEsperada = movimientos.reduce((s, m) => s + (m.AfectaCaja ? (m.Monto || 0) * (m.SignoCaja || 1) : 0), cajaIni);
  const diferencia = parseFloat(cajaFinal || 0) - cajaEsperada;

  // Calcular ingresos por conteo
  const totalConteoIngresos = Object.entries(conteos).reduce((s, [id, uds]) => {
    const p = productos.find((x) => (x.Id || x.id) === parseInt(id));
    return s + (p ? (p.PrecioVenta || 0) * uds : 0);
  }, 0);
  const totalConteoCosto = Object.entries(conteos).reduce((s, [id, uds]) => {
    const p = productos.find((x) => (x.Id || x.id) === parseInt(id));
    return s + (p ? (p.CostoUnitario || 0) * uds : 0);
  }, 0);

  // Gastos de jornada (movimientos negativos operativos)
  const gastosJornada = movimientos.filter((m) => m.Tipo === 'gasto_operativo' || m.tipo === 'gasto_operativo')
    .reduce((s, m) => s + (m.Monto || 0), 0);

  async function confirmarCierre() {
    if (!cajaFinal) { toast.error('Ingresa la caja final'); return; }
    setSaving(true);
    try {
      const conteosArr = Object.entries(conteos)
        .filter(([, uds]) => uds > 0)
        .map(([id, uds]) => ({ ProductoId: parseInt(id), UnidadesVendidas: uds }));

      await cierresApi.confirmar(nid, jid, {
        CajaFinalRegistrada: parseFloat(cajaFinal),
        ConteoRealizado: conteoRealizado,
        Conteos: conteoRealizado ? conteosArr : [],
      });
      toast.success('¡Jornada cerrada correctamente!');
      navigate('/historial');
    } catch (err) {
      toast.error(err.response?.data?.Mensaje || 'Error al confirmar cierre');
    } finally {
      setSaving(false);
    }
  }

  function goTo(n) {
    if (n === 2 && !conteoRealizado && paso === 1) setConteoRealizado(false);
    setPaso(n);
  }

  const estadoDia = totalConteoIngresos - totalConteoCosto - gastosJornada > 0 ? 'rentable' : totalConteoIngresos > 0 ? 'equilibrio' : 'perdida';
  const margenDia = totalConteoIngresos > 0 ? ((totalConteoIngresos - totalConteoCosto - gastosJornada) / totalConteoIngresos) * 100 : 0;

  return (
    <>
      <div className="fo-topbar">
        <div>
          <h1 className="fo-page-title">Cierre de jornada</h1>
          <p className="fo-page-sub">{jornada ? fmtFecha(jornada.FechaReferencia || jornada.fechaReferencia) : 'Cargando...'}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/jornada')}>← Volver a la jornada</button>
      </div>

      {/* Stepper */}
      <div className="fo-card" style={{ marginBottom: '1.5rem', padding: '1.125rem 1.5rem' }}>
        <div className="fo-steps" style={{ marginBottom: 0 }}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const isDone = paso > n;
            const isActive = paso === n;
            return (
              <div key={n} className={`fo-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                <div className="step-circle">{isDone ? '✓' : n}</div>
                <span className="step-label">{label}</span>
                {n < STEPS.length && <div className="step-line" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* PASO 1: Conteo */}
      {paso === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="fo-card">
            <div className="fo-card-header">
              <div><div className="fo-card-title">Conteo de productos vendidos</div><div className="fo-card-subtitle">Ingresa las unidades vendidas hoy</div></div>
              <span className="badge badge-info">Recomendado</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="fo-table" style={{ minWidth: 480 }}>
                <thead><tr><th>Producto</th><th>Precio</th><th>Costo</th><th style={{ textAlign: 'center' }}>Unidades</th><th style={{ textAlign: 'right' }}>Subtotal</th></tr></thead>
                <tbody>
                  {productos.map((p) => {
                    const pid = p.Id || p.id;
                    const uds = conteos[pid] || 0;
                    return (
                      <tr key={pid}>
                        <td>{p.Nombre || p.nombre}</td>
                        <td className="mono">{fmt(p.PrecioVenta)}</td>
                        <td className="mono">{fmt(p.CostoUnitario)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input type="number" min="0" value={uds}
                            onFocus={(e) => { if (uds === 0) e.target.value = ''; }}
                            onBlur={(e) => { if (e.target.value === '') { setConteos((prev) => ({ ...prev, [pid]: 0 })); } }}
                            onChange={(e) => setConteos((prev) => ({ ...prev, [pid]: Math.max(0, parseInt(e.target.value) || 0) }))}
                            style={{ width: 90, textAlign: 'center', padding: '.375rem .5rem', border: '1.5px solid var(--fo-border)', borderRadius: 8, fontFamily: 'var(--fo-font-mono)', fontSize: '.875rem' }} />
                        </td>
                        <td style={{ textAlign: 'right' }} className={`amount ${uds > 0 ? 'pos' : ''}`}>{fmt((p.PrecioVenta || 0) * uds)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--fo-surface)' }}>
                    <td colSpan={3} style={{ fontWeight: 600, padding: '.875rem 1rem' }}>Total estimado</td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--fo-font-mono)', padding: '.875rem 1rem' }}>{Object.values(conteos).reduce((s, v) => s + v, 0)} uds</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--fo-font-mono)', fontWeight: 700, color: 'var(--fo-primary)', padding: '.875rem 1rem', fontSize: '1rem' }}>{fmt(totalConteoIngresos)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div>
            <div className="fo-card" style={{ marginBottom: '.75rem' }}>
              <div style={{ fontSize: '.85rem', fontWeight: 500, marginBottom: '.5rem' }}>Vista previa de ingresos</div>
              <div style={{ fontFamily: 'var(--fo-font-mono)', fontSize: '1.35rem', fontWeight: 500, color: 'var(--fo-primary)' }}>{fmt(totalConteoIngresos)}</div>
            </div>
            <div className="fo-card">
              <div style={{ fontSize: '.85rem', fontWeight: 500, marginBottom: '.5rem' }}>¿Por qué hacer el conteo?</div>
              <div style={{ fontSize: '.8125rem', color: 'var(--fo-text-secondary)', lineHeight: 1.75, marginBottom: '.875rem' }}>Permite calcular el <strong>margen exacto</strong> y validar si la caja cuadra con las ventas.</div>
              <button className="btn btn-ghost btn-sm btn-block" onClick={() => { setConteoRealizado(false); goTo(2); }}>Omitir este paso</button>
              <div style={{ fontSize: '.775rem', color: 'var(--fo-text-muted)', textAlign: 'center', marginTop: '.375rem' }}>Los indicadores serán estimados</div>
            </div>
          </div>
        </div>
      )}

      {/* PASO 2: Caja final */}
      {paso === 2 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="fo-card" style={{ padding: '2.5rem 2rem', textAlign: 'center', maxWidth: 440, width: '100%' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '.375rem' }}>¿Cuánto hay en caja ahora?</div>
            <div style={{ fontSize: '.875rem', color: 'var(--fo-text-muted)', marginBottom: '1.75rem' }}>Cuenta el efectivo físico antes de cerrar</div>
            <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--fo-border)', borderRadius: 12, maxWidth: 300, margin: '0 auto', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.125rem', background: 'var(--fo-surface)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--fo-primary)', borderRight: '2px solid var(--fo-border)' }}>$</div>
              <input type="text" inputMode="decimal" placeholder="0" min="0" value={cajaFinal} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); setCajaFinal(v); }}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1.5rem', fontFamily: 'var(--fo-font-mono)', textAlign: 'right', padding: '1rem', background: 'transparent' }} />
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.375rem' }}>
              <div style={{ fontSize: '.775rem', color: 'var(--fo-text-muted)' }}>Caja inicial: <strong>{fmt(cajaIni)}</strong></div>
              <div style={{ fontSize: '.775rem', color: 'var(--fo-text-muted)' }}>Caja esperada: <strong style={{ color: 'var(--fo-primary)' }}>{fmt(cajaEsperada)}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* PASO 3: Validación */}
      {paso === 3 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="fo-card" style={{ maxWidth: 680, width: '100%' }}>
            <div className="fo-card-header">
              <div className="fo-card-title">Reconciliación de caja</div>
              <span className={`badge ${Math.abs(diferencia) < 1000 ? 'badge-success' : 'badge-danger'}`}>{Math.abs(diferencia) < 1000 ? 'Cuadra' : 'Diferencia'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
              <div style={{ background: 'var(--fo-surface)', borderRadius: 12, padding: '1.25rem' }}>
                <div style={{ fontSize: '.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--fo-text-muted)', marginBottom: '.5rem' }}>Caja esperada</div>
                <div style={{ fontFamily: 'var(--fo-font-mono)', fontSize: '1.5rem', fontWeight: 500, color: 'var(--fo-primary)', marginBottom: '.875rem' }}>{fmt(cajaEsperada)}</div>
                <div style={{ height: 1, background: 'var(--fo-border)', margin: '.625rem 0' }} />
                <div style={{ fontSize: '.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.3rem 0' }}><span style={{ color: 'var(--fo-text-secondary)' }}>Caja inicial</span><span style={{ fontFamily: 'var(--fo-font-mono)' }}>{fmt(cajaIni)}</span></div>
                  {movimientos.filter((m) => m.AfectaCaja).slice(0, 5).map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '.3rem 0', borderTop: '1px solid var(--fo-border-light)' }}>
                      <span style={{ color: 'var(--fo-text-secondary)', fontSize: '.775rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.Descripcion || m.descripcion}</span>
                      <span style={{ fontFamily: 'var(--fo-font-mono)', fontWeight: 500, color: (m.SignoCaja || 0) > 0 ? 'var(--fo-accent-dark)' : 'var(--fo-danger)' }}>{(m.SignoCaja || 0) > 0 ? '+' : '-'}{fmt(m.Monto || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ background: 'var(--fo-surface)', borderRadius: 12, padding: '1.125rem', textAlign: 'center', marginBottom: '.75rem' }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--fo-text-muted)', marginBottom: '.375rem' }}>Caja que contaste</div>
                  <div style={{ fontFamily: 'var(--fo-font-mono)', fontSize: '1.5rem', fontWeight: 500 }}>{fmt(parseFloat(cajaFinal || 0))}</div>
                </div>
                <div style={{ borderRadius: 12, padding: '1.125rem', textAlign: 'center', border: '1.5px solid', background: Math.abs(diferencia) < 1000 ? 'var(--fo-success-lt)' : 'var(--fo-danger-lt)', borderColor: Math.abs(diferencia) < 1000 ? '#a8dfc4' : '#f5b8b8' }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--fo-text-muted)', marginBottom: '.375rem' }}>Diferencia</div>
                  <div style={{ fontFamily: 'var(--fo-font-mono)', fontSize: '1.4rem', fontWeight: 500, color: diferencia >= 0 ? 'var(--fo-accent-dark)' : 'var(--fo-danger)' }}>{diferencia >= 0 ? '+' : ''}{fmt(diferencia)}</div>
                  <div style={{ fontSize: '.775rem', marginTop: '.375rem', color: 'var(--fo-text-secondary)' }}>{Math.abs(diferencia) < 100 ? 'La caja cuadra perfectamente' : diferencia > 0 ? 'Sobrante en caja' : 'Faltante en caja'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PASO 4: Resumen */}
      {paso === 4 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="fo-card">
            <div className="fo-card-header">
              <div className="fo-card-title">Estado de resultados del día</div>
              <span className={`badge ${conteoRealizado ? 'badge-success' : 'badge-neutral'}`}>{conteoRealizado ? 'Con conteo' : 'Estimado'}</span>
            </div>
            <SummaryRow label="Ingresos operativos" value={fmt(totalConteoIngresos)} />
            <SummaryRow label="Costo de lo vendido" value={fmt(totalConteoCosto)} cls="s-neg" />
            <SummaryRow label="Utilidad bruta" value={fmt(totalConteoIngresos - totalConteoCosto)} cls="s-pos highlight" />
            <hr className="fo-divider" style={{ margin: '.5rem 0' }} />
            <SummaryRow label="Gastos de la jornada" value={fmt(gastosJornada)} cls="s-neg" />
            <SummaryRow label="Utilidad neta" value={fmt(totalConteoIngresos - totalConteoCosto - gastosJornada)} cls="s-total" />
            <DayResult estado={estadoDia} icon={estadoDia === 'rentable' ? '✅' : estadoDia === 'perdida' ? '❌' : '⚖️'}
              title={estadoDia === 'rentable' ? 'Día rentable' : estadoDia === 'perdida' ? 'Día con pérdida' : 'En equilibrio'}
              sub={`Margen estimado: ${fmtPct(margenDia)}`} />
          </div>
          <div>
            <div className="fo-card" style={{ marginBottom: '1rem' }}>
              <div className="fo-card-header"><div className="fo-card-title">Indicadores del día</div></div>
              <SummaryRow label="Margen de ganancia" value={fmtPct(margenDia)} />
              <SummaryRow label="Diferencia de caja" value={`${diferencia >= 0 ? '+' : ''}${fmt(diferencia)}`} />
            </div>
          </div>
        </div>
      )}

      {/* PASO 5: Confirmar */}
      {paso === 5 && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="fo-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: 500, width: '100%' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 500, marginBottom: '.375rem' }}>¿Confirmar el cierre?</div>
            <div style={{ fontSize: '.875rem', color: 'var(--fo-text-muted)', marginBottom: '1.75rem' }}>Una vez cerrada la jornada solo puede modificarse con justificación registrada en auditoría.</div>
            <div className="fo-card" style={{ background: 'var(--fo-surface)', border: 'none', textAlign: 'left', marginBottom: '1.25rem' }}>
              <SummaryRow label="Ingresos del día"   value={fmt(totalConteoIngresos)} />
              <SummaryRow label="Utilidad neta"      value={fmt(totalConteoIngresos - totalConteoCosto - gastosJornada)} />
              <SummaryRow label="Margen de ganancia" value={fmtPct(margenDia)} />
              <SummaryRow label="Diferencia de caja" value={`${diferencia >= 0 ? '+' : ''}${fmt(diferencia)}`} />
            </div>
            {!conteoRealizado && (
              <Alert type="info" icon="ℹ️"><span style={{ fontSize: '.8rem' }}>El conteo fue omitido. Los indicadores son <strong>estimados</strong>.</span></Alert>
            )}
            <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setPaso(4)}>← Revisar resumen</button>
              <button className="btn btn-accent btn-lg" onClick={confirmarCierre} disabled={saving}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                {saving ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navegación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--fo-border-light)' }}>
        <button className="btn btn-ghost" style={{ visibility: paso === 1 ? 'hidden' : 'visible' }} onClick={() => setPaso((p) => p - 1)}>← Anterior</button>
        {paso < 5 && (
          <button className="btn btn-primary" onClick={() => {
            if (paso === 1) { setConteoRealizado(Object.values(conteos).some(v => v > 0)); }
            if (paso === 2 && !cajaFinal) { toast.error('Ingresa la caja final'); return; }
            goTo(paso + 1);
          }}>Siguiente →</button>
        )}
      </div>
    </>
  );
}

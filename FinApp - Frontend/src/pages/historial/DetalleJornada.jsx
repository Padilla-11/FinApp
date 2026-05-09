import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cierresApi } from '../../api/cierres';
import { jornadasApi } from '../../api/jornadas';
import { SummaryRow, DayResult, EstadoBadge, EmptyState } from '../../components/ui/index';
import { Modal } from '../../components/ui/Modal';
import { fmt, fmtPct, fmtFecha, fmtHora } from '../../utils/format';
import toast from 'react-hot-toast';

const TIPOS_ICON = {
  gasto_operativo: { icon: '💸', cls: 'gasto' },
  compra_mercancia: { icon: '📦', cls: 'compra' },
  ingreso_no_operativo: { icon: '💵', cls: 'ingreso' },
  retiro_dueno: { icon: '🏦', cls: 'retiro' },
  cobro_cuenta_por_cobrar: { icon: '💰', cls: 'cobro' },
};

export default function DetalleJornada() {
  const { negocio } = useApp();
  const { id } = useParams();
  const navigate = useNavigate();
  const nid = negocio?.Id || negocio?.id;

  const [cierre, setCierre]         = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [tabActiva, setTabActiva]   = useState('mov');
  const [modalCorr, setModalCorr]   = useState(false);
  const [justificacion, setJustificacion] = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    if (!nid || !id) return;
    (async () => {
      try {
        // Primero obtener el cierre del historial para tener el JornadaId
        const hRes = await cierresApi.historial(nid, 1, 100);
        const cierres = hRes.data?.Data || [];
        const cierreData = cierres.find((x) => String(x.Id || x.id) === String(id));

        if (!cierreData) {
          navigate('/historial');
          return;
        }

        // Obtener datos completos del cierre usando el endpoint de obtener por jornada
        const jid = cierreData.JornadaId || cierreData.jornadaId;
        if (jid) {
          const cierreRes = await cierresApi.obtener(nid, jid);
          const cierreCompleto = cierreRes.data?.Data;
          setCierre(cierreCompleto);

          // Obtener movimientos de la jornada
          const mRes = await jornadasApi.listarMovimientos(nid, jid);
          setMovimientos(mRes.data.Data || []);
        } else {
          setCierre(cierreData);
        }
      } catch {
        navigate('/historial');
      } finally {
        setLoading(false);
      }
    })();
  }, [nid, id]);

  async function solicitarCorreccion() {
    if (!justificacion.trim()) { toast.error('La justificación es obligatoria'); return; }
    setSaving(true);
    try {
      await cierresApi.corregir(nid, id, { Justificacion: justificacion });
      setModalCorr(false);
      toast.success('Corrección registrada en auditoría');
    } catch (err) {
      toast.error(err.response?.data?.Mensaje || 'Error al registrar corrección');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--fo-text-muted)' }}>Cargando...</div>;
  if (!cierre) return <div style={{ padding: '3rem', textAlign: 'center' }}><EmptyState icon="❌" text="No se encontró esta jornada" /></div>;

  const estado    = cierre.EstadoDia    || cierre.estadoDia;
  const ingresos  = cierre.IngresosOperativos || 0;
  const costo     = cierre.CostoVendido || 0;
  const utilBruta = cierre.UtilidadBruta || (ingresos - costo);
  const gastos    = cierre.GastosJornada || 0;
  const fijos     = cierre.CostosFijosDia || 0;
  const utilNeta  = cierre.UtilidadNeta || 0;
  const margen    = cierre.MargenGanancia || 0;
  const cajaIni   = cierre.CajaInicial || 0;
  const cajaEsp   = cierre.CajaEsperada || 0;
  const cajaReg   = cierre.CajaFinalRegistrada || 0;
  const diffCaja  = cierre.DiferenciaCaja || 0;

  const iconMap = { rentable: '✅', perdida: '❌', equilibrio: '⚖️' };
  const titleMap = { rentable: 'Día rentable', perdida: 'Día con pérdida', equilibrio: 'En equilibrio' };

  return (
    <>
      <div className="fo-topbar">
        <div>
          <h1 className="fo-page-title">Jornada del {fmtFecha(cierre.FechaReferencia || cierre.fechaReferencia || cierre.CreadoEn || cierre.creadoEn)}</h1>
          <p className="fo-page-sub">Cierre confirmado</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/historial')}>← Volver al historial</button>
          <button className="btn btn-outline btn-sm" onClick={() => setModalCorr(true)}>Solicitar corrección</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
        {/* Izquierda: resultados + caja */}
        <div>
          <div className="fo-card" style={{ marginBottom: '1rem' }}>
            <div className="fo-card-header">
              <div className="fo-card-title">Estado de resultados</div>
              <EstadoBadge estado={estado} />
            </div>
            <SummaryRow label="Ingresos operativos" value={fmt(ingresos)} />
            <SummaryRow label="Costo de lo vendido" value={fmt(costo)}    cls="s-neg" />
            <SummaryRow label="Utilidad bruta"      value={fmt(utilBruta)} cls="s-pos" />
            <hr className="fo-divider" style={{ margin: '.25rem 0' }} />
            <SummaryRow label="Gastos de la jornada" value={fmt(gastos)} cls="s-neg" />
            <SummaryRow label="Costos fijos del día" value={fmt(fijos)}  cls="s-neg" />
            <SummaryRow label="Utilidad neta"        value={fmt(utilNeta)} cls="s-total" />
            <DayResult estado={estado} icon={iconMap[estado]} title={titleMap[estado]}
              sub={`Margen: ${fmtPct(margen)}`} />
          </div>

          <div className="fo-card">
            <div className="fo-card-header"><div className="fo-card-title">Reconciliación de caja</div></div>
            <SummaryRow label="Caja inicial"    value={fmt(cajaIni)} />
            <SummaryRow label="Caja esperada"   value={fmt(cajaEsp)} />
            <SummaryRow label="Caja registrada" value={fmt(cajaReg)} />
            <SummaryRow label="Diferencia"      value={`${diffCaja >= 0 ? '+' : ''}${fmt(diffCaja)}`}
              style={{ color: diffCaja === 0 ? 'var(--fo-accent-dark)' : diffCaja > 0 ? 'var(--fo-warning)' : 'var(--fo-danger)' }} />
          </div>
        </div>

        {/* Derecha: tabs */}
        <div className="fo-card">
          <div className="fo-tabs">
            {[{ key: 'mov', label: `Movimientos (${movimientos.length})` }, { key: 'prod', label: 'Productos vendidos' }, { key: 'audit', label: 'Auditoría' }].map((t) => (
              <button key={t.key} className={`fo-tab ${tabActiva === t.key ? 'active' : ''}`} onClick={() => setTabActiva(t.key)}>{t.label}</button>
            ))}
          </div>

          {tabActiva === 'mov' && (
            <>
              {movimientos.length === 0 ? <EmptyState icon="📋" text="Sin movimientos registrados" /> :
                movimientos.map((m, i) => {
                  const info = TIPOS_ICON[m.Tipo || m.tipo] || { icon: '📌', cls: 'compra' };
                  const esPos = (m.SignoCaja || 0) > 0;
                  return (
                    <div key={i} className="movement">
                      <div className={`movement-icon ${info.cls}`}>{info.icon}</div>
                      <div className="movement-info">
                        <div className="movement-desc">{m.Descripcion || m.descripcion}</div>
                        <div className="movement-meta">{fmtHora(m.RegistradoEn || m.registradoEn)}</div>
                      </div>
                      <div className={`movement-amount ${esPos ? 'pos' : 'neg'}`}>{esPos ? '+' : '-'}{fmt(m.Monto || 0)}</div>
                    </div>
                  );
                })
              }
            </>
          )}

          {tabActiva === 'prod' && (
            <>
              {(!cierre.Conteos || cierre.Conteos?.length === 0) ? (
                <EmptyState icon="📦" text="No se realizó conteo de productos en esta jornada" />
              ) : (
                <div className="fo-table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
                  <table className="fo-table">
                    <thead><tr><th>Producto</th><th>Uds</th><th>Precio</th><th>Costo</th><th>Subtotal</th></tr></thead>
                    <tbody>
                      {(cierre.Conteos || []).map((c, i) => (
                        <tr key={i}>
                          <td>{c.ProductoNombre || `Producto ${c.ProductoId}`}</td>
                          <td className="mono">{c.UnidadesVendidas}</td>
                          <td className="mono">{fmt(c.PrecioVenta)}</td>
                          <td className="mono">{fmt(c.CostoUnitario)}</td>
                          <td className="amount pos">{fmt(c.SubtotalIngresos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tabActiva === 'audit' && (
            <EmptyState icon="🔒" text="Sin correcciones registradas. Esta jornada no ha sido modificada." />
          )}
        </div>
      </div>

      {/* Modal corrección */}
      <Modal open={modalCorr} onClose={() => setModalCorr(false)} title="Solicitar corrección"
        footer={<><button className="btn btn-ghost" onClick={() => setModalCorr(false)}>Cancelar</button><button className="btn btn-primary" onClick={solicitarCorreccion} disabled={saving}>{saving ? 'Guardando...' : 'Continuar'}</button></>}>
        <div className="alert warning" style={{ marginBottom: '1rem' }}>
          <span className="alert-icon">⚠️</span>
          <div className="alert-text" style={{ fontSize: '.8rem' }}>Cualquier cambio quedará registrado en el log de auditoría con tu usuario y la justificación.</div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="label-text">Justificación <span className="required">*</span></label>
          <textarea className="fo-input" style={{ resize: 'vertical', minHeight: 80 }} placeholder="Explica por qué necesitas corregir esta jornada..."
            value={justificacion} onChange={(e) => setJustificacion(e.target.value)} />
        </div>
      </Modal>
    </>
  );
}

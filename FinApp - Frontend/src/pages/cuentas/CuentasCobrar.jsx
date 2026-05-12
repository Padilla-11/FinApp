import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { cuentasApi } from '../../api/otros';
import { jornadasApi } from '../../api/jornadas';
import { KpiCard, Alert, EstadoBadge, EmptyState } from '../../components/ui/index';
import { Modal } from '../../components/ui/Modal';
import { fmt, fmtFechaCorta } from '../../utils/format';
import toast from 'react-hot-toast';

export default function CuentasCobrar() {
  const { negocio } = useApp();
  const nid = negocio?.Id || negocio?.id;

  const [cuentas, setCuentas]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filtro, setFiltro]     = useState('');
  const [jornadaActiva, setJornadaActiva] = useState(null);

  const [modalCobro, setModalCobro] = useState(false);
  const [cuentaActiva, setCuentaActiva] = useState(null);
  const [montoCobro, setMontoCobro]   = useState('');
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    if (!nid) return;
    cargar();
  }, [nid]);

  async function cargar() {
    setLoading(true);
    try {
      const [cRes, jRes] = await Promise.allSettled([
        cuentasApi.listar(nid),
        jornadasApi.obtenerActiva(nid),
      ]);
      if (cRes.status === 'fulfilled') setCuentas(cRes.value.data.Data || []);
      if (jRes.status === 'fulfilled') setJornadaActiva(jRes.value.data.Data);
    } finally {
      setLoading(false);
    }
  }

  const lista = filtro ? cuentas.filter((c) => (c.Estado || c.estado) === filtro) : cuentas;

  const pendientes = cuentas.filter((c) => ['pendiente', 'cobrado_parcial'].includes(c.Estado || c.estado));
  const totalPendiente = pendientes.reduce((s, c) => s + ((c.MontoTotal || 0) - (c.MontoCobrado || 0)), 0);

  const hoy = new Date();
  const vencidas = pendientes.filter((c) => {
    const d = new Date(c.FechaRegistro || c.fechaRegistro);
    return (hoy - d) / (1000 * 60 * 60 * 24) > 7;
  });
  const totalVencidas = vencidas.reduce((s, c) => s + ((c.MontoTotal || 0) - (c.MontoCobrado || 0)), 0);

  const cobradas = cuentas.filter((c) => (c.Estado || c.estado) === 'cobrado');
  const totalCobrado = cobradas.reduce((s, c) => s + (c.MontoCobrado || c.montoCobrado || 0), 0);

  function abrirModalCobro(cuenta) {
    if (!jornadaActiva) { toast.error('Necesitas tener una jornada activa para registrar cobros'); return; }
    setCuentaActiva(cuenta);
    setMontoCobro('');
    setModalCobro(true);
  }

  async function confirmarCobro() {
    if (!montoCobro || parseFloat(montoCobro) <= 0) { toast.error('Ingresa un monto válido'); return; }
    const pendiente = (cuentaActiva.MontoTotal || 0) - (cuentaActiva.MontoCobrado || 0);
    if (parseFloat(montoCobro) > pendiente) { toast.error(`El monto no puede superar ${fmt(pendiente)}`); return; }
    setSaving(true);
    try {
      const jid = jornadaActiva.Id || jornadaActiva.id;
      const vid  = cuentaActiva.Id || cuentaActiva.id;
      await cuentasApi.registrarCobro(nid, vid, jid, { MontoCobrado: parseFloat(montoCobro) });
      setModalCobro(false);
      toast.success('Cobro registrado exitosamente');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.Mensaje || 'Error al registrar cobro');
    } finally {
      setSaving(false);
    }
  }

  function diasDesde(iso) {
    if (!iso) return 0;
    return Math.floor((hoy - new Date(iso)) / (1000 * 60 * 60 * 24));
  }

  return (
    <>
      <div className="fo-topbar">
        <div>
          <h1 className="fo-page-title">Cuentas por cobrar</h1>
          <p className="fo-page-sub">Cartera pendiente · {negocio?.Nombre || negocio?.nombre}</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard label="Total por cobrar" value={fmt(totalPendiente)} type="warning" sub="Cartera activa" />
        <KpiCard label="Vencidas (+7 días)" value={fmt(totalVencidas)} type="danger" sub={`${vencidas.length} cuenta(s)`} />
        <KpiCard label="Cobros del mes" value={fmt(totalCobrado)} sub={`${cobradas.length} cuenta(s) cobrada(s)`} />
        <KpiCard label="Clientes activos" value={pendientes.length} sub="con saldo pendiente" />
      </div>

      {/* Alerta vencidas */}
      {vencidas.length > 0 && (
        <Alert type="danger" icon="🔴" title="Cuentas vencidas">
          {vencidas.map((c) => `${c.NombreCliente || c.nombreCliente} (${fmt((c.MontoTotal || 0) - (c.MontoCobrado || 0))})`).join(' · ')} — llevan más de 7 días sin pagar.
        </Alert>
      )}

      {!jornadaActiva && (
        <Alert type="info" icon="ℹ️">Necesitas una jornada activa para registrar cobros. <a href="/jornada" style={{ fontWeight: 500 }}>Abrir jornada →</a></Alert>
      )}

      {/* Tabla */}
      <div className="fo-card" style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--fo-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="fo-card-title">Detalle de cuentas</div>
          <select className="fo-input fo-select" style={{ width: 'auto' }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="cobrado_parcial">Cobro parcial</option>
            <option value="cobrado">Cobradas</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--fo-text-muted)' }}>Cargando cuentas...</div>
        ) : lista.length === 0 ? (
          <EmptyState icon="card" text="No hay cuentas que coincidan con el filtro" />
        ) : (
          <div className="fo-table-wrap" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table className="fo-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Descripción</th>
                  <th>Total</th>
                  <th>Cobrado</th>
                  <th>Pendiente</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c, i) => {
                  const estado    = c.Estado || c.estado;
                  const total     = c.MontoTotal || 0;
                  const cobrado   = c.MontoCobrado || 0;
                  const pendiente = total - cobrado;
                  const dias      = diasDesde(c.FechaRegistro || c.fechaRegistro);
                  const esVencida = dias > 7 && estado !== 'cobrado';
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{c.NombreCliente || c.nombreCliente}</td>
                      <td style={{ color: 'var(--fo-text-secondary)', fontSize: '.85rem' }}>{c.Descripcion || c.descripcion || '—'}</td>
                      <td className="amount">{fmt(total)}</td>
                      <td className="amount pos">{fmt(cobrado)}</td>
                      <td className={`amount ${pendiente > 0 ? 'neg' : ''}`}>{fmt(pendiente)}</td>
                      <td>
                        <span style={{ color: esVencida ? 'var(--fo-danger)' : 'var(--fo-text-muted)', fontWeight: esVencida ? 600 : 400, fontSize: '.85rem' }}>
                          {dias}d {esVencida && '⚠️'}
                        </span>
                      </td>
                      <td><EstadoBadge estado={estado} /></td>
                      <td>
                        {estado !== 'cobrado' && (
                          <button className="btn btn-accent btn-sm" onClick={() => abrirModalCobro(c)}>Cobrar</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal cobro */}
      <Modal open={modalCobro} onClose={() => setModalCobro(false)} title={`Registrar cobro — ${cuentaActiva?.NombreCliente || ''}`}
        footer={<><button className="btn btn-ghost" onClick={() => setModalCobro(false)}>Cancelar</button><button className="btn btn-accent" onClick={confirmarCobro} disabled={saving}>{saving ? 'Registrando...' : 'Confirmar cobro'}</button></>}>
        {cuentaActiva && (
          <>
            <div className="fo-card" style={{ background: 'var(--fo-surface)', border: 'none', marginBottom: '1rem', padding: '.875rem 1rem' }}>
              <div className="summary-row" style={{ fontSize: '.875rem' }}><span className="s-label">Deuda total</span><span className="s-value">{fmt(cuentaActiva.MontoTotal)}</span></div>
              <div className="summary-row" style={{ border: 'none', fontSize: '.875rem' }}><span className="s-label">Ya cobrado</span><span className="s-value" style={{ color: 'var(--fo-accent-dark)' }}>{fmt(cuentaActiva.MontoCobrado)}</span></div>
              <div className="summary-row" style={{ border: 'none', fontSize: '.875rem' }}><span className="s-label">Saldo pendiente</span><span className="s-value" style={{ color: 'var(--fo-danger)' }}>{fmt((cuentaActiva.MontoTotal || 0) - (cuentaActiva.MontoCobrado || 0))}</span></div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="label-text">Monto a cobrar ahora <span className="required">*</span></label>
              <div className="input-prefix">
                <span className="input-prefix-text">$</span>
                <input className="fo-input" type="number" placeholder="0" min="1"
                  max={(cuentaActiva.MontoTotal || 0) - (cuentaActiva.MontoCobrado || 0)}
                  value={montoCobro} onChange={(e) => setMontoCobro(e.target.value)} />
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

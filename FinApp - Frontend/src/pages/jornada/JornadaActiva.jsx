import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { jornadasApi } from '../../api/jornadas';
import { cuentasApi } from '../../api/otros';
import { Modal } from '../../components/ui/Modal';
import { Alert, EmptyState, EstadoBadge } from '../../components/ui/index';
import { fmt, fmtHora, fmtFecha } from '../../utils/format';
import { MOV_ICONS } from '../../utils/icons';
import { ClockIcon, MapPinIcon } from '@heroicons/react/20/solid';
import toast from 'react-hot-toast';

import { getProximoDiaPrueba } from '../../utils/diasPrueba';

const TIPOS_MOV = {
  gasto_operativo:       { label: 'Gasto operativo',       Icon: MOV_ICONS.gasto_operativo.Icon, cls: 'gasto',   signo: -1, title: 'Registrar gasto' },
  compra_mercancia:      { label: 'Compra de mercancía',   Icon: MOV_ICONS.compra_mercancia.Icon, cls: 'compra',  signo: -1, title: 'Compra de mercancía' },
  ingreso_no_operativo:  { label: 'Ingreso no operativo',  Icon: MOV_ICONS.ingreso_no_operativo.Icon, cls: 'ingreso', signo:  1, title: 'Ingreso no operativo' },
  retiro_dueno:          { label: 'Retiro del dueño',      Icon: MOV_ICONS.retiro_dueno.Icon, cls: 'retiro',  signo: -1, title: 'Retiro del dueño' },
};

export default function JornadaActiva() {
  const { negocio } = useApp();
  const navigate = useNavigate();
  const nid = negocio?.Id || negocio?.id;

  const [jornada, setJornada]       = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loadingJ, setLoadingJ]     = useState(true);

  // Modales
  const [modalApertura, setModalApertura] = useState(false);
  const [modalMov, setModalMov]     = useState(false);
  const [modalCredito, setModalCredito] = useState(false);
  const [tipoActivo, setTipoActivo] = useState('gasto_operativo');

  // Forms
  const [cajaInicial, setCajaInicial] = useState('150000');
  const [notaApertura, setNotaApertura] = useState('');
  const [movForm, setMovForm] = useState({ descripcion: '', monto: '', nota: '' });
  const [creditoForm, setCreditoForm] = useState({ nombreCliente: '', descripcion: '', monto: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (nid) cargar(); }, [nid]);

  async function cargar() {
    setLoadingJ(true);
    try {
      const res = await jornadasApi.obtenerActiva(nid);
      const j = res.data.Data;
      setJornada(j);
      if (j) {
        const mRes = await jornadasApi.listarMovimientos(nid, j.Id || j.id);
        setMovimientos(mRes.data.Data || []);
      }
    } catch {
      setJornada(null);
      setModalApertura(true);
    } finally {
      setLoadingJ(false);
    }
  }

  async function abrirJornada() {
    if (!cajaInicial) { toast.error('Ingresa la caja inicial'); return; }
    setSaving(true);
    try {
      const payload = {
        CajaInicial: parseFloat(cajaInicial),
        NotaApertura: notaApertura || null,
      };
      if (import.meta.env.VITE_TEST_MODE === 'true') {
        payload.FechaReferencia = getProximoDiaPrueba();
      }
      const res = await jornadasApi.abrir(nid, payload);
      setJornada(res.data.Data);
      setModalApertura(false);
      setMovimientos([]);
      toast.success('Jornada abierta');
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || err.response?.data?.Mensaje || 'Error al abrir jornada';
      toast.error(mensaje);
    } finally {
      setSaving(false);
    }
  }

  function abrirModalMov(tipo) {
    setTipoActivo(tipo);
    setMovForm({ descripcion: '', monto: '', nota: '' });
    setModalMov(true);
  }

  async function registrarMovimiento() {
    if (!movForm.descripcion || !movForm.monto) { toast.error('Completa descripción y monto'); return; }
    setSaving(true);
    try {
      const jid = jornada.Id || jornada.id;
      await jornadasApi.registrarMovimiento(nid, jid, {
        Tipo: tipoActivo,
        Descripcion: movForm.descripcion,
        Monto: parseFloat(movForm.monto),
        Nota: movForm.nota || null,
      });
      const mRes = await jornadasApi.listarMovimientos(nid, jid);
      setMovimientos(mRes.data.Data || []);
      setModalMov(false);
      toast.success('Movimiento registrado');
    } catch (err) {
      toast.error(err.response?.data?.Mensaje || 'Error al registrar');
    } finally {
      setSaving(false);
    }
  }

  async function registrarVentaCredito() {
    if (!creditoForm.nombreCliente || !creditoForm.monto) { toast.error('Cliente y monto son requeridos'); return; }
    setSaving(true);
    try {
      const jid = jornada.Id || jornada.id;
      await jornadasApi.registrarVentaCredito(nid, jid, {
        NombreCliente: creditoForm.nombreCliente,
        Descripcion: creditoForm.descripcion || null,
        MontoTotal: parseFloat(creditoForm.monto),
      });
      setModalCredito(false);
      setCreditoForm({ nombreCliente: '', descripcion: '', monto: '' });
      toast.success('Venta a crédito registrada');
    } catch (err) {
      toast.error(err.response?.data?.Mensaje || 'Error al registrar crédito');
    } finally {
      setSaving(false);
    }
  }

  // Calcular caja estimada
  const cajaIni = jornada?.CajaInicial || 0;
  const cajaEstimada = movimientos.reduce((s, m) => s + (m.AfectaCaja ? (m.Monto || 0) * (m.SignoCaja || 1) : 0), cajaIni);
  const gastosHoy = movimientos.filter((m) => m.SignoCaja === -1 && m.AfectaCaja).reduce((s, m) => s + (m.Monto || 0), 0);

  if (loadingJ) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--fo-text-muted)' }}>Cargando jornada...</div>;

  return (
    <>
      <div className="fo-topbar">
        <div>
          <h1 className="fo-page-title">Jornada activa</h1>
          <p className="fo-page-sub">{jornada ? `Abierta a las ${fmtHora(jornada.AbiertaEn || jornada.abiertaEn)}` : 'Sin jornada abierta'}</p>
        </div>
        <span className="badge badge-warning" style={{ fontSize: '.75rem', display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}><ClockIcon style={{ width: 12, height: 12 }} /> En curso</span>
      </div>

      {!jornada && (
        <div className="fo-empty">
          <div className="fo-empty-icon"><ClockIcon /></div>
          <div className="fo-empty-text">No hay jornada activa</div>
          <button className="btn btn-accent" style={{ marginTop: '1rem' }} onClick={() => setModalApertura(true)}>Abrir nueva jornada</button>
        </div>
      )}

      {jornada && (
        <>
          {/* Status bar con caja */}
          <div className="status-bar open">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem' }}>
              <span className="status-dot" />
              <span>Datos preliminares — jornada no cerrada</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Caja inicial', val: fmt(cajaIni) },
                { label: 'Caja estimada', val: fmt(cajaEstimada) },
                { label: 'Gastos hoy', val: `-${fmt(gastosHoy)}`, danger: true },
              ].map((item) => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,.6)', borderRadius: 8, padding: '.5rem .875rem' }}>
                  <div style={{ fontSize: '.7rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--fo-text-muted)', marginBottom: '.2rem' }}>{item.label}</div>
                  <div style={{ fontFamily: 'var(--fo-font-mono)', fontSize: '.95rem', fontWeight: 500, color: item.danger ? 'var(--fo-danger)' : 'var(--fo-primary)' }}>{item.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.75rem', marginBottom: '1.5rem' }}>
            {Object.entries(TIPOS_MOV).map(([tipo, info]) => (
              <div key={tipo} onClick={() => abrirModalMov(tipo)}
                style={{ background: 'var(--fo-white)', border: '1.5px solid var(--fo-border-light)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '.5rem', cursor: 'pointer', transition: 'all .18s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--fo-primary)'; e.currentTarget.style.boxShadow = 'var(--fo-shadow)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--fo-border-light)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--fo-info-lt)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{info.Icon && <info.Icon style={{ width: 20, height: 20 }} />}</div>
                <div style={{ fontSize: '.875rem', fontWeight: 600 }}>{info.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            {/* Feed movimientos */}
            <div className="fo-card">
              <div className="fo-card-header">
                <div className="fo-card-title">Movimientos de hoy</div>
                <span className="badge badge-neutral">{movimientos.length} registros</span>
              </div>
              {movimientos.length === 0 ? (
                <EmptyState icon="clipboard" text="Aún no hay movimientos. Usa los botones de arriba." />
              ) : (
                movimientos.map((m, i) => {
                  const tipo = TIPOS_MOV[m.Tipo || m.tipo] || { Icon: MapPinIcon, cls: 'compra' };
                  const esPos = (m.SignoCaja || 0) > 0;
                  return (
                    <div key={i} className="movement">
                      <div className={`movement-icon ${tipo.cls}`}>{tipo.Icon && <tipo.Icon />}</div>
                      <div className="movement-info">
                        <div className="movement-desc">{m.Descripcion || m.descripcion}</div>
                        <div className="movement-meta">{fmtHora(m.RegistradoEn || m.registradoEn)} · {tipo.label}</div>
                      </div>
                      <div className={`movement-amount ${esPos ? 'pos' : 'neg'}`}>
                        {esPos ? '+' : '-'}{fmt(m.Monto || m.monto)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Panel derecho */}
            <div>
              <div className="fo-card" style={{ marginBottom: '1rem' }}>
                <div className="fo-card-header">
                  <div className="fo-card-title">Ventas a crédito</div>
                  <button className="btn btn-outline btn-sm" onClick={() => setModalCredito(true)}>+ Nueva</button>
                </div>
                <Alert type="info" icon="ℹ️">
                  <span style={{ fontSize: '.8rem' }}>Las ventas a crédito no afectan la caja hasta que se cobren.</span>
                </Alert>
              </div>
              <div className="fo-card">
                <div className="fo-card-title" style={{ marginBottom: '.75rem' }}>Cobros pendientes</div>
                <a href="/cuentas" className="btn btn-outline btn-block" style={{ fontSize: '.8rem' }}>Ver cartera →</a>
              </div>
            </div>
          </div>

          {/* FAB Cerrar */}
          <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }}>
            <button className="btn btn-accent btn-lg" onClick={() => navigate('/cierre')} style={{ boxShadow: '0 4px 16px rgba(76,175,130,.35)' }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              Cerrar jornada
            </button>
          </div>
        </>
      )}

      {/* Modal apertura */}
      <Modal open={modalApertura} onClose={() => !jornada && navigate('/dashboard')} title="Abrir nueva jornada"
        footer={<><button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Cancelar</button><button className="btn btn-accent" onClick={abrirJornada} disabled={saving}>{saving ? 'Abriendo...' : 'Abrir jornada'}</button></>}>
        <Alert type="info" icon="ℹ️"><span style={{ fontSize: '.8rem' }}>La caja inicial sugerida es igual a la del día anterior.</span></Alert>
        <div className="form-group">
          <label className="label-text">Caja inicial <span className="required">*</span></label>
          <div className="input-prefix"><span className="input-prefix-text">$</span><input className="fo-input" type="number" value={cajaInicial} onChange={(e) => setCajaInicial(e.target.value)} min="0" /></div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="label-text">Nota de apertura (opcional)</label>
          <input className="fo-input" type="text" placeholder="Ej: Día festivo, personal reducido..." value={notaApertura} onChange={(e) => setNotaApertura(e.target.value)} />
        </div>
      </Modal>

      {/* Modal movimiento */}
      <Modal open={modalMov} onClose={() => setModalMov(false)} title={TIPOS_MOV[tipoActivo]?.title || 'Movimiento'}
        footer={<><button className="btn btn-ghost" onClick={() => setModalMov(false)}>Cancelar</button><button className="btn btn-primary" onClick={registrarMovimiento} disabled={saving}>{saving ? 'Registrando...' : 'Registrar'}</button></>}>
        <div className="form-group">
          <label className="label-text">Descripción <span className="required">*</span></label>
          <input className="fo-input" type="text" placeholder="¿En qué fue este movimiento?" value={movForm.descripcion} onChange={(e) => setMovForm((p) => ({ ...p, descripcion: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="label-text">Monto <span className="required">*</span></label>
          <div className="input-prefix"><span className="input-prefix-text">$</span><input className="fo-input" type="number" placeholder="0" min="1" value={movForm.monto} onChange={(e) => setMovForm((p) => ({ ...p, monto: e.target.value }))} /></div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="label-text">Nota (opcional)</label>
          <input className="fo-input" type="text" placeholder="Observación adicional" value={movForm.nota} onChange={(e) => setMovForm((p) => ({ ...p, nota: e.target.value }))} />
        </div>
      </Modal>

      {/* Modal crédito */}
      <Modal open={modalCredito} onClose={() => setModalCredito(false)} title="Nueva venta a crédito"
        footer={<><button className="btn btn-ghost" onClick={() => setModalCredito(false)}>Cancelar</button><button className="btn btn-primary" onClick={registrarVentaCredito} disabled={saving}>{saving ? 'Registrando...' : 'Registrar'}</button></>}>
        <Alert type="info" icon="ℹ️"><span style={{ fontSize: '.8rem' }}>Esta venta no afectará la caja hasta que se registre el cobro.</span></Alert>
        <div className="form-group">
          <label className="label-text">Nombre del cliente <span className="required">*</span></label>
          <input className="fo-input" type="text" placeholder="Nombre del cliente o empresa" value={creditoForm.nombreCliente} onChange={(e) => setCreditoForm((p) => ({ ...p, nombreCliente: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="label-text">Descripción</label>
          <input className="fo-input" type="text" placeholder="Ej: Pedido empresarial 40 arepas" value={creditoForm.descripcion} onChange={(e) => setCreditoForm((p) => ({ ...p, descripcion: e.target.value }))} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="label-text">Monto total <span className="required">*</span></label>
          <div className="input-prefix"><span className="input-prefix-text">$</span><input className="fo-input" type="number" placeholder="0" min="1" value={creditoForm.monto} onChange={(e) => setCreditoForm((p) => ({ ...p, monto: e.target.value }))} /></div>
        </div>
      </Modal>
    </>
  );
}

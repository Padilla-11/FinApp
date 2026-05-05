import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { negociosApi } from '../../api/negocios';
import { productosApi } from '../../api/productos';
import { costosFijosApi, empleadosApi, categoriasGastosApi } from '../../api/otros';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/index';
import { fmt, equivDiario } from '../../utils/format';
import toast from 'react-hot-toast';

const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

export default function Configuracion() {
  const { negocio, seleccionarNegocio } = useApp();
  const nid = negocio?.Id || negocio?.id;

  const [tab, setTab]               = useState('negocio');
  const [productos, setProductos]   = useState([]);
  const [costos, setCostos]         = useState([]);
  const [empleados, setEmpleados]   = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading]       = useState(true);

  // Negocio form
  const [negForm, setNegForm] = useState({ nombre: '', actividad: '', fechaInicio: '', dias: [] });

  // Modales
  const [modalProd, setModalProd]     = useState(false);
  const [modalCosto, setModalCosto]   = useState(false);
  const [modalEmp, setModalEmp]       = useState(false);
  const [modalCat, setModalCat]       = useState(false);
  const [modalUser, setModalUser]     = useState(false);

  // Forms
  const [prodForm, setProdForm]   = useState({ nombre: '', precio: '', costo: '' });
  const [costoForm, setCostoForm] = useState({ nombre: '', valor: '', frecuencia: 'mensual' });
  const [empForm, setEmpForm]     = useState({ nombre: '', cargo: '', tipoPago: 'mensual', valorPago: '' });
  const [catForm, setCatForm]     = useState({ nombre: '' });
  const [userForm, setUserForm]   = useState({ correo: '', rol: 'operador' });
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!nid) return;
    cargarTodo();
    if (negocio) {
      setNegForm({
        nombre: negocio.Nombre || negocio.nombre || '',
        actividad: negocio.TipoActividad || negocio.tipoActividad || '',
        fechaInicio: (negocio.FechaInicio || negocio.fechaInicio || '').slice(0, 10),
        dias: negocio.DiasOperacion || negocio.diasOperacion || [],
      });
    }
  }, [nid]);

  async function cargarTodo() {
    setLoading(true);
    try {
      const [pRes, cRes, eRes, catRes] = await Promise.allSettled([
        productosApi.listar(nid),
        costosFijosApi.listar(nid),
        empleadosApi.listar(nid),
        categoriasGastosApi.listar(nid),
      ]);
      if (pRes.status === 'fulfilled')   setProductos(pRes.value.data.Data || []);
      if (cRes.status === 'fulfilled')   setCostos(cRes.value.data.Data || []);
      if (eRes.status === 'fulfilled')   setEmpleados(eRes.value.data.Data || []);
      if (catRes.status === 'fulfilled') setCategorias(catRes.value.data.Data || []);
    } finally {
      setLoading(false);
    }
  }

  function toggleDia(d) {
    setNegForm((p) => ({
      ...p,
      dias: p.dias.includes(d) ? p.dias.filter((x) => x !== d) : [...p.dias, d].sort(),
    }));
  }

  async function guardarNegocio() {
    if (!negForm.nombre) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const res = await negociosApi.actualizar(nid, {
        Nombre: negForm.nombre,
        TipoActividad: negForm.actividad || null,
        FechaInicio: negForm.fechaInicio,
        DiasOperacion: negForm.dias,
      });
      seleccionarNegocio(res.data.Data);
      toast.success('Negocio actualizado');
    } catch (err) {
      toast.error(err.response?.data?.Mensaje || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function addProducto() {
    if (!prodForm.nombre || !prodForm.precio || !prodForm.costo) { toast.error('Todos los campos son requeridos'); return; }
    setSaving(true);
    try {
      await productosApi.crear(nid, { Nombre: prodForm.nombre, PrecioVenta: parseFloat(prodForm.precio), CostoUnitario: parseFloat(prodForm.costo) });
      setModalProd(false); setProdForm({ nombre: '', precio: '', costo: '' });
      cargarTodo(); toast.success('Producto agregado');
    } catch (err) { toast.error(err.response?.data?.Mensaje || 'Error'); } finally { setSaving(false); }
  }

  async function eliminarProducto(pid) {
    if (!confirm('¿Eliminar este producto?')) return;
    try { await productosApi.eliminar(nid, pid); cargarTodo(); toast.success('Producto eliminado'); }
    catch { toast.error('Error al eliminar'); }
  }

  async function addCosto() {
    if (!costoForm.nombre || !costoForm.valor) { toast.error('Nombre y valor son requeridos'); return; }
    setSaving(true);
    try {
      await costosFijosApi.crear(nid, { Nombre: costoForm.nombre, Valor: parseFloat(costoForm.valor), Frecuencia: costoForm.frecuencia });
      setModalCosto(false); setCostoForm({ nombre: '', valor: '', frecuencia: 'mensual' });
      cargarTodo(); toast.success('Costo fijo agregado');
    } catch { toast.error('Error'); } finally { setSaving(false); }
  }

  async function eliminarCosto(cid) {
    if (!confirm('¿Eliminar este costo fijo?')) return;
    try { await costosFijosApi.eliminar(nid, cid); cargarTodo(); toast.success('Eliminado'); }
    catch { toast.error('Error al eliminar'); }
  }

  async function addEmpleado() {
    if (!empForm.nombre || !empForm.valorPago) { toast.error('Nombre y valor son requeridos'); return; }
    setSaving(true);
    try {
      await empleadosApi.crear(nid, { Nombre: empForm.nombre, Cargo: empForm.cargo || null, TipoPago: empForm.tipoPago, ValorPago: parseFloat(empForm.valorPago) });
      setModalEmp(false); setEmpForm({ nombre: '', cargo: '', tipoPago: 'mensual', valorPago: '' });
      cargarTodo(); toast.success('Empleado agregado');
    } catch { toast.error('Error'); } finally { setSaving(false); }
  }

  async function eliminarEmpleado(eid) {
    if (!confirm('¿Eliminar este empleado?')) return;
    try { await empleadosApi.eliminar(nid, eid); cargarTodo(); toast.success('Eliminado'); }
    catch { toast.error('Error al eliminar'); }
  }

  async function addCategoria() {
    if (!catForm.nombre) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      await categoriasGastosApi.crear(nid, { Nombre: catForm.nombre });
      setModalCat(false); setCatForm({ nombre: '' });
      cargarTodo(); toast.success('Categoría agregada');
    } catch { toast.error('Error'); } finally { setSaving(false); }
  }

  async function invitarUsuario() {
    if (!userForm.correo) { toast.error('El correo es requerido'); return; }
    setSaving(true);
    try {
      await negociosApi.invitarMiembro(nid, { Correo: userForm.correo, Rol: userForm.rol });
      setModalUser(false); setUserForm({ correo: '', rol: 'operador' });
      toast.success('Invitación enviada');
    } catch (err) { toast.error(err.response?.data?.Mensaje || 'Error'); } finally { setSaving(false); }
  }

  const totalFijosMes = costos.reduce((s, c) => {
    const v = c.Valor || 0;
    const f = c.Frecuencia || c.frecuencia;
    return s + (f === 'mensual' ? v : f === 'semanal' ? v * 4.33 : v * 30);
  }, 0);
  const totalFijosDia = costos.reduce((s, c) => s + (c.EquivalenteDiario || equivDiario(c.Valor || 0, c.Frecuencia || c.frecuencia)), 0);
  const totalNominaDia = empleados.reduce((s, e) => s + (e.CostoDiario || equivDiario(e.ValorPago || 0, e.TipoPago || e.tipoPago)), 0);

  const TABS = [
    { key: 'negocio', label: 'Negocio' },
    { key: 'productos', label: 'Productos' },
    { key: 'costos', label: 'Costos fijos' },
    { key: 'nomina', label: 'Nómina' },
    { key: 'categorias', label: 'Categorías gastos' },
    { key: 'usuarios', label: 'Usuarios' },
  ];

  return (
    <>
      <div className="fo-topbar">
        <div>
          <h1 className="fo-page-title">Configuración</h1>
          <p className="fo-page-sub">{negocio?.Nombre || negocio?.nombre} · Administra tu negocio</p>
        </div>
        {tab === 'negocio' && <button className="btn btn-accent btn-sm" onClick={guardarNegocio} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>}
      </div>

      <div className="fo-tabs">
        {TABS.map((t) => <button key={t.key} className={`fo-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {/* TAB NEGOCIO */}
      {tab === 'negocio' && (
        <div className="fo-card">
          <div className="fo-card-header"><div className="fo-card-title">Datos del negocio</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="label-text">Nombre <span className="required">*</span></label>
              <input className="fo-input" value={negForm.nombre} onChange={(e) => setNegForm((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label-text">Tipo de actividad</label>
              <select className="fo-input fo-select" value={negForm.actividad} onChange={(e) => setNegForm((p) => ({ ...p, actividad: e.target.value }))}>
                <option value="">Selecciona</option>
                {['Alimentos y bebidas','Comercio al por menor','Servicios personales','Manufactura artesanal','Otro'].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label-text">Fecha de inicio</label>
            <input className="fo-input" type="date" style={{ maxWidth: 200 }} value={negForm.fechaInicio} onChange={(e) => setNegForm((p) => ({ ...p, fechaInicio: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label-text">Días de operación semanal</label>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
              {DIAS.map((d, i) => (
                <div key={i} onClick={() => toggleDia(i + 1)}
                  style={{ width: 44, height: 44, borderRadius: 8, border: '1.5px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 500, cursor: 'pointer', transition: 'all .18s',
                    background: negForm.dias.includes(i + 1) ? 'var(--fo-primary)' : 'var(--fo-white)',
                    borderColor: negForm.dias.includes(i + 1) ? 'var(--fo-primary)' : 'var(--fo-border)',
                    color: negForm.dias.includes(i + 1) ? '#fff' : 'var(--fo-text-secondary)',
                  }}>
                  {d}
                </div>
              ))}
            </div>
            <div className="fo-hint">Actualmente: <strong>{negForm.dias.length} días/semana → ~{Math.round(negForm.dias.length * 4.33)} días operativos por mes</strong></div>
          </div>
        </div>
      )}

      {/* TAB PRODUCTOS */}
      {tab === 'productos' && (
        <div className="fo-card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--fo-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="fo-card-title">Productos y servicios</div>
            <button className="btn btn-primary btn-sm" onClick={() => setModalProd(true)}>+ Agregar</button>
          </div>
          {productos.length === 0 ? <EmptyState icon="📦" text="No hay productos configurados" /> : (
            <div className="fo-table-wrap" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
              <table className="fo-table">
                <thead><tr><th>Producto</th><th>Precio venta</th><th>Costo unit.</th><th>Margen</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {productos.map((p) => {
                    const pid = p.Id || p.id;
                    const margen = p.MargenPorcentaje || (((p.PrecioVenta - p.CostoUnitario) / p.PrecioVenta) * 100);
                    return (
                      <tr key={pid}>
                        <td style={{ fontWeight: 500 }}>{p.Nombre || p.nombre}</td>
                        <td className="amount">{fmt(p.PrecioVenta)}</td>
                        <td className="amount">{fmt(p.CostoUnitario)}</td>
                        <td><span className={`badge ${margen >= 30 ? 'badge-success' : margen >= 15 ? 'badge-warning' : 'badge-danger'}`}>{margen?.toFixed(1)}%</span></td>
                        <td><span className={`badge ${(p.Activo ?? true) ? 'badge-success' : 'badge-neutral'}`}>{(p.Activo ?? true) ? 'Activo' : 'Inactivo'}</span></td>
                        <td><button className="btn btn-danger btn-sm" onClick={() => eliminarProducto(pid)}>Eliminar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB COSTOS FIJOS */}
      {tab === 'costos' && (
        <div className="fo-card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--fo-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="fo-card-title">Costos fijos</div>
              <div className="fo-card-subtitle">Total mensual: <strong>{fmt(totalFijosMes)}</strong> · Equiv. diario: <strong>{fmt(totalFijosDia)}</strong></div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setModalCosto(true)}>+ Agregar</button>
          </div>
          {costos.length === 0 ? <EmptyState icon="💰" text="No hay costos fijos configurados" /> : (
            <div className="fo-table-wrap" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
              <table className="fo-table">
                <thead><tr><th>Nombre</th><th>Valor</th><th>Frecuencia</th><th>Equiv. diario</th><th></th></tr></thead>
                <tbody>
                  {costos.map((c) => {
                    const cid = c.Id || c.id;
                    const ed  = c.EquivalenteDiario || equivDiario(c.Valor || 0, c.Frecuencia || c.frecuencia);
                    return (
                      <tr key={cid}>
                        <td style={{ fontWeight: 500 }}>{c.Nombre || c.nombre}</td>
                        <td className="amount">{fmt(c.Valor || c.valor)}</td>
                        <td><span className="badge badge-neutral">{c.Frecuencia || c.frecuencia}</span></td>
                        <td className="mono">{fmt(ed)}</td>
                        <td><button className="btn btn-danger btn-sm" onClick={() => eliminarCosto(cid)}>Eliminar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB NÓMINA */}
      {tab === 'nomina' && (
        <div className="fo-card" style={{ padding: 0 }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--fo-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="fo-card-title">Empleados</div>
              <div className="fo-card-subtitle">Costo laboral diario total: <strong>{fmt(totalNominaDia)}</strong></div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setModalEmp(true)}>+ Agregar</button>
          </div>
          {empleados.length === 0 ? <EmptyState icon="👥" text="No hay empleados registrados" /> : (
            <div className="fo-table-wrap" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
              <table className="fo-table">
                <thead><tr><th>Nombre</th><th>Cargo</th><th>Tipo pago</th><th>Valor</th><th>Costo/día</th><th></th></tr></thead>
                <tbody>
                  {empleados.map((e) => {
                    const eid = e.Id || e.id;
                    const cd  = e.CostoDiario || equivDiario(e.ValorPago || 0, e.TipoPago || e.tipoPago);
                    return (
                      <tr key={eid}>
                        <td style={{ fontWeight: 500 }}>{e.Nombre || e.nombre}</td>
                        <td style={{ color: 'var(--fo-text-muted)' }}>{e.Cargo || e.cargo || '—'}</td>
                        <td><span className="badge badge-neutral">{e.TipoPago || e.tipoPago}</span></td>
                        <td className="amount">{fmt(e.ValorPago || e.valorPago)}</td>
                        <td className="mono">{fmt(cd)}</td>
                        <td><button className="btn btn-danger btn-sm" onClick={() => eliminarEmpleado(eid)}>Eliminar</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CATEGORÍAS */}
      {tab === 'categorias' && (
        <div className="fo-card">
          <div className="fo-card-header">
            <div>
              <div className="fo-card-title">Categorías de gastos operativos</div>
              <div className="fo-card-subtitle">Usadas para clasificar movimientos durante la jornada</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setModalCat(true)}>+ Agregar</button>
          </div>
          {categorias.length === 0 ? <EmptyState icon="🏷️" text="No hay categorías configuradas" /> : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
              {categorias.map((c, i) => (
                <span key={i} className="badge badge-info" style={{ fontSize: '.8rem', padding: '.375rem .75rem' }}>
                  {c.Nombre || c.nombre}
                  {!(c.EsPredefinida || c.esPredefinida) && (
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '.375rem', color: 'var(--fo-primary)', fontWeight: 600 }}>✕</button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB USUARIOS */}
      {tab === 'usuarios' && (
        <div className="fo-card">
          <div className="fo-card-header">
            <div className="fo-card-title">Usuarios con acceso</div>
            <button className="btn btn-primary btn-sm" onClick={() => setModalUser(true)}>+ Invitar</button>
          </div>
          <div style={{ color: 'var(--fo-text-muted)', fontSize: '.875rem', padding: '1rem 0' }}>Gestión de miembros disponible próximamente con detalles completos.</div>
        </div>
      )}

      {/* Modales */}
      <Modal open={modalProd} onClose={() => setModalProd(false)} title="Agregar producto"
        footer={<><button className="btn btn-ghost" onClick={() => setModalProd(false)}>Cancelar</button><button className="btn btn-primary" onClick={addProducto} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></>}>
        <div className="form-group"><label className="label-text">Nombre <span className="required">*</span></label><input className="fo-input" placeholder="Nombre del producto" value={prodForm.nombre} onChange={(e) => setProdForm((p) => ({ ...p, nombre: e.target.value }))} /></div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}><label className="label-text">Precio de venta <span className="required">*</span></label><input className="fo-input" type="number" placeholder="0" value={prodForm.precio} onChange={(e) => setProdForm((p) => ({ ...p, precio: e.target.value }))} /></div>
          <div style={{ flex: 1 }}><label className="label-text">Costo unitario <span className="required">*</span></label><input className="fo-input" type="number" placeholder="0" value={prodForm.costo} onChange={(e) => setProdForm((p) => ({ ...p, costo: e.target.value }))} /></div>
        </div>
        {prodForm.precio && prodForm.costo && <div className="fo-hint">Margen: <strong>{(((prodForm.precio - prodForm.costo) / prodForm.precio) * 100).toFixed(1)}%</strong></div>}
      </Modal>

      <Modal open={modalCosto} onClose={() => setModalCosto(false)} title="Agregar costo fijo"
        footer={<><button className="btn btn-ghost" onClick={() => setModalCosto(false)}>Cancelar</button><button className="btn btn-primary" onClick={addCosto} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></>}>
        <div className="form-group"><label className="label-text">Nombre <span className="required">*</span></label><input className="fo-input" placeholder="Ej: Arriendo local" value={costoForm.nombre} onChange={(e) => setCostoForm((p) => ({ ...p, nombre: e.target.value }))} /></div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}><label className="label-text">Valor <span className="required">*</span></label><input className="fo-input" type="number" placeholder="0" value={costoForm.valor} onChange={(e) => setCostoForm((p) => ({ ...p, valor: e.target.value }))} /></div>
          <div style={{ flex: 1 }}><label className="label-text">Frecuencia</label>
            <select className="fo-input fo-select" value={costoForm.frecuencia} onChange={(e) => setCostoForm((p) => ({ ...p, frecuencia: e.target.value }))}>
              <option value="mensual">Mensual</option><option value="semanal">Semanal</option><option value="diaria">Diaria</option>
            </select>
          </div>
        </div>
        {costoForm.valor && <div className="fo-hint">Equiv. diario: <strong>{fmt(equivDiario(costoForm.valor, costoForm.frecuencia))}</strong></div>}
      </Modal>

      <Modal open={modalEmp} onClose={() => setModalEmp(false)} title="Agregar empleado"
        footer={<><button className="btn btn-ghost" onClick={() => setModalEmp(false)}>Cancelar</button><button className="btn btn-primary" onClick={addEmpleado} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></>}>
        <div className="form-group"><label className="label-text">Nombre <span className="required">*</span></label><input className="fo-input" placeholder="Nombre completo" value={empForm.nombre} onChange={(e) => setEmpForm((p) => ({ ...p, nombre: e.target.value }))} /></div>
        <div className="form-group"><label className="label-text">Cargo</label><input className="fo-input" placeholder="Ej: Cajera" value={empForm.cargo} onChange={(e) => setEmpForm((p) => ({ ...p, cargo: e.target.value }))} /></div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}><label className="label-text">Tipo de pago</label>
            <select className="fo-input fo-select" value={empForm.tipoPago} onChange={(e) => setEmpForm((p) => ({ ...p, tipoPago: e.target.value }))}>
              <option value="mensual">Mensual</option><option value="semanal">Semanal</option><option value="diario">Diario</option>
            </select>
          </div>
          <div style={{ flex: 1 }}><label className="label-text">Valor <span className="required">*</span></label><input className="fo-input" type="number" placeholder="0" value={empForm.valorPago} onChange={(e) => setEmpForm((p) => ({ ...p, valorPago: e.target.value }))} /></div>
        </div>
        {empForm.valorPago && <div className="fo-hint">Costo diario: <strong>{fmt(equivDiario(empForm.valorPago, empForm.tipoPago))}</strong></div>}
      </Modal>

      <Modal open={modalCat} onClose={() => setModalCat(false)} title="Nueva categoría de gasto"
        footer={<><button className="btn btn-ghost" onClick={() => setModalCat(false)}>Cancelar</button><button className="btn btn-primary" onClick={addCategoria} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></>}>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label-text">Nombre <span className="required">*</span></label><input className="fo-input" placeholder="Ej: Publicidad" value={catForm.nombre} onChange={(e) => setCatForm({ nombre: e.target.value })} /></div>
      </Modal>

      <Modal open={modalUser} onClose={() => setModalUser(false)} title="Invitar usuario"
        footer={<><button className="btn btn-ghost" onClick={() => setModalUser(false)}>Cancelar</button><button className="btn btn-primary" onClick={invitarUsuario} disabled={saving}>{saving ? 'Enviando...' : 'Enviar invitación'}</button></>}>
        <div className="form-group"><label className="label-text">Correo electrónico <span className="required">*</span></label><input className="fo-input" type="email" placeholder="correo@ejemplo.com" value={userForm.correo} onChange={(e) => setUserForm((p) => ({ ...p, correo: e.target.value }))} /></div>
        <div className="form-group" style={{ marginBottom: 0 }}><label className="label-text">Rol</label>
          <select className="fo-input fo-select" value={userForm.rol} onChange={(e) => setUserForm((p) => ({ ...p, rol: e.target.value }))}>
            <option value="operador">Operador — Solo registra jornadas</option>
            <option value="propietario">Propietario — Acceso completo</option>
          </select>
          <div className="fo-hint">{userForm.rol === 'operador' ? 'El operador puede registrar movimientos pero no ve los indicadores financieros.' : 'El propietario tiene acceso total al sistema.'}</div>
        </div>
      </Modal>
    </>
  );
}

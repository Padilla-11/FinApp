import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { negociosApi } from '../../api/negocios';
import { productosApi } from '../../api/productos';
import { costosFijosApi } from '../../api/otros';
import { useApp } from '../../context/AppContext';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

export default function Onboarding() {
  const { cargarNegocios, seleccionarNegocio } = useApp();
  const navigate = useNavigate();
  const [paso, setPaso] = useState(1);
  const [negocioId, setNegocioId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Paso 1
  const [negForm, setNegForm] = useState({ nombre: '', actividad: '', fechaInicio: '', dias: [1,2,3,4,5,6] });
  // Paso 2
  const [productos, setProductos] = useState([]);
  const [modalProd, setModalProd] = useState(false);
  const [prodForm, setProdForm] = useState({ nombre: '', precio: '', costo: '', categoria: '' });
  // Paso 3
  const [costos, setCostos] = useState([]);
  const [modalCosto, setModalCosto] = useState(false);
  const [costoForm, setCostoForm] = useState({ nombre: '', valor: '', frecuencia: 'mensual' });

  function toggleDia(d) {
    setNegForm((p) => ({
      ...p,
      dias: p.dias.includes(d) ? p.dias.filter((x) => x !== d) : [...p.dias, d].sort(),
    }));
  }

  async function paso1Next() {
    if (!negForm.nombre || !negForm.fechaInicio || negForm.dias.length === 0) {
      toast.error('Completa los campos obligatorios'); return;
    }
    setLoading(true);
    try {
      const res = await negociosApi.crear({
        Nombre: negForm.nombre,
        TipoActividad: negForm.actividad || null,
        FechaInicio: negForm.fechaInicio,
        DiasOperacion: negForm.dias,
      });
      const neg = res.data.Data;
      setNegocioId(neg.Id || neg.id);
      seleccionarNegocio(neg);
      setPaso(2);
    } catch (err) {
      toast.error(err.response?.data?.Mensaje || 'Error al crear negocio');
    } finally {
      setLoading(false);
    }
  }

  function addProducto() {
    if (!prodForm.nombre || !prodForm.precio || !prodForm.costo) { toast.error('Nombre, precio y costo son requeridos'); return; }
    setProductos((p) => [...p, { ...prodForm }]);
    setProdForm({ nombre: '', precio: '', costo: '', categoria: '' });
    setModalProd(false);
  }

  async function paso2Next() {
    if (productos.length === 0) { toast.error('Agrega al menos un producto'); return; }
    setLoading(true);
    try {
      for (const p of productos) {
        await productosApi.crear(negocioId, {
          Nombre: p.nombre, PrecioVenta: parseFloat(p.precio), CostoUnitario: parseFloat(p.costo),
        });
      }
      setPaso(3);
    } catch (err) {
      toast.error('Error al guardar productos');
    } finally {
      setLoading(false);
    }
  }

  function addCosto() {
    if (!costoForm.nombre || !costoForm.valor) { toast.error('Nombre y valor son requeridos'); return; }
    setCostos((p) => [...p, { ...costoForm }]);
    setCostoForm({ nombre: '', valor: '', frecuencia: 'mensual' });
    setModalCosto(false);
  }

  async function paso3Finish() {
    setLoading(true);
    try {
      for (const c of costos) {
        await costosFijosApi.crear(negocioId, {
          Nombre: c.nombre, Valor: parseFloat(c.valor), Frecuencia: c.frecuencia,
        });
      }
      await cargarNegocios();
      toast.success('¡Negocio configurado! Bienvenido a FinOp');
      navigate('/dashboard');
    } catch {
      toast.error('Error al guardar costos');
    } finally {
      setLoading(false);
    }
  }

  const equivDiario = (v, f, diasOperativos = 6) => {
    const n = parseFloat(v) || 0;
    if (f === 'diaria') return n;
    if (f === 'semanal') return n / diasOperativos;
    return n / Math.round(diasOperativos * 4.33);
  };

  const pills = [1,2,3].map((n) => (
    <div key={n} style={{ height: 4, flex: 1, borderRadius: 2, background: paso >= n ? (paso === n ? 'var(--fo-primary)' : 'var(--fo-accent)') : 'var(--fo-surface)' }} />
  ));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--fo-bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--fo-white)', borderBottom: '1px solid var(--fo-border-light)', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--fo-primary)' }}>FinOp</div>
        <div style={{ fontSize: '.875rem', color: 'var(--fo-text-muted)' }}>Configuración inicial — Paso {paso} de 3</div>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="fo-card" style={{ width: '100%', maxWidth: 600, padding: '2rem' }}>
          <div style={{ display: 'flex', gap: '.5rem', marginBottom: '2rem' }}>{pills}</div>

          {paso === 1 && (
            <>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '.375rem' }}>Cuéntanos sobre tu negocio</div>
              <div style={{ fontSize: '.875rem', color: 'var(--fo-text-muted)', marginBottom: '1.75rem' }}>Esta información es obligatoria para comenzar.</div>
              <div className="form-group">
                <label className="label-text">Nombre del negocio <span className="required">*</span></label>
                <input className="fo-input" placeholder="Ej: Fritos y Fritos" value={negForm.nombre} onChange={(e) => setNegForm((p) => ({ ...p, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label-text">Tipo de actividad</label>
                <select className="fo-input fo-select" value={negForm.actividad} onChange={(e) => setNegForm((p) => ({ ...p, actividad: e.target.value }))}>
                  <option value="">Selecciona una categoría</option>
                  {['Alimentos y bebidas','Comercio al por menor','Servicios personales','Manufactura artesanal','Servicios de transporte','Salud y belleza','Otro'].map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label-text">Fecha de inicio <span className="required">*</span></label>
                <input className="fo-input" type="date" value={negForm.fechaInicio} onChange={(e) => setNegForm((p) => ({ ...p, fechaInicio: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label-text">Días que opera tu negocio <span className="required">*</span></label>
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
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '.375rem' }}>Agrega tu primer producto</div>
              <div style={{ fontSize: '.875rem', color: 'var(--fo-text-muted)', marginBottom: '1.5rem' }}>Necesitas al menos uno para realizar cierres.</div>
              {productos.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '.75rem', background: 'var(--fo-surface)', borderRadius: 8, marginBottom: '.5rem' }}>
                  <div><strong>{p.nombre}</strong> <span style={{ fontSize: '.8rem', color: 'var(--fo-text-muted)' }}>— Precio: ${p.precio} · Costo: ${p.costo}</span></div>
                  <button onClick={() => setProductos((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--fo-danger)', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={() => setModalProd(true)}>+ Agregar producto</button>
            </>
          )}

          {paso === 3 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.25rem' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Costos fijos del negocio</div>
                <span className="badge badge-neutral">Opcional</span>
              </div>
              <div style={{ fontSize: '.875rem', color: 'var(--fo-text-muted)', marginBottom: '1.5rem' }}>Arriendos, servicios, nómina. Calculamos el equivalente diario automáticamente.</div>
              {costos.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '.75rem', background: 'var(--fo-surface)', borderRadius: 8, marginBottom: '.5rem' }}>
                  <div><strong>{c.nombre}</strong> <span style={{ fontSize: '.8rem', color: 'var(--fo-text-muted)' }}>— ${c.valor} / {c.frecuencia} · Equiv/día: ${equivDiario(c.valor, c.frecuencia, negForm.dias.length).toFixed(0)}</span></div>
                  <button onClick={() => setCostos((prev) => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--fo-danger)', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <button className="btn btn-outline btn-sm" onClick={() => setModalCosto(true)}>+ Agregar costo fijo</button>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--fo-border-light)' }}>
            <button className="btn btn-ghost" style={{ visibility: paso === 1 ? 'hidden' : 'visible' }} onClick={() => setPaso((p) => p - 1)}>← Atrás</button>
            {paso < 3
              ? <button className="btn btn-primary" onClick={paso === 1 ? paso1Next : paso2Next} disabled={loading}>{loading ? 'Guardando...' : 'Continuar →'}</button>
              : <button className="btn btn-accent" onClick={paso3Finish} disabled={loading}>{loading ? 'Finalizando...' : '¡Comenzar a usar FinOp!'}</button>
            }
          </div>
        </div>
      </div>

      {/* Modal Producto */}
      <Modal open={modalProd} onClose={() => setModalProd(false)} title="Agregar producto"
        footer={<><button className="btn btn-ghost" onClick={() => setModalProd(false)}>Cancelar</button><button className="btn btn-primary" onClick={addProducto}>Guardar</button></>}>
        <div className="form-group"><label className="label-text">Nombre <span className="required">*</span></label><input className="fo-input" placeholder="Ej: Arepa de choclo" value={prodForm.nombre} onChange={(e) => setProdForm((p) => ({ ...p, nombre: e.target.value }))} /></div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}><label className="label-text">Precio de venta <span className="required">*</span></label><input className="fo-input" type="number" placeholder="0" value={prodForm.precio} onChange={(e) => setProdForm((p) => ({ ...p, precio: e.target.value }))} /></div>
          <div style={{ flex: 1 }}><label className="label-text">Costo unitario <span className="required">*</span></label><input className="fo-input" type="number" placeholder="0" value={prodForm.costo} onChange={(e) => setProdForm((p) => ({ ...p, costo: e.target.value }))} /></div>
        </div>
        {prodForm.precio && prodForm.costo && (
          <div className="fo-hint" style={{ marginTop: '.5rem' }}>Margen estimado: <strong>{(((prodForm.precio - prodForm.costo) / prodForm.precio) * 100).toFixed(1)}%</strong></div>
        )}
      </Modal>

      {/* Modal Costo */}
      <Modal open={modalCosto} onClose={() => setModalCosto(false)} title="Agregar costo fijo"
        footer={<><button className="btn btn-ghost" onClick={() => setModalCosto(false)}>Cancelar</button><button className="btn btn-primary" onClick={addCosto}>Guardar</button></>}>
        <div className="form-group"><label className="label-text">Nombre <span className="required">*</span></label><input className="fo-input" placeholder="Ej: Arriendo local" value={costoForm.nombre} onChange={(e) => setCostoForm((p) => ({ ...p, nombre: e.target.value }))} /></div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}><label className="label-text">Valor <span className="required">*</span></label><input className="fo-input" type="number" placeholder="0" value={costoForm.valor} onChange={(e) => setCostoForm((p) => ({ ...p, valor: e.target.value }))} /></div>
          <div style={{ flex: 1 }}><label className="label-text">Frecuencia</label>
            <select className="fo-input fo-select" value={costoForm.frecuencia} onChange={(e) => setCostoForm((p) => ({ ...p, frecuencia: e.target.value }))}>
              <option value="mensual">Mensual</option><option value="semanal">Semanal</option><option value="diaria">Diaria</option>
            </select>
          </div>
        </div>
        {costoForm.valor && <div className="fo-hint">Equiv. diario: <strong>${equivDiario(costoForm.valor, costoForm.frecuencia, negForm.dias.length).toFixed(0)}</strong></div>}
      </Modal>
    </div>
  );
}

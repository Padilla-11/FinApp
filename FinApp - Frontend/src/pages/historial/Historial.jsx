import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cierresApi } from '../../api/cierres';
import { EstadoBadge, KpiCard, EmptyState } from '../../components/ui/index';
import { fmt, fmtPct, fmtFechaCorta } from '../../utils/format';

export default function Historial() {
  const { negocio } = useApp();
  const navigate = useNavigate();
  const nid = negocio?.Id || negocio?.id;

  const [cierres, setCierres]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [pagina, setPagina]     = useState(1);
  const [total, setTotal]       = useState(0);
  const [filtroEstado, setFiltroEstado] = useState('');
  const TAMANO = 20;

  useEffect(() => {
    if (!nid) return;
    cargar();
  }, [nid, pagina]);

  async function cargar() {
    setLoading(true);
    try {
      const res = await cierresApi.historial(nid, pagina, TAMANO);
      const data = res.data.Data;
      setCierres(data?.Items || data || []);
      setTotal(data?.Total || 0);
    } finally {
      setLoading(false);
    }
  }

  const lista = filtroEstado ? cierres.filter((c) => (c.EstadoDia || c.estadoDia) === filtroEstado) : cierres;

  // KPIs del conjunto visible
  const totalIngresos = lista.reduce((s, c) => s + (c.IngresosOperativos || 0), 0);
  const totalUtilidad = lista.reduce((s, c) => s + (c.UtilidadNeta || 0), 0);
  const diasRentables = lista.filter((c) => (c.EstadoDia || c.estadoDia) === 'rentable').length;
  const margenProm    = totalIngresos > 0 ? (totalUtilidad / totalIngresos) * 100 : 0;

  return (
    <>
      <div className="fo-topbar">
        <div>
          <h1 className="fo-page-title">Historial de jornadas</h1>
          <p className="fo-page-sub">{negocio?.Nombre || negocio?.nombre} · {total} jornadas registradas</p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <select className="fo-input fo-select" style={{ width: 'auto' }} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="rentable">Rentables</option>
            <option value="perdida">Con pérdida</option>
            <option value="equilibrio">En equilibrio</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <KpiCard label="Jornadas operadas"    value={lista.length}       sub={`de ${total} en total`} />
        <KpiCard label="Días rentables"       value={diasRentables}      type="accent" sub={`${lista.length ? Math.round(diasRentables / lista.length * 100) : 0}% del total`} />
        <KpiCard label="Ingreso promedio/día" value={fmt(lista.length ? totalIngresos / lista.length : 0)} sub="días operativos" />
        <KpiCard label="Margen promedio"      value={fmtPct(margenProm)} type="warning" sub="días con conteo" />
      </div>

      {/* Tabla */}
      <div className="fo-card" style={{ padding: 0 }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--fo-border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="fo-card-title">Detalle por jornada</div>
        </div>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--fo-text-muted)' }}>Cargando historial...</div>
        ) : lista.length === 0 ? (
          <EmptyState icon="calendar" text="No hay jornadas que coincidan con el filtro" />
        ) : (
          <div className="fo-table-wrap" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table className="fo-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ingresos</th>
                  <th>Costo vendido</th>
                  <th>Utilidad neta</th>
                  <th>Margen</th>
                  <th>Dif. caja</th>
                  <th>Estado</th>
                  <th>Cerrado por</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                  {lista.map((c, i) => {
                    const estado    = c.EstadoDia    || c.estadoDia;
                    const ingresos  = c.IngresosOperativos || 0;
                    const utilidad  = c.UtilidadNeta || 0;
                    const margen    = c.MargenGanancia || 0;
                    const diffCaja  = c.DiferenciaCaja || 0;
                    const fecha     = c.FechaReferencia || c.fechaReferencia || c.CreadoEn || c.creadoEn;
                    return (
                      <tr key={i} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 500 }}>{fmtFechaCorta(fecha)}</td>
                        <td className="amount">{fmt(ingresos)}</td>
                        <td className="amount neg">{fmt(c.CostoVendido || 0)}</td>
                        <td className={`amount ${utilidad >= 0 ? 'pos' : 'neg'}`}>{fmt(utilidad)}</td>
                        <td className="mono">{fmtPct(margen)}</td>
                        <td className={`mono ${diffCaja >= 0 ? '' : 'neg'}`}>{diffCaja >= 0 ? '+' : ''}{fmt(diffCaja)}</td>
                        <td><EstadoBadge estado={estado} /></td>
                        <td style={{ fontSize: '.75rem', color: 'var(--fo-text-muted)' }}>{c.CerradoPorNombre || c.cerradoPorNombre || ''}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/historial/${c.Id || c.id}`)}>Ver →</button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {total > TAMANO && (
          <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'center', gap: '.5rem', borderTop: '1px solid var(--fo-border-light)' }}>
            <button className="btn btn-ghost btn-sm" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>← Anterior</button>
            <span style={{ padding: '.3rem .75rem', fontSize: '.875rem', color: 'var(--fo-text-muted)' }}>Página {pagina} de {Math.ceil(total / TAMANO)}</span>
            <button className="btn btn-ghost btn-sm" disabled={pagina >= Math.ceil(total / TAMANO)} onClick={() => setPagina((p) => p + 1)}>Siguiente →</button>
          </div>
        )}
      </div>
    </>
  );
}

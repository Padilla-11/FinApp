import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cierresApi } from '../../api/cierres';
import { jornadasApi } from '../../api/jornadas';
import { cuentasApi } from '../../api/otros';
import { KpiCard, Alert, EstadoBadge, EmptyState } from '../../components/ui/index';
import { fmt, fmtPct, fmtFechaCorta, fmtHora } from '../../utils/format';
import { ChartBarIcon, CheckCircleIcon, CalendarDaysIcon } from '@heroicons/react/20/solid';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function Dashboard() {
  const { negocio, rol } = useApp();
  const navigate = useNavigate();
  const [historial, setHistorial]   = useState([]);
  const [jornada, setJornada]       = useState(null);
  const [cuentas, setCuentas]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const esOperador = rol === 'operador';

  const nid = negocio?.Id || negocio?.id;

  useEffect(() => {
    if (!nid) return;
    (async () => {
      setLoading(true);
      try {
        const [hRes, jRes, cRes] = await Promise.allSettled([
          cierresApi.historial(nid, 1, 30),
          jornadasApi.obtenerActiva(nid),
          cuentasApi.listar(nid),
        ]);
        if (hRes.status === 'fulfilled') setHistorial(hRes.value.data?.Data || []);
        if (jRes.status === 'fulfilled') setJornada(jRes.value.data.Data);
        if (cRes.status === 'fulfilled') setCuentas(cRes.value.data.Data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [nid]);

  const totalCobrar = cuentas.filter((c) => ['pendiente','cobrado_parcial'].includes(c.Estado || c.estado))
    .reduce((s, c) => s + ((c.MontoTotal || 0) - (c.MontoCobrado || 0)), 0);

  // ── PROPIETARIO ─────────────────────────────────────────────
  const mesActual = historial.filter((c) => {
    const fechaRef = c.FechaReferencia || c.fechaReferencia || c.CreadoEn || c.creadoEn;
    const d = new Date(fechaRef);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalIngresos  = mesActual.reduce((s, c) => s + (c.IngresosOperativos || 0), 0);
  const totalUtilidad  = mesActual.reduce((s, c) => s + (c.UtilidadNeta || 0), 0);
  const margenProm     = totalIngresos > 0 ? (totalUtilidad / totalIngresos) * 100 : 0;
  const diasRentables  = mesActual.filter((c) => (c.EstadoDia || c.estadoDia) === 'rentable').length;

  // ── OPERADOR ────────────────────────────────────────────────
  const ultimaJornada = historial[0] || null;
  const jornadasEsteMes = historial.filter((c) => {
    const d = new Date(c.FechaReferencia || c.fechaReferencia || c.CreadoEn || c.creadoEn);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const opDiasRentables = jornadasEsteMes.filter((c) => (c.EstadoDia || c.estadoDia) === 'rentable').length;

  // Datos para gráfica
  const chartData = historial.slice(0, esOperador ? 7 : 14).reverse().map((c) => ({
    fecha: fmtFechaCorta(c.FechaReferencia || c.fechaReferencia || c.CreadoEn || c.creadoEn),
    Ingresos: c.IngresosOperativos || c.ingresosOperativos || 0,
    Gastos: (c.GastosJornada || c.gastosJornada || 0) + (c.CostosFijosDia || c.costosFijosDia || 0) + (c.CostoVendido || c.costoVendido || 0),
  }));

  const alertas = [];
  if (jornada) alertas.push({ type: 'warning', title: 'Jornada abierta', text: `Tienes una jornada abierta desde las ${fmtHora(jornada.AbiertaEn || jornada.abiertaEn)}` });
  if (totalCobrar > 0) alertas.push({ type: 'info', title: 'Cuentas por cobrar', text: `Tienes ${fmt(totalCobrar)} pendientes de cobro.`, link: '/cuentas' });
  const racha = mesActual.slice(-3);
  if (!esOperador && racha.length >= 2 && racha.every((c) => (c.EstadoDia || c.estadoDia) === 'perdida')) alertas.push({ type: 'danger', title: 'Racha negativa', text: 'Llevas varios días consecutivos sin superar el punto de equilibrio.' });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
      <div style={{ textAlign: 'center', color: 'var(--fo-text-muted)' }}>Cargando dashboard...</div>
    </div>
  );

  return (
    <>
      <div className="fo-topbar">
        <div>
          <h1 className="fo-page-title">Dashboard</h1>
          <p className="fo-page-sub">{negocio?.Nombre || negocio?.nombre} · {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <button className="btn btn-accent" onClick={() => navigate('/jornada')}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>
          {jornada ? 'Ver jornada activa' : 'Abrir jornada'}
        </button>
      </div>

      {/* Status bar */}
      <div className={`status-bar ${jornada ? 'open' : 'closed'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.625rem' }}>
          <span className="status-dot" />
          {jornada
            ? <span>Jornada activa · abierta a las <strong>{fmtHora(jornada.AbiertaEn || jornada.abiertaEn)}</strong></span>
            : <span>Sin jornada activa</span>
          }
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/jornada')}>
          {jornada ? 'Ver jornada →' : 'Abrir jornada'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {esOperador ? (
          <>
            <KpiCard label="Última jornada" value={ultimaJornada ? fmtFechaCorta(ultimaJornada.FechaReferencia || ultimaJornada.fechaReferencia || ultimaJornada.CreadoEn || ultimaJornada.creadoEn) : '—'} sub={ultimaJornada ? `Ingresos: ${fmt(ultimaJornada.IngresosOperativos || 0)}` : 'Sin cierres'} />
            <KpiCard label="Utilidad" value={ultimaJornada ? fmt(ultimaJornada.UtilidadNeta || 0) : '—'} type={ultimaJornada && (ultimaJornada.UtilidadNeta || 0) >= 0 ? 'accent' : 'danger'} sub={ultimaJornada ? `Margen: ${fmtPct(ultimaJornada.MargenGanancia || 0)}` : ''} />
            <KpiCard label="Jornadas este mes" value={`${jornadasEsteMes.length}`} sub={jornadasEsteMes.length === 1 ? '1 cerrada' : `${jornadasEsteMes.length} cerradas`} />
            <KpiCard label="Días rentables" value={jornadasEsteMes.length > 0 ? `${opDiasRentables} / ${jornadasEsteMes.length}` : '—'} sub={jornadasEsteMes.length > 0 ? `${Math.round(opDiasRentables / jornadasEsteMes.length * 100)}% del total` : ''} />
          </>
        ) : (
          <>
            <KpiCard label="Ingresos del mes" value={fmt(totalIngresos)} sub={`${mesActual.length} jornadas`} />
            <KpiCard label="Utilidad neta" value={fmt(totalUtilidad)} type="accent" sub={`Margen: ${fmtPct(margenProm)}`} style={{ '--fo-kpi-val': 'var(--fo-accent-dark)' }} />
            <KpiCard label="Días rentables" value={`${diasRentables} / ${mesActual.length}`} sub="Este mes" />
            <KpiCard label="Cuentas por cobrar" value={fmt(totalCobrar)} type="warning" sub={`${cuentas.filter(c => ['pendiente','cobrado_parcial'].includes(c.Estado||c.estado)).length} clientes`} />
          </>
        )}
      </div>

      {/* Gráfica + Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="fo-card">
          <div className="fo-card-header">
            <div>
              <div className="fo-card-title">Ingresos vs Gastos</div>
              <div className="fo-card-subtitle">{esOperador ? 'Últimos 7 cierres' : 'Últimos 14 cierres'}</div>
            </div>
            <span className="badge badge-info">{new Date().toLocaleString('es-CO', { month: 'long', year: 'numeric' })}</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--fo-border-light)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--fo-text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--fo-text-muted)' }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v, n) => [fmt(v), n]} labelStyle={{ fontWeight: 600 }} />
                <Legend />
                <Bar dataKey="Ingresos" fill="#6B7C93" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos" fill="#A3D9BD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="chart" text="Aún no hay datos para mostrar" />
          )}
        </div>

        <div className="fo-card">
          <div className="fo-card-header">
            <div className="fo-card-title">Alertas activas</div>
            {alertas.length > 0 && <span className="badge badge-danger">{alertas.length}</span>}
          </div>
          {alertas.length === 0 ? (
            <EmptyState icon="check" text="Sin alertas activas" />
          ) : (
            alertas.map((a, i) => (
              <Alert key={i} type={a.type} icon={a.icon} title={a.title}>
                {a.text} {a.link && <a href={a.link} style={{ fontWeight: 500, marginLeft: '.375rem' }}>Ver →</a>}
              </Alert>
            ))
          )}
        </div>
      </div>

      {/* Últimas jornadas */}
      <div className="fo-card">
        <div className="fo-card-header">
          <div className="fo-card-title">Últimas jornadas</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/historial')}>Ver todo →</button>
        </div>
        {historial.length === 0 ? (
          <EmptyState icon="calendar" text="Aún no hay jornadas cerradas" />
        ) : (
          <div className="fo-table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="fo-table">
              <thead><tr><th>Fecha</th><th>Ingresos</th><th>Utilidad neta</th><th>Margen</th><th>Estado</th><th>Cerrado por</th></tr></thead>
              <tbody>
                {historial.slice(0, 5).map((c, i) => (
                  <tr key={i} style={{ cursor: 'pointer' }} onClick={() => navigate('/historial')}>
                    <td>{fmtFechaCorta(c.FechaReferencia || c.fechaReferencia || c.CreadoEn || c.creadoEn)}</td>
                    <td className="amount">{fmt(c.IngresosOperativos)}</td>
                    <td className={`amount ${(c.UtilidadNeta || 0) >= 0 ? 'pos' : 'neg'}`}>{fmt(c.UtilidadNeta)}</td>
                    <td className="mono">{fmtPct(c.MargenGanancia)}</td>
                    <td><EstadoBadge estado={c.EstadoDia || c.estadoDia} /></td>
                    <td style={{ fontSize: '.75rem', color: 'var(--fo-text-muted)' }}>{c.CerradoPorNombre || c.cerradoPorNombre || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

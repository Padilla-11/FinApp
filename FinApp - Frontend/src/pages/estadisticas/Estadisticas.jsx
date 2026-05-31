import { useApp } from '../../context/AppContext';
import { useHistorial } from '../../hooks/useHistorial';
import StatCardBase from '../../components/analisis/StatCardBase';
import SparkLine from '../../components/analisis/SparkLine';
import ProgresoBar from '../../components/analisis/ProgresoBar';
import DonutChart from '../../components/analisis/DonutChart';
import BarChartCard from '../../components/analisis/BarChartCard';
import AreaChartCard from '../../components/analisis/AreaChartCard';
import SemaphoroChart from '../../components/analisis/SemaphoroChart';
import EmptyChart from '../../components/analisis/EmptyChart';
import BannerResumen from '../../components/analisis/BannerResumen';
import DrawerInterpretacion from '../../components/analisis/DrawerInterpretacion';
import { EmptyState, Spinner } from '../../components/ui/index';
import { fmt, fmtPct } from '../../utils/format';
import { useEffect, useMemo, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';
import { analisisApi } from '../../api/analisis';

const PERIODOS = [
  { label: '7 días', valor: 7 },
  { label: '30 días', valor: 30 },
  { label: '90 días', valor: 90 },
];

function getStat(grupos, groupId, nombre) {
  const list = grupos?.[groupId];
  if (!list) return null;
  return list.find((s) => s.Nombre === nombre) || null;
}

function fmtStat(stat) {
  if (!stat || stat.Valor === null || stat.Valor === undefined) return '—';
  switch (stat.Formato) {
    case 'moneda': return fmt(stat.Valor);
    case 'porcentaje': return fmtPct(stat.Valor);
    case 'numero': return `${Math.round(stat.Valor).toLocaleString('es-CO')}${stat.Unidad ? ` ${stat.Unidad}` : ''}`;
    case 'fraccion': return Math.round(stat.Valor).toLocaleString('es-CO');
    default: return String(stat.Valor);
  }
}

const TABS = [
  { key: 'rentabilidad', label: 'Rentabilidad' },
  { key: 'operacion', label: 'Operación' },
  { key: 'costos', label: 'Costos' },
  { key: 'productos', label: 'Productos' },
  { key: 'cartera', label: 'Cartera' },
];

export default function Estadisticas() {
  const { negocio } = useApp();
  const nid = negocio?.Id || negocio?.id;
  const [tab, setTab] = useState('rentabilidad');

  const {
    loading, data, dias, error, jornadas, productos,
    resumen, meta, grupos, cambiarPeriodo,
  } = useHistorial(nid);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // ── Background IA fetch ──
  const [drawerStat, setDrawerStat] = useState(null);
  const [iaData, setIaData] = useState(null);
  const [iaCargando, setIaCargando] = useState(false);
  const [regenerando, setRegenerando] = useState(false);

  useEffect(() => {
    if (!nid) return;
    setIaCargando(true);
    setIaData(null);
    analisisApi.getCompleto(nid, dias)
      .then((res) => setIaData(res.data?.Data || res.data))
      .catch(() => {})
      .finally(() => setIaCargando(false));
  }, [nid, dias]);

  const interpretacionesMap = useMemo(() => {
    if (!iaData?.Grupos) return {};
    const map = {};
    Object.values(iaData.Grupos).forEach((list) => {
      list.forEach((stat) => {
        map[stat.Id] = {
          interpretacion: stat.Interpretacion,
          accion: stat.Accion,
          estado: stat.Estado,
        };
      });
    });
    return map;
  }, [iaData]);

  const cerrarDrawer = useCallback(() => setDrawerStat(null), []);
  const abrirDrawer = useCallback((stat) => {
    if (!stat) return;
    const merged = {
      ...stat,
      Interpretacion: interpretacionesMap[stat.Id]?.interpretacion ?? stat.Interpretacion,
      Accion: interpretacionesMap[stat.Id]?.accion ?? stat.Accion,
      Estado: interpretacionesMap[stat.Id]?.estado ?? stat.Estado,
    };
    setDrawerStat(merged);
  }, [interpretacionesMap]);

  const regenerarIa = useCallback(async () => {
    if (!nid) return;
    setRegenerando(true);
    try {
      const res = await analisisApi.regenerar(nid, dias);
      setIaData(res.data?.Data || res.data);
    } catch {
      toast.error('Error al regenerar la interpretación');
    } finally {
      setRegenerando(false);
    }
  }, [nid, dias]);

  // ── Computed chart data from jornadas ──
  const chartData = useMemo(() => {
    if (!jornadas?.length) return {};

    const sorted = [...jornadas].sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));

    // Utilidad neta acumulada + diaria
    let acum = 0;
    const utilidadAcum = sorted.map((j) => {
      acum += j.UtilidadNeta || 0;
      return { fecha: j.Fecha, acumulada: acum, diaria: j.UtilidadNeta || 0 };
    });

    // Crecimiento ingresos - week over week
    const weekMap = {};
    sorted.forEach((j) => {
      const d = new Date(j.Fecha);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weekMap[key]) weekMap[key] = { suma: 0, fechas: [] };
      weekMap[key].suma += j.Ingresos || 0;
      weekMap[key].fechas.push(j.Fecha);
    });
    const weekKeys = Object.keys(weekMap).sort();
    const ingresosSemanal = weekKeys.map((semana, idx) => {
      const curr = weekMap[semana].suma;
      const prev = idx > 0 ? weekMap[weekKeys[idx - 1]].suma : null;
      const cambio = prev && prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      return { semana, ingresos: curr, cambioPct: cambio };
    });

    // Día de semana performance
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayMap = {};
    sorted.forEach((j) => {
      const day = new Date(j.Fecha).getDay();
      if (!dayMap[day]) dayMap[day] = { sum: 0, count: 0 };
      dayMap[day].sum += j.UtilidadNeta || 0;
      dayMap[day].count++;
    });
    const diasSemana = Object.entries(dayMap).map(([day, v]) => ({
      name: dayNames[parseInt(day)],
      utilidad: Math.round(v.sum / v.count),
    }));

    // Margen neto & bruto spark line
    const margenes = sorted.map((j) => ({
      fecha: j.Fecha,
      neto: j.MargenNeto || 0,
      bruto: j.MargenBruto || 0,
    }));

    // Días rentables vs no rentables
    const rentables = jornadas.filter((j) => {
      const e = (j.EstadoDia || '').toLowerCase();
      return e === 'rentable' || e === 'bueno';
    }).length;
    const perdidas = jornadas.filter((j) => {
      const e = (j.EstadoDia || '').toLowerCase();
      return e === 'perdida' || e === 'critico';
    }).length;
    const equilibrio = jornadas.length - rentables - perdidas;

    const rentabilidadDonut = [
      { name: 'Rentables', value: rentables, color: '#4CAF82' },
      { name: 'Equilibrio', value: equilibrio, color: '#E8992A' },
      { name: 'Pérdida', value: perdidas, color: '#E05252' },
    ].filter((d) => d.value > 0);

    // Gasto promedio sparkline (from GastosJornada)
    const gastosProm = sorted.map((j) => ({
      fecha: j.Fecha,
      gasto: j.GastosJornada || 0,
    }));
    const gastoPromedioVal = gastosProm.length
      ? gastosProm.reduce((s, g) => s + g.gasto, 0) / gastosProm.length
      : 0;

    // Ingreso promedio sparkline
    const ingresosProm = sorted.map((j) => ({
      fecha: j.Fecha,
      ingreso: j.Ingresos || 0,
    }));
    const ingresoPromedioVal = ingresosProm.length
      ? ingresosProm.reduce((s, g) => s + g.ingreso, 0) / ingresosProm.length
      : 0;

    // Punto equilibrio promedio
    const puntoEquilibrioPromedio = sorted.reduce((s, j) => s + (j.PuntoEquilibrio || 0), 0) / sorted.length;

    // Días con ingreso que superó equilibrio (for "Días en equilibrio")
    const ingresosVsEquilibrio = sorted.map((j) => ({
      fecha: j.Fecha,
      ingreso: j.Ingresos || 0,
      equilibrio: j.PuntoEquilibrio || 0,
      sobreEquilibrio: (j.Ingresos || 0) >= (j.PuntoEquilibrio || 0),
    }));

    return {
      utilidadAcum,
      ingresosSemanal,
      diasSemana,
      margenes,
      rentabilidadDonut,
      gastosProm,
      gastoPromedioVal,
      ingresosProm,
      ingresoPromedioVal,
      puntoEquilibrioPromedio,
      ingresosVsEquilibrio,
      sorted,
    };
  }, [jornadas]);

  // ── Ranked productos ──
  const productosRank = useMemo(() => {
    if (!productos?.length) return [];
    return [...productos]
      .sort((a, b) => (b.Ingresos || 0) - (a.Ingresos || 0))
      .slice(0, 10);
  }, [productos]);

  // ── Margen por producto (para barras de % margen) ──
  const margenProductos = useMemo(() => {
    if (!productos?.length) return [];
    return [...productos]
      .sort((a, b) => (b.Margen || 0) - (a.Margen || 0))
      .slice(0, 10)
      .map((p) => ({ nombre: p.Nombre, margen: p.Margen || 0 }));
  }, [productos]);
  const margenPromedio = margenProductos.length
    ? margenProductos.reduce((s, p) => s + p.margen, 0) / margenProductos.length
    : 0;

  if (!nid) {
    return (
      <div className="fo-page">
        <EmptyState text="Selecciona un negocio para ver las estadísticas" />
      </div>
    );
  }

  return (
    <div className="fo-page">
      {/* ── Header ── */}
      <div className="fo-topbar">
        <h1 className="fo-page-title">Estadísticas</h1>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              onClick={() => cambiarPeriodo(p.valor)}
              className={`fo-btn-periodo ${dias === p.valor ? 'active' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Banner resumen ── */}
      <BannerResumen
        resumen={resumen}
        meta={meta}
        cargando={loading}
      />

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Spinner size={32} />
        </div>
      ) : !data ? (
        <EmptyState text="No hay datos suficientes para generar estadísticas" />
      ) : (
        <>
          <div className="fo-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`fo-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'rentabilidad' && <SeccionRentabilidad grupos={grupos} chartData={chartData} onStatClick={abrirDrawer} />}
          {tab === 'operacion' && <SeccionOperacion grupos={grupos} chartData={chartData} onStatClick={abrirDrawer} />}
          {tab === 'costos' && <SeccionCostos grupos={grupos} chartData={chartData} onStatClick={abrirDrawer} />}
          {tab === 'productos' && <SeccionProductos grupos={grupos} productosRank={productosRank} margenProductos={margenProductos} margenPromedio={margenPromedio} chartData={chartData} onStatClick={abrirDrawer} />}
          {tab === 'cartera' && <SeccionCartera grupos={grupos} onStatClick={abrirDrawer} />}
          {drawerStat && (
            <DrawerInterpretacion
              stat={drawerStat}
              iaCargando={iaCargando}
              onClose={cerrarDrawer}
              onRegenerar={regenerarIa}
              regenerando={regenerando}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Sección Rentabilidad ──
function SeccionRentabilidad({ grupos, chartData, onStatClick }) {
  const margenNeto = getStat(grupos, 'rentabilidad', 'Margen neto');
  const margenBruto = getStat(grupos, 'rentabilidad', 'Margen bruto');
  const jornadasRent = getStat(grupos, 'rentabilidad', 'Jornadas rentables');
  const utilidadNeta = getStat(grupos, 'rentabilidad', 'Utilidad neta acumulada');
  const rachaActual = getStat(grupos, 'rentabilidad', 'Racha actual');
  const crecimientoIng = getStat(grupos, 'rentabilidad', 'Crecimiento de ingresos');
  const rentabilidadDonut = chartData.rentabilidadDonut;
  const rentablesPct = rentabilidadDonut?.length
    ? ((rentabilidadDonut.find((d) => d.name === 'Rentables')?.value || 0) /
       rentabilidadDonut.reduce((s, d) => s + d.value, 0) * 100).toFixed(1)
    : '0.0';

  const crecimientoColorFn = (entry, idx, data) => {
    if (idx === 0) return '#3A5068';
    const prev = data[idx - 1]?.ingresos || 0;
    return entry.ingresos >= prev ? '#4CAF82' : '#E05252';
  };

  return (
    <section>
      <h2 className="fo-section-title">Rentabilidad</h2>
      <div className="chart-grid">
        <StatCardBase span={4} title="Margen Neto" subtitle={margenNeto?.Etiqueta} onClick={margenNeto ? () => onStatClick(margenNeto) : undefined}>
          {margenNeto ? (
            <ProgresoBar
              value={margenNeto.Valor} min={0} max={50} format="pct"
              zonas={[
                { from: 0, to: 20, color: '#E05252', label: 'Crítico' },
                { from: 20, to: 30, color: '#E8992A', label: 'Advertencia' },
                { from: 30, to: 50, color: '#4CAF82', label: 'Bueno' },
              ]}
            />
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={4} title="Margen Bruto" subtitle={margenBruto?.Etiqueta} onClick={margenBruto ? () => onStatClick(margenBruto) : undefined}>
          {margenBruto ? (
            <ProgresoBar
              value={margenBruto.Valor} min={0} max={70} format="pct"
              zonas={[
                { from: 0, to: 40, color: '#E05252', label: 'Crítico' },
                { from: 40, to: 55, color: '#E8992A', label: 'Advertencia' },
                { from: 55, to: 70, color: '#4CAF82', label: 'Bueno' },
              ]}
            />
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={4} title="Jornadas Rentables" subtitle="Distribución últimos días" onClick={jornadasRent ? () => onStatClick(jornadasRent) : undefined}>
          {rentabilidadDonut?.length ? (
            <DonutChart data={rentabilidadDonut} height={180} innerRadius={50} outerRadius={72} centerText={`${rentablesPct}%`} />
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={8} title="Utilidad Neta Acumulada" subtitle="Evolución diaria" onClick={utilidadNeta ? () => onStatClick(utilidadNeta) : undefined}>
          {chartData.utilidadAcum?.length ? (
            <AreaChartCard
              data={chartData.utilidadAcum}
              height={200}
              charts={[
                { areaKey: 'acumulada', areaColor: '#4CAF82', label: 'Acumulada' },
                { lineKey: 'diaria', lineColor: '#3A5068', label: 'Por jornada', dashed: false },
              ]}
            />
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={4} title="Racha Actual" subtitle="Estado de cada jornada" onClick={rachaActual ? () => onStatClick(rachaActual) : undefined}>
          {chartData.sorted?.length ? (
            <>
              <SemaphoroChart jornadas={chartData.sorted.slice(-20)} />
              <div style={{ marginTop: '.5rem', fontSize: '.78rem', color: '#4A6070' }}>
                Últimas {Math.min(20, chartData.sorted.length)} jornadas
              </div>
            </>
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={6} title="Crecimiento Ingresos" subtitle="Ingresos por semana" onClick={crecimientoIng ? () => onStatClick(crecimientoIng) : undefined}>
          {chartData.ingresosSemanal?.length ? (
            <BarChartCard
              data={chartData.ingresosSemanal}
              bars={[{ dataKey: 'ingresos', barSize: 32 }]}
              xKey="semana"
              height={180}
              formatter={fmt}
              colorFn={crecimientoColorFn}
              showValueLabels
            />
          ) : <EmptyChart />}
        </StatCardBase>
      </div>
    </section>
  );
}

// ── Sección Operación ──
function SeccionOperacion({ grupos, chartData, onStatClick }) {
  const eficiencia = getStat(grupos, 'costos', 'Eficiencia operativa');
  const ingresoProm = getStat(grupos, 'operacion', 'Ingreso promedio por jornada');
  const diasEquilibrio = getStat(grupos, 'operacion', 'Días sobre punto de equilibrio');

  return (
    <section>
      <h2 className="fo-section-title">Operación</h2>
      <div className="chart-grid">
        <StatCardBase span={6} title="Mejor / Peor Día" subtitle="Utilidad neta promedio por día de semana">
          {chartData.diasSemana?.length ? (
            <BarChartCard
              data={chartData.diasSemana}
              bars={[{ dataKey: 'utilidad', color: '#8FAFC4' }]}
              xKey="name"
              height={200}
              formatter={fmt}
              highlightBest
              highlightWorst
            />
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={4} title="Ingreso Promedio" subtitle={ingresoProm?.Etiqueta} onClick={ingresoProm ? () => onStatClick(ingresoProm) : undefined}>
          {ingresoProm ? (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.3rem', fontWeight: 500, color: '#3A5068', textAlign: 'center', marginBottom: '.5rem' }}>
                {fmt(ingresoProm.Valor)}
              </div>
              <SparkLine
                data={chartData.ingresosProm} dataKey="ingreso" color="#3A5068"
                height={60} formatter={fmt}
                showArea
                refLine={chartData.ingresoPromedioVal}
                showExtremes
              />
            </>
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={4} title="Días en Equilibrio" subtitle={diasEquilibrio?.Etiqueta} onClick={diasEquilibrio ? () => onStatClick(diasEquilibrio) : undefined}>
          {diasEquilibrio ? (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.3rem', fontWeight: 500, color: '#E8992A', textAlign: 'center', marginBottom: '.5rem' }}>
                {fmtStat(diasEquilibrio)}
              </div>
              <SemaphoroChart jornadas={chartData.sorted?.slice(-15)} />
            </>
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={4} title="Eficiencia Operativa" subtitle={eficiencia?.Etiqueta} onClick={eficiencia ? () => onStatClick(eficiencia) : undefined}>
          {eficiencia ? (
            <ProgresoBar
              value={eficiencia.Valor} min={0} max={5} format="pct"
              zonas={[
                { from: 0, to: 2, color: '#4CAF82', label: 'Bueno' },
                { from: 2, to: 4, color: '#E8992A', label: 'Advertencia' },
                { from: 4, to: 5, color: '#E05252', label: 'Crítico' },
              ]}
              height={40}
            />
          ) : <EmptyChart />}
        </StatCardBase>
      </div>
    </section>
  );
}

// ── Sección Costos ──
function SeccionCostos({ grupos, chartData, onStatClick }) {
  const pesoCostos = getStat(grupos, 'costos', 'Peso de costos fijos');
  const gastoProm = getStat(grupos, 'costos', 'Gasto operativo promedio');
  const cargaLaboral = getStat(grupos, 'costos', 'Carga laboral');

  return (
    <section>
      <h2 className="fo-section-title">Costos</h2>
      <div className="chart-grid">
        <StatCardBase span={4} title="Peso Costos" subtitle={pesoCostos?.Etiqueta} onClick={pesoCostos ? () => onStatClick(pesoCostos) : undefined}>
          {pesoCostos ? (
            <ProgresoBar
              value={pesoCostos.Valor} min={0} max={100} format="pct"
              zonas={[
                { from: 0, to: 25, color: '#4CAF82', label: 'Bueno' },
                { from: 25, to: 35, color: '#E8992A', label: 'Advertencia' },
                { from: 35, to: 100, color: '#E05252', label: 'Crítico' },
              ]}
              height={40}
            />
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={4} title="Gasto Promedio" subtitle={gastoProm?.Etiqueta} onClick={gastoProm ? () => onStatClick(gastoProm) : undefined}>
          {gastoProm ? (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.3rem', fontWeight: 500, color: '#3A5068', textAlign: 'center', marginBottom: '.5rem' }}>
                {fmt(gastoProm.Valor)}
              </div>
              <SparkLine
                data={chartData.gastosProm} dataKey="gasto" color="#4CAF82"
                height={60} formatter={fmt}
                showArea
                refLine={chartData.gastoPromedioVal}
                showExtremes
              />
            </>
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={4} title="Carga Laboral" subtitle={cargaLaboral?.Etiqueta} onClick={cargaLaboral ? () => onStatClick(cargaLaboral) : undefined}>
          {cargaLaboral ? (
            <ProgresoBar
              value={cargaLaboral.Valor} min={0} max={100} format="pct"
              zonas={[
                { from: 0, to: 25, color: '#4CAF82', label: 'Bueno' },
                { from: 25, to: 35, color: '#E8992A', label: 'Advertencia' },
                { from: 35, to: 100, color: '#E05252', label: 'Crítico' },
              ]}
              height={40}
            />
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={6} title="Punto de Equilibrio" subtitle="Ingreso diario vs punto de equilibrio">
          {chartData.puntoEquilibrioPromedio > 0 && chartData.ingresosVsEquilibrio?.length ? (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.3rem', fontWeight: 500, color: '#3A5068', textAlign: 'center', marginBottom: '.5rem' }}>
                {fmt(chartData.puntoEquilibrioPromedio)}
              </div>
              <BarChartCard
                data={chartData.ingresosVsEquilibrio.slice(-10)}
                bars={[{ dataKey: 'ingreso', color: '#3A5068' }]}
                xKey="fecha"
                height={140}
                formatter={fmt}
                trendLine={{ value: chartData.puntoEquilibrioPromedio, color: '#E8992A' }}
              />
            </>
          ) : <EmptyChart />}
        </StatCardBase>
      </div>
    </section>
  );
}

// ── Sección Productos ──
function SeccionProductos({ grupos, productosRank, margenProductos, margenPromedio, chartData, onStatClick }) {
  const conteoRealizado = getStat(grupos, 'productos', 'Jornadas sin conteo');
  const margenPortafolio = getStat(grupos, 'productos', 'Margen promedio del portafolio');
  const masVendido = getStat(grupos, 'productos', 'Producto más vendido');

  const rankingColorFn = (entry, idx) => idx === 0 ? '#4CAF82' : '#8FAFC4';

  const margenColorFn = (entry) => entry.margen >= margenPromedio ? '#4CAF82' : '#E05252';

  return (
    <section>
      <h2 className="fo-section-title">Productos</h2>
      <div className="chart-grid">
        <StatCardBase span={8} title="Ranking Productos" subtitle="Top 10 por ingresos" onClick={masVendido ? () => onStatClick(masVendido) : undefined}>
          {productosRank?.length ? (
            <BarChartCard
              data={productosRank.slice(0, 10)}
              bars={[{ dataKey: 'Ingresos' }]}
              xKey="Nombre"
              layout="horizontal"
              height={Math.max(160, productosRank.slice(0, 10).length * 28)}
              formatter={fmt}
              colorFn={rankingColorFn}
            />
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={4} title="Margen por Producto" subtitle={`Promedio: ${margenPromedio.toFixed(1)}%`} onClick={margenPortafolio ? () => onStatClick(margenPortafolio) : undefined}>
          {margenProductos?.length ? (
            <BarChartCard
              data={margenProductos}
              bars={[{ dataKey: 'margen', barSize: 16 }]}
              xKey="nombre"
              layout="horizontal"
              height={Math.max(160, margenProductos.length * 28)}
              formatter={fmtPct}
              colorFn={margenColorFn}
              trendLine={{ value: margenPromedio, color: '#E8992A' }}
            />
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={12} title="Conteo Realizado" subtitle={conteoRealizado?.Etiqueta} onClick={conteoRealizado ? () => onStatClick(conteoRealizado) : undefined}>
          {conteoRealizado && chartData.sorted?.length ? (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.1rem', fontWeight: 500, color: '#3A5068', textAlign: 'center', marginBottom: '.75rem' }}>
                {fmtStat(conteoRealizado)}
              </div>
              <SemaphoroChart
                jornadas={chartData.sorted.map((j) => ({
                  Fecha: j.Fecha,
                  EstadoDia: (j.ConteoRealizado || 0) > 0 ? 'rentable' : 'perdida',
                }))}
              />
              <div style={{ textAlign: 'center', fontSize: '.75rem', color: '#7A95A8', marginTop: '.5rem' }}>
                Días con conteo registrado vs sin registro
              </div>
            </>
          ) : <EmptyChart />}
        </StatCardBase>
      </div>
    </section>
  );
}

// ── Sección Cartera ──
function SeccionCartera({ grupos, onStatClick }) {
  const carteraVencida = getStat(grupos, 'cartera', 'Cartera vencida');
  const creditoVsContado = getStat(grupos, 'cartera', 'Ventas a crédito vs total');
  const antiguedad = getStat(grupos, 'cartera', 'Días promedio de cobro');

  const creditoDonut = useMemo(() => {
    if (!creditoVsContado || creditoVsContado.Valor === null || creditoVsContado.Valor === undefined) return [];
    const credito = creditoVsContado.Valor;
    const contado = 100 - credito;
    return [
      { name: 'Contado', value: contado, color: '#4CAF82' },
      { name: 'Crédito', value: credito, color: '#E8992A' },
    ].filter((d) => d.value > 0);
  }, [creditoVsContado]);

  return (
    <section>
      <h2 className="fo-section-title">Cartera</h2>
      <div className="chart-grid">
        <StatCardBase span={4} title="Cartera Vencida" subtitle={carteraVencida?.Etiqueta} onClick={carteraVencida ? () => onStatClick(carteraVencida) : undefined}>
          {carteraVencida ? (
            <ProgresoBar
              value={carteraVencida.Valor} min={0} max={30} format="pct"
              zonas={[
                { from: 0, to: 10, color: '#4CAF82', label: 'Bueno' },
                { from: 10, to: 20, color: '#E8992A', label: 'Advertencia' },
                { from: 20, to: 30, color: '#E05252', label: 'Crítico' },
              ]}
              height={40}
            />
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={4} title="Crédito vs Contado" subtitle={creditoVsContado?.Etiqueta} onClick={creditoVsContado ? () => onStatClick(creditoVsContado) : undefined}>
          {creditoDonut?.length ? (
            <>
              <DonutChart data={creditoDonut} height={160} innerRadius={45} outerRadius={65} />
              <div style={{ textAlign: 'center', fontSize: '.8rem', color: '#3A5068', fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
                {fmtPct(creditoVsContado?.Valor)} crédito
              </div>
            </>
          ) : <EmptyChart />}
        </StatCardBase>

        <StatCardBase span={4} title="Antigüedad Cartera" subtitle={antiguedad?.Etiqueta} onClick={antiguedad ? () => onStatClick(antiguedad) : undefined}>
          {antiguedad && antiguedad.Valor > 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '1rem', gap: '.5rem',
            }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.5rem', fontWeight: 500, color: '#3A5068' }}>
                {fmtStat(antiguedad)}
              </div>
              <div style={{ fontSize: '.78rem', color: '#4A6070', textAlign: 'center' }}>
                Días promedio de cartera
              </div>
            </div>
          ) : (
            <EmptyChart text="Sin cartera vencida">
              <CheckCircle size={28} strokeWidth={1.5} color="#4CAF82" />
            </EmptyChart>
          )}
        </StatCardBase>
      </div>
    </section>
  );
}

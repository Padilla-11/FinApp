using Finop.API.Data;
using Finop.API.Models.DTOs.Analisis;
using Finop.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services;

public class EstadisticasCalculator
{
    private readonly FinopDbContext _db;

    public EstadisticasCalculator(FinopDbContext db) => _db = db;

    public async Task<EstadisticasBase> CalcularAsync(long negocioId, DateOnly inicio, DateOnly fin)
    {
        var cierres = await _db.CierresJornada
            .Include(c => c.Jornada)
            .Where(c => c.NegocioId == negocioId
                     && c.Jornada.FechaReferencia >= inicio
                     && c.Jornada.FechaReferencia <= fin)
            .ToListAsync();

        var movimientos = await _db.MovimientosJornada
            .Include(m => m.CategoriaGasto)
            .Where(m => m.NegocioId == negocioId
                     && m.Jornada.FechaReferencia >= inicio
                     && m.Jornada.FechaReferencia <= fin
                     && m.Tipo == "gasto_operativo")
            .ToListAsync();

        var ventasCredito = await _db.VentasCredito
            .Include(v => v.Cobros)
            .Where(v => v.NegocioId == negocioId
                     && v.FechaRegistro >= inicio
                     && v.FechaRegistro <= fin)
            .ToListAsync();

        var negocio = await _db.Negocios.FindAsync(negocioId);

        var diasPeriodo = fin.DayNumber - inicio.DayNumber + 1;
        var inicioPrev = inicio.AddDays(-diasPeriodo);
        var finPrev = inicio.AddDays(-1);

        var cierresPrev = await _db.CierresJornada
            .Include(c => c.Jornada)
            .Where(c => c.NegocioId == negocioId
                     && c.Jornada.FechaReferencia >= inicioPrev
                     && c.Jornada.FechaReferencia <= finPrev)
            .ToListAsync();

        return new EstadisticasBase
        {
            NombreNegocio = negocio?.Nombre ?? "",
            JornadasBase = cierres.Count,
            CierreIds = cierres.Select(c => (c.Id, c.ActualizadoEn)).ToList(),
            Grupos = new Dictionary<string, List<TarjetaDto>>
            {
                ["rentabilidad"] = CalcularRentabilidad(cierres, cierresPrev),
                ["operacion"] = CalcularOperacion(cierres, cierresPrev, negocio),
                ["costos"] = CalcularCostos(cierres, cierresPrev, movimientos, negocioId),
                ["productos"] = await CalcularProductosAsync(cierres, negocioId),
                ["cartera"] = CalcularCartera(ventasCredito, cierres),
            },
        };
    }

    private List<TarjetaDto> CalcularRentabilidad(List<CierreJornada> actual, List<CierreJornada> anterior)
    {
        if (!actual.Any()) return new();

        var ingresosActual = actual.Sum(c => c.IngresosOperativos);
        var utilNetaActual = actual.Sum(c => c.UtilidadNeta);
        var utilBrutaActual = actual.Sum(c => c.UtilidadBruta);

        var ingresosPrev = anterior.Sum(c => c.IngresosOperativos);
        var utilNetaPrev = anterior.Sum(c => c.UtilidadNeta);

        var margenNeto = ingresosActual > 0 ? utilNetaActual / ingresosActual * 100 : 0;
        var margenBruto = ingresosActual > 0 ? utilBrutaActual / ingresosActual * 100 : 0;
        var margenNetoPrev = ingresosPrev > 0 ? utilNetaPrev / ingresosPrev * 100 : 0;

        var rentables = actual.Count(c => c.EstadoDia == "rentable");
        var tasaRentables = actual.Count > 0 ? (decimal)rentables / actual.Count * 100 : 0;

        var crecimientoIng = ingresosPrev > 0 ? (ingresosActual - ingresosPrev) / ingresosPrev * 100 : 0;

        var rachaActual = 0;
        var rachaEstado = actual.OrderByDescending(c => c.Jornada.FechaReferencia).First().EstadoDia == "rentable" ? "rentable" : "perdida";
        foreach (var c in actual.OrderByDescending(c => c.Jornada.FechaReferencia))
        {
            var esRentable = c.EstadoDia == "rentable";
            if ((rachaEstado == "rentable") == esRentable) rachaActual++;
            else break;
        }

        return new List<TarjetaDto>
        {
            new() {
                Id = "margen_neto", Nombre = "Margen neto",
                Valor = Math.Round((double)margenNeto, 1), Unidad = "%", Formato = "porcentaje",
                Tendencia = margenNeto > margenNetoPrev ? "sube" : margenNeto < margenNetoPrev ? "baja" : "igual",
                TendenciaPct = margenNetoPrev != 0 ? Math.Round((double)(margenNeto - margenNetoPrev), 1) : null,
                Estado = margenNeto >= 20 ? "bueno" : margenNeto >= 10 ? "advertencia" : "critico",
            },
            new() {
                Id = "margen_bruto", Nombre = "Margen bruto",
                Valor = Math.Round((double)margenBruto, 1), Unidad = "%", Formato = "porcentaje",
                Tendencia = "igual", TendenciaPct = null,
                Estado = margenBruto >= 35 ? "bueno" : margenBruto >= 20 ? "advertencia" : "critico",
            },
            new() {
                Id = "utilidad_neta_acumulada", Nombre = "Utilidad neta acumulada",
                Valor = (double)utilNetaActual, Unidad = "COP", Formato = "moneda",
                Tendencia = utilNetaActual > utilNetaPrev ? "sube" : utilNetaActual < utilNetaPrev ? "baja" : "igual",
                TendenciaPct = utilNetaPrev != 0 ? Math.Round((double)((utilNetaActual - utilNetaPrev) / Math.Abs(utilNetaPrev) * 100), 1) : null,
                Estado = utilNetaActual > 0 ? "bueno" : utilNetaActual == 0 ? "advertencia" : "critico",
            },
            new() {
                Id = "tasa_jornadas_rentables", Nombre = "Jornadas rentables",
                Valor = Math.Round((double)tasaRentables, 1), Unidad = "%", Formato = "porcentaje",
                Tendencia = "igual", TendenciaPct = null,
                Estado = tasaRentables >= 70 ? "bueno" : tasaRentables >= 50 ? "advertencia" : "critico",
            },
            new() {
                Id = "crecimiento_ingresos", Nombre = "Crecimiento de ingresos",
                Valor = Math.Round((double)crecimientoIng, 1), Unidad = "%", Formato = "porcentaje",
                Tendencia = crecimientoIng > 0 ? "sube" : crecimientoIng < 0 ? "baja" : "igual",
                TendenciaPct = Math.Round((double)crecimientoIng, 1),
                Estado = crecimientoIng > 5 ? "bueno" : crecimientoIng >= 0 ? "advertencia" : "critico",
            },
            new() {
                Id = "racha_actual", Nombre = "Racha actual",
                Valor = rachaActual, Unidad = rachaEstado == "rentable" ? "días rentables" : "días con pérdida", Formato = "numero",
                Tendencia = rachaEstado == "rentable" ? "sube" : "baja", TendenciaPct = null,
                Estado = rachaEstado == "rentable" && rachaActual >= 3 ? "bueno" : rachaEstado == "rentable" ? "advertencia" : "critico",
            },
        };
    }

    private List<TarjetaDto> CalcularOperacion(List<CierreJornada> actual, List<CierreJornada> anterior, Negocio? negocio)
    {
        if (!actual.Any()) return new();

        var ingresosTotales = actual.Sum(c => c.IngresosOperativos);
        var diasOperados = actual.Count;
        var ingresoPromedio = diasOperados > 0 ? ingresosTotales / diasOperados : 0;

        var ingresosPrev = anterior.Sum(c => c.IngresosOperativos);
        var diasPrev = anterior.Count;
        var ingresoPromedioPrev = diasPrev > 0 ? ingresosPrev / diasPrev : 0;

        var porDia = actual
            .Where(c => c.Jornada is not null)
            .GroupBy(c => c.Jornada!.FechaReferencia.DayOfWeek)
            .Select(g => new
            {
                Dia = g.Key,
                Nombre = ObtenerNombreDia(g.Key),
                Promedio = g.Average(c => c.IngresosOperativos),
                Jornadas = g.Count(),
            })
            .OrderByDescending(d => d.Promedio)
            .ToList();

        var mejorDia = porDia.FirstOrDefault();
        var peorDia = porDia.LastOrDefault();

        var diasSobreEquilibrio = actual.Count(c => c.EstadoDia != "perdida");
        var diasHabilesConfigurados = negocio?.DiasOperacion?.Length ?? 6;
        var diasOperadosVsConfigurados = actual.Count;

        var diferenciaCajaPromedio = actual.Count > 0 ? actual.Average(c => c.DiferenciaCaja) : 0;

        return new List<TarjetaDto>
        {
            new() {
                Id = "ingreso_promedio_jornada", Nombre = "Ingreso promedio por jornada",
                Valor = (double)ingresoPromedio, Unidad = "COP", Formato = "moneda",
                Tendencia = ingresoPromedio > ingresoPromedioPrev ? "sube" : ingresoPromedio < ingresoPromedioPrev ? "baja" : "igual",
                TendenciaPct = ingresoPromedioPrev != 0 ? Math.Round((double)((ingresoPromedio - ingresoPromedioPrev) / ingresoPromedioPrev * 100), 1) : null,
                Estado = ingresoPromedio > (actual.FirstOrDefault()?.PuntoEquilibrioDia ?? 0) ? "bueno" : "advertencia",
            },
            new() {
                Id = "mejor_dia_semana", Nombre = "Mejor día de la semana",
                Valor = mejorDia != null ? (double)mejorDia.Promedio : 0, Unidad = "COP promedio", Formato = "moneda",
                Etiqueta = mejorDia?.Nombre,
                Tendencia = null, TendenciaPct = null,
                Estado = "bueno",
            },
            new() {
                Id = "peor_dia_semana", Nombre = "Peor día de la semana",
                Valor = peorDia != null ? (double)peorDia.Promedio : 0, Unidad = "COP promedio", Formato = "moneda",
                Etiqueta = peorDia?.Nombre,
                Tendencia = null, TendenciaPct = null,
                Estado = peorDia != null && peorDia.Promedio < (actual.FirstOrDefault()?.PuntoEquilibrioDia ?? 0) ? "critico" : "advertencia",
            },
            new() {
                Id = "dias_sobre_equilibrio", Nombre = "Días sobre punto de equilibrio",
                Valor = diasSobreEquilibrio, Unidad = "días", Formato = "numero",
                Tendencia = null, TendenciaPct = null,
                Estado = diasSobreEquilibrio >= diasOperados * 0.7 ? "bueno" : diasSobreEquilibrio >= diasOperados * 0.5 ? "advertencia" : "critico",
            },
            new() {
                Id = "dias_operados_vs_configurados", Nombre = "Días operados vs configurados",
                Valor = diasOperadosVsConfigurados, Unidad = $"de {diasHabilesConfigurados} días", Formato = "fraccion",
                Tendencia = null, TendenciaPct = null,
                Estado = (double)diasOperadosVsConfigurados / diasHabilesConfigurados >= 0.8 ? "bueno" : (double)diasOperadosVsConfigurados / diasHabilesConfigurados >= 0.5 ? "advertencia" : "critico",
            },
            new() {
                Id = "diferencia_caja_promedio", Nombre = "Diferencia de caja promedio",
                Valor = (double)diferenciaCajaPromedio, Unidad = "COP", Formato = "moneda",
                Tendencia = null, TendenciaPct = null,
                Estado = Math.Abs((double)diferenciaCajaPromedio) < 10000 ? "bueno" : Math.Abs((double)diferenciaCajaPromedio) < 50000 ? "advertencia" : "critico",
            },
        };
    }

    private List<TarjetaDto> CalcularCostos(List<CierreJornada> actual, List<CierreJornada> anterior, List<MovimientoJornada> movimientos, long negocioId)
    {
        if (!actual.Any()) return new();

        var ingresosTotales = actual.Sum(c => c.IngresosOperativos);
        var gastosTotales = actual.Sum(c => c.GastosJornada);
        var costosFijosTotales = actual.Sum(c => c.CostosFijosDia);

        var eficiencia = ingresosTotales > 0 ? gastosTotales / ingresosTotales * 100 : 0;
        var ingresoPromedio = actual.Count > 0 ? ingresosTotales / actual.Count : 0;
        var pesoCostosFijos = ingresoPromedio > 0 ? costosFijosTotales / actual.Count / ingresoPromedio * 100 : 0;

        var totalNominaDia = _db.Empleados.Where(e => e.NegocioId == negocioId && e.EliminadoEn == null).Sum(e => e.CostoDiario);
        var cargaLaboral = ingresoPromedio > 0 ? totalNominaDia / ingresoPromedio * 100 : 0;

        var cobertura = costosFijosTotales > 0 ? ingresosTotales / costosFijosTotales : 0;
        var gastoPromedio = actual.Count > 0 ? gastosTotales / actual.Count : 0;

        var gastosPorCategoria = movimientos
            .Where(m => m.CategoriaGasto != null)
            .GroupBy(m => m.CategoriaGasto!)
            .Select(g => new { Categoria = g.Key, Total = g.Sum(m => m.Monto) })
            .OrderByDescending(g => g.Total)
            .ToList();

        var categoriaMayor = gastosPorCategoria.FirstOrDefault();

        var gastosPrev = anterior.Sum(c => c.GastosJornada);
        var variacionGastos = gastosPrev > 0 ? (gastosTotales - gastosPrev) / gastosPrev * 100 : 0;

        return new List<TarjetaDto>
        {
            new() {
                Id = "eficiencia_operativa", Nombre = "Eficiencia operativa",
                Valor = Math.Round((double)eficiencia, 1), Unidad = "%", Formato = "porcentaje",
                Tendencia = null, TendenciaPct = null,
                Estado = eficiencia < 10 ? "bueno" : eficiencia < 20 ? "advertencia" : "critico",
            },
            new() {
                Id = "peso_costos_fijos", Nombre = "Peso de costos fijos",
                Valor = Math.Round((double)pesoCostosFijos, 1), Unidad = "%", Formato = "porcentaje",
                Tendencia = null, TendenciaPct = null,
                Estado = pesoCostosFijos < 20 ? "bueno" : pesoCostosFijos < 35 ? "advertencia" : "critico",
            },
            new() {
                Id = "carga_laboral", Nombre = "Carga laboral",
                Valor = Math.Round((double)cargaLaboral, 1), Unidad = "%", Formato = "porcentaje",
                Tendencia = null, TendenciaPct = null,
                Estado = cargaLaboral >= 15 && cargaLaboral <= 25 ? "bueno" : cargaLaboral < 35 ? "advertencia" : "critico",
            },
            new() {
                Id = "cobertura_costos_fijos", Nombre = "Cobertura de costos fijos",
                Valor = Math.Round((double)cobertura, 1), Unidad = "x", Formato = "numero",
                Tendencia = null, TendenciaPct = null,
                Estado = cobertura >= 2 ? "bueno" : cobertura >= 1 ? "advertencia" : "critico",
            },
            new() {
                Id = "categoria_mayor_gasto", Nombre = "Categoría de mayor gasto",
                Valor = categoriaMayor != null ? (double)categoriaMayor.Total : 0, Unidad = "COP", Formato = "moneda",
                Etiqueta = categoriaMayor?.Categoria?.Nombre,
                Tendencia = null, TendenciaPct = null,
                Estado = categoriaMayor != null && categoriaMayor.Total > gastosTotales * 0.5m ? "advertencia" : "bueno",
            },
            new() {
                Id = "gasto_promedio_jornada", Nombre = "Gasto operativo promedio",
                Valor = (double)gastoPromedio, Unidad = "COP por jornada", Formato = "moneda",
                Tendencia = variacionGastos > 0 ? "sube" : variacionGastos < 0 ? "baja" : "igual",
                TendenciaPct = Math.Round((double)variacionGastos, 1),
                Estado = gastoPromedio < ingresoPromedio * 0.15m ? "bueno" : gastoPromedio < ingresoPromedio * 0.25m ? "advertencia" : "critico",
            },
        };
    }

    private async Task<List<TarjetaDto>> CalcularProductosAsync(List<CierreJornada> cierres, long negocioId)
    {
        if (!cierres.Any()) return new();

        var cierreIds = cierres.Select(c => c.Id).ToList();
        var conteos = await _db.ConteosProductosCierre
            .Include(c => c.Producto)
            .Where(c => cierreIds.Contains(c.CierreId))
            .ToListAsync();

        if (!conteos.Any()) return new();

        var porProducto = conteos
            .GroupBy(c => c.ProductoId)
            .Select(g => new
            {
                ProductoId = g.Key,
                Nombre = g.First().Producto?.Nombre ?? "?",
                Unidades = g.Sum(c => c.UnidadesVendidas),
                Utilidad = g.Sum(c => c.SubtotalUtilidad),
                Margen = g.Average(c => c.PrecioVenta > 0 ? (c.PrecioVenta - c.CostoUnitario) / c.PrecioVenta * 100 : 0),
                Ingresos = g.Sum(c => c.SubtotalIngresos),
            })
            .ToList();

        var totalIngresos = porProducto.Sum(p => p.Ingresos);
        var masVendido = porProducto.OrderByDescending(p => p.Unidades).FirstOrDefault();
        var masRentable = porProducto.OrderByDescending(p => p.Utilidad).FirstOrDefault();
        var peorMargen = porProducto.OrderBy(p => p.Margen).FirstOrDefault();
        var margenPromedio = porProducto.Any() ? porProducto.Average(p => p.Margen) : 0;

        var jornadasSinConteo = cierres.Count(c => !c.ConteoRealizado);

        return new List<TarjetaDto>
        {
            new() {
                Id = "producto_mas_vendido", Nombre = "Producto más vendido",
                Valor = masVendido?.Unidades ?? 0, Unidad = "unidades", Formato = "numero",
                Etiqueta = masVendido?.Nombre,
                Tendencia = null, TendenciaPct = null,
                Estado = "bueno",
            },
            new() {
                Id = "producto_mas_rentable", Nombre = "Producto más rentable",
                Valor = masRentable != null ? (double)masRentable.Utilidad : 0, Unidad = "COP de utilidad", Formato = "moneda",
                Etiqueta = masRentable?.Nombre,
                Tendencia = null, TendenciaPct = null,
                Estado = "bueno",
            },
            new() {
                Id = "producto_peor_margen", Nombre = "Producto con menor margen",
                Valor = peorMargen != null ? Math.Round((double)peorMargen.Margen, 1) : 0, Unidad = "%", Formato = "porcentaje",
                Etiqueta = peorMargen?.Nombre,
                Tendencia = null, TendenciaPct = null,
                Estado = peorMargen != null && peorMargen.Margen < 30 ? "advertencia" : "bueno",
            },
            new() {
                Id = "margen_portafolio", Nombre = "Margen promedio del portafolio",
                Valor = Math.Round((double)margenPromedio, 1), Unidad = "%", Formato = "porcentaje",
                Tendencia = null, TendenciaPct = null,
                Estado = margenPromedio >= 40 ? "bueno" : margenPromedio >= 25 ? "advertencia" : "critico",
            },
            new() {
                Id = "jornadas_conteo_omitido", Nombre = "Jornadas sin conteo",
                Valor = jornadasSinConteo, Unidad = $"de {cierres.Count} jornadas", Formato = "fraccion",
                Tendencia = null, TendenciaPct = null,
                Estado = jornadasSinConteo == 0 ? "bueno" : jornadasSinConteo <= cierres.Count * 0.3 ? "advertencia" : "critico",
            },
        };
    }

    private List<TarjetaDto> CalcularCartera(List<VentaCredito> ventas, List<CierreJornada> cierres)
    {
        var pendientes = ventas.Where(v => v.Estado != "cobrado").ToList();
        var totalPendiente = pendientes.Sum(v => v.MontoTotal - v.MontoCobrado);

        var vencidas = pendientes.Where(v => v.FechaRegistro < DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7))).ToList();
        var montoVencido = vencidas.Sum(v => v.MontoTotal - v.MontoCobrado);
        var tasaVencida = totalPendiente > 0 ? montoVencido / totalPendiente * 100 : 0;

        var ventasConCobro = ventas.Where(v => v.Cobros.Any()).ToList();
        var diasPromedioCobro = ventasConCobro.Any()
            ? ventasConCobro.Average(v => v.Cobros.Min(c => (c.RegistradoEn.Date - DateTime.SpecifyKind(v.FechaRegistro.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc)).Days))
            : 0;

        var ingresosTotales = cierres.Sum(c => c.IngresosOperativos);
        var montoCredito = ventas.Sum(v => v.MontoTotal);
        var creditoVsContado = ingresosTotales > 0 ? montoCredito / ingresosTotales * 100 : 0;

        return new List<TarjetaDto>
        {
            new() {
                Id = "total_pendiente", Nombre = "Total por cobrar",
                Valor = (double)totalPendiente, Unidad = "COP", Formato = "moneda",
                Tendencia = null, TendenciaPct = null,
                Estado = totalPendiente == 0 ? "bueno" : totalPendiente < 500000 ? "advertencia" : "critico",
            },
            new() {
                Id = "tasa_cartera_vencida", Nombre = "Cartera vencida",
                Valor = Math.Round((double)tasaVencida, 1), Unidad = "%", Formato = "porcentaje",
                Tendencia = null, TendenciaPct = null,
                Estado = tasaVencida < 20 ? "bueno" : tasaVencida < 50 ? "advertencia" : "critico",
            },
            new() {
                Id = "dias_promedio_cobro", Nombre = "Días promedio de cobro",
                Valor = Math.Round((double)diasPromedioCobro, 1), Unidad = "días", Formato = "numero",
                Tendencia = null, TendenciaPct = null,
                Estado = diasPromedioCobro <= 5 ? "bueno" : diasPromedioCobro <= 10 ? "advertencia" : "critico",
            },
            new() {
                Id = "ventas_credito_vs_contado", Nombre = "Ventas a crédito vs total",
                Valor = Math.Round((double)creditoVsContado, 1), Unidad = "%", Formato = "porcentaje",
                Tendencia = null, TendenciaPct = null,
                Estado = creditoVsContado < 10 ? "bueno" : creditoVsContado < 20 ? "advertencia" : "critico",
            },
        };
    }

    public async Task<(List<HistorialJornadaDto> Jornadas, List<ProductoRankingDto> Productos)> CalcularDetalleAsync(long negocioId, DateOnly inicio, DateOnly fin)
    {
        var cierres = await _db.CierresJornada
            .Include(c => c.Jornada)
            .Where(c => c.NegocioId == negocioId
                     && c.Jornada.FechaReferencia >= inicio
                     && c.Jornada.FechaReferencia <= fin)
            .OrderBy(c => c.Jornada.FechaReferencia)
            .ToListAsync();

        var jornadas = cierres.Select(c => new HistorialJornadaDto
        {
            Fecha = c.Jornada.FechaReferencia.ToString("yyyy-MM-dd"),
            Ingresos = c.IngresosOperativos,
            UtilidadNeta = c.UtilidadNeta,
            UtilidadBruta = c.UtilidadBruta,
            MargenNeto = c.IngresosOperativos > 0 ? (double)(c.UtilidadNeta / c.IngresosOperativos * 100) : 0,
            MargenBruto = c.IngresosOperativos > 0 ? (double)(c.UtilidadBruta / c.IngresosOperativos * 100) : 0,
            EstadoDia = c.EstadoDia,
            ConteoRealizado = c.ConteoRealizado,
            DiferenciaCaja = c.DiferenciaCaja,
            PuntoEquilibrio = c.PuntoEquilibrioDia,
            GastosJornada = c.GastosJornada,
            CostosFijosDia = c.CostosFijosDia,
        }).ToList();

        var cierreIds = cierres.Select(c => c.Id).ToList();
        var conteos = await _db.ConteosProductosCierre
            .Include(c => c.Producto)
            .Where(c => cierreIds.Contains(c.CierreId))
            .ToListAsync();

        var productos = conteos
            .GroupBy(c => c.ProductoId)
            .Select(g => new ProductoRankingDto
            {
                Id = g.Key,
                Nombre = g.First().Producto?.Nombre ?? "?",
                Unidades = g.Sum(c => c.UnidadesVendidas),
                Utilidad = g.Sum(c => c.SubtotalUtilidad),
                Margen = g.Average(c => c.PrecioVenta > 0 ? (double)((c.PrecioVenta - c.CostoUnitario) / c.PrecioVenta * 100) : 0),
                Ingresos = g.Sum(c => c.SubtotalIngresos),
            })
            .OrderByDescending(p => p.Ingresos)
            .ToList();

        return (jornadas, productos);
    }

    private static string ObtenerNombreDia(DayOfWeek dia) => dia switch
    {
        DayOfWeek.Monday => "Lunes",
        DayOfWeek.Tuesday => "Martes",
        DayOfWeek.Wednesday => "Miércoles",
        DayOfWeek.Thursday => "Jueves",
        DayOfWeek.Friday => "Viernes",
        DayOfWeek.Saturday => "Sábado",
        DayOfWeek.Sunday => "Domingo",
        _ => dia.ToString(),
    };
}

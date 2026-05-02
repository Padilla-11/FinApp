using Finop.API.Data;
using Finop.API.Models.DTOs.Simulador;
using Finop.API.Models.Entities;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services.Implementations;

public class SimuladorService : ISimuladorService
{
    private readonly FinopDbContext _db;
    private readonly IAccesoService _acceso;

    public SimuladorService(FinopDbContext db, IAccesoService acceso)
    { _db = db; _acceso = acceso; }

    public async Task<PreviewSimulacionResponse> PreviewAsync(
        long negocioId, long usuarioId, PreviewSimulacionRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);
        var actual = await CalcularPromediosBaseAsync(negocioId, request.PeriodoBaseInicio, request.PeriodoBaseFin);
        var simulado = AplicarVariables(actual, request.Variables);
        return BuildPreview(actual, simulado);
    }

    public async Task<EscenarioResponse> GuardarEscenarioAsync(
        long negocioId, long usuarioId, CrearEscenarioRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);
        var actual = await CalcularPromediosBaseAsync(negocioId, request.PeriodoBaseInicio, request.PeriodoBaseFin);
        var simulado = AplicarVariables(actual, request.Variables);

        var escenario = new EscenarioSimulacion
        {
            NegocioId = negocioId,
            CreadoPor = usuarioId,
            Nombre = request.Nombre.Trim(),
            Descripcion = request.Descripcion,
            PeriodoBaseInicio = request.PeriodoBaseInicio,
            PeriodoBaseFin = request.PeriodoBaseFin,
            IngresosDiariosActual = actual.IngresosDiarios,
            UtilidadNetaActual = actual.UtilidadNeta,
            MargenActual = actual.Margen,
            EquilibrioActual = actual.Equilibrio,
            IngresosDiariosSimulado = simulado.IngresosDiarios,
            UtilidadNetaSimulado = simulado.UtilidadNeta,
            MargenSimulado = simulado.Margen,
            EquilibrioSimulado = simulado.Equilibrio
        };

        _db.EscenariosSimulacion.Add(escenario);
        await _db.SaveChangesAsync();

        // Guardar variables
        foreach (var v in request.Variables)
        {
            _db.VariablesSimulacion.Add(new VariableSimulacion
            {
                EscenarioId = escenario.Id,
                NegocioId = negocioId,
                TipoVariable = v.TipoVariable,
                ProductoId = v.ProductoId,
                CostoFijoId = v.CostoFijoId,
                ValorActual = v.ValorActual,
                ValorSimulado = v.ValorSimulado
            });
        }
        await _db.SaveChangesAsync();

        return await ObtenerEscenarioAsync(negocioId, escenario.Id, usuarioId);
    }

    public async Task<List<EscenarioResponse>> ListarEscenariosAsync(long negocioId, long usuarioId)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var escenarios = await _db.EscenariosSimulacion
            .Where(e => e.NegocioId == negocioId && e.EliminadoEn == null)
            .Include(e => e.Variables).ThenInclude(v => v.Producto)
            .Include(e => e.Variables).ThenInclude(v => v.CostoFijo)
            .OrderByDescending(e => e.CreadoEn)
            .ToListAsync();

        return escenarios.Select(MapearRespuesta).ToList();
    }

    public async Task<EscenarioResponse> ObtenerEscenarioAsync(long negocioId, long escenarioId, long usuarioId)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var escenario = await _db.EscenariosSimulacion
            .Where(e => e.Id == escenarioId && e.NegocioId == negocioId && e.EliminadoEn == null)
            .Include(e => e.Variables).ThenInclude(v => v.Producto)
            .Include(e => e.Variables).ThenInclude(v => v.CostoFijo)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Escenario no encontrado.");

        return MapearRespuesta(escenario);
    }

    public async Task EliminarEscenarioAsync(long negocioId, long escenarioId, long usuarioId)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var escenario = await _db.EscenariosSimulacion
            .FirstOrDefaultAsync(e => e.Id == escenarioId && e.NegocioId == negocioId && e.EliminadoEn == null)
            ?? throw new KeyNotFoundException("Escenario no encontrado.");

        escenario.EliminadoEn = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
    }

    // ── Lógica de simulación ────────────────────────────────────────────

    private record PromedioBase(
        decimal IngresosDiarios, decimal UtilidadNeta, decimal Margen, decimal Equilibrio,
        decimal CostoVendidoPct, decimal GastosDiarios, decimal CostosFijosDia);

    private async Task<PromedioBase> CalcularPromediosBaseAsync(
        long negocioId, DateOnly inicio, DateOnly fin)
    {
        var cierres = await _db.CierresJornada
            .Where(c => c.NegocioId == negocioId
                     && c.Jornada.FechaReferencia >= inicio
                     && c.Jornada.FechaReferencia <= fin)
            .Include(c => c.Jornada)
            .ToListAsync();

        if (cierres.Count == 0)
            return new PromedioBase(0, 0, 0, 0, 0.3m, 0, 0);

        var ingrProm = cierres.Average(c => (double)c.IngresosOperativos);
        var utilProm = cierres.Average(c => (double)c.UtilidadNeta);
        var margenProm = cierres.Average(c => (double)c.MargenGanancia);
        var equilProm = cierres.Average(c => (double)c.PuntoEquilibrioDia);
        var costoVendPct = cierres.Average(c =>
            c.IngresosOperativos > 0 ? (double)(c.CostoVendido / c.IngresosOperativos) : 0.3);
        var gastosProm = cierres.Average(c => (double)c.GastosJornada);
        var fijosPromedio = cierres.Average(c => (double)c.CostosFijosDia);

        return new PromedioBase(
            (decimal)ingrProm, (decimal)utilProm, (decimal)margenProm,
            (decimal)equilProm, (decimal)costoVendPct, (decimal)gastosProm, (decimal)fijosPromedio);
    }

    private static PromedioBase AplicarVariables(PromedioBase actual, List<VariableSimulacionRequest> variables)
    {
        var ingresos = actual.IngresosDiarios;
        var costoVendPct = actual.CostoVendidoPct;
        var gastos = actual.GastosDiarios;
        var fijos = actual.CostosFijosDia;

        foreach (var v in variables)
        {
            switch (v.TipoVariable)
            {
                case "precio_producto":
                    // Ajuste proporcional en ingresos si precio sube/baja
                    if (v.ValorActual > 0)
                        ingresos *= v.ValorSimulado / v.ValorActual;
                    break;
                case "costo_producto":
                    // Ajuste en % de costo vendido
                    if (v.ValorActual > 0)
                        costoVendPct *= (double)(v.ValorSimulado / v.ValorActual);
                    break;
                case "volumen_ventas":
                    // Cambio directo de ingresos
                    ingresos = v.ValorSimulado;
                    break;
                case "costo_fijo":
                    // Ajuste en costos fijos diarios
                    if (v.ValorActual > 0)
                        fijos = fijos * (v.ValorSimulado / v.ValorActual);
                    break;
                case "dias_operativos":
                    // Impacto en costos fijos por más/menos días
                    if (v.ValorActual > 0)
                        fijos = fijos * (v.ValorActual / v.ValorSimulado);
                    break;
            }
        }

        var costoVendido = ingresos * (decimal)costoVendPct;
        var utilNeta = ingresos - costoVendido - gastos - fijos;
        var margen = ingresos > 0 ? Math.Round(utilNeta / ingresos * 100, 2) : 0;
        var equilibrio = (ingresos - costoVendido) > 0
            ? fijos / ((ingresos - costoVendido) / ingresos)
            : 0;

        return new PromedioBase(ingresos, utilNeta, margen, equilibrio, (decimal)costoVendPct, gastos, fijos);
    }

    private static PreviewSimulacionResponse BuildPreview(PromedioBase actual, PromedioBase simulado) => new()
    {
        IngresosDiariosActual = actual.IngresosDiarios,
        UtilidadNetaActual = actual.UtilidadNeta,
        MargenActual = actual.Margen,
        EquilibrioActual = actual.Equilibrio,
        IngresosDiariosSimulado = simulado.IngresosDiarios,
        UtilidadNetaSimulado = simulado.UtilidadNeta,
        MargenSimulado = simulado.Margen,
        EquilibrioSimulado = simulado.Equilibrio,
        VariacionIngresos = actual.IngresosDiarios > 0
            ? Math.Round((simulado.IngresosDiarios - actual.IngresosDiarios) / actual.IngresosDiarios * 100, 2)
            : 0,
        VariacionUtilidad = actual.UtilidadNeta > 0
            ? Math.Round((simulado.UtilidadNeta - actual.UtilidadNeta) / actual.UtilidadNeta * 100, 2)
            : 0
    };

    private static EscenarioResponse MapearRespuesta(EscenarioSimulacion e) => new()
    {
        Id = e.Id,
        Nombre = e.Nombre,
        Descripcion = e.Descripcion,
        PeriodoBaseInicio = e.PeriodoBaseInicio,
        PeriodoBaseFin = e.PeriodoBaseFin,
        IngresosDiariosActual = e.IngresosDiariosActual,
        UtilidadNetaActual = e.UtilidadNetaActual,
        MargenActual = e.MargenActual,
        EquilibrioActual = e.EquilibrioActual,
        IngresosDiariosSimulado = e.IngresosDiariosSimulado,
        UtilidadNetaSimulado = e.UtilidadNetaSimulado,
        MargenSimulado = e.MargenSimulado,
        EquilibrioSimulado = e.EquilibrioSimulado,
        VariacionIngresos = e.VariacionIngresos,
        VariacionUtilidad = e.VariacionUtilidad,
        CreadoEn = e.CreadoEn,
        Variables = e.Variables?.Select(v => new VariableSimulacionResponse
        {
            Id = v.Id,
            TipoVariable = v.TipoVariable,
            NombreEntidad = v.Producto?.Nombre ?? v.CostoFijo?.Nombre,
            ValorActual = v.ValorActual,
            ValorSimulado = v.ValorSimulado,
            VariacionPct = v.VariacionPct
        }).ToList() ?? []
    };
}

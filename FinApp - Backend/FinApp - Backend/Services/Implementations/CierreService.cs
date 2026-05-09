using System.Text.Json;
using Finop.API.Data;
using Finop.API.Models.DTOs.Cierres;
using Finop.API.Models.Entities;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services.Implementations;

public class CierreService : ICierreService
{
    private readonly FinopDbContext _db;
    private readonly IAccesoService _acceso;

    public CierreService(FinopDbContext db, IAccesoService acceso)
    { _db = db; _acceso = acceso; }

    public async Task<CierreResponse> ConfirmarCierreAsync(
        long negocioId, long jornadaId, long usuarioId, ConfirmarCierreRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var jornada = await _db.Jornadas
            .Include(j => j.Movimientos)
            .FirstOrDefaultAsync(j => j.Id == jornadaId && j.NegocioId == negocioId)
            ?? throw new KeyNotFoundException("Jornada no encontrada.");

        if (jornada.Estado != "abierta")
            throw new InvalidOperationException("Esta jornada ya está cerrada.");

        var negocio = await _db.Negocios.FindAsync(negocioId)!
            ?? throw new KeyNotFoundException("Negocio no encontrado.");

        // ── Calcular indicadores ────────────────────────────────────────

        // Caja esperada = caja_inicial + suma(monto * signo) de movimientos que afectan caja
        var cajaEsperada = jornada.CajaInicial + jornada.Movimientos
            .Where(m => m.AfectaCaja)
            .Sum(m => m.Monto * m.SignoCaja);

        // Determinar si hay conteo
        bool conteoRealizado = request.ConteoRealizado && request.Conteos.Count > 0;

        // Gastos operativos: usar desde frontend si no hay conteo, sino desde movimientos
        var gastosJornada = !conteoRealizado && request.GastosJornadaCalculados.HasValue
            ? request.GastosJornadaCalculados.Value
            : jornada.Movimientos
                .Where(m => m.Tipo == "gasto_operativo" || m.Tipo == "compra_mercancia")
                .Sum(m => m.Monto);

        // Costos fijos diarios proporcionales
        var costosFijosDia = await CalcularCostosFijosDiaAsync(negocioId, negocio.DiasOperacion.Length);

        // Ingresos y costo vendido desde conteo (si se realizó) o estimado
        decimal ingresosOperativos;
        decimal costoVendido;

        if (conteoRealizado)
        {
            // Calcular desde conteo de productos
            ingresosOperativos = 0;
            costoVendido = 0;
            foreach (var item in request.Conteos)
            {
                var prod = await _db.Productos.FindAsync(item.ProductoId)
                    ?? throw new KeyNotFoundException($"Producto {item.ProductoId} no encontrado.");
                ingresosOperativos += item.UnidadesVendidas * prod.PrecioVenta;
                costoVendido += item.UnidadesVendidas * prod.CostoUnitario;
            }
        }
        else
        {
            // Si el frontend envía los ingresos calculados desde caja final, usarlos
            // Fórmula frontend: ingresos = cajaFinal - cajaInicial + gastos
            if (request.IngresosOperativosCalculados.HasValue && request.IngresosOperativosCalculados > 0)
            {
                ingresosOperativos = request.IngresosOperativosCalculados.Value;
            }
            else
            {
                // Fallback: calcular desde movimientos (lógica antigua)
                var ingresosBrutos = jornada.Movimientos
                    .Where(m => m.SignoCaja == 1 && m.AfectaCaja)
                    .Sum(m => m.Monto);
                ingresosOperativos = ingresosBrutos;
            }

            // Calcular costo vendido con margen promedio de productos activos
            var margenPromedio = await _db.Productos
                .Where(p => p.NegocioId == negocioId && p.EliminadoEn == null && p.Activo)
                .AverageAsync(p => (double?)p.MargenPorcentaje) ?? 20;
            costoVendido = ingresosOperativos * (1 - (decimal)margenPromedio / 100);
        }

        // Punto de equilibrio diario
        var puntoEquilibrio = costosFijosDia > 0
            ? costosFijosDia / (ingresosOperativos > 0
                ? (ingresosOperativos - costoVendido) / ingresosOperativos
                : 1)
            : 0;

        // Estado del día
        var utilNeta = ingresosOperativos - costoVendido - gastosJornada - costosFijosDia;
        var estadoDia = utilNeta > 0 ? "rentable" : utilNeta == 0 ? "equilibrio" : "perdida";

        // ── Persistir cierre ───────────────────────────────────────────

        var cierre = new CierreJornada
        {
            JornadaId = jornadaId,
            NegocioId = negocioId,
            CerradoPor = usuarioId,
            CajaInicial = jornada.CajaInicial,
            CajaFinalRegistrada = request.CajaFinalRegistrada,
            CajaEsperada = cajaEsperada,
            IngresosOperativos = ingresosOperativos,
            CostoVendido = costoVendido,
            GastosJornada = gastosJornada,
            CostosFijosDia = costosFijosDia,
            PuntoEquilibrioDia = puntoEquilibrio,
            EstadoDia = estadoDia,
            ConteoRealizado = conteoRealizado
        };

        _db.CierresJornada.Add(cierre);

        // Cerrar jornada
        jornada.Estado = "cerrada";
        jornada.CerradaEn = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();

        // Guardar conteo de productos si se realizó
        if (conteoRealizado)
        {
            foreach (var item in request.Conteos)
            {
                var prod = await _db.Productos.FindAsync(item.ProductoId)!;
                _db.ConteosProductosCierre.Add(new ConteoProductoCierre
                {
                    CierreId = cierre.Id,
                    NegocioId = negocioId,
                    ProductoId = item.ProductoId,
                    UnidadesVendidas = item.UnidadesVendidas,
                    PrecioVenta = prod!.PrecioVenta,
                    CostoUnitario = prod.CostoUnitario
                });
            }
            await _db.SaveChangesAsync();
        }

        return await ObtenerPorJornadaAsync(negocioId, jornadaId, usuarioId);
    }

    public async Task<CierreResponse> ObtenerPorJornadaAsync(long negocioId, long jornadaId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);

        var cierre = await _db.CierresJornada
            .Include(c => c.Jornada)
            .Include(c => c.Conteos).ThenInclude(ct => ct.Producto)
            .FirstOrDefaultAsync(c => c.JornadaId == jornadaId && c.NegocioId == negocioId)
            ?? throw new KeyNotFoundException("No se encontró el cierre para esta jornada.");

        return MapearRespuesta(cierre);
    }

    public async Task<List<HistorialCierreResponse>> ObtenerHistorialAsync(
        long negocioId, long usuarioId, int pagina = 1, int tamano = 30)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);

        return await _db.CierresJornada
            .Where(c => c.NegocioId == negocioId)
            .Include(c => c.Jornada)
            .OrderByDescending(c => c.CreadoEn)
            .Skip((pagina - 1) * tamano)
            .Take(tamano)
            .Select(c => new HistorialCierreResponse
            {
                Id = c.Id,
                JornadaId = c.JornadaId,
                FechaReferencia = c.Jornada.FechaReferencia,
                IngresosOperativos = c.IngresosOperativos,
                CostoVendido = c.CostoVendido,
                UtilidadNeta = c.UtilidadNeta,
                MargenGanancia = c.MargenGanancia,
                EstadoDia = c.EstadoDia,
                CreadoEn = c.CreadoEn
            })
            .ToListAsync();
    }

    public async Task<CierreResponse> CorregirAsync(
        long negocioId, long cierreId, long usuarioId, CorregirCierreRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var cierre = await _db.CierresJornada
            .Include(c => c.Jornada)
            .Include(c => c.Conteos).ThenInclude(ct => ct.Producto)
            .FirstOrDefaultAsync(c => c.Id == cierreId && c.NegocioId == negocioId)
            ?? throw new KeyNotFoundException("Cierre no encontrado.");

        // Snapshot antes de corregir
        var anterior = JsonSerializer.Serialize(MapearRespuesta(cierre));

        if (request.CajaFinalRegistrada.HasValue)
            cierre.CajaFinalRegistrada = request.CajaFinalRegistrada.Value;
        if (request.IngresosOperativos.HasValue)
            cierre.IngresosOperativos = request.IngresosOperativos.Value;
        if (request.CostoVendido.HasValue)
            cierre.CostoVendido = request.CostoVendido.Value;
        if (request.GastosJornada.HasValue)
            cierre.GastosJornada = request.GastosJornada.Value;

        cierre.ActualizadoEn = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        // Snapshot después de corregir
        var nuevo = JsonSerializer.Serialize(MapearRespuesta(cierre));

        _db.AuditoriasCierres.Add(new AuditoriaCierre
        {
            CierreId = cierreId,
            NegocioId = negocioId,
            ModificadoPor = usuarioId,
            Justificacion = request.Justificacion,
            ValoresAnteriores = JsonDocument.Parse(anterior),
            ValoresNuevos = JsonDocument.Parse(nuevo)
        });
        await _db.SaveChangesAsync();

        return MapearRespuesta(cierre);
    }

    // ── Utilidades ────────────────────────────────────────────────────

    private async Task<decimal> CalcularCostosFijosDiaAsync(long negocioId, int diasOperacionSemana)
    {
        // Días operativos al mes aproximado
        var diasMes = diasOperacionSemana * 4.33m;

        var sumaCostosFijos = await _db.CostosFijos
            .Where(c => c.NegocioId == negocioId && c.EliminadoEn == null)
            .SumAsync(c => c.EquivalenteDiario);

        var sumaEmpleados = await _db.Empleados
            .Where(e => e.NegocioId == negocioId && e.EliminadoEn == null)
            .SumAsync(e => e.CostoDiario);

        return sumaCostosFijos + sumaEmpleados;
    }

    private static CierreResponse MapearRespuesta(CierreJornada c) => new()
    {
        Id = c.Id,
        JornadaId = c.JornadaId,
        FechaReferencia = c.Jornada?.FechaReferencia ?? DateOnly.MinValue,
        CajaInicial = c.CajaInicial,
        CajaEsperada = c.CajaEsperada,
        CajaFinalRegistrada = c.CajaFinalRegistrada,
        DiferenciaCaja = c.DiferenciaCaja,
        IngresosOperativos = c.IngresosOperativos,
        CostoVendido = c.CostoVendido,
        UtilidadBruta = c.UtilidadBruta,
        GastosJornada = c.GastosJornada,
        CostosFijosDia = c.CostosFijosDia,
        UtilidadNeta = c.UtilidadNeta,
        MargenGanancia = c.MargenGanancia,
        PuntoEquilibrioDia = c.PuntoEquilibrioDia,
        EstadoDia = c.EstadoDia,
        ConteoRealizado = c.ConteoRealizado,
        CreadoEn = c.CreadoEn,
        Conteos = c.Conteos?.Select(ct => new ConteoProductoCierreResponse
        {
            ProductoId = ct.ProductoId,
            NombreProducto = ct.Producto?.Nombre ?? "",
            UnidadesVendidas = ct.UnidadesVendidas,
            PrecioVenta = ct.PrecioVenta,
            CostoUnitario = ct.CostoUnitario,
            SubtotalIngresos = ct.SubtotalIngresos,
            SubtotalCosto = ct.SubtotalCosto,
            SubtotalUtilidad = ct.SubtotalUtilidad
        }).ToList() ?? []
    };
}

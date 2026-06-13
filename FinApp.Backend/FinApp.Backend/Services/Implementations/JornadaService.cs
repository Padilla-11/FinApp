using Finop.API.Data;
using Finop.API.Models.DTOs.Jornadas;
using Finop.API.Models.Entities;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services.Implementations;

public class JornadaService : IJornadaService
{
    private readonly FinopDbContext _db;
    private readonly IAccesoService _acceso;

    public JornadaService(FinopDbContext db, IAccesoService acceso)
    { _db = db; _acceso = acceso; }

    public async Task<JornadaResponse> AbrirAsync(long negocioId, long usuarioId, AbrirJornadaRequest request)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);

        // Verificar que no haya una jornada abierta
        var abierta = await _db.Jornadas
            .AnyAsync(j => j.NegocioId == negocioId && j.Estado == "abierta");
        if (abierta)
            throw new InvalidOperationException("Ya existe una jornada abierta. Debe cerrarla antes de abrir una nueva.");

        var fechaRef = request.FechaReferencia ?? DateOnly.FromDateTime(DateTime.Today);

        // Verificar unicidad por fecha
        var existeFecha = await _db.Jornadas
            .AnyAsync(j => j.NegocioId == negocioId && j.FechaReferencia == fechaRef);
        if (existeFecha)
            throw new InvalidOperationException($"Solo puedes tener una jornada por día. Ya tienes una jornada (abierta o cerrada) para el {fechaRef:dd/MM/yyyy}.");

        var jornada = new Jornada
        {
            NegocioId = negocioId,
            AbiertaPor = usuarioId,
            FechaReferencia = fechaRef,
            CajaInicial = request.CajaInicial,
            NotaApertura = request.NotaApertura,
            Estado = "abierta"
        };

        _db.Jornadas.Add(jornada);
        await _db.SaveChangesAsync();

        // Recargar con nombre de usuario
        await _db.Entry(jornada).Reference(j => j.AbiertaPorUsuario).LoadAsync();
        return MapearRespuesta(jornada, 0, 0, 0, 0);
    }

    public async Task<JornadaResponse?> ObtenerAbiertaAsync(long negocioId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);

        var jornada = await _db.Jornadas
            .Include(j => j.AbiertaPorUsuario)
            .Include(j => j.Movimientos)
            .FirstOrDefaultAsync(j => j.NegocioId == negocioId && j.Estado == "abierta");

        if (jornada is null) return null;

        var (ingresos, gastos, totalMov) = CalcularResumen(jornada.Movimientos);
        var cajaActual = jornada.CajaInicial + jornada.Movimientos
            .Where(m => m.AfectaCaja)
            .Sum(m => m.Monto * m.SignoCaja);

        return MapearRespuesta(jornada, cajaActual, ingresos, gastos, totalMov);
    }

    public async Task<JornadaResponse> ObtenerPorIdAsync(long negocioId, long jornadaId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);

        var jornada = await _db.Jornadas
            .Include(j => j.AbiertaPorUsuario)
            .Include(j => j.Movimientos)
            .FirstOrDefaultAsync(j => j.Id == jornadaId && j.NegocioId == negocioId)
            ?? throw new KeyNotFoundException("Jornada no encontrada.");

        var (ingresos, gastos, totalMov) = CalcularResumen(jornada.Movimientos);
        var cajaActual = jornada.CajaInicial + jornada.Movimientos
            .Where(m => m.AfectaCaja)
            .Sum(m => m.Monto * m.SignoCaja);

        return MapearRespuesta(jornada, cajaActual, ingresos, gastos, totalMov);
    }

    public async Task<List<JornadaResumenResponse>> ListarHistorialAsync(long negocioId, long usuarioId, int pagina = 1, int tamano = 20)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);

        return await _db.Jornadas
            .Where(j => j.NegocioId == negocioId)
            .OrderByDescending(j => j.FechaReferencia)
            .Skip((pagina - 1) * tamano)
            .Take(tamano)
            .Select(j => new JornadaResumenResponse
            {
                Id = j.Id,
                FechaReferencia = j.FechaReferencia,
                Estado = j.Estado,
                CajaInicial = j.CajaInicial,
                AbiertaEn = j.AbiertaEn
            })
            .ToListAsync();
    }

    // ── Utilidades privadas ──────────────────────────────────────────

    private static (decimal ingresos, decimal gastos, int total) CalcularResumen(
        ICollection<MovimientoJornada> movimientos)
    {
        var ingresos = movimientos
            .Where(m => m.SignoCaja == 1 && m.AfectaCaja)
            .Sum(m => m.Monto);
        var gastos = movimientos
            .Where(m => m.SignoCaja == -1 && m.AfectaCaja)
            .Sum(m => m.Monto);
        return (ingresos, gastos, movimientos.Count);
    }

    private static JornadaResponse MapearRespuesta(
        Jornada j, decimal cajaActual, decimal ingresos, decimal gastos, int totalMov) => new()
    {
        Id = j.Id,
        FechaReferencia = j.FechaReferencia,
        CajaInicial = j.CajaInicial,
        NotaApertura = j.NotaApertura,
        Estado = j.Estado,
        AbiertaEn = j.AbiertaEn,
        CerradaEn = j.CerradaEn,
        AbiertaPorNombre = j.AbiertaPorUsuario?.Nombre ?? "",
        CajaActual = cajaActual,
        TotalIngresos = ingresos,
        TotalGastos = gastos,
        TotalMovimientos = totalMov
    };
}

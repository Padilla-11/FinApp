using Finop.API.Data;
using Finop.API.Models.DTOs.Movimientos;
using Finop.API.Models.Entities;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services.Implementations;

public class MovimientoService : IMovimientoService
{
    private readonly FinopDbContext _db;
    private readonly IAccesoService _acceso;

    public MovimientoService(FinopDbContext db, IAccesoService acceso)
    { _db = db; _acceso = acceso; }

    public async Task<MovimientoResponse> RegistrarAsync(
        long negocioId, long jornadaId, long usuarioId, RegistrarMovimientoRequest request)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        var jornada = await ObtenerJornadaAbiertaAsync(negocioId, jornadaId);

        // El signo depende del tipo de movimiento
        var signo = request.Tipo switch
        {
            "gasto_operativo" or "compra_mercancia" or "retiro_dueno" => (short)-1,
            "ingreso_no_operativo" or "cobro_cuenta_por_cobrar" => (short)1,
            _ => throw new ArgumentException($"Tipo de movimiento no válido: {request.Tipo}")
        };

        var movimiento = new MovimientoJornada
        {
            JornadaId = jornadaId,
            NegocioId = negocioId,
            Tipo = request.Tipo,
            CategoriaGastoId = request.CategoriaGastoId,
            Descripcion = request.Descripcion.Trim(),
            Monto = request.Monto,
            AfectaCaja = true,
            SignoCaja = signo,
            Nota = request.Nota,
            RegistradoPor = usuarioId
        };

        _db.MovimientosJornada.Add(movimiento);
        await _db.SaveChangesAsync();
        await _db.Entry(movimiento).Reference(m => m.RegistradoPorUsuario).LoadAsync();
        if (movimiento.CategoriaGastoId.HasValue)
            await _db.Entry(movimiento).Reference(m => m.CategoriaGasto).LoadAsync();

        return MapearRespuesta(movimiento);
    }

    public async Task<List<MovimientoResponse>> ListarPorJornadaAsync(
        long negocioId, long jornadaId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);

        return await _db.MovimientosJornada
            .Where(m => m.JornadaId == jornadaId && m.NegocioId == negocioId)
            .Include(m => m.RegistradoPorUsuario)
            .Include(m => m.CategoriaGasto)
            .OrderByDescending(m => m.RegistradoEn)
            .Select(m => MapearRespuesta(m))
            .ToListAsync();
    }

    public async Task EliminarAsync(long negocioId, long jornadaId, long movimientoId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        await ObtenerJornadaAbiertaAsync(negocioId, jornadaId);

        var movimiento = await _db.MovimientosJornada
            .FirstOrDefaultAsync(m => m.Id == movimientoId
                                   && m.JornadaId == jornadaId
                                   && m.NegocioId == negocioId)
            ?? throw new KeyNotFoundException("Movimiento no encontrado.");

        // No se pueden eliminar movimientos vinculados a cobros de crédito
        var esCobro = await _db.CobrosCredito.AnyAsync(c => c.MovimientoId == movimientoId);
        if (esCobro)
            throw new InvalidOperationException("No se puede eliminar un movimiento vinculado a un cobro de crédito.");

        _db.MovimientosJornada.Remove(movimiento);
        await _db.SaveChangesAsync();
    }

    public async Task<List<CategoriaGastoResponse>> ListarCategoriasGastoAsync(long negocioId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);

        return await _db.CategoriasGastos
            .Where(c => c.NegocioId == negocioId && c.EliminadoEn == null)
            .OrderBy(c => c.EsPredefinida ? 0 : 1).ThenBy(c => c.Nombre)
            .Select(c => new CategoriaGastoResponse
            { Id = c.Id, Nombre = c.Nombre, EsPredefinida = c.EsPredefinida })
            .ToListAsync();
    }

    public async Task<CategoriaGastoResponse> CrearCategoriaGastoAsync(
        long negocioId, long usuarioId, CrearCategoriaGastoRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var cat = new CategoriaGasto
        {
            NegocioId = negocioId,
            Nombre = request.Nombre.Trim(),
            EsPredefinida = false
        };
        _db.CategoriasGastos.Add(cat);
        await _db.SaveChangesAsync();

        return new CategoriaGastoResponse { Id = cat.Id, Nombre = cat.Nombre, EsPredefinida = false };
    }

    // ── Utilidades ────────────────────────────────────────────────────

    private async Task<Jornada> ObtenerJornadaAbiertaAsync(long negocioId, long jornadaId)
    {
        var jornada = await _db.Jornadas
            .FirstOrDefaultAsync(j => j.Id == jornadaId && j.NegocioId == negocioId)
            ?? throw new KeyNotFoundException("Jornada no encontrada.");

        if (jornada.Estado != "abierta")
            throw new InvalidOperationException("La jornada ya está cerrada. No se pueden agregar movimientos.");

        return jornada;
    }

    private static MovimientoResponse MapearRespuesta(MovimientoJornada m) => new()
    {
        Id = m.Id,
        Tipo = m.Tipo,
        CategoriaNombre = m.CategoriaGasto?.Nombre,
        Descripcion = m.Descripcion,
        Monto = m.Monto,
        SignoCaja = m.SignoCaja,
        AfectaCaja = m.AfectaCaja,
        Nota = m.Nota,
        RegistradoPorNombre = m.RegistradoPorUsuario?.Nombre ?? "",
        RegistradoEn = m.RegistradoEn
    };
}

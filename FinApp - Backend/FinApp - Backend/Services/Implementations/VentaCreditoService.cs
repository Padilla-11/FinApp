using Finop.API.Data;
using Finop.API.Models.DTOs.VentasCredito;
using Finop.API.Models.Entities;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services.Implementations;

public class VentaCreditoService : IVentaCreditoService
{
    private readonly FinopDbContext _db;
    private readonly IAccesoService _acceso;

    public VentaCreditoService(FinopDbContext db, IAccesoService acceso)
    { _db = db; _acceso = acceso; }

    public async Task<VentaCreditoResponse> CrearAsync(
        long negocioId, long jornadaId, long usuarioId, CrearVentaCreditoRequest request)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        await VerificarJornadaAbiertaAsync(negocioId, jornadaId);

        var venta = new VentaCredito
        {
            NegocioId = negocioId,
            JornadaId = jornadaId,
            RegistradoPor = usuarioId,
            NombreCliente = request.NombreCliente.Trim(),
            Descripcion = request.Descripcion,
            MontoTotal = request.MontoTotal,
            Nota = request.Nota
        };

        _db.VentasCredito.Add(venta);
        await _db.SaveChangesAsync();
        return MapearRespuesta(venta, []);
    }

    public async Task<List<VentaCreditoResponse>> ListarPendientesAsync(long negocioId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);

        return await _db.VentasCredito
            .Where(v => v.NegocioId == negocioId
                     && (v.Estado == "pendiente" || v.Estado == "cobrado_parcial"))
            .Include(v => v.Cobros)
            .OrderByDescending(v => v.CreadoEn)
            .Select(v => MapearRespuesta(v, v.Cobros.ToList()))
            .ToListAsync();
    }

    public async Task<VentaCreditoResponse> RegistrarCobroAsync(
        long negocioId, long ventaId, long jornadaId, long usuarioId, RegistrarCobroRequest request)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        await VerificarJornadaAbiertaAsync(negocioId, jornadaId);

        var venta = await _db.VentasCredito
            .Include(v => v.Cobros)
            .FirstOrDefaultAsync(v => v.Id == ventaId && v.NegocioId == negocioId)
            ?? throw new KeyNotFoundException("Venta a crédito no encontrada.");

        if (venta.Estado == "cobrado")
            throw new InvalidOperationException("Esta venta ya está cobrada en su totalidad.");

        var saldoPendiente = venta.MontoTotal - venta.MontoCobrado;
        if (request.MontoCobrado > saldoPendiente)
            throw new InvalidOperationException(
                $"El monto a cobrar ({request.MontoCobrado:C}) supera el saldo pendiente ({saldoPendiente:C}).");

        // Crear movimiento en la jornada
        var movimiento = new MovimientoJornada
        {
            JornadaId = jornadaId,
            NegocioId = negocioId,
            Tipo = "cobro_cuenta_por_cobrar",
            Descripcion = $"Cobro a {venta.NombreCliente}",
            Monto = request.MontoCobrado,
            AfectaCaja = true,
            SignoCaja = 1,
            Nota = request.Nota,
            RegistradoPor = usuarioId
        };
        _db.MovimientosJornada.Add(movimiento);
        await _db.SaveChangesAsync(); // Necesitamos el ID del movimiento

        // Crear el cobro — el trigger de PostgreSQL actualizará ventas_credito
        var cobro = new CobroCredito
        {
            VentaCreditoId = ventaId,
            NegocioId = negocioId,
            JornadaId = jornadaId,
            MovimientoId = movimiento.Id,
            MontoCobrado = request.MontoCobrado,
            RegistradoPor = usuarioId,
            Nota = request.Nota
        };
        _db.CobrosCredito.Add(cobro);
        await _db.SaveChangesAsync();

        // Refrescar la venta desde la base de datos (el trigger ya actualizó el estado)
        await _db.Entry(venta).ReloadAsync();
        await _db.Entry(venta).Collection(v => v.Cobros).LoadAsync();

        return MapearRespuesta(venta, venta.Cobros.ToList());
    }

    private async Task VerificarJornadaAbiertaAsync(long negocioId, long jornadaId)
    {
        var jornada = await _db.Jornadas
            .FirstOrDefaultAsync(j => j.Id == jornadaId && j.NegocioId == negocioId)
            ?? throw new KeyNotFoundException("Jornada no encontrada.");
        if (jornada.Estado != "abierta")
            throw new InvalidOperationException("La jornada está cerrada.");
    }

    private static VentaCreditoResponse MapearRespuesta(VentaCredito v, List<CobroCredito> cobros) => new()
    {
        Id = v.Id,
        NombreCliente = v.NombreCliente,
        Descripcion = v.Descripcion,
        MontoTotal = v.MontoTotal,
        MontoCobrado = v.MontoCobrado,
        Estado = v.Estado,
        FechaRegistro = v.FechaRegistro,
        Nota = v.Nota,
        Cobros = cobros.Select(c => new CobroResponse
        {
            Id = c.Id,
            MontoCobrado = c.MontoCobrado,
            Nota = c.Nota,
            RegistradoEn = c.RegistradoEn
        }).ToList()
    };
}

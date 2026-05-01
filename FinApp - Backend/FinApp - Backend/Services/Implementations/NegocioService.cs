using Finop.API.Data;
using Finop.API.Models.DTOs.Negocios;
using Finop.API.Models.Entities;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services.Implementations;

public class NegocioService : INegocioService
{
    private readonly FinopDbContext _db;
    private readonly IAccesoService _acceso;

    public NegocioService(FinopDbContext db, IAccesoService acceso)
    { _db = db; _acceso = acceso; }

    public async Task<List<NegocioResponse>> ObtenerMisNegociosAsync(long usuarioId)
    {
        return await _db.UsuariosNegocios
            .Where(un => un.UsuarioId == usuarioId && un.EliminadoEn == null)
            .Include(un => un.Negocio)
            .Where(un => un.Negocio.EliminadoEn == null)
            .Select(un => new NegocioResponse
            {
                Id            = un.Negocio.Id,
                Nombre        = un.Negocio.Nombre,
                TipoActividad = un.Negocio.TipoActividad,
                FechaInicio   = un.Negocio.FechaInicio,
                DiasOperacion = un.Negocio.DiasOperacion,
                Rol           = un.Rol,
                CreadoEn      = un.Negocio.CreadoEn
            })
            .OrderByDescending(n => n.CreadoEn)
            .ToListAsync();
    }

    public async Task<NegocioResponse> ObtenerPorIdAsync(long negocioId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        var rol = await _acceso.ObtenerRolAsync(negocioId, usuarioId);

        var negocio = await _db.Negocios
            .FirstOrDefaultAsync(n => n.Id == negocioId && n.EliminadoEn == null)
            ?? throw new KeyNotFoundException("Negocio no encontrado.");

        return Map(negocio, rol);
    }

    public async Task<NegocioResponse> CrearAsync(long usuarioId, CrearNegocioRequest request)
    {
        if (request.DiasOperacion.Any(d => d < 1 || d > 7))
            throw new ArgumentException("Los días operativos deben estar entre 1 (Lun) y 7 (Dom).");

        var negocio = new Negocio
        {
            Nombre        = request.Nombre.Trim(),
            TipoActividad = request.TipoActividad?.Trim(),
            FechaInicio   = request.FechaInicio,
            DiasOperacion = request.DiasOperacion.Distinct().Order().Select(d => (short)d).ToArray(),
            CreadoPor     = usuarioId
        };

        _db.Negocios.Add(negocio);
        await _db.SaveChangesAsync();

        // Registrar como propietario
        _db.UsuariosNegocios.Add(new UsuarioNegocio
        {
            UsuarioId = usuarioId,
            NegocioId = negocio.Id,
            Rol       = "propietario"
        });

        // Categorías de gastos predefinidas
        var predefinidas = new[] { "Transporte", "Insumos", "Empaques", "Servicios", "Otros" };
        foreach (var nombre in predefinidas)
            _db.CategoriasGastos.Add(new CategoriaGasto
                { NegocioId = negocio.Id, Nombre = nombre, EsPredefinida = true });

        await _db.SaveChangesAsync();
        return Map(negocio, "propietario");
    }

    public async Task<NegocioResponse> ActualizarAsync(long negocioId, long usuarioId, ActualizarNegocioRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var negocio = await _db.Negocios
            .FirstOrDefaultAsync(n => n.Id == negocioId && n.EliminadoEn == null)
            ?? throw new KeyNotFoundException("Negocio no encontrado.");

        if (request.Nombre is not null)      negocio.Nombre        = request.Nombre.Trim();
        if (request.TipoActividad is not null) negocio.TipoActividad = request.TipoActividad.Trim();
        if (request.FechaInicio.HasValue)    negocio.FechaInicio   = request.FechaInicio.Value;
        if (request.DiasOperacion is not null)
        {
            if (request.DiasOperacion.Any(d => d < 1 || d > 7))
                throw new ArgumentException("Los días deben estar entre 1 y 7.");
            negocio.DiasOperacion = request.DiasOperacion.Distinct().Order().Select(d => (short)d).ToArray();
        }

        negocio.ActualizadoEn = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return Map(negocio, "propietario");
    }

    public async Task EliminarAsync(long negocioId, long usuarioId)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        // Verificar que no haya jornadas abiertas
        var jornadaAbierta = await _db.Jornadas
            .AnyAsync(j => j.NegocioId == negocioId && j.Estado == "abierta");
        if (jornadaAbierta)
            throw new InvalidOperationException("No se puede eliminar un negocio con una jornada abierta.");

        var negocio = await _db.Negocios.FindAsync(negocioId)
            ?? throw new KeyNotFoundException("Negocio no encontrado.");

        negocio.EliminadoEn = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task InvitarOperadorAsync(long negocioId, long usuarioPropietarioId, InvitarOperadorRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioPropietarioId);

        var operador = await _db.Usuarios
            .FirstOrDefaultAsync(u => u.Correo == request.CorreoOperador.ToLower() && u.EliminadoEn == null)
            ?? throw new KeyNotFoundException("No existe usuario con ese correo registrado en FINOP.");

        var yaExiste = await _db.UsuariosNegocios
            .AnyAsync(un => un.NegocioId == negocioId && un.UsuarioId == operador.Id && un.EliminadoEn == null);
        if (yaExiste)
            throw new InvalidOperationException("Ese usuario ya tiene acceso al negocio.");

        _db.UsuariosNegocios.Add(new UsuarioNegocio
        {
            UsuarioId    = operador.Id,
            NegocioId    = negocioId,
            Rol          = "operador",
            InvitadoPor  = usuarioPropietarioId
        });
        await _db.SaveChangesAsync();
    }

    public async Task RemoverMiembroAsync(long negocioId, long usuarioPropietarioId, long miembroId)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioPropietarioId);

        if (miembroId == usuarioPropietarioId)
            throw new InvalidOperationException("El propietario no puede removerse a sí mismo.");

        var relacion = await _db.UsuariosNegocios
            .FirstOrDefaultAsync(un => un.NegocioId == negocioId && un.UsuarioId == miembroId && un.EliminadoEn == null)
            ?? throw new KeyNotFoundException("El usuario no tiene acceso a este negocio.");

        relacion.EliminadoEn = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
    }

    private static NegocioResponse Map(Negocio n, string rol) => new()
    {
        Id            = n.Id,
        Nombre        = n.Nombre,
        TipoActividad = n.TipoActividad,
        FechaInicio   = n.FechaInicio,
        DiasOperacion = n.DiasOperacion,
        Rol           = rol,
        CreadoEn      = n.CreadoEn
    };
}

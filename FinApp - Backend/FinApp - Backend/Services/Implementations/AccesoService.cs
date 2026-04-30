using Finop.API.Data;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services.Implementations;

public class AccesoService : IAccesoService
{
    private readonly FinopDbContext _db;
    public AccesoService(FinopDbContext db) => _db = db;

    public async Task VerificarAccesoAsync(long negocioId, long usuarioId)
    {
        var existe = await _db.UsuariosNegocios
            .AnyAsync(un => un.NegocioId == negocioId
                         && un.UsuarioId == usuarioId
                         && un.EliminadoEn == null);
        if (!existe)
            throw new UnauthorizedAccessException("No tiene acceso a este negocio.");
    }

    public async Task VerificarPropietarioAsync(long negocioId, long usuarioId)
    {
        var rol = await ObtenerRolAsync(negocioId, usuarioId);
        if (rol != "propietario")
            throw new UnauthorizedAccessException("Solo el propietario puede realizar esta acción.");
    }

    public async Task<string> ObtenerRolAsync(long negocioId, long usuarioId)
    {
        var un = await _db.UsuariosNegocios
            .FirstOrDefaultAsync(x => x.NegocioId == negocioId
                                   && x.UsuarioId == usuarioId
                                   && x.EliminadoEn == null)
            ?? throw new UnauthorizedAccessException("No tiene acceso a este negocio.");
        return un.Rol;
    }
}

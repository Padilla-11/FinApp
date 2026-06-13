using System.Security.Claims;

namespace Finop.API.Helpers;

/// <summary>
/// Extrae el usuario autenticado del contexto HTTP.
/// </summary>
public static class ContextoUsuario
{
    public static long ObtenerUsuarioId(ClaimsPrincipal user)
    {
        var sub = user.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? user.FindFirstValue("sub")
                  ?? throw new UnauthorizedAccessException("Token sin usuario.");
        return long.Parse(sub);
    }
}

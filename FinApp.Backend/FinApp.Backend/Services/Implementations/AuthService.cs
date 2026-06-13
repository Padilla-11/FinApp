using Finop.API.Data;
using Finop.API.Helpers;
using Finop.API.Models.DTOs.Auth;
using Finop.API.Models.Entities;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services.Implementations;

public class AuthService : IAuthService
{
    private readonly FinopDbContext _db;
    private readonly JwtHelper _jwt;
    private readonly IConfiguration _config;

    public AuthService(FinopDbContext db, JwtHelper jwt, IConfiguration config)
    { _db = db; _jwt = jwt; _config = config; }

    public async Task<AuthResponse> RegistrarAsync(RegisterRequest request)
    {
        var existe = await _db.Usuarios
            .AnyAsync(u => u.Correo == request.Correo.ToLower() && u.EliminadoEn == null);
        if (existe)
            throw new InvalidOperationException("Ya existe una cuenta con ese correo.");

        var usuario = new Usuario
        {
            Nombre = request.Nombre.Trim(),
            Correo = request.Correo.ToLower().Trim(),
            ContrasenaHash = BCrypt.Net.BCrypt.HashPassword(request.Contrasena)
        };

        _db.Usuarios.Add(usuario);
        await _db.SaveChangesAsync();

        return BuildResponse(usuario);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var usuario = await _db.Usuarios
            .FirstOrDefaultAsync(u => u.Correo == request.Correo.ToLower() && u.EliminadoEn == null)
            ?? throw new UnauthorizedAccessException("Correo o contraseña incorrectos.");

        if (!BCrypt.Net.BCrypt.Verify(request.Contrasena, usuario.ContrasenaHash))
            throw new UnauthorizedAccessException("Correo o contraseña incorrectos.");

        return BuildResponse(usuario);
    }

    private AuthResponse BuildResponse(Models.Entities.Usuario u)
    {
        var expMin = int.Parse(_config["Jwt:ExpirationMinutes"]!);

        // Obtener el negocio asociado al usuario (único)
        var negocioId = _db.UsuariosNegocios
            .Where(un => un.UsuarioId == u.Id && un.EliminadoEn == null)
            .Select(un => un.NegocioId)
            .FirstOrDefault();

        return new AuthResponse
        {
            Token = _jwt.GenerarToken(u.Id, u.Correo, u.Nombre),
            Nombre = u.Nombre,
            Correo = u.Correo,
            UsuarioId = u.Id,
            NegocioId = negocioId,
            Expira = DateTimeOffset.UtcNow.AddMinutes(expMin),
            Usuario = new Models.DTOs.Auth.UsuarioDto
            {
                Id = u.Id,
                Nombre = u.Nombre,
                Correo = u.Correo
            }
        };
    }
}

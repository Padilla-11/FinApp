using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.Auth;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;
    public AuthController(IAuthService auth) => _auth = auth;

    /// <summary>Registrar un nuevo usuario</summary>
    [HttpPost("registrar")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Registrar([FromBody] RegisterRequest request)
    {
        var resultado = await _auth.RegistrarAsync(request);
        return Ok(ApiResponse<AuthResponse>.Ok(resultado, "Usuario registrado exitosamente."));
    }

    /// <summary>Iniciar sesión y obtener token JWT</summary>
    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login([FromBody] LoginRequest request)
    {
        var resultado = await _auth.LoginAsync(request);
        return Ok(ApiResponse<AuthResponse>.Ok(resultado, "Sesión iniciada."));
    }
}

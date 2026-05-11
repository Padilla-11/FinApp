using Finop.API.Helpers;
using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.Negocios;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

[ApiController]
[Route("api/negocios")]
[Authorize]
public class NegociosController : ControllerBase
{
    private readonly INegocioService _svc;
    public NegociosController(INegocioService svc) => _svc = svc;
    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<NegocioResponse>>>> MisNegocios()
    {
        var data = await _svc.ObtenerMisNegociosAsync(UsuarioId);
        return Ok(ApiResponse<List<NegocioResponse>>.Ok(data));
    }

    [HttpGet("{negocioId:long}")]
    public async Task<ActionResult<ApiResponse<NegocioResponse>>> Obtener(long negocioId)
    {
        var data = await _svc.ObtenerPorIdAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<NegocioResponse>.Ok(data));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<NegocioResponse>>> Crear([FromBody] CrearNegocioRequest request)
    {
        var data = await _svc.CrearAsync(UsuarioId, request);
        return CreatedAtAction(nameof(Obtener), new { negocioId = data.Id },
            ApiResponse<NegocioResponse>.Ok(data, "Negocio creado."));
    }

    [HttpPut("{negocioId:long}")]
    public async Task<ActionResult<ApiResponse<NegocioResponse>>> Actualizar(
        long negocioId, [FromBody] ActualizarNegocioRequest request)
    {
        var data = await _svc.ActualizarAsync(negocioId, UsuarioId, request);
        return Ok(ApiResponse<NegocioResponse>.Ok(data, "Negocio actualizado."));
    }

    [HttpDelete("{negocioId:long}")]
    public async Task<ActionResult<ApiResponse<object>>> Eliminar(long negocioId)
    {
        await _svc.EliminarAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<object>.Ok(null!, "Negocio eliminado."));
    }

    [HttpGet("{negocioId:long}/miembros")]
    public async Task<ActionResult<ApiResponse<List<MiembroResponse>>>> ListarMiembros(long negocioId)
    {
        var data = await _svc.ObtenerMiembrosAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<List<MiembroResponse>>.Ok(data));
    }

    [HttpPost("{negocioId:long}/miembros")]
    public async Task<ActionResult<ApiResponse<MiembroResponse>>> CrearMiembro(
        long negocioId, [FromBody] CrearMiembroRequest request)
    {
        var data = await _svc.CrearMiembroAsync(negocioId, UsuarioId, request);
        return Ok(ApiResponse<MiembroResponse>.Ok(data, "Usuario registrado exitosamente."));
    }

    [HttpDelete("{negocioId:long}/miembros/{miembroId:long}")]
    public async Task<ActionResult<ApiResponse<object>>> EliminarMiembro(long negocioId, long miembroId)
    {
        await _svc.EliminarMiembroAsync(negocioId, UsuarioId, miembroId);
        return Ok(ApiResponse<object>.Ok(null!, "Usuario eliminado del negocio."));
    }
}

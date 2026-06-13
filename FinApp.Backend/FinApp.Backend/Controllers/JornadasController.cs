using Finop.API.Helpers;
using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.Jornadas;
using Finop.API.Models.DTOs.Movimientos;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

[ApiController]
[Route("api/negocios/{negocioId:long}/jornadas")]
[Authorize]
public class JornadasController : ControllerBase
{
    private readonly IJornadaService _jornadaSvc;
    private readonly IMovimientoService _movSvc;
    public JornadasController(IJornadaService jornadaSvc, IMovimientoService movSvc)
    { _jornadaSvc = jornadaSvc; _movSvc = movSvc; }
    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    /// <summary>Abrir una nueva jornada para el día actual</summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<JornadaResponse>>> Abrir(
        long negocioId, [FromBody] AbrirJornadaRequest request)
    {
        var data = await _jornadaSvc.AbrirAsync(negocioId, UsuarioId, request);
        return Ok(ApiResponse<JornadaResponse>.Ok(data, "Jornada abierta."));
    }

    /// <summary>Obtener la jornada actualmente abierta (si existe)</summary>
    [HttpGet("activa")]
    public async Task<ActionResult<ApiResponse<JornadaResponse?>>> ObtenerActiva(long negocioId)
    {
        var data = await _jornadaSvc.ObtenerAbiertaAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<JornadaResponse?>.Ok(data));
    }

    /// <summary>Obtener historial de jornadas paginado</summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<JornadaResumenResponse>>>> Historial(
        long negocioId, [FromQuery] int pagina = 1, [FromQuery] int tamano = 20)
    {
        var data = await _jornadaSvc.ListarHistorialAsync(negocioId, UsuarioId, pagina, tamano);
        return Ok(ApiResponse<List<JornadaResumenResponse>>.Ok(data));
    }

    /// <summary>Obtener una jornada específica por ID</summary>
    [HttpGet("{jornadaId:long}")]
    public async Task<ActionResult<ApiResponse<JornadaResponse>>> Obtener(long negocioId, long jornadaId)
    {
        var data = await _jornadaSvc.ObtenerPorIdAsync(negocioId, jornadaId, UsuarioId);
        return Ok(ApiResponse<JornadaResponse>.Ok(data));
    }

    // ── Movimientos anidados ─────────────────────────────────────────

    /// <summary>Listar movimientos de una jornada</summary>
    [HttpGet("{jornadaId:long}/movimientos")]
    public async Task<ActionResult<ApiResponse<List<MovimientoResponse>>>> ListarMovimientos(
        long negocioId, long jornadaId)
    {
        var data = await _movSvc.ListarPorJornadaAsync(negocioId, jornadaId, UsuarioId);
        return Ok(ApiResponse<List<MovimientoResponse>>.Ok(data));
    }

    /// <summary>Registrar un movimiento en la jornada activa</summary>
    [HttpPost("{jornadaId:long}/movimientos")]
    public async Task<ActionResult<ApiResponse<MovimientoResponse>>> RegistrarMovimiento(
        long negocioId, long jornadaId, [FromBody] RegistrarMovimientoRequest request)
    {
        var data = await _movSvc.RegistrarAsync(negocioId, jornadaId, UsuarioId, request);
        return Ok(ApiResponse<MovimientoResponse>.Ok(data, "Movimiento registrado."));
    }

    /// <summary>Eliminar un movimiento de la jornada activa</summary>
    [HttpDelete("{jornadaId:long}/movimientos/{movimientoId:long}")]
    public async Task<ActionResult<ApiResponse<object>>> EliminarMovimiento(
        long negocioId, long jornadaId, long movimientoId)
    {
        await _movSvc.EliminarAsync(negocioId, jornadaId, movimientoId, UsuarioId);
        return Ok(ApiResponse<object>.Ok(null!, "Movimiento eliminado."));
    }
}

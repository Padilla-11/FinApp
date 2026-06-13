using Finop.API.Helpers;
using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.Cierres;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

[ApiController]
[Route("api/negocios/{negocioId:long}")]
[Authorize]
public class CierresController : ControllerBase
{
    private readonly ICierreService _svc;
    public CierresController(ICierreService svc) => _svc = svc;
    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    /// <summary>Confirmar el cierre de una jornada abierta (solo propietario)</summary>
    [HttpPost("jornadas/{jornadaId:long}/cierre")]
    public async Task<ActionResult<ApiResponse<CierreResponse>>> ConfirmarCierre(
        long negocioId, long jornadaId, [FromBody] ConfirmarCierreRequest request)
    {
        var data = await _svc.ConfirmarCierreAsync(negocioId, jornadaId, UsuarioId, request);
        return Ok(ApiResponse<CierreResponse>.Ok(data, "Jornada cerrada exitosamente."));
    }

    /// <summary>Obtener el cierre de una jornada específica</summary>
    [HttpGet("jornadas/{jornadaId:long}/cierre")]
    public async Task<ActionResult<ApiResponse<CierreResponse>>> ObtenerCierre(long negocioId, long jornadaId)
    {
        var data = await _svc.ObtenerPorJornadaAsync(negocioId, jornadaId, UsuarioId);
        return Ok(ApiResponse<CierreResponse>.Ok(data));
    }

    /// <summary>Historial de cierres paginado</summary>
    [HttpGet("historial")]
    public async Task<ActionResult<ApiResponse<List<HistorialCierreResponse>>>> Historial(
        long negocioId, [FromQuery] int pagina = 1, [FromQuery] int tamano = 30)
    {
        var data = await _svc.ObtenerHistorialAsync(negocioId, UsuarioId, pagina, tamano);
        return Ok(ApiResponse<List<HistorialCierreResponse>>.Ok(data));
    }

    /// <summary>Corregir un cierre confirmado (solo propietario, queda en auditoría)</summary>
    [HttpPatch("cierres/{cierreId:long}")]
    public async Task<ActionResult<ApiResponse<CierreResponse>>> Corregir(
        long negocioId, long cierreId, [FromBody] CorregirCierreRequest request)
    {
        var data = await _svc.CorregirAsync(negocioId, cierreId, UsuarioId, request);
        return Ok(ApiResponse<CierreResponse>.Ok(data, "Cierre corregido. Cambio registrado en auditoría."));
    }
}

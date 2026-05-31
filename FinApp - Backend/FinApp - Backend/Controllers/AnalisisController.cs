using Finop.API.Helpers;
using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.Analisis;
using Finop.API.Services;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

[ApiController]
[Route("api/negocios/{negocioId:long}/analisis")]
[Authorize]
public class AnalisisController : ControllerBase
{
    private readonly AnalisisService _service;
    private readonly IAccesoService _acceso;

    public AnalisisController(AnalisisService service, IAccesoService acceso)
    {
        _service = service;
        _acceso = acceso;
    }

    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    [HttpGet("estadisticas/raw")]
    public async Task<ActionResult<ApiResponse<AnalisisResponseDto>>> GetRaw(long negocioId, [FromQuery] int dias = 30)
    {
        var resultado = await _service.GetRawAsync(negocioId, UsuarioId, dias);
        return Ok(ApiResponse<AnalisisResponseDto>.Ok(resultado));
    }

    [HttpGet("estadisticas")]
    public async Task<ActionResult<ApiResponse<AnalisisResponseDto>>> Get(long negocioId, [FromQuery] int dias = 30)
    {
        var resultado = await _service.GetConIAAsync(negocioId, UsuarioId, dias);
        return Ok(ApiResponse<AnalisisResponseDto>.Ok(resultado));
    }

    [HttpGet("estadisticas/detalle")]
    public async Task<ActionResult<ApiResponse<AnalisisDetalleResponseDto>>> GetDetalle(long negocioId, [FromQuery] int dias = 30)
    {
        var resultado = await _service.GetDetalleAsync(negocioId, UsuarioId, dias);
        return Ok(ApiResponse<AnalisisDetalleResponseDto>.Ok(resultado));
    }

    [HttpPost("estadisticas/regenerar")]
    public async Task<ActionResult<ApiResponse<AnalisisResponseDto>>> Regenerar(long negocioId, [FromBody] RegenerarRequest request)
    {
        var resultado = await _service.GetConIAAsync(negocioId, UsuarioId, request.Dias, forzarRegeneracion: true);
        return Ok(ApiResponse<AnalisisResponseDto>.Ok(resultado, "Análisis regenerado exitosamente."));
    }
}

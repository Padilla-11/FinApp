using Finop.API.Helpers;
using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.Simulador;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

[ApiController]
[Route("api/negocios/{negocioId:long}/simulador")]
[Authorize]
public class SimuladorController : ControllerBase
{
    private readonly ISimuladorService _svc;
    public SimuladorController(ISimuladorService svc) => _svc = svc;
    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    /// <summary>
    /// Calcular preview de un escenario sin guardarlo.
    /// Útil para mostrar resultados en tiempo real mientras el usuario ajusta variables.
    /// </summary>
    [HttpPost("preview")]
    public async Task<ActionResult<ApiResponse<PreviewSimulacionResponse>>> Preview(
        long negocioId, [FromBody] PreviewSimulacionRequest request)
    {
        var data = await _svc.PreviewAsync(negocioId, UsuarioId, request);
        return Ok(ApiResponse<PreviewSimulacionResponse>.Ok(data));
    }

    /// <summary>Guardar un escenario de simulación</summary>
    [HttpPost("escenarios")]
    public async Task<ActionResult<ApiResponse<EscenarioResponse>>> Guardar(
        long negocioId, [FromBody] CrearEscenarioRequest request)
    {
        var data = await _svc.GuardarEscenarioAsync(negocioId, UsuarioId, request);
        return CreatedAtAction(nameof(Obtener), new { negocioId, escenarioId = data.Id },
            ApiResponse<EscenarioResponse>.Ok(data, "Escenario guardado."));
    }

    /// <summary>Listar escenarios guardados</summary>
    [HttpGet("escenarios")]
    public async Task<ActionResult<ApiResponse<List<EscenarioResponse>>>> Listar(long negocioId)
    {
        var data = await _svc.ListarEscenariosAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<List<EscenarioResponse>>.Ok(data));
    }

    /// <summary>Obtener un escenario guardado por ID</summary>
    [HttpGet("escenarios/{escenarioId:long}")]
    public async Task<ActionResult<ApiResponse<EscenarioResponse>>> Obtener(long negocioId, long escenarioId)
    {
        var data = await _svc.ObtenerEscenarioAsync(negocioId, escenarioId, UsuarioId);
        return Ok(ApiResponse<EscenarioResponse>.Ok(data));
    }

    /// <summary>Eliminar un escenario guardado (soft delete)</summary>
    [HttpDelete("escenarios/{escenarioId:long}")]
    public async Task<ActionResult<ApiResponse<object>>> Eliminar(long negocioId, long escenarioId)
    {
        await _svc.EliminarEscenarioAsync(negocioId, escenarioId, UsuarioId);
        return Ok(ApiResponse<object>.Ok(null!, "Escenario eliminado."));
    }

    /// <summary>Obtener estadísticas reales del negocio para el simulador</summary>
    [HttpGet("estadisticas")]
    public async Task<ActionResult<ApiResponse<EstadisticasSimuladorResponse>>> ObtenerEstadisticas(long negocioId)
    {
        var data = await _svc.ObtenerEstadisticasAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<EstadisticasSimuladorResponse>.Ok(data));
    }
}

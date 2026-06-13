using Finop.API.Helpers;
using Finop.API.Models.DTOs.IA;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

[ApiController]
[Route("api/negocios/{negocioId:long}")]
[Authorize]
public class IAController : ControllerBase
{
    private readonly IIAService _ia;
    private readonly ILogger<IAController> _logger;
    public IAController(IIAService ia, ILogger<IAController> logger)
    {
        _ia = ia;
        _logger = logger;
    }
    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    [HttpPost("asistente")]
    public async Task<ActionResult<ConsultaIAResponse>> Consultar(
        long negocioId, [FromBody] ConsultaIARequest request)
    {
        try
        {
            var data = await _ia.ConsultarAsync(negocioId, UsuarioId, request);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error en Consultar IA para negocio {NegocioId}", negocioId);
            return StatusCode(500, new ConsultaIAResponse
            {
                Respuesta = "Ocurrió un error al procesar tu consulta. Intenta de nuevo.",
                TokensUsados = 0
            });
        }
    }

    [HttpPost("asistente/diagnostico")]
    public async Task<ActionResult<DiagnosticoIAResponse>> Diagnostico(
        long negocioId, [FromBody] DiagnosticoIARequest request)
    {
        try
        {
            var data = await _ia.GenerarDiagnosticoAsync(negocioId, UsuarioId, request);
            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error en Diagnostico IA para negocio {NegocioId}", negocioId);
            return StatusCode(500, new DiagnosticoIAResponse
            {
                DatosInsuficientes = false,
                EstadoGeneral = "Ocurrió un error al generar el diagnóstico.",
                PuntosPositivos = [],
                PuntosMejorar = [],
                ConsejoGeneral = "",
                MensajeInicial = "Hubo un error. Intenta de nuevo.",
                TokensUsados = 0
            });
        }
    }
}

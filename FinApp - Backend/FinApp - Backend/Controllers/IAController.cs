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
    public IAController(IIAService ia) => _ia = ia;
    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    [HttpPost("asistente")]
    public async Task<ActionResult<ConsultaIAResponse>> Consultar(
        long negocioId, [FromBody] ConsultaIARequest request)
    {
        var data = await _ia.ConsultarAsync(negocioId, UsuarioId, request);
        return Ok(data);
    }
}

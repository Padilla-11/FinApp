using Finop.API.Helpers;
using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.CostosFijos;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

[ApiController]
[Route("api/negocios/{negocioId:long}/costos-fijos")]
[Authorize]
public class CostosFijosController : ControllerBase
{
    private readonly ICostoFijoService _svc;
    public CostosFijosController(ICostoFijoService svc) => _svc = svc;
    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<CostoFijoResponse>>>> Listar(long negocioId)
    {
        var data = await _svc.ListarAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<List<CostoFijoResponse>>.Ok(data));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CostoFijoResponse>>> Crear(
        long negocioId, [FromBody] CrearCostoFijoRequest request)
    {
        var data = await _svc.CrearAsync(negocioId, UsuarioId, request);
        return Ok(ApiResponse<CostoFijoResponse>.Ok(data, "Costo fijo creado."));
    }

    [HttpPut("{costoId:long}")]
    public async Task<ActionResult<ApiResponse<CostoFijoResponse>>> Actualizar(
        long negocioId, long costoId, [FromBody] ActualizarCostoFijoRequest request)
    {
        var data = await _svc.ActualizarAsync(negocioId, costoId, UsuarioId, request);
        return Ok(ApiResponse<CostoFijoResponse>.Ok(data, "Costo fijo actualizado."));
    }

    [HttpDelete("{costoId:long}")]
    public async Task<ActionResult<ApiResponse<object>>> Eliminar(long negocioId, long costoId)
    {
        await _svc.EliminarAsync(negocioId, costoId, UsuarioId);
        return Ok(ApiResponse<object>.Ok(null!, "Costo fijo eliminado."));
    }
}

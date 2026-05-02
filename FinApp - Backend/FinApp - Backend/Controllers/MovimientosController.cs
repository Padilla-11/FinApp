using Finop.API.Helpers;
using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.Movimientos;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

/// <summary>
/// Gestión de categorías de gastos y consulta cross-jornada de movimientos.
/// Los movimientos dentro de una jornada se gestionan en JornadasController.
/// </summary>
[ApiController]
[Route("api/negocios/{negocioId:long}/categorias-gastos")]
[Authorize]
public class MovimientosController : ControllerBase
{
    private readonly IMovimientoService _svc;
    public MovimientosController(IMovimientoService svc) => _svc = svc;
    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<CategoriaGastoResponse>>>> ListarCategorias(long negocioId)
    {
        var data = await _svc.ListarCategoriasGastoAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<List<CategoriaGastoResponse>>.Ok(data));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<CategoriaGastoResponse>>> CrearCategoria(
        long negocioId, [FromBody] CrearCategoriaGastoRequest request)
    {
        var data = await _svc.CrearCategoriaGastoAsync(negocioId, UsuarioId, request);
        return Ok(ApiResponse<CategoriaGastoResponse>.Ok(data, "Categoría de gasto creada."));
    }
}

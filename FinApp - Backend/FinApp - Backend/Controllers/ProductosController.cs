using Finop.API.Helpers;
using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.Productos;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

[ApiController]
[Route("api/negocios/{negocioId:long}/productos")]
[Authorize]
public class ProductosController : ControllerBase
{
    private readonly IProductoService _svc;
    public ProductosController(IProductoService svc) => _svc = svc;
    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProductoResponse>>>> Listar(long negocioId)
    {
        var data = await _svc.ListarAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<List<ProductoResponse>>.Ok(data));
    }

    [HttpGet("{productoId:long}")]
    public async Task<ActionResult<ApiResponse<ProductoResponse>>> Obtener(long negocioId, long productoId)
    {
        var data = await _svc.ObtenerPorIdAsync(negocioId, productoId, UsuarioId);
        return Ok(ApiResponse<ProductoResponse>.Ok(data));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProductoResponse>>> Crear(
        long negocioId, [FromBody] CrearProductoRequest request)
    {
        var data = await _svc.CrearAsync(negocioId, UsuarioId, request);
        return CreatedAtAction(nameof(Obtener), new { negocioId, productoId = data.Id },
            ApiResponse<ProductoResponse>.Ok(data, "Producto creado."));
    }

    [HttpPut("{productoId:long}")]
    public async Task<ActionResult<ApiResponse<ProductoResponse>>> Actualizar(
        long negocioId, long productoId, [FromBody] ActualizarProductoRequest request)
    {
        var data = await _svc.ActualizarAsync(negocioId, productoId, UsuarioId, request);
        return Ok(ApiResponse<ProductoResponse>.Ok(data, "Producto actualizado."));
    }

    [HttpDelete("{productoId:long}")]
    public async Task<ActionResult<ApiResponse<object>>> Eliminar(long negocioId, long productoId)
    {
        await _svc.EliminarAsync(negocioId, productoId, UsuarioId);
        return Ok(ApiResponse<object>.Ok(null!, "Producto eliminado."));
    }

    // ── Categorías ────────────────────────────────────────────────────

    [HttpGet("categorias")]
    public async Task<ActionResult<ApiResponse<List<CategoriaProductoResponse>>>> ListarCategorias(long negocioId)
    {
        var data = await _svc.ListarCategoriasAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<List<CategoriaProductoResponse>>.Ok(data));
    }

    [HttpPost("categorias")]
    public async Task<ActionResult<ApiResponse<CategoriaProductoResponse>>> CrearCategoria(
        long negocioId, [FromBody] CrearCategoriaProductoRequest request)
    {
        var data = await _svc.CrearCategoriaAsync(negocioId, UsuarioId, request);
        return Ok(ApiResponse<CategoriaProductoResponse>.Ok(data, "Categoría creada."));
    }

    [HttpDelete("categorias/{categoriaId:long}")]
    public async Task<ActionResult<ApiResponse<object>>> EliminarCategoria(long negocioId, long categoriaId)
    {
        await _svc.EliminarCategoriaAsync(negocioId, categoriaId, UsuarioId);
        return Ok(ApiResponse<object>.Ok(null!, "Categoría eliminada."));
    }
}

using Finop.API.Helpers;
using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.Empleados;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

[ApiController]
[Route("api/negocios/{negocioId:long}/empleados")]
[Authorize]
public class EmpleadosController : ControllerBase
{
    private readonly IEmpleadoService _svc;
    public EmpleadosController(IEmpleadoService svc) => _svc = svc;
    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<EmpleadoResponse>>>> Listar(long negocioId)
    {
        var data = await _svc.ListarAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<List<EmpleadoResponse>>.Ok(data));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<EmpleadoResponse>>> Crear(
        long negocioId, [FromBody] CrearEmpleadoRequest request)
    {
        var data = await _svc.CrearAsync(negocioId, UsuarioId, request);
        return Ok(ApiResponse<EmpleadoResponse>.Ok(data, "Empleado creado."));
    }

    [HttpPut("{empleadoId:long}")]
    public async Task<ActionResult<ApiResponse<EmpleadoResponse>>> Actualizar(
        long negocioId, long empleadoId, [FromBody] ActualizarEmpleadoRequest request)
    {
        var data = await _svc.ActualizarAsync(negocioId, empleadoId, UsuarioId, request);
        return Ok(ApiResponse<EmpleadoResponse>.Ok(data, "Empleado actualizado."));
    }

    [HttpDelete("{empleadoId:long}")]
    public async Task<ActionResult<ApiResponse<object>>> Eliminar(long negocioId, long empleadoId)
    {
        await _svc.EliminarAsync(negocioId, empleadoId, UsuarioId);
        return Ok(ApiResponse<object>.Ok(null!, "Empleado eliminado."));
    }
}

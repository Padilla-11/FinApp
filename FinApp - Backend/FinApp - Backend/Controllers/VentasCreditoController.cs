using Finop.API.Helpers;
using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.VentasCredito;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finop.API.Controllers;

[ApiController]
[Route("api/negocios/{negocioId:long}")]
[Authorize]
public class VentasCreditoController : ControllerBase
{
    private readonly IVentaCreditoService _svc;
    public VentasCreditoController(IVentaCreditoService svc) => _svc = svc;
    private long UsuarioId => ContextoUsuario.ObtenerUsuarioId(User);

    /// <summary>Listar todas las cuentas por cobrar pendientes o parciales</summary>
    [HttpGet("cuentas-por-cobrar")]
    public async Task<ActionResult<ApiResponse<List<VentaCreditoResponse>>>> ListarPendientes(long negocioId)
    {
        var data = await _svc.ListarPendientesAsync(negocioId, UsuarioId);
        return Ok(ApiResponse<List<VentaCreditoResponse>>.Ok(data));
    }

    /// <summary>Registrar una venta a crédito durante una jornada abierta</summary>
    [HttpPost("jornadas/{jornadaId:long}/ventas-credito")]
    public async Task<ActionResult<ApiResponse<VentaCreditoResponse>>> Crear(
        long negocioId, long jornadaId, [FromBody] CrearVentaCreditoRequest request)
    {
        var data = await _svc.CrearAsync(negocioId, jornadaId, UsuarioId, request);
        return Ok(ApiResponse<VentaCreditoResponse>.Ok(data, "Venta a crédito registrada."));
    }

    /// <summary>Registrar un pago (parcial o total) sobre una cuenta por cobrar</summary>
    [HttpPost("cuentas-por-cobrar/{ventaId:long}/cobros")]
    public async Task<ActionResult<ApiResponse<VentaCreditoResponse>>> RegistrarCobro(
        long negocioId, long ventaId,
        [FromQuery] long jornadaId,
        [FromBody] RegistrarCobroRequest request)
    {
        var data = await _svc.RegistrarCobroAsync(negocioId, ventaId, jornadaId, UsuarioId, request);
        return Ok(ApiResponse<VentaCreditoResponse>.Ok(data, "Cobro registrado."));
    }
}

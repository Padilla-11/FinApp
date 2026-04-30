using Finop.API.Models.DTOs.Auth;
using Finop.API.Models.DTOs.Negocios;
using Finop.API.Models.DTOs.Productos;
using Finop.API.Models.DTOs.CostosFijos;
using Finop.API.Models.DTOs.Empleados;
using Finop.API.Models.DTOs.Jornadas;
using Finop.API.Models.DTOs.Movimientos;
using Finop.API.Models.DTOs.VentasCredito;
using Finop.API.Models.DTOs.Cierres;
using Finop.API.Models.DTOs.Simulador;

namespace Finop.API.Services.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegistrarAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
}

public interface INegocioService
{
    Task<List<NegocioResponse>> ObtenerMisNegociosAsync(long usuarioId);
    Task<NegocioResponse> ObtenerPorIdAsync(long negocioId, long usuarioId);
    Task<NegocioResponse> CrearAsync(long usuarioId, CrearNegocioRequest request);
    Task<NegocioResponse> ActualizarAsync(long negocioId, long usuarioId, ActualizarNegocioRequest request);
    Task EliminarAsync(long negocioId, long usuarioId);
    Task InvitarOperadorAsync(long negocioId, long usuarioPropietarioId, InvitarOperadorRequest request);
    Task RemoverMiembroAsync(long negocioId, long usuarioPropietarioId, long miembroId);
}

public interface IProductoService
{
    Task<List<ProductoResponse>> ListarAsync(long negocioId, long usuarioId);
    Task<ProductoResponse> ObtenerPorIdAsync(long negocioId, long productoId, long usuarioId);
    Task<ProductoResponse> CrearAsync(long negocioId, long usuarioId, CrearProductoRequest request);
    Task<ProductoResponse> ActualizarAsync(long negocioId, long productoId, long usuarioId, ActualizarProductoRequest request);
    Task EliminarAsync(long negocioId, long productoId, long usuarioId);
    Task<List<CategoriaProductoResponse>> ListarCategoriasAsync(long negocioId, long usuarioId);
    Task<CategoriaProductoResponse> CrearCategoriaAsync(long negocioId, long usuarioId, CrearCategoriaProductoRequest request);
    Task EliminarCategoriaAsync(long negocioId, long categoriaId, long usuarioId);
}

public interface ICostoFijoService
{
    Task<List<CostoFijoResponse>> ListarAsync(long negocioId, long usuarioId);
    Task<CostoFijoResponse> CrearAsync(long negocioId, long usuarioId, CrearCostoFijoRequest request);
    Task<CostoFijoResponse> ActualizarAsync(long negocioId, long costoId, long usuarioId, ActualizarCostoFijoRequest request);
    Task EliminarAsync(long negocioId, long costoId, long usuarioId);
}

public interface IEmpleadoService
{
    Task<List<EmpleadoResponse>> ListarAsync(long negocioId, long usuarioId);
    Task<EmpleadoResponse> CrearAsync(long negocioId, long usuarioId, CrearEmpleadoRequest request);
    Task<EmpleadoResponse> ActualizarAsync(long negocioId, long empleadoId, long usuarioId, ActualizarEmpleadoRequest request);
    Task EliminarAsync(long negocioId, long empleadoId, long usuarioId);
}

public interface IJornadaService
{
    Task<JornadaResponse> AbrirAsync(long negocioId, long usuarioId, AbrirJornadaRequest request);
    Task<JornadaResponse?> ObtenerAbiertaAsync(long negocioId, long usuarioId);
    Task<JornadaResponse> ObtenerPorIdAsync(long negocioId, long jornadaId, long usuarioId);
    Task<List<JornadaResumenResponse>> ListarHistorialAsync(long negocioId, long usuarioId, int pagina = 1, int tamano = 20);
}

public interface IMovimientoService
{
    Task<MovimientoResponse> RegistrarAsync(long negocioId, long jornadaId, long usuarioId, RegistrarMovimientoRequest request);
    Task<List<MovimientoResponse>> ListarPorJornadaAsync(long negocioId, long jornadaId, long usuarioId);
    Task EliminarAsync(long negocioId, long jornadaId, long movimientoId, long usuarioId);
    Task<List<CategoriaGastoResponse>> ListarCategoriasGastoAsync(long negocioId, long usuarioId);
    Task<CategoriaGastoResponse> CrearCategoriaGastoAsync(long negocioId, long usuarioId, CrearCategoriaGastoRequest request);
}

public interface IVentaCreditoService
{
    Task<VentaCreditoResponse> CrearAsync(long negocioId, long jornadaId, long usuarioId, CrearVentaCreditoRequest request);
    Task<List<VentaCreditoResponse>> ListarPendientesAsync(long negocioId, long usuarioId);
    Task<VentaCreditoResponse> RegistrarCobroAsync(long negocioId, long ventaId, long jornadaId, long usuarioId, RegistrarCobroRequest request);
}

public interface ICierreService
{
    Task<CierreResponse> ConfirmarCierreAsync(long negocioId, long jornadaId, long usuarioId, ConfirmarCierreRequest request);
    Task<CierreResponse> ObtenerPorJornadaAsync(long negocioId, long jornadaId, long usuarioId);
    Task<List<HistorialCierreResponse>> ObtenerHistorialAsync(long negocioId, long usuarioId, int pagina = 1, int tamano = 30);
    Task<CierreResponse> CorregirAsync(long negocioId, long cierreId, long usuarioId, CorregirCierreRequest request);
}

public interface ISimuladorService
{
    Task<PreviewSimulacionResponse> PreviewAsync(long negocioId, long usuarioId, PreviewSimulacionRequest request);
    Task<EscenarioResponse> GuardarEscenarioAsync(long negocioId, long usuarioId, CrearEscenarioRequest request);
    Task<List<EscenarioResponse>> ListarEscenariosAsync(long negocioId, long usuarioId);
    Task<EscenarioResponse> ObtenerEscenarioAsync(long negocioId, long escenarioId, long usuarioId);
    Task EliminarEscenarioAsync(long negocioId, long escenarioId, long usuarioId);
}

public interface IAccesoService
{
    Task VerificarAccesoAsync(long negocioId, long usuarioId);
    Task VerificarPropietarioAsync(long negocioId, long usuarioId);
    Task<string> ObtenerRolAsync(long negocioId, long usuarioId);
}

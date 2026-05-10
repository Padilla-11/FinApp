using Finop.API.Data;
using Finop.API.Models.DTOs.CostosFijos;
using Finop.API.Models.DTOs.Empleados;
using Finop.API.Models.DTOs.Productos;
using Finop.API.Models.Entities;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services.Implementations;

// ═══════════════════════════════════════════════════════════════════
// MÉTODOS AUXILIARES
// ═══════════════════════════════════════════════════════════════════
public static class CostoHelper
{
    public static decimal CalcularCostoDiario(decimal valor, string frecuencia, short[]? diasOperacion)
    {
        if (frecuencia == "diaria") return valor;
        if (frecuencia == "semanal") return valor / 7;

        var diasSemana = diasOperacion?.Length ?? 6;
        var diasMes = Math.Round(diasSemana * 4.33m);
        return valor / diasMes;
    }
}

// ═══════════════════════════════════════════════════════════════════
// PRODUCTOS
// ═══════════════════════════════════════════════════════════════════
public class ProductoService : IProductoService
{
    private readonly FinopDbContext _db;
    private readonly IAccesoService _acceso;

    public ProductoService(FinopDbContext db, IAccesoService acceso)
    { _db = db; _acceso = acceso; }

    public async Task<List<ProductoResponse>> ListarAsync(long negocioId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        return await _db.Productos
            .Where(p => p.NegocioId == negocioId && p.EliminadoEn == null)
            .Include(p => p.Categoria)
            .OrderBy(p => p.Nombre)
            .Select(p => MapProducto(p))
            .ToListAsync();
    }

    public async Task<ProductoResponse> ObtenerPorIdAsync(long negocioId, long productoId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        var prod = await ObtenerProductoAsync(productoId, negocioId);
        return MapProducto(prod);
    }

    public async Task<ProductoResponse> CrearAsync(long negocioId, long usuarioId, CrearProductoRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        if (request.PrecioVenta <= 0)
            throw new ArgumentException("El precio de venta debe ser mayor a 0.");
        if (request.CostoUnitario < 0)
            throw new ArgumentException("El costo unitario no puede ser negativo.");
        if (request.CostoUnitario >= request.PrecioVenta)
            throw new ArgumentException("El costo unitario no puede ser mayor o igual al precio de venta.");

        var producto = new Producto
        {
            NegocioId     = negocioId,
            CategoriaId   = request.CategoriaId,
            Nombre        = request.Nombre.Trim(),
            PrecioVenta   = request.PrecioVenta,
            CostoUnitario = request.CostoUnitario
        };

        _db.Productos.Add(producto);
        await _db.SaveChangesAsync();

        // Recargar para obtener columna generada (margen_porcentaje)
        await _db.Entry(producto).ReloadAsync();
        if (producto.CategoriaId.HasValue)
            await _db.Entry(producto).Reference(p => p.Categoria).LoadAsync();

        return MapProducto(producto);
    }

    public async Task<ProductoResponse> ActualizarAsync(
        long negocioId, long productoId, long usuarioId, ActualizarProductoRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);
        var producto = await ObtenerProductoAsync(productoId, negocioId);

        if (request.Nombre is not null)        producto.Nombre        = request.Nombre.Trim();
        if (request.PrecioVenta.HasValue)      producto.PrecioVenta   = request.PrecioVenta.Value;
        if (request.CostoUnitario.HasValue)    producto.CostoUnitario = request.CostoUnitario.Value;
        if (request.CategoriaId.HasValue)      producto.CategoriaId   = request.CategoriaId;
        if (request.Activo.HasValue)           producto.Activo        = request.Activo.Value;

        producto.ActualizadoEn = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(producto).ReloadAsync();
        if (producto.CategoriaId.HasValue)
            await _db.Entry(producto).Reference(p => p.Categoria).LoadAsync();

        return MapProducto(producto);
    }

    public async Task EliminarAsync(long negocioId, long productoId, long usuarioId)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);
        var producto = await ObtenerProductoAsync(productoId, negocioId);

        // Verificar si tiene cierres — no eliminar físicamente
        var tieneCierres = await _db.ConteosProductosCierre.AnyAsync(c => c.ProductoId == productoId);
        if (tieneCierres)
        {
            producto.EliminadoEn = DateTimeOffset.UtcNow;
            producto.Activo      = false;
        }
        else
        {
            _db.Productos.Remove(producto);
        }
        await _db.SaveChangesAsync();
    }

    public async Task<List<CategoriaProductoResponse>> ListarCategoriasAsync(long negocioId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        return await _db.CategoriasProductos
            .Where(c => c.NegocioId == negocioId && c.EliminadoEn == null)
            .Select(c => new CategoriaProductoResponse
            {
                Id             = c.Id,
                Nombre         = c.Nombre,
                TotalProductos = c.Productos.Count(p => p.EliminadoEn == null)
            })
            .OrderBy(c => c.Nombre)
            .ToListAsync();
    }

    public async Task<CategoriaProductoResponse> CrearCategoriaAsync(
        long negocioId, long usuarioId, CrearCategoriaProductoRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var cat = new CategoriaProducto
        {
            NegocioId = negocioId,
            Nombre    = request.Nombre.Trim()
        };
        _db.CategoriasProductos.Add(cat);
        await _db.SaveChangesAsync();

        return new CategoriaProductoResponse { Id = cat.Id, Nombre = cat.Nombre };
    }

    public async Task EliminarCategoriaAsync(long negocioId, long categoriaId, long usuarioId)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var cat = await _db.CategoriasProductos
            .FirstOrDefaultAsync(c => c.Id == categoriaId && c.NegocioId == negocioId && c.EliminadoEn == null)
            ?? throw new KeyNotFoundException("Categoría no encontrada.");

        // Desasociar productos antes de eliminar
        await _db.Productos
            .Where(p => p.CategoriaId == categoriaId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.CategoriaId, (long?)null));

        cat.EliminadoEn = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
    }

    // ── Utilidades ───────────────────────────────────────────────────

    private async Task<Producto> ObtenerProductoAsync(long productoId, long negocioId) =>
        await _db.Productos
            .Include(p => p.Categoria)
            .FirstOrDefaultAsync(p => p.Id == productoId && p.NegocioId == negocioId && p.EliminadoEn == null)
        ?? throw new KeyNotFoundException($"Producto {productoId} no encontrado.");

    private static ProductoResponse MapProducto(Producto p) => new()
    {
        Id               = p.Id,
        Nombre           = p.Nombre,
        PrecioVenta      = p.PrecioVenta,
        CostoUnitario    = p.CostoUnitario,
        MargenPorcentaje = p.MargenPorcentaje,
        Activo           = p.Activo,
        CategoriaId      = p.CategoriaId,
        CategoriaNombre  = p.Categoria?.Nombre,
        CreadoEn         = p.CreadoEn
    };
}

// ═══════════════════════════════════════════════════════════════════
// COSTOS FIJOS
// ═══════════════════════════════════════════════════════════════════
public class CostoFijoService : ICostoFijoService
{
    private readonly FinopDbContext _db;
    private readonly IAccesoService _acceso;

    public CostoFijoService(FinopDbContext db, IAccesoService acceso)
    { _db = db; _acceso = acceso; }

    public async Task<List<CostoFijoResponse>> ListarAsync(long negocioId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        return await _db.CostosFijos
            .Where(c => c.NegocioId == negocioId && c.EliminadoEn == null)
            .OrderBy(c => c.Nombre)
            .Select(c => MapCosto(c))
            .ToListAsync();
    }

    public async Task<CostoFijoResponse> CrearAsync(long negocioId, long usuarioId, CrearCostoFijoRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var negocio = await _db.Negocios.FindAsync(negocioId);
        var costo = new CostoFijo
        {
            NegocioId  = negocioId,
            Nombre     = request.Nombre.Trim(),
            Valor      = request.Valor,
            Frecuencia = request.Frecuencia
        };
        costo.EquivalenteDiario = CostoHelper.CalcularCostoDiario(costo.Valor, costo.Frecuencia, negocio?.DiasOperacion);
        _db.CostosFijos.Add(costo);
        await _db.SaveChangesAsync();
        return MapCosto(costo);
    }

    public async Task<CostoFijoResponse> ActualizarAsync(
        long negocioId, long costoId, long usuarioId, ActualizarCostoFijoRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var costo = await _db.CostosFijos
            .FirstOrDefaultAsync(c => c.Id == costoId && c.NegocioId == negocioId && c.EliminadoEn == null)
            ?? throw new KeyNotFoundException("Costo fijo no encontrado.");

        if (request.Nombre is not null)    costo.Nombre     = request.Nombre.Trim();
        if (request.Valor.HasValue)        costo.Valor      = request.Valor.Value;
        if (request.Frecuencia is not null) costo.Frecuencia = request.Frecuencia;

        var negocio = await _db.Negocios.FindAsync(negocioId);
        costo.EquivalenteDiario = CostoHelper.CalcularCostoDiario(costo.Valor, costo.Frecuencia, negocio?.DiasOperacion);
        costo.ActualizadoEn = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(costo).ReloadAsync();
        return MapCosto(costo);
    }

    public async Task EliminarAsync(long negocioId, long costoId, long usuarioId)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var costo = await _db.CostosFijos
            .FirstOrDefaultAsync(c => c.Id == costoId && c.NegocioId == negocioId && c.EliminadoEn == null)
            ?? throw new KeyNotFoundException("Costo fijo no encontrado.");

        costo.EliminadoEn = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
    }

    private static CostoFijoResponse MapCosto(CostoFijo c) => new()
    {
        Id               = c.Id,
        Nombre           = c.Nombre,
        Valor            = c.Valor,
        Frecuencia       = c.Frecuencia,
        EquivalenteDiario = c.EquivalenteDiario
    };
}

// ═══════════════════════════════════════════════════════════════════
// EMPLEADOS
// ═══════════════════════════════════════════════════════════════════
public class EmpleadoService : IEmpleadoService
{
    private readonly FinopDbContext _db;
    private readonly IAccesoService _acceso;

    public EmpleadoService(FinopDbContext db, IAccesoService acceso)
    { _db = db; _acceso = acceso; }

    public async Task<List<EmpleadoResponse>> ListarAsync(long negocioId, long usuarioId)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        return await _db.Empleados
            .Where(e => e.NegocioId == negocioId && e.EliminadoEn == null)
            .OrderBy(e => e.Nombre)
            .Select(e => MapEmpleado(e))
            .ToListAsync();
    }

    public async Task<EmpleadoResponse> CrearAsync(long negocioId, long usuarioId, CrearEmpleadoRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var negocio = await _db.Negocios.FindAsync(negocioId);
        var empleado = new Empleado
        {
            NegocioId  = negocioId,
            Nombre     = request.Nombre.Trim(),
            Cargo      = request.Cargo?.Trim(),
            TipoPago   = request.TipoPago,
            ValorPago  = request.ValorPago
        };
        empleado.CostoDiario = CostoHelper.CalcularCostoDiario(empleado.ValorPago, empleado.TipoPago, negocio?.DiasOperacion);
        _db.Empleados.Add(empleado);
        await _db.SaveChangesAsync();
        return MapEmpleado(empleado);
    }

    public async Task<EmpleadoResponse> ActualizarAsync(
        long negocioId, long empleadoId, long usuarioId, ActualizarEmpleadoRequest request)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var empleado = await _db.Empleados
            .FirstOrDefaultAsync(e => e.Id == empleadoId && e.NegocioId == negocioId && e.EliminadoEn == null)
            ?? throw new KeyNotFoundException("Empleado no encontrado.");

        if (request.Nombre is not null)   empleado.Nombre   = request.Nombre.Trim();
        if (request.Cargo is not null)    empleado.Cargo    = request.Cargo.Trim();
        if (request.TipoPago is not null) empleado.TipoPago = request.TipoPago;
        if (request.ValorPago.HasValue)   empleado.ValorPago = request.ValorPago.Value;

        var negocio = await _db.Negocios.FindAsync(negocioId);
        empleado.CostoDiario = CostoHelper.CalcularCostoDiario(empleado.ValorPago, empleado.TipoPago, negocio?.DiasOperacion);
        empleado.ActualizadoEn = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        await _db.Entry(empleado).ReloadAsync();
        return MapEmpleado(empleado);
    }

    public async Task EliminarAsync(long negocioId, long empleadoId, long usuarioId)
    {
        await _acceso.VerificarPropietarioAsync(negocioId, usuarioId);

        var empleado = await _db.Empleados
            .FirstOrDefaultAsync(e => e.Id == empleadoId && e.NegocioId == negocioId && e.EliminadoEn == null)
            ?? throw new KeyNotFoundException("Empleado no encontrado.");

        empleado.EliminadoEn = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
    }

    private static EmpleadoResponse MapEmpleado(Empleado e) => new()
    {
        Id          = e.Id,
        Nombre      = e.Nombre,
        Cargo       = e.Cargo,
        TipoPago    = e.TipoPago,
        ValorPago   = e.ValorPago,
        CostoDiario = e.CostoDiario
    };
}

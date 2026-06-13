using System.ComponentModel.DataAnnotations;

namespace Finop.API.Models.DTOs.Productos;

public class CrearProductoRequest
{
    [Required] [MaxLength(150)]
    public string Nombre { get; set; } = null!;
    [Required][Range(0.01, double.MaxValue)] public decimal PrecioVenta { get; set; }
    [Required][Range(0, double.MaxValue)] public decimal CostoUnitario { get; set; }
    public long? CategoriaId { get; set; }
}

public class ActualizarProductoRequest
{
    [MaxLength(150)] public string? Nombre { get; set; }
    [Range(0.01, double.MaxValue)] public decimal? PrecioVenta { get; set; }
    [Range(0, double.MaxValue)] public decimal? CostoUnitario { get; set; }
    public long? CategoriaId { get; set; }
    public bool? Activo { get; set; }
}

public class ProductoResponse
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public decimal PrecioVenta { get; set; }
    public decimal CostoUnitario { get; set; }
    public decimal MargenPorcentaje { get; set; }
    public bool Activo { get; set; }
    public long? CategoriaId { get; set; }
    public string? CategoriaNombre { get; set; }
    public DateTimeOffset CreadoEn { get; set; }
}

public class CrearCategoriaProductoRequest
{
    [Required][MaxLength(100)] public string Nombre { get; set; } = null!;
}

public class CategoriaProductoResponse
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public int TotalProductos { get; set; }
}

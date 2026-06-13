namespace Finop.API.Models.Entities;

/// <summary>
/// Productos o servicios ofrecidos por el negocio.
/// </summary>
public class Producto
{
    public long Id { get; set; }
    public long NegocioId { get; set; }
    public long? CategoriaId { get; set; }
    public string Nombre { get; set; } = null!;
    public decimal PrecioVenta { get; set; }
    public decimal CostoUnitario { get; set; }

    /// <summary>
    /// Columna generada por PostgreSQL: ((precio_venta - costo_unitario) / precio_venta) * 100
    /// </summary>
    public decimal MargenPorcentaje { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ActualizadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EliminadoEn { get; set; }

    // Navegación
    public Negocio Negocio { get; set; } = null!;
    public CategoriaProducto? Categoria { get; set; }
    public ICollection<ConteoProductoCierre> ConteosCierre { get; set; } = [];
}

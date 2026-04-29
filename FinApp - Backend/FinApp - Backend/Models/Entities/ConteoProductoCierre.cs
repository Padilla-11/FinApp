namespace Finop.API.Models.Entities;

/// <summary>
/// Detalle de unidades vendidas por producto en cada cierre.
/// </summary>
public class ConteoProductoCierre
{
    public long Id { get; set; }
    public long CierreId { get; set; }
    public long NegocioId { get; set; }
    public long ProductoId { get; set; }
    public int UnidadesVendidas { get; set; }

    /// <summary>
    /// Copia del precio al momento del cierre. Protege historial de cambios futuros.
    /// </summary>
    public decimal PrecioVenta { get; set; }

    /// <summary>
    /// Copia del costo al momento del cierre. Protege historial de cambios futuros.
    /// </summary>
    public decimal CostoUnitario { get; set; }

    /// <summary>
    /// Calculado por PostgreSQL: unidades_vendidas * precio_venta
    /// </summary>
    public decimal SubtotalIngresos { get; set; }

    /// <summary>
    /// Calculado por PostgreSQL: unidades_vendidas * costo_unitario
    /// </summary>
    public decimal SubtotalCosto { get; set; }

    /// <summary>
    /// Calculado por PostgreSQL: subtotal_ingresos - subtotal_costo
    /// </summary>
    public decimal SubtotalUtilidad { get; set; }

    // Navegación
    public CierreJornada Cierre { get; set; } = null!;
    public Negocio Negocio { get; set; } = null!;
    public Producto Producto { get; set; } = null!;
}

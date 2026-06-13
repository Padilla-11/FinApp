namespace Finop.API.Models.Entities;

/// <summary>
/// Variables modificadas en cada escenario de simulación.
/// Tipos: precio_producto | costo_producto | volumen_ventas | costo_fijo | dias_operativos
/// </summary>
public class VariableSimulacion
{
    public long Id { get; set; }
    public long EscenarioId { get; set; }
    public long NegocioId { get; set; }
    public string TipoVariable { get; set; } = null!;
    public long? ProductoId { get; set; }
    public long? CostoFijoId { get; set; }
    public decimal ValorActual { get; set; }
    public decimal ValorSimulado { get; set; }

    /// <summary>
    /// Calculado por PostgreSQL como porcentaje de variación.
    /// </summary>
    public decimal VariacionPct { get; set; }
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;

    // Navegación
    public EscenarioSimulacion Escenario { get; set; } = null!;
    public Negocio Negocio { get; set; } = null!;
    public Producto? Producto { get; set; }
    public CostoFijo? CostoFijo { get; set; }
}

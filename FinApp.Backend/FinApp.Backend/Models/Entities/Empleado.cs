namespace Finop.API.Models.Entities;

/// <summary>
/// Empleados del negocio. Su costo diario se suma a los costos fijos del cierre.
/// </summary>
public class Empleado
{
    public long Id { get; set; }
    public long NegocioId { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Cargo { get; set; }

    /// <summary>
    /// diario | semanal | mensual
    /// </summary>
    public string TipoPago { get; set; } = null!;
    public decimal ValorPago { get; set; }

    /// <summary>
    /// Calculado automáticamente por PostgreSQL según tipo_pago y valor_pago.
    /// </summary>
    public decimal CostoDiario { get; set; }
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ActualizadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EliminadoEn { get; set; }

    public Negocio Negocio { get; set; } = null!;
}

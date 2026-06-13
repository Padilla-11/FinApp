namespace Finop.API.Models.Entities;

/// <summary>
/// Costos fijos periódicos del negocio (arriendo, servicios, etc.)
/// </summary>
public class CostoFijo
{
    public long Id { get; set; }
    public long NegocioId { get; set; }
    public string Nombre { get; set; } = null!;
    public decimal Valor { get; set; }

    /// <summary>
    /// diaria | semanal | mensual
    /// </summary>
    public string Frecuencia { get; set; } = null!;

    /// <summary>
    /// Calculado por PostgreSQL. Usado para distribuir el costo en el cierre diario.
    /// </summary>
    public decimal EquivalenteDiario { get; set; }
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ActualizadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EliminadoEn { get; set; }

    public Negocio Negocio { get; set; } = null!;
}

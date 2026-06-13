namespace Finop.API.Models.Entities;

/// <summary>
/// Pagos recibidos sobre ventas a crédito.
/// </summary>
public class CobroCredito
{
    public long Id { get; set; }
    public long VentaCreditoId { get; set; }
    public long NegocioId { get; set; }
    public long JornadaId { get; set; }

    /// <summary>
    /// Vincula el cobro al movimiento tipo cobro_cuenta_por_cobrar en la jornada.
    /// </summary>
    public long MovimientoId { get; set; }
    public decimal MontoCobrado { get; set; }
    public long RegistradoPor { get; set; }
    public DateTimeOffset RegistradoEn { get; set; } = DateTimeOffset.UtcNow;
    public string? Nota { get; set; }

    // Navegación
    public VentaCredito VentaCredito { get; set; } = null!;
    public Negocio Negocio { get; set; } = null!;
    public Jornada Jornada { get; set; } = null!;
    public MovimientoJornada Movimiento { get; set; } = null!;
    public Usuario RegistradoPorUsuario { get; set; } = null!;
}

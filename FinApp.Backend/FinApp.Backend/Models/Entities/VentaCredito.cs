namespace Finop.API.Models.Entities;

/// <summary>
/// Ventas realizadas a crédito. No afectan la caja hasta que se cobran.
/// </summary>
public class VentaCredito
{
    public long Id { get; set; }
    public long NegocioId { get; set; }
    public long JornadaId { get; set; }
    public long RegistradoPor { get; set; }
    public string NombreCliente { get; set; } = null!;
    public string? Descripcion { get; set; }
    public decimal MontoTotal { get; set; }

    /// <summary>
    /// Actualizado automáticamente por trigger al registrar cobros.
    /// </summary>
    public decimal MontoCobrado { get; set; } = 0;

    /// <summary>
    /// pendiente | cobrado_parcial | cobrado
    /// Actualizado automáticamente por trigger.
    /// </summary>
    public string Estado { get; set; } = "pendiente";
    public DateOnly FechaRegistro { get; set; } = DateOnly.FromDateTime(DateTime.Today);
    public string? Nota { get; set; }
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ActualizadoEn { get; set; } = DateTimeOffset.UtcNow;

    // Navegación
    public Negocio Negocio { get; set; } = null!;
    public Jornada Jornada { get; set; } = null!;
    public Usuario RegistradoPorUsuario { get; set; } = null!;
    public ICollection<CobroCredito> Cobros { get; set; } = [];
}

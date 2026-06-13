namespace Finop.API.Models.Entities;

/// <summary>
/// Ciclos operativos del negocio. Una jornada puede cruzar la medianoche.
/// </summary>
public class Jornada
{
    public long Id { get; set; }
    public long NegocioId { get; set; }
    public long AbiertaPor { get; set; }

    /// <summary>
    /// Día calendario en que se abrió la jornada. Usado como referencia en el historial.
    /// </summary>
    public DateOnly FechaReferencia { get; set; }
    public decimal CajaInicial { get; set; }
    public string? NotaApertura { get; set; }
    public DateTimeOffset AbiertaEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CerradaEn { get; set; }

    /// <summary>
    /// abierta | cerrada
    /// </summary>
    public string Estado { get; set; } = "abierta";

    // Navegación
    public Negocio Negocio { get; set; } = null!;
    public Usuario AbiertaPorUsuario { get; set; } = null!;
    public ICollection<MovimientoJornada> Movimientos { get; set; } = [];
    public ICollection<VentaCredito> VentasCredito { get; set; } = [];
    public CierreJornada? Cierre { get; set; }
}

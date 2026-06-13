using System.Text.Json;

namespace Finop.API.Models.Entities;

/// <summary>
/// Registro de todas las correcciones realizadas sobre cierres confirmados.
/// </summary>
public class AuditoriaCierre
{
    public long Id { get; set; }
    public long CierreId { get; set; }
    public long NegocioId { get; set; }
    public long ModificadoPor { get; set; }
    public string Justificacion { get; set; } = null!;

    /// <summary>
    /// Snapshot JSONB del cierre antes de la corrección.
    /// </summary>
    public JsonDocument ValoresAnteriores { get; set; } = null!;

    /// <summary>
    /// Snapshot JSONB del cierre después de la corrección.
    /// </summary>
    public JsonDocument ValoresNuevos { get; set; } = null!;
    public DateTimeOffset ModificadoEn { get; set; } = DateTimeOffset.UtcNow;

    // Navegación
    public CierreJornada Cierre { get; set; } = null!;
    public Negocio Negocio { get; set; } = null!;
    public Usuario ModificadoPorUsuario { get; set; } = null!;
}

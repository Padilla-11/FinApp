namespace Finop.API.Models.Entities;

/// <summary>
/// Relación entre usuarios y negocios con rol asignado.
/// </summary>
public class UsuarioNegocio
{
    public long Id { get; set; }
    public long UsuarioId { get; set; }
    public long NegocioId { get; set; }

    /// <summary>
    /// propietario: acceso total. operador: solo registra jornadas.
    /// </summary>
    public string Rol { get; set; } = null!;
    public long? InvitadoPor { get; set; }
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EliminadoEn { get; set; }

    // Navegación
    public Usuario Usuario { get; set; } = null!;
    public Negocio Negocio { get; set; } = null!;
    public Usuario? InvitadoPorUsuario { get; set; }
}

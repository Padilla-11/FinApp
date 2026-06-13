namespace Finop.API.Models.Entities;

/// <summary>
/// Usuarios registrados en el sistema.
/// </summary>
public class Usuario
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string Correo { get; set; } = null!;
    public string ContrasenaHash { get; set; } = null!;
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ActualizadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EliminadoEn { get; set; }

    // Navegación
    public ICollection<UsuarioNegocio> UsuariosNegocios { get; set; } = [];
    public ICollection<Negocio> NegociosCreados { get; set; } = [];
}

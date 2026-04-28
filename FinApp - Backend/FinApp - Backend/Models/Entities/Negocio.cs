namespace Finop.API.Models.Entities;

/// <summary>
/// Negocios registrados en el sistema. Un usuario puede tener varios.
/// </summary>
public class Negocio
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? TipoActividad { get; set; }
    public DateOnly FechaInicio { get; set; }

    /// <summary>
    /// Array de días operativos: 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb 7=Dom
    /// </summary>
    public short[] DiasOperacion { get; set; } = [];
    public long CreadoPor { get; set; }
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ActualizadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EliminadoEn { get; set; }

    // Navegación
    public Usuario CreadorUsuario { get; set; } = null!;
    public ICollection<UsuarioNegocio> UsuariosNegocios { get; set; } = [];
    public ICollection<Producto> Productos { get; set; } = [];
    public ICollection<CostoFijo> CostosFijos { get; set; } = [];
    public ICollection<Empleado> Empleados { get; set; } = [];
    public ICollection<Jornada> Jornadas { get; set; } = [];
}

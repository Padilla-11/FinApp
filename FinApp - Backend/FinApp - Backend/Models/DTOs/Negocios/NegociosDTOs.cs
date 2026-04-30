using System.ComponentModel.DataAnnotations;

namespace Finop.API.Models.DTOs.Negocios;

public class CrearNegocioRequest
{
    [Required(ErrorMessage = "El nombre del negocio es obligatorio")]
    [MaxLength(150)]
    public string Nombre { get; set; } = null!;

    [MaxLength(100)]
    public string? TipoActividad { get; set; }

    [Required(ErrorMessage = "La fecha de inicio es obligatoria")]
    public DateOnly FechaInicio { get; set; }

    /// <summary>
    /// Días operativos: 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb 7=Dom
    /// </summary>
    [Required(ErrorMessage = "Debe especificar al menos un día de operación")]
    [MinLength(1)]
    public short[] DiasOperacion { get; set; } = [];
}

public class ActualizarNegocioRequest
{
    [MaxLength(150)]
    public string? Nombre { get; set; }

    [MaxLength(100)]
    public string? TipoActividad { get; set; }

    public DateOnly? FechaInicio { get; set; }
    public short[]? DiasOperacion { get; set; }
}

public class NegocioResponse
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? TipoActividad { get; set; }
    public DateOnly FechaInicio { get; set; }
    public short[] DiasOperacion { get; set; } = [];
    public string Rol { get; set; } = null!;
    public DateTimeOffset CreadoEn { get; set; }
}

public class InvitarOperadorRequest
{
    [Required]
    [EmailAddress]
    public string CorreoOperador { get; set; } = null!;
}

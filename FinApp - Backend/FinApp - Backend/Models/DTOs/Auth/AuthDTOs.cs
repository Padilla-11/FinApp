using System.ComponentModel.DataAnnotations;

namespace Finop.API.Models.DTOs.Auth;

public class RegisterRequest
{
    [Required(ErrorMessage = "El nombre es obligatorio")]
    [MaxLength(100)]
    public string Nombre { get; set; } = null!;

    [Required(ErrorMessage = "El correo es obligatorio")]
    [EmailAddress(ErrorMessage = "Correo no válido")]
    public string Correo { get; set; } = null!;

    [Required(ErrorMessage = "La contraseña es obligatoria")]
    [MinLength(8, ErrorMessage = "La contraseña debe tener mínimo 8 caracteres")]
    public string Contrasena { get; set; } = null!;
}

public class LoginRequest
{
    [Required(ErrorMessage = "El correo es obligatorio")]
    [EmailAddress]
    public string Correo { get; set; } = null!;

    [Required(ErrorMessage = "La contraseña es obligatoria")]
    public string Contrasena { get; set; } = null!;
}

public class UsuarioDto
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string Correo { get; set; } = null!;
}

public class AuthResponse
{
    public string Token { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public string Correo { get; set; } = null!;
    public long UsuarioId { get; set; }
    public long NegocioId { get; set; }
    public DateTimeOffset Expira { get; set; }
    public UsuarioDto Usuario { get; set; } = null!;
}

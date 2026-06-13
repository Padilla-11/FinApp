using System.ComponentModel.DataAnnotations;

namespace Finop.API.Models.DTOs.CostosFijos;

public class CrearCostoFijoRequest
{
    [Required][MaxLength(150)] public string Nombre { get; set; } = null!;
    [Required][Range(0.01, double.MaxValue)] public decimal Valor { get; set; }
    [Required][RegularExpression("^(diaria|semanal|mensual)$")]
    public string Frecuencia { get; set; } = null!;
}

public class ActualizarCostoFijoRequest
{
    [MaxLength(150)] public string? Nombre { get; set; }
    [Range(0.01, double.MaxValue)] public decimal? Valor { get; set; }
    [RegularExpression("^(diaria|semanal|mensual)$")] public string? Frecuencia { get; set; }
}

public class CostoFijoResponse
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public decimal Valor { get; set; }
    public string Frecuencia { get; set; } = null!;
    public decimal EquivalenteDiario { get; set; }
}

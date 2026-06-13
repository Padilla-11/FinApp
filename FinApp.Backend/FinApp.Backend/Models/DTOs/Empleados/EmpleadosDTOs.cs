using System.ComponentModel.DataAnnotations;

namespace Finop.API.Models.DTOs.Empleados;

public class CrearEmpleadoRequest
{
    [Required][MaxLength(150)] public string Nombre { get; set; } = null!;
    [MaxLength(100)] public string? Cargo { get; set; }
    [Required][RegularExpression("^(diario|semanal|mensual)$")]
    public string TipoPago { get; set; } = null!;
    [Required][Range(0.01, double.MaxValue)] public decimal ValorPago { get; set; }
}

public class ActualizarEmpleadoRequest
{
    [MaxLength(150)] public string? Nombre { get; set; }
    [MaxLength(100)] public string? Cargo { get; set; }
    [RegularExpression("^(diario|semanal|mensual)$")] public string? TipoPago { get; set; }
    [Range(0.01, double.MaxValue)] public decimal? ValorPago { get; set; }
}

public class EmpleadoResponse
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Cargo { get; set; }
    public string TipoPago { get; set; } = null!;
    public decimal ValorPago { get; set; }
    public decimal CostoDiario { get; set; }
}

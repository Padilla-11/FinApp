using System.ComponentModel.DataAnnotations;

namespace Finop.API.Models.DTOs.VentasCredito;

public class CrearVentaCreditoRequest
{
    [Required][MaxLength(150)] public string NombreCliente { get; set; } = null!;
    [MaxLength(255)] public string? Descripcion { get; set; }
    [Required][Range(0.01, double.MaxValue)] public decimal MontoTotal { get; set; }
    public string? Nota { get; set; }
}

public class RegistrarCobroRequest
{
    [Required][Range(0.01, double.MaxValue)] public decimal MontoCobrado { get; set; }
    public string? Nota { get; set; }
}

public class VentaCreditoResponse
{
    public long Id { get; set; }
    public string NombreCliente { get; set; } = null!;
    public string? Descripcion { get; set; }
    public decimal MontoTotal { get; set; }
    public decimal MontoCobrado { get; set; }
    public decimal SaldoPendiente => MontoTotal - MontoCobrado;
    public string Estado { get; set; } = null!;
    public DateOnly FechaRegistro { get; set; }
    public string? Nota { get; set; }
    public List<CobroResponse> Cobros { get; set; } = [];
}

public class CobroResponse
{
    public long Id { get; set; }
    public decimal MontoCobrado { get; set; }
    public string? Nota { get; set; }
    public DateTimeOffset RegistradoEn { get; set; }
}

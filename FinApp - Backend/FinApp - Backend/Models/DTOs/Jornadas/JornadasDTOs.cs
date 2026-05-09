using System.ComponentModel.DataAnnotations;

namespace Finop.API.Models.DTOs.Jornadas;

public class AbrirJornadaRequest
{
    [Required][Range(0, double.MaxValue)] public decimal CajaInicial { get; set; }
    public string? NotaApertura { get; set; }
    public DateOnly? FechaReferencia { get; set; }
}

public class JornadaResponse
{
    public long Id { get; set; }
    public DateOnly FechaReferencia { get; set; }
    public decimal CajaInicial { get; set; }
    public string? NotaApertura { get; set; }
    public string Estado { get; set; } = null!;
    public DateTimeOffset AbiertaEn { get; set; }
    public DateTimeOffset? CerradaEn { get; set; }
    public string AbiertaPorNombre { get; set; } = null!;
    public decimal CajaActual { get; set; }
    public decimal TotalIngresos { get; set; }
    public decimal TotalGastos { get; set; }
    public int TotalMovimientos { get; set; }
}

public class JornadaResumenResponse
{
    public long Id { get; set; }
    public DateOnly FechaReferencia { get; set; }
    public string Estado { get; set; } = null!;
    public decimal CajaInicial { get; set; }
    public DateTimeOffset AbiertaEn { get; set; }
}

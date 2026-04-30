using System.ComponentModel.DataAnnotations;

namespace Finop.API.Models.DTOs.Simulador;

public class VariableSimulacionRequest
{
    [Required][RegularExpression("^(precio_producto|costo_producto|volumen_ventas|costo_fijo|dias_operativos)$")]
    public string TipoVariable { get; set; } = null!;
    public long? ProductoId { get; set; }
    public long? CostoFijoId { get; set; }
    [Required] public decimal ValorActual { get; set; }
    [Required][Range(0, double.MaxValue)] public decimal ValorSimulado { get; set; }
}

public class CrearEscenarioRequest
{
    [Required][MaxLength(150)] public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }
    [Required] public DateOnly PeriodoBaseInicio { get; set; }
    [Required] public DateOnly PeriodoBaseFin { get; set; }
    [Required][MinLength(1)] public List<VariableSimulacionRequest> Variables { get; set; } = [];
}

public class EscenarioResponse
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }
    public DateOnly PeriodoBaseInicio { get; set; }
    public DateOnly PeriodoBaseFin { get; set; }

    // Actual vs Simulado
    public decimal IngresosDiariosActual { get; set; }
    public decimal UtilidadNetaActual { get; set; }
    public decimal MargenActual { get; set; }
    public decimal EquilibrioActual { get; set; }

    public decimal IngresosDiariosSimulado { get; set; }
    public decimal UtilidadNetaSimulado { get; set; }
    public decimal MargenSimulado { get; set; }
    public decimal EquilibrioSimulado { get; set; }

    public decimal VariacionIngresos { get; set; }
    public decimal VariacionUtilidad { get; set; }

    public List<VariableSimulacionResponse> Variables { get; set; } = [];
    public DateTimeOffset CreadoEn { get; set; }
}

public class VariableSimulacionResponse
{
    public long Id { get; set; }
    public string TipoVariable { get; set; } = null!;
    public string? NombreEntidad { get; set; }
    public decimal ValorActual { get; set; }
    public decimal ValorSimulado { get; set; }
    public decimal VariacionPct { get; set; }
}

public class PreviewSimulacionRequest
{
    [Required] public DateOnly PeriodoBaseInicio { get; set; }
    [Required] public DateOnly PeriodoBaseFin { get; set; }
    [Required][MinLength(1)] public List<VariableSimulacionRequest> Variables { get; set; } = [];
}

public class PreviewSimulacionResponse
{
    public decimal IngresosDiariosActual { get; set; }
    public decimal UtilidadNetaActual { get; set; }
    public decimal MargenActual { get; set; }
    public decimal EquilibrioActual { get; set; }
    public decimal IngresosDiariosSimulado { get; set; }
    public decimal UtilidadNetaSimulado { get; set; }
    public decimal MargenSimulado { get; set; }
    public decimal EquilibrioSimulado { get; set; }
    public decimal VariacionIngresos { get; set; }
    public decimal VariacionUtilidad { get; set; }
}

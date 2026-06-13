namespace Finop.API.Models.Entities;

/// <summary>
/// Escenarios financieros guardados por el propietario.
/// </summary>
public class EscenarioSimulacion
{
    public long Id { get; set; }
    public long NegocioId { get; set; }
    public long CreadoPor { get; set; }
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }

    public DateOnly PeriodoBaseInicio { get; set; }
    public DateOnly PeriodoBaseFin { get; set; }

    // Situación actual (promedio real del período base)
    public decimal IngresosDiariosActual { get; set; }
    public decimal UtilidadNetaActual { get; set; }
    public decimal MargenActual { get; set; }
    public decimal EquilibrioActual { get; set; }

    // Escenario simulado
    public decimal IngresosDiariosSimulado { get; set; }
    public decimal UtilidadNetaSimulado { get; set; }
    public decimal MargenSimulado { get; set; }
    public decimal EquilibrioSimulado { get; set; }

    // Variaciones (calculadas por PostgreSQL)
    public decimal VariacionIngresos { get; set; }
    public decimal VariacionUtilidad { get; set; }

    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ActualizadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? EliminadoEn { get; set; }

    // Navegación
    public Negocio Negocio { get; set; } = null!;
    public Usuario CreadoPorUsuario { get; set; } = null!;
    public ICollection<VariableSimulacion> Variables { get; set; } = [];
}

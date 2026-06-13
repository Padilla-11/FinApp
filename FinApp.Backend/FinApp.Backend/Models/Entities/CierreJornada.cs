namespace Finop.API.Models.Entities;

/// <summary>
/// Indicadores financieros persistidos al confirmar el cierre de una jornada.
/// </summary>
public class CierreJornada
{
    public long Id { get; set; }
    public long JornadaId { get; set; }
    public long NegocioId { get; set; }
    public long CerradoPor { get; set; }

    // Reconciliación de caja
    public decimal CajaInicial { get; set; }
    public decimal CajaFinalRegistrada { get; set; }
    public decimal CajaEsperada { get; set; }

    /// <summary>
    /// Positivo = sobrante. Negativo = faltante. Calculado por PostgreSQL.
    /// </summary>
    public decimal DiferenciaCaja { get; set; }

    // Indicadores financieros
    public decimal IngresosOperativos { get; set; }
    public decimal CostoVendido { get; set; }

    /// <summary>
    /// Calculado por PostgreSQL: ingresos_operativos - costo_vendido
    /// </summary>
    public decimal UtilidadBruta { get; set; }
    public decimal GastosJornada { get; set; }

    /// <summary>
    /// Proporción diaria de costos fijos + nómina según días operativos del mes.
    /// </summary>
    public decimal CostosFijosDia { get; set; }

    /// <summary>
    /// Calculado por PostgreSQL: ingresos - costo_vendido - gastos - costos_fijos_dia
    /// </summary>
    public decimal UtilidadNeta { get; set; }

    /// <summary>
    /// Calculado por PostgreSQL como porcentaje.
    /// </summary>
    public decimal MargenGanancia { get; set; }
    public decimal PuntoEquilibrioDia { get; set; }

    /// <summary>
    /// rentable | equilibrio | perdida
    /// </summary>
    public string EstadoDia { get; set; } = null!;

    /// <summary>
    /// TRUE = el usuario hizo el conteo de productos. FALSE = se usó margen promedio.
    /// </summary>
    public bool ConteoRealizado { get; set; } = false;
    public DateTimeOffset CreadoEn { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ActualizadoEn { get; set; } = DateTimeOffset.UtcNow;

    // Navegación
    public Jornada Jornada { get; set; } = null!;
    public Negocio Negocio { get; set; } = null!;
    public Usuario CerradoPorUsuario { get; set; } = null!;
    public ICollection<ConteoProductoCierre> Conteos { get; set; } = [];
    public ICollection<AuditoriaCierre> Auditorias { get; set; } = [];
}

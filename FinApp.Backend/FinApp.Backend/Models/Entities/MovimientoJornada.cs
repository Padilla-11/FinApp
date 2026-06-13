namespace Finop.API.Models.Entities;

/// <summary>
/// Movimientos registrados durante una jornada activa.
/// Tipos: gasto_operativo | compra_mercancia | ingreso_no_operativo | retiro_dueno | cobro_cuenta_por_cobrar
/// </summary>
public class MovimientoJornada
{
    public long Id { get; set; }
    public long JornadaId { get; set; }
    public long NegocioId { get; set; }
    public string Tipo { get; set; } = null!;
    public long? CategoriaGastoId { get; set; }
    public string Descripcion { get; set; } = null!;
    public decimal Monto { get; set; }

    /// <summary>
    /// FALSE solo para ventas a crédito que aún no han sido cobradas.
    /// </summary>
    public bool AfectaCaja { get; set; } = true;

    /// <summary>
    /// -1 = reduce caja (gastos, compras, retiros). +1 = aumenta caja (ingresos, cobros).
    /// </summary>
    public short SignoCaja { get; set; }
    public string? Nota { get; set; }
    public long RegistradoPor { get; set; }
    public DateTimeOffset RegistradoEn { get; set; } = DateTimeOffset.UtcNow;

    // Navegación
    public Jornada Jornada { get; set; } = null!;
    public Negocio Negocio { get; set; } = null!;
    public CategoriaGasto? CategoriaGasto { get; set; }
    public Usuario RegistradoPorUsuario { get; set; } = null!;
    public CobroCredito? CobroCredito { get; set; }
}

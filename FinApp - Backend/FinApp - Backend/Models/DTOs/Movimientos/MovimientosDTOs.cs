using System.ComponentModel.DataAnnotations;

namespace Finop.API.Models.DTOs.Movimientos;

public class RegistrarMovimientoRequest
{
    /// <summary>gasto_operativo | compra_mercancia | ingreso_no_operativo | retiro_dueno</summary>
    [Required][RegularExpression("^(gasto_operativo|compra_mercancia|ingreso_no_operativo|retiro_dueno)$")]
    public string Tipo { get; set; } = null!;

    public long? CategoriaGastoId { get; set; }

    [Required][MaxLength(255)] public string Descripcion { get; set; } = null!;

    [Required][Range(0.01, double.MaxValue)] public decimal Monto { get; set; }

    public string? Nota { get; set; }
}

public class MovimientoResponse
{
    public long Id { get; set; }
    public string Tipo { get; set; } = null!;
    public string? CategoriaNombre { get; set; }
    public string Descripcion { get; set; } = null!;
    public decimal Monto { get; set; }
    public short SignoCaja { get; set; }
    public bool AfectaCaja { get; set; }
    public string? Nota { get; set; }
    public string RegistradoPorNombre { get; set; } = null!;
    public DateTimeOffset RegistradoEn { get; set; }
}

public class CrearCategoriaGastoRequest
{
    [Required][MaxLength(100)] public string Nombre { get; set; } = null!;
}

public class CategoriaGastoResponse
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public bool EsPredefinida { get; set; }
}

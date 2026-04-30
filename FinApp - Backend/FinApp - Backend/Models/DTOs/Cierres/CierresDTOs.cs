using System.ComponentModel.DataAnnotations;

namespace Finop.API.Models.DTOs.Cierres;

/// <summary>Paso 1 del cierre: conteo opcional de productos.</summary>
public class ConteoProductoItem
{
    [Required] public long ProductoId { get; set; }
    [Required][Range(0, int.MaxValue)] public int UnidadesVendidas { get; set; }
}

/// <summary>Payload principal para confirmar el cierre.</summary>
public class ConfirmarCierreRequest
{
    [Required][Range(0, double.MaxValue)] public decimal CajaFinalRegistrada { get; set; }
    public bool ConteoRealizado { get; set; } = false;
    public List<ConteoProductoItem> Conteos { get; set; } = [];
}

public class CorregirCierreRequest
{
    [Required] public string Justificacion { get; set; } = null!;
    [Range(0, double.MaxValue)] public decimal? CajaFinalRegistrada { get; set; }
    [Range(0, double.MaxValue)] public decimal? IngresosOperativos { get; set; }
    [Range(0, double.MaxValue)] public decimal? CostoVendido { get; set; }
    [Range(0, double.MaxValue)] public decimal? GastosJornada { get; set; }
}

public class CierreResponse
{
    public long Id { get; set; }
    public long JornadaId { get; set; }
    public DateOnly FechaReferencia { get; set; }

    // Caja
    public decimal CajaInicial { get; set; }
    public decimal CajaEsperada { get; set; }
    public decimal CajaFinalRegistrada { get; set; }
    public decimal DiferenciaCaja { get; set; }

    // Financieros
    public decimal IngresosOperativos { get; set; }
    public decimal CostoVendido { get; set; }
    public decimal UtilidadBruta { get; set; }
    public decimal GastosJornada { get; set; }
    public decimal CostosFijosDia { get; set; }
    public decimal UtilidadNeta { get; set; }
    public decimal MargenGanancia { get; set; }
    public decimal PuntoEquilibrioDia { get; set; }
    public string EstadoDia { get; set; } = null!;
    public bool ConteoRealizado { get; set; }

    public List<ConteoProductoCierreResponse> Conteos { get; set; } = [];
    public DateTimeOffset CreadoEn { get; set; }
}

public class ConteoProductoCierreResponse
{
    public long ProductoId { get; set; }
    public string NombreProducto { get; set; } = null!;
    public int UnidadesVendidas { get; set; }
    public decimal PrecioVenta { get; set; }
    public decimal CostoUnitario { get; set; }
    public decimal SubtotalIngresos { get; set; }
    public decimal SubtotalCosto { get; set; }
    public decimal SubtotalUtilidad { get; set; }
}

public class HistorialCierreResponse
{
    public long Id { get; set; }
    public long JornadaId { get; set; }
    public DateOnly FechaReferencia { get; set; }
    public decimal IngresosOperativos { get; set; }
    public decimal UtilidadNeta { get; set; }
    public decimal MargenGanancia { get; set; }
    public string EstadoDia { get; set; } = null!;
    public DateTimeOffset CreadoEn { get; set; }
}

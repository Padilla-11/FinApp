using System.Text.Json.Serialization;

namespace Finop.API.Models.DTOs.Analisis;

public class AnalisisResponseDto
{
    public MetaDto Meta { get; set; } = null!;
    public ResumenGeneralDto? ResumenGeneral { get; set; }
    public Dictionary<string, List<TarjetaDto>> Grupos { get; set; } = new();
}

public class MetaDto
{
    public string Negocio { get; set; } = "";
    public string PeriodoInicio { get; set; } = "";
    public string PeriodoFin { get; set; } = "";
    public int JornadasBase { get; set; }
    public DateTime? GeneradoEn { get; set; }
    public string? IdempotencyKey { get; set; }
}

public class ResumenGeneralDto
{
    public string Estado { get; set; } = "advertencia";
    public string Titulo { get; set; } = "";
    public string Texto { get; set; } = "";
}

public class TarjetaDto
{
    public string Id { get; set; } = "";
    public string Nombre { get; set; } = "";
    public double? Valor { get; set; }
    public string Unidad { get; set; } = "";
    public string Formato { get; set; } = "numero";
    public string? Etiqueta { get; set; }
    public string? Tendencia { get; set; }
    public double? TendenciaPct { get; set; }
    public string Estado { get; set; } = "advertencia";
    public string? Interpretacion { get; set; }
    public string? Accion { get; set; }
}

public class AnalisisIAResultado
{
    [JsonPropertyName("resumen_general")]
    public ResumenGeneralDto? ResumenGeneral { get; set; }

    [JsonPropertyName("interpretaciones")]
    public Dictionary<string, InterpretacionDto> Interpretaciones { get; set; } = new();
}

public class InterpretacionDto
{
    public string Estado { get; set; } = "advertencia";
    public string Interpretacion { get; set; } = "";
    public string Accion { get; set; } = "";
}

public class EstadisticasBase
{
    public string NombreNegocio { get; set; } = "";
    public int JornadasBase { get; set; }
    public List<(long Id, DateTimeOffset ActualizadoEn)> CierreIds { get; set; } = [];
    public Dictionary<string, List<TarjetaDto>> Grupos { get; set; } = new();
}

public record RegenerarRequest(int Dias = 30);

public class HistorialJornadaDto
{
    public string Fecha { get; set; } = "";
    public decimal Ingresos { get; set; }
    public decimal UtilidadNeta { get; set; }
    public decimal UtilidadBruta { get; set; }
    public double MargenNeto { get; set; }
    public double MargenBruto { get; set; }
    public string EstadoDia { get; set; } = "";
    public bool ConteoRealizado { get; set; }
    public decimal DiferenciaCaja { get; set; }
    public decimal PuntoEquilibrio { get; set; }
    public decimal GastosJornada { get; set; }
    public decimal CostosFijosDia { get; set; }
}

public class ProductoRankingDto
{
    public long Id { get; set; }
    public string Nombre { get; set; } = "";
    public int Unidades { get; set; }
    public decimal Utilidad { get; set; }
    public double Margen { get; set; }
    public decimal Ingresos { get; set; }
}

public class AnalisisDetalleResponseDto
{
    public MetaDto Meta { get; set; } = null!;
    public ResumenGeneralDto? ResumenGeneral { get; set; }
    public Dictionary<string, List<TarjetaDto>> Grupos { get; set; } = new();
    public List<HistorialJornadaDto> Jornadas { get; set; } = new();
    public List<ProductoRankingDto> Productos { get; set; } = new();
}

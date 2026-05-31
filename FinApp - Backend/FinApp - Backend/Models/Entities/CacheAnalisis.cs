namespace Finop.API.Models.Entities;

public class CacheAnalisis
{
    public long Id { get; set; }
    public long NegocioId { get; set; }
    public Negocio Negocio { get; set; } = null!;
    public short Dias { get; set; }
    public DateOnly PeriodoInicio { get; set; }
    public DateOnly PeriodoFin { get; set; }
    public int JornadasBase { get; set; }
    public string IdempotencyKey { get; set; } = null!;
    public string PayloadEnviado { get; set; } = null!;
    public string Resultado { get; set; } = null!;
    public DateTime GeneradoEn { get; set; }
}

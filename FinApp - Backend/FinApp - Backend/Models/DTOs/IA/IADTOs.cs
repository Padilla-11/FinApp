namespace Finop.API.Models.DTOs.IA;

public class ConsultaIARequest
{
    public string Mensaje { get; set; } = null!;
    public List<MensajeChat>? Historial { get; set; }
    public int PeriodoDias { get; set; } = 30;
}

public class MensajeChat
{
    public string Rol { get; set; } = null!;
    public string Contenido { get; set; } = null!;
}

public class ConsultaIAResponse
{
    public string Respuesta { get; set; } = null!;
    public int TokensUsados { get; set; }
}

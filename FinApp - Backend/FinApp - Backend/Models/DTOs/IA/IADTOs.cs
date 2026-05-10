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

public class DiagnosticoIARequest
{
    public int PeriodoDias { get; set; } = 30;
}

public class DiagnosticoIAResponse
{
    public bool DatosInsuficientes { get; set; }
    public string EstadoGeneral { get; set; } = null!;
    public List<PuntoPositivo> PuntosPositivos { get; set; } = [];
    public List<PuntoMejorar> PuntosMejorar { get; set; } = [];
    public string ConsejoGeneral { get; set; } = null!;
    public string MensajeInicial { get; set; } = null!;
    public int TokensUsados { get; set; }
}

public class PuntoPositivo
{
    public string Titulo { get; set; } = null!;
    public string Detalle { get; set; } = null!;
}

public class PuntoMejorar
{
    public string Titulo { get; set; } = null!;
    public string Detalle { get; set; } = null!;
    public string ConsejoEspecifico { get; set; } = null!;
    public string ContextoConceptual { get; set; } = null!;
}

public class ProblemaIA
{
    public string Titulo { get; set; } = null!;
    public string Explicacion { get; set; } = null!;
}

public class RecomendacionIA
{
    public string Accion { get; set; } = null!;
    public string Impacto { get; set; } = null!;
}

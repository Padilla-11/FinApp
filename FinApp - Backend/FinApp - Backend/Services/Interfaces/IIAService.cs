using Finop.API.Models.DTOs.IA;

namespace Finop.API.Services.Interfaces;

public interface IIAService
{
    Task<ConsultaIAResponse> ConsultarAsync(
        long negocioId,
        long usuarioId,
        ConsultaIARequest request);

    Task<DiagnosticoIAResponse> GenerarDiagnosticoAsync(
        long negocioId,
        long usuarioId,
        DiagnosticoIARequest request);
}

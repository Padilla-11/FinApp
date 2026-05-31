using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Finop.API.Data;
using Finop.API.Models.DTOs;
using Finop.API.Models.DTOs.Analisis;
using Finop.API.Services.Implementations;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services;

public class AnalisisService
{
    private readonly FinopDbContext _db;
    private readonly EstadisticasCalculator _calculator;
    private readonly AnalisisIAService _ia;
    private readonly IAccesoService _acceso;
    private readonly ILogger<AnalisisService> _logger;

    public AnalisisService(FinopDbContext db, EstadisticasCalculator calculator, AnalisisIAService ia, IAccesoService acceso, ILogger<AnalisisService> logger)
    {
        _db = db;
        _calculator = calculator;
        _ia = ia;
        _acceso = acceso;
        _logger = logger;
    }

    public async Task<AnalisisResponseDto> GetRawAsync(long negocioId, long usuarioId, int dias)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        var (inicio, fin) = GetPeriodo(dias);
        var estadisticas = await _calculator.CalcularAsync(negocioId, inicio, fin);
        return new AnalisisResponseDto
        {
            Meta = BuildMeta(estadisticas, inicio, fin, null, null),
            ResumenGeneral = null,
            Grupos = estadisticas.Grupos,
        };
    }

    public async Task<AnalisisDetalleResponseDto> GetDetalleAsync(long negocioId, long usuarioId, int dias)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        var (inicio, fin) = GetPeriodo(dias);

        var estadisticas = await _calculator.CalcularAsync(negocioId, inicio, fin);
        var (jornadas, productos) = await _calculator.CalcularDetalleAsync(negocioId, inicio, fin);

        return new AnalisisDetalleResponseDto
        {
            Meta = BuildMeta(estadisticas, inicio, fin, null, null),
            ResumenGeneral = null,
            Grupos = estadisticas.Grupos,
            Jornadas = jornadas,
            Productos = productos,
        };
    }

    public async Task<AnalisisResponseDto> GetConIAAsync(long negocioId, long usuarioId, int dias, bool forzarRegeneracion = false)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        var (inicio, fin) = GetPeriodo(dias);

        var estadisticas = await _calculator.CalcularAsync(negocioId, inicio, fin);
        var key = GenerarIdempotencyKey(negocioId, dias, estadisticas.CierreIds);

        if (!forzarRegeneracion)
        {
            var cache = await _db.CacheAnalisis
                .Where(c => c.NegocioId == negocioId && c.Dias == dias && c.IdempotencyKey == key)
                .OrderByDescending(c => c.GeneradoEn)
                .FirstOrDefaultAsync();

            if (cache != null)
            {
                try
                {
                    var resultadoCacheado = JsonSerializer.Deserialize<AnalisisIAResultado>(cache.Resultado,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    if (resultadoCacheado?.ResumenGeneral != null && resultadoCacheado.Interpretaciones.Count > 0)
                    {
                        // Verificar que al menos una interpretación coincida con una tarjeta real
                        var tarjetasExistentes = estadisticas.Grupos
                            .SelectMany(g => g.Value)
                            .Select(t => t.Id)
                            .ToHashSet();
                        var coinciden = resultadoCacheado.Interpretaciones.Keys.Count(tarjetasExistentes.Contains);

                        if (coinciden > 0)
                        {
                            _logger.LogDebug("Cache válido: {Coinciden}/{Total} interpretaciones coinciden con tarjetas",
                                coinciden, resultadoCacheado.Interpretaciones.Count);
                            return ArmarResponse(estadisticas, resultadoCacheado, cache.GeneradoEn, key, inicio, fin);
                        }

                        _logger.LogWarning("Cache sin coincidencias: {Interpretaciones} interpretaciones, 0 tarjetas coinciden. Regenerando...",
                            resultadoCacheado.Interpretaciones.Count);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Cache corrupto para negocio {NegocioId}, dias {Dias}, key {Key}. Regenerando...",
                        negocioId, dias, key);
                }
            }
        }

        var payload = BuildPayload(estadisticas, inicio, fin);
        var resultadoIA = await _ia.GenerarInterpretacionesAsync(
            estadisticas.NombreNegocio,
            estadisticas.Grupos,
            estadisticas.JornadasBase,
            inicio,
            fin);
        await GuardarCacheAsync(negocioId, dias, inicio, fin, estadisticas.JornadasBase, key, payload, resultadoIA);

        return ArmarResponse(estadisticas, resultadoIA, DateTime.UtcNow, key, inicio, fin);
    }

    private (DateOnly inicio, DateOnly fin) GetPeriodo(int dias)
    {
        var fin = DateOnly.FromDateTime(DateTime.Now);
        var inicio = fin.AddDays(-dias + 1);
        return (inicio, fin);
    }

    private string GenerarIdempotencyKey(long negocioId, int dias, List<(long Id, DateTimeOffset ActualizadoEn)> cierres)
    {
        var partes = cierres
            .OrderBy(c => c.Id)
            .Select(c => $"{c.Id}:{c.ActualizadoEn:O}");

        var input = $"{negocioId}:{dias}:{string.Join(",", partes)}";
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLower();
    }

    private async Task GuardarCacheAsync(long negocioId, int dias, DateOnly inicio, DateOnly fin, int jornadasBase,
        string key, object payload, AnalisisIAResultado resultado)
    {
        var anteriores = await _db.CacheAnalisis
            .Where(c => c.NegocioId == negocioId && c.Dias == dias)
            .ToListAsync();
        _db.CacheAnalisis.RemoveRange(anteriores);

        _db.CacheAnalisis.Add(new Models.Entities.CacheAnalisis
        {
            NegocioId = negocioId,
            Dias = (short)dias,
            PeriodoInicio = inicio,
            PeriodoFin = fin,
            JornadasBase = jornadasBase,
            IdempotencyKey = key,
            PayloadEnviado = JsonSerializer.Serialize(payload),
            Resultado = JsonSerializer.Serialize(resultado),
            GeneradoEn = DateTime.UtcNow,
        });

        await _db.SaveChangesAsync();
    }

    private AnalisisResponseDto ArmarResponse(EstadisticasBase est, AnalisisIAResultado? ia, DateTime generadoEn, string key,
        DateOnly inicio, DateOnly fin)
    {
        if (ia != null)
        {
            // Construir un lookup normalizado para matching flexible
            var iaKeys = ia.Interpretaciones.Keys.ToList();
            var lookupNormalizado = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var k in iaKeys)
            {
                lookupNormalizado[k.Trim().ToLowerInvariant()] = k;
            }

            var tarjetasSinMatch = new List<string>();

            foreach (var grupo in est.Grupos)
            {
                foreach (var tarjeta in grupo.Value)
                {
                    // 1. Intento exacto
                    if (ia.Interpretaciones.TryGetValue(tarjeta.Id, out var interp))
                    {
                        tarjeta.Interpretacion = interp.Interpretacion;
                        tarjeta.Accion = interp.Accion;
                        tarjeta.Estado = interp.Estado;
                        continue;
                    }

                    // 2. Fallback: normalized matching
                    var keyNormalizada = tarjeta.Id.Trim().ToLowerInvariant();
                    if (lookupNormalizado.TryGetValue(keyNormalizada, out var realKey))
                    {
                        interp = ia.Interpretaciones[realKey];
                        tarjeta.Interpretacion = interp.Interpretacion;
                        tarjeta.Accion = interp.Accion;
                        tarjeta.Estado = interp.Estado;
                        _logger.LogDebug(
                            "ArmarResponse: Match fuzzy para tarjeta '{TarjetaId}' con clave IA '{RealKey}'",
                            tarjeta.Id, realKey);
                        continue;
                    }

                    tarjetasSinMatch.Add(tarjeta.Id);
                }
            }

            if (tarjetasSinMatch.Count > 0)
            {
                _logger.LogWarning(
                    "ArmarResponse: {SinMatch} tarjetas sin interpretación. IDs sin match: [{IdsSinMatch}]. Claves devueltas por IA: [{ClavesIA}]",
                    tarjetasSinMatch.Count,
                    string.Join(", ", tarjetasSinMatch),
                    string.Join(", ", iaKeys.Select(k => $"'{k}'")));
            }
        }

        var totalTarjetas = est.Grupos.Sum(g => g.Value.Count);
        var conInterpretacion = est.Grupos.Sum(g => g.Value.Count(t => t.Interpretacion != null));
        _logger.LogInformation(
            "ArmarResponse: {ConIA} interpretaciones aplicadas de {Total} tarjetas ({Pct}%)",
            conInterpretacion, totalTarjetas,
            totalTarjetas > 0 ? Math.Round(conInterpretacion * 100.0 / totalTarjetas) : 0);

        return new AnalisisResponseDto
        {
            Meta = BuildMeta(est, inicio, fin, generadoEn, key),
            ResumenGeneral = ia?.ResumenGeneral,
            Grupos = est.Grupos,
        };
    }

    private MetaDto BuildMeta(EstadisticasBase est, DateOnly inicio, DateOnly fin, DateTime? generadoEn, string? key)
    {
        return new MetaDto
        {
            Negocio = est.NombreNegocio,
            PeriodoInicio = inicio.ToString("yyyy-MM-dd"),
            PeriodoFin = fin.ToString("yyyy-MM-dd"),
            JornadasBase = est.JornadasBase,
            GeneradoEn = generadoEn,
            IdempotencyKey = key,
        };
    }

    private object BuildPayload(EstadisticasBase est, DateOnly inicio, DateOnly fin)
    {
        return new
        {
            negocio = new { nombre = est.NombreNegocio },
            periodo = $"{inicio:yyyy-MM-dd} al {fin:yyyy-MM-dd} ({est.JornadasBase} jornadas)",
            estadisticas = est.Grupos.ToDictionary(
                g => g.Key,
                g => g.Value.Select(t => new
                {
                    id = t.Id,
                    nombre = t.Nombre,
                    valor = t.Valor,
                    unidad = t.Unidad,
                    estado = t.Estado,
                    tendencia = t.Tendencia,
                    tendencia_pct = t.TendenciaPct,
                }).ToList()
            ),
        };
    }
}

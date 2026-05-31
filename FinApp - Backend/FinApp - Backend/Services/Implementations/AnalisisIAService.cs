using System.Globalization;
using System.Text;
using System.Text.Json;
using Finop.API.Models.DTOs.Analisis;

namespace Finop.API.Services.Implementations;

public class AnalisisIAService
{
    private readonly IConfiguration _config;
    private readonly HttpClient _http;
    private readonly ILogger<AnalisisIAService> _logger;

    public AnalisisIAService(IConfiguration config, IHttpClientFactory factory, ILogger<AnalisisIAService> logger)
    {
        _config = config;
        _http = factory.CreateClient("OpenCodeGo");
        _logger = logger;
    }

    public async Task<AnalisisIAResultado> GenerarInterpretacionesAsync(
        string nombreNegocio,
        Dictionary<string, List<TarjetaDto>> grupos,
        int jornadasBase,
        DateOnly inicio,
        DateOnly fin)
    {
        var periodo = $"{inicio:yyyy-MM-dd} al {fin:yyyy-MM-dd}";

        // ── Resumen general (request pequeño con stats clave) ──
        var resumenTask = GenerarResumenAsync(nombreNegocio, periodo, jornadasBase, grupos);

        // ── Interpretaciones por grupo en paralelo ──
        var tasks = grupos
            .Where(g => g.Value.Count > 0)
            .Select(g => GenerarInterpretacionesGrupoAsync(g.Key, nombreNegocio, periodo, g.Value))
            .ToList();

        await Task.WhenAll(tasks);

        var resultado = new AnalisisIAResultado
        {
            Interpretaciones = new Dictionary<string, InterpretacionDto>(),
        };

        var fallidos = 0;
        foreach (var task in tasks)
        {
            var interps = task.Result;
            if (interps != null)
            {
                foreach (var (key, val) in interps)
                    resultado.Interpretaciones[key] = val;
            }
            else
            {
                fallidos++;
            }
        }

        try
        {
            resultado.ResumenGeneral = await resumenTask;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo generar el resumen general");
        }

        if (fallidos > 0)
            _logger.LogWarning("{Fallidos}/{Total} grupos fallaron al generar interpretaciones",
                fallidos, tasks.Count);

        if (resultado.Interpretaciones.Count == 0 && resultado.ResumenGeneral == null)
            throw new InvalidOperationException("La IA no pudo generar ninguna interpretación. Intenta de nuevo.");

        return resultado;
    }

    private async Task<ResumenGeneralDto?> GenerarResumenAsync(
        string nombreNegocio, string periodo, int jornadasBase,
        Dictionary<string, List<TarjetaDto>> grupos)
    {
        var stats = grupos.SelectMany(g => g.Value).ToList();
        var prompt = BuildPromptResumen(nombreNegocio, periodo, jornadasBase, stats);
        var json = await EnviarPeticionAsync(prompt, "resumen");

        // Extraer solo el campo resumen_general del JSON
        var raw = StripMarkdown(json);
        var bloque = ExtraerPrimerJson(raw);
        if (bloque == null) return null;

        try
        {
            var doc = JsonDocument.Parse(bloque);
            if (doc.RootElement.TryGetProperty("resumen_general", out var rg))
            {
                return JsonSerializer.Deserialize<ResumenGeneralDto>(rg.GetRawText(),
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Error parseando resumen_general de la IA");
        }

        return null;
    }

    private async Task<Dictionary<string, InterpretacionDto>?> GenerarInterpretacionesGrupoAsync(
        string grupoKey, string nombreNegocio, string periodo,
        List<TarjetaDto> tarjetas)
    {
        var prompt = BuildPromptGrupo(grupoKey, nombreNegocio, periodo, tarjetas);
        var json = await EnviarPeticionAsync(prompt, grupoKey);

        var raw = StripMarkdown(json);
        var bloque = ExtraerPrimerJson(raw);
        if (bloque == null)
        {
            _logger.LogWarning("Grupo '{Grupo}': No se encontró JSON en la respuesta", grupoKey);
            return null;
        }

        try
        {
            // Intentar parsear como AnalisisIAResultado completo (con interpretaciones)
            var resultado = JsonSerializer.Deserialize<AnalisisIAResultado>(bloque,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (resultado?.Interpretaciones.Count > 0)
            {
                _logger.LogDebug("Grupo '{Grupo}': {Count} interpretaciones recibidas",
                    grupoKey, resultado.Interpretaciones.Count);
                return resultado.Interpretaciones;
            }

            // Intentar extraer solo el campo interpretaciones si el parseo anterior no dio resultados
            using var doc = JsonDocument.Parse(bloque);
            if (doc.RootElement.TryGetProperty("interpretaciones", out var interps))
            {
                var dict = JsonSerializer.Deserialize<Dictionary<string, InterpretacionDto>>(
                    interps.GetRawText(),
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (dict?.Count > 0)
                {
                    _logger.LogDebug("Grupo '{Grupo}': {Count} interpretaciones recibidas (extracción directa)",
                        grupoKey, dict.Count);
                    return dict;
                }
            }

            _logger.LogWarning("Grupo '{Grupo}': JSON sin interpretaciones. Respuesta (primeros 500): {Respuesta}",
                grupoKey, bloque.Length > 500 ? bloque[..500] : bloque);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Grupo '{Grupo}': Error parseando JSON de respuesta", grupoKey);
        }

        return null;
    }

    private static string? ExtraerPrimerJson(string raw)
    {
        var idx = raw.IndexOf('{');
        if (idx < 0) return null;

        var profundidad = 0;
        for (var i = idx; i < raw.Length; i++)
        {
            if (raw[i] == '{') profundidad++;
            else if (raw[i] == '}') { profundidad--; if (profundidad == 0) return raw[idx..(i + 1)]; }
        }

        return null;
    }

    private static string StripMarkdown(string raw)
    {
        raw = raw.Trim();
        if (raw.StartsWith("```"))
        {
            var start = raw.IndexOf('\n');
            if (start > 0) raw = raw[(start + 1)..];
            var end = raw.LastIndexOf("```");
            if (end > 0) raw = raw[..end].Trim();
        }
        return raw;
    }

    private string BuildPromptResumen(string nombreNegocio, string periodo, int jornadasBase, List<TarjetaDto> stats)
    {
        var json = JsonSerializer.Serialize(new
        {
            negocio = nombreNegocio,
            periodo,
            jornadas = jornadasBase,
            estadisticas = stats.Select(t => new
            {
                id = t.Id, nombre = t.Nombre, valor = t.Valor,
                unidad = t.Unidad, estado = t.Estado,
            })
        });

        return $"""
            Eres el asistente financiero de FinOp. Genera ÚNICAMENTE un JSON con el resumen general del negocio.
            Sin texto adicional, sin markdown, sin explicaciones.

            Datos del negocio:
            {json}

            Devuelve este JSON exacto (sin markdown, sin texto adicional):
            {"""
            {
              "resumen_general": {
                "estado": "bueno|advertencia|critico",
                "titulo": "Frase corta que resume la situación financiera",
                "texto": "2-3 oraciones explicando la situación general del negocio en lenguaje simple"
              }
            }
            """}
            """;
    }

    private string BuildPromptGrupo(string grupoKey, string nombreNegocio, string periodo, List<TarjetaDto> tarjetas)
    {
        var json = JsonSerializer.Serialize(new
        {
            negocio = nombreNegocio,
            periodo,
            grupo = grupoKey,
            estadisticas = tarjetas.Select(t => new
            {
                id = t.Id,
                nombre = t.Nombre,
                valor = t.Valor,
                unidad = t.Unidad,
                estado = t.Estado,
                tendencia = t.Tendencia,
                tendencia_pct = t.TendenciaPct,
            })
        });

        var ejemploJson = """
            {
              "interpretaciones": {
                "ID_DE_LA_ESTADISTICA": {
                  "estado": "bueno|advertencia|critico",
                  "interpretacion": "2 oraciones explicando qué significa este número",
                  "accion": "1 oración en imperativo con la acción concreta para esta semana"
                }
              }
            }
            """;

        return $"""
            Eres el asistente financiero de FinOp. Genera interpretaciones para este grupo de estadísticas.
            Lenguaje simple para microempresario colombiano, sin términos contables.
            Montos en pesos colombianos ($1.240.000), porcentajes con una decimal (18,4%).

            Datos del negocio:
            {json}

            IMPORTANTE: Las claves de "interpretaciones" deben ser EXACTAMENTE los "id" de las estadísticas de arriba.

            Devuelve ÚNICAMENTE este JSON, sin markdown, sin texto adicional:
            {ejemploJson}
            """;
    }

    private async Task<string> EnviarPeticionAsync(string prompt, string contexto)
    {
        var modelo = _config["IA:ModeloAnalisis"] ?? "deepseek-v4-flash";
        var maxTokens = int.Parse(_config["IA:MaxTokens"] ?? "32000");
        var temp = double.Parse(_config["IA:TemperatureAnalisis"] ?? "0.3", CultureInfo.InvariantCulture);
        var baseUrl = _config["IA:BaseUrl"] ?? "https://opencode.ai/zen/go/v1";

        var body = new Dictionary<string, object?>
        {
            ["model"] = modelo,
            ["messages"] = new List<object>
            {
                new { role = "user", content = prompt }
            },
            ["max_tokens"] = maxTokens,
            ["temperature"] = temp,
        };

        var json = JsonSerializer.Serialize(body, new JsonSerializerOptions { PropertyNamingPolicy = null });
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await _http.PostAsync($"{baseUrl}/chat/completions", content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "IA API error (ctx={Contexto}, modelo={Modelo}, status={(int)response.StatusCode}): {Body}",
                    contexto, modelo, (int)response.StatusCode,
                    responseBody.Length > 1000 ? responseBody[..1000] : responseBody);

                if ((int)response.StatusCode >= 500)
                    throw new InvalidOperationException(
                        $"La API de IA devolvió error {(int)response.StatusCode} para '{contexto}'.");

                throw new InvalidOperationException(
                    $"La API de IA rechazó la solicitud (error {(int)response.StatusCode}): " +
                    responseBody[..Math.Min(responseBody.Length, 500)]);
            }

            using var doc = JsonDocument.Parse(responseBody);
            var choice = doc.RootElement.GetProperty("choices")[0];
            var finishReason = choice.TryGetProperty("finish_reason", out var fr) ? fr.GetString() : null;
            var msg = choice.GetProperty("message");

            var contentText = msg.GetProperty("content").GetString();

            if (string.IsNullOrEmpty(contentText))
            {
                if (msg.TryGetProperty("reasoning_content", out var reasoningProp))
                {
                    contentText = reasoningProp.GetString();
                    _logger.LogWarning(
                        "Content vacío en IA (ctx={Contexto}, modelo={Modelo}); usando reasoning_content",
                        contexto, modelo);
                }
            }

            if (string.IsNullOrEmpty(contentText))
            {
                _logger.LogError("IA devolvió respuesta vacía (ctx={Contexto}, modelo={Modelo}, finish={Finish})",
                    contexto, modelo, finishReason);
                throw new InvalidOperationException($"La IA devolvió respuesta vacía para '{contexto}'.");
            }

            if (finishReason == "length")
            {
                _logger.LogWarning(
                    "IA finish_reason=length (ctx={Contexto}, modelo={Modelo}, max_tokens={MaxTokens}, len={Len})",
                    contexto, modelo, maxTokens, contentText.Length);
            }

            _logger.LogDebug("Respuesta IA recibida (ctx={Contexto}, modelo={Modelo}, finish={Finish}, tokens={Tokens})",
                contexto, modelo, finishReason,
                doc.RootElement.TryGetProperty("usage", out var usage) &&
                usage.TryGetProperty("total_tokens", out var tt) ? tt.GetInt32() : 0);

            return contentText;
        }
        catch (InvalidOperationException) { throw; }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Error de conexión IA (ctx={Contexto}, modelo={Modelo})", contexto, modelo);
            throw new InvalidOperationException($"Error de conexión con la IA para '{contexto}'.");
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "Timeout IA (ctx={Contexto}, modelo={Modelo})", contexto, modelo);
            throw new InvalidOperationException($"La IA no respondió a tiempo para '{contexto}'.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error inesperado IA (ctx={Contexto}, modelo={Modelo})", contexto, modelo);
            throw new InvalidOperationException($"Error inesperado de IA para '{contexto}'.");
        }
    }
}
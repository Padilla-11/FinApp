using System.Globalization;
using System.Text;
using System.Text.Json;
using Finop.API.Data;
using Finop.API.Models.DTOs.IA;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Finop.API.Services.Implementations;

public class IAService : IIAService
{
    private readonly FinopDbContext _db;
    private readonly IAccesoService _acceso;
    private readonly IConfiguration _config;
    private readonly HttpClient _http;
    private readonly ILogger<IAService> _logger;

    public IAService(FinopDbContext db, IAccesoService acceso, IConfiguration config, IHttpClientFactory factory, ILogger<IAService> logger)
    {
        _db = db;
        _acceso = acceso;
        _config = config;
        _http = factory.CreateClient("OpenCodeGo");
        _logger = logger;
    }

    public async Task<ConsultaIAResponse> ConsultarAsync(
        long negocioId, long usuarioId, ConsultaIARequest request)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        var fechaInicio = DateTimeOffset.UtcNow.AddDays(-request.PeriodoDias);

        var promptSistema = $@"Eres FinOp IA 🤖, asistente financiero experto para microempresas colombianas.
CRÍTICO: Siempre responde en español. NUNCA uses inglés.

Tienes acceso a herramientas para consultar datos financieros del negocio.
Debes usarlas para obtener información real antes de responder.
Nunca respondas sin antes obtener al menos un dato con las herramientas.
Para preguntas sobre productos, días de la semana o estructura de costos, llama las herramientas específicas.

REGLAS DE FORMATO:
- Máximo 4-5 líneas por respuesta. Siempre incluye al menos un número real del negocio.
- Siempre termina con una pregunta o una acción sugerida.
- Números en formato $280.000. Porcentajes con un decimal: 18.4%.
- Lenguaje de dueño de negocio, no de contador.
- Nunca digas ""Como modelo de IA..."" ni ""No tengo acceso a..."".";

        var (contentText, tokens) = await EjecutarConToolsAsync(promptSistema, request.Mensaje, request.Historial, negocioId, fechaInicio);

        return new ConsultaIAResponse
        {
            Respuesta = !string.IsNullOrEmpty(contentText) ? contentText : "No pude generar una respuesta. Intenta de nuevo.",
            TokensUsados = tokens
        };
    }

    public async Task<DiagnosticoIAResponse> GenerarDiagnosticoAsync(
        long negocioId, long usuarioId, DiagnosticoIARequest request)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);
        var fechaInicio = DateTimeOffset.UtcNow.AddDays(-request.PeriodoDias);

        var cantCierres = await _db.CierresJornada
            .CountAsync(c => c.NegocioId == negocioId && c.CreadoEn >= fechaInicio);

        if (cantCierres < 3)
        {
            return new DiagnosticoIAResponse
            {
                DatosInsuficientes = true,
                EstadoGeneral = "Aún no tienes suficientes datos para generar un diagnóstico. Necesitas al menos 3 jornadas cerradas.",
                PuntosPositivos = [], PuntosMejorar = [], ConsejoGeneral = "",
                MensajeInicial = "Sigue registrando tus jornadas. Cuando tengas 3 o más cerradas, podrás obtener un análisis completo.",
                TokensUsados = 0
            };
        }

        var promptSistema = $@"Eres FinOp IA 🤖, asistente financiero experto para microempresas colombianas.
CRÍTICO: Responde exclusivamente en español.

Debes generar un diagnóstico financiero completo del negocio usando las herramientas disponibles.
ANTES DE RESPONDER llama SIEMPRE al menos obtener_resumen_financiero.
Si necesitas más datos, usa otras herramientas según el caso.

Debes devolver ÚNICAMENTE JSON válido con esta estructura:
{{
  ""estado_general"": ""4-6 líneas interpretando la salud del negocio. Menciona 2-3 números clave."",
  ""puntos_positivos"": [
    {{ ""titulo"": ""..."", ""detalle"": ""2-3 líneas con datos reales"" }}
  ],
  ""puntos_mejorar"": [
    {{
      ""titulo"": ""..."",
      ""detalle"": ""2-3 líneas con datos reales"",
      ""consejo_especifico"": ""Acción concreta en imperativo con impacto estimado"",
      ""contexto_conceptual"": ""Explicación breve del concepto financiero relacionado""
    }}
  ],
  ""consejo_general"": ""Recomendación práctica con impacto estimado"",
  ""mensaje_inicial"": ""3-4 líneas: saluda al negocio, conclusión más importante, pregunta de seguimiento""
}}

REGLAS: 2-3 elementos por lista. Datos reales. $280.000, 18.4%. Lenguaje de dueño de negocio. Sin ""Como modelo de IA..."".";

        var (rawText, tokens) = await EjecutarConToolsAsync(promptSistema, "Genera el diagnóstico financiero completo del negocio.", null, negocioId, fechaInicio);

        if (string.IsNullOrEmpty(rawText))
        {
            return new DiagnosticoIAResponse
            {
                EstadoGeneral = "No se pudo generar el diagnóstico.",
                PuntosPositivos = [], PuntosMejorar = [], ConsejoGeneral = "",
                MensajeInicial = "Hubo un error generando el diagnóstico. Intenta de nuevo.",
                TokensUsados = tokens
            };
        }

        return ParsearDiagnostico(rawText, tokens);
    }

    // ──────── LOOP DE FUNCTION CALLING ───────────────────────

    private static readonly JsonSerializerOptions _jsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = null
    };

    private async Task<(string? finalText, int totalTokens)> EjecutarConToolsAsync(
        string promptSistema, string mensajeUsuario, List<MensajeChat>? historial,
        long negocioId, DateTimeOffset desde)
    {
        var mensajes = new List<object> { new { role = "system", content = promptSistema } };

        if (historial is not null)
            foreach (var m in historial)
                mensajes.Add(new { role = m.Rol, content = m.Contenido });

        mensajes.Add(new { role = "user", content = mensajeUsuario });

        var tools = ObtenerDefinicionesTools();
        int totalTokens = 0;
        var maxTokens = int.Parse(_config["IA:MaxTokens"] ?? "3000");

        for (int i = 0; i < 3; i++)
        {
            string responseJson;
            try
            {
                responseJson = await EnviarPeticionHttp(mensajes, tools, maxTokens);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error en iteración {Iteracion} de function calling", i);
                return ($"Error de conexión con el servicio de IA. Intenta de nuevo. Detalle: {ex.Message}", totalTokens);
            }

            OpenAIChatResponse? result;
            try
            {
                result = JsonSerializer.Deserialize<OpenAIChatResponse>(responseJson, _jsonOpts);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Error deserializando respuesta IA en iteración {Iteracion}. Body: {Body}", i, responseJson[..Math.Min(responseJson.Length, 500)]);
                return ("Error procesando la respuesta de IA. Intenta de nuevo.", totalTokens);
            }

            totalTokens += result?.Usage?.TotalTokens ?? 0;
            var choice = result?.Choices?.FirstOrDefault();
            var msg = choice?.Message;

            if (msg?.ToolCalls == null || msg.ToolCalls.Count == 0)
            {
                var text = !string.IsNullOrEmpty(msg?.Content) ? msg.Content : msg?.ReasoningContent;
                return (text, totalTokens);
            }

            var assistantMsg = new Dictionary<string, object>
            {
                ["role"] = "assistant",
                ["content"] = msg.Content ?? ""
            };
            if (!string.IsNullOrEmpty(msg.ReasoningContent))
                assistantMsg["reasoning_content"] = msg.ReasoningContent;
            assistantMsg["tool_calls"] = msg.ToolCalls.Select(tc => new
            {
                id = tc.Id,
                type = tc.Type,
                function = new { name = tc.Function.Name, arguments = tc.Function.Arguments }
            }).ToList();
            mensajes.Add(assistantMsg);

            foreach (var tc in msg.ToolCalls)
            {
                string resultJson;
                try { resultJson = await EjecutarTool(tc.Function.Name, negocioId, desde); }
                catch (Exception ex) { resultJson = $"{{\"error\":\"{ex.Message}\"}}"; }
                mensajes.Add(new { role = "tool", tool_call_id = tc.Id, content = resultJson });
            }
        }

        string? finalText;
        try
        {
            var finalJson = await EnviarPeticionHttp(mensajes, null, maxTokens);
            var finalResult = JsonSerializer.Deserialize<OpenAIChatResponse>(finalJson, _jsonOpts);
            totalTokens += finalResult?.Usage?.TotalTokens ?? 0;
            var finalChoice = finalResult?.Choices?.FirstOrDefault()?.Message;
            finalText = !string.IsNullOrEmpty(finalChoice?.Content) ? finalChoice.Content : finalChoice?.ReasoningContent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error en llamada final de function calling");
            finalText = "Error generando respuesta final. Intenta de nuevo.";
        }
        return (finalText, totalTokens);
    }

    private async Task<string> EnviarPeticionHttp(List<object> mensajes, List<object>? tools, int maxTokens)
    {
        var body = new Dictionary<string, object?>
        {
            ["model"] = _config["IA:Modelo"] ?? "deepseek-v4-flash",
            ["messages"] = mensajes,
            ["max_tokens"] = maxTokens,
            ["temperature"] = double.Parse(_config["IA:Temperature"] ?? "0.7", CultureInfo.InvariantCulture)
        };

        if (tools is not null)
            body["tools"] = tools;

        var json = JsonSerializer.Serialize(body, new JsonSerializerOptions { PropertyNamingPolicy = null });
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var fullUrl = $"{(_config["IA:BaseUrl"] ?? "https://opencode.ai/zen/go/v1")}/chat/completions";

        HttpResponseMessage response;
        try { response = await _http.PostAsync(fullUrl, content); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error de conexión con API de IA");
            var escaped = JsonSerializer.Serialize($"Error de conexión con la IA: {ex.Message}");
            return $"{{\"choices\":[{{\"message\":{{\"content\":{escaped}}}}}],\"usage\":{{\"total_tokens\":0}}}}";
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            _logger.LogWarning("API de IA respondió {StatusCode}: {Body}", response.StatusCode, errorBody[..Math.Min(errorBody.Length, 1000)]);
            var escaped = JsonSerializer.Serialize($"El servicio de IA respondió con error ({response.StatusCode}). Intenta de nuevo.");
            return $"{{\"choices\":[{{\"message\":{{\"content\":{escaped}}}}}],\"usage\":{{\"total_tokens\":0}}}}";
        }

        return await response.Content.ReadAsStringAsync();
    }

    // ──────── DEFINICIONES DE TOOLS ──────────────────────────

    private static List<object> ObtenerDefinicionesTools()
    {
        return new List<object>
        {
            new { type = "function", function = new { name = "obtener_resumen_financiero", description = "Resumen financiero: ingresos totales, utilidad neta, margen promedio, días rentables, punto de equilibrio, promedio diario y tendencia.", parameters = new { type = "object", properties = new { } } } },
            new { type = "function", function = new { name = "obtener_productos_top", description = "Productos más vendidos, más rentables, margen promedio y rendimiento por día.", parameters = new { type = "object", properties = new { } } } },
            new { type = "function", function = new { name = "obtener_desglose_por_dia", description = "Ingresos, utilidad y rentabilidad por día de la semana (Lunes a Domingo), mejor y peor día.", parameters = new { type = "object", properties = new { } } } },
            new { type = "function", function = new { name = "obtener_estructura_costos", description = "Estructura de costos como % del ingreso: costo de ventas, gastos, fijos, nómina. Incluye totales por día.", parameters = new { type = "object", properties = new { } } } },
            new { type = "function", function = new { name = "obtener_cuentas_por_cobrar", description = "Total de cuentas por cobrar pendientes y cantidad de clientes.", parameters = new { type = "object", properties = new { } } } }
        };
    }

    // ──────── EJECUCIÓN DE TOOLS ─────────────────────────────

    private async Task<string> EjecutarTool(string toolName, long negocioId, DateTimeOffset desde)
    {
        return toolName switch
        {
            "obtener_resumen_financiero" => await ToolResumenFinanciero(negocioId, desde),
            "obtener_productos_top" => await ToolProductosTop(negocioId, desde),
            "obtener_desglose_por_dia" => await ToolDesglosePorDia(negocioId, desde),
            "obtener_estructura_costos" => await ToolEstructuraCostos(negocioId, desde),
            "obtener_cuentas_por_cobrar" => await ToolCuentasPorCobrar(negocioId),
            _ => $"{{\"error\":\"Tool '{toolName}' no encontrada\"}}"
        };
    }

    private async Task<string> ToolResumenFinanciero(long negocioId, DateTimeOffset desde)
    {
        var cierres = await _db.CierresJornada
            .Where(c => c.NegocioId == negocioId && c.CreadoEn >= desde)
            .ToListAsync();

        if (cierres.Count == 0) return "{\"jornadas\":0}";

        var totalIngresos = cierres.Sum(c => c.IngresosOperativos);
        var asc = cierres.OrderBy(c => c.CreadoEn).ToList();
        var mid = asc.Count / 2;
        var tendencia = "sin_datos_suficientes";
        if (mid >= 2)
        {
            var ant = asc.Take(mid).Sum(c => c.IngresosOperativos);
            var rec = asc.Skip(mid).Sum(c => c.IngresosOperativos);
            var uAnt = asc.Take(mid).Sum(c => c.UtilidadNeta);
            var uRec = asc.Skip(mid).Sum(c => c.UtilidadNeta);
            tendencia = $"{{\"ingresos_pct\":{(ant > 0 ? (rec - ant) / ant * 100 : 0):F1},\"utilidad_pct\":{(uAnt > 0 ? (uRec - uAnt) / uAnt * 100 : 0):F1}}}";
        }

        return JsonSerializer.Serialize(new
        {
            jornadas = cierres.Count,
            ingresos_totales = totalIngresos,
            utilidad_neta = cierres.Sum(c => c.UtilidadNeta),
            margen_promedio_pct = Math.Round(totalIngresos > 0 ? cierres.Sum(c => c.UtilidadNeta) / totalIngresos * 100 : 0, 1),
            dias_rentables = cierres.Count(c => c.EstadoDia == "rentable"),
            dias_perdida = cierres.Count(c => c.EstadoDia == "perdida"),
            promedio_diario = Math.Round(totalIngresos / cierres.Count, 0),
            punto_equilibrio = cierres.First().PuntoEquilibrioDia,
            tendencia
        });
    }

    private async Task<string> ToolProductosTop(long negocioId, DateTimeOffset desde)
    {
        var productos = await _db.Productos
            .Where(p => p.NegocioId == negocioId && p.EliminadoEn == null && p.Activo)
            .ToListAsync();

        if (productos.Count == 0) return "{\"productos\":0}";

        var result = new Dictionary<string, object>
        {
            ["total_productos"] = productos.Count,
            ["margen_promedio_pct"] = Math.Round(productos.Average(p => p.MargenPorcentaje), 1)
        };

        var conteos = await _db.ConteosProductosCierre
            .Include(c => c.Cierre)
            .Where(c => c.NegocioId == negocioId && c.Cierre.CreadoEn >= desde)
            .ToListAsync();

        if (conteos.Count > 0)
        {
            var dias = await _db.CierresJornada.CountAsync(c => c.NegocioId == negocioId && c.CreadoEn >= desde);
            if (dias == 0) dias = 1;

            result["top_vendidos"] = conteos.GroupBy(c => c.ProductoId)
                .Select(g => new
                {
                    nombre = productos.FirstOrDefault(p => p.Id == g.Key)?.Nombre ?? "?",
                    unidades = g.Sum(x => x.UnidadesVendidas),
                    beneficio = g.Sum(x => x.SubtotalUtilidad),
                    und_dia = Math.Round(g.Sum(x => (decimal)x.UnidadesVendidas) / dias, 1),
                    ing_dia = Math.Round(g.Sum(x => x.SubtotalIngresos) / dias, 0)
                })
                .OrderByDescending(x => x.unidades).Take(3).ToList();

            result["top_rentables"] = conteos.GroupBy(c => c.ProductoId)
                .Select(g => new { nombre = productos.FirstOrDefault(p => p.Id == g.Key)?.Nombre ?? "?", beneficio = g.Sum(x => x.SubtotalUtilidad) })
                .OrderByDescending(x => x.beneficio).Take(3).ToList();
        }

        return JsonSerializer.Serialize(result);
    }

    private async Task<string> ToolDesglosePorDia(long negocioId, DateTimeOffset desde)
    {
        var cierres = await _db.CierresJornada
            .Where(c => c.NegocioId == negocioId && c.CreadoEn >= desde)
            .Include(c => c.Jornada).ToListAsync();

        if (cierres.Count == 0) return "{\"jornadas\":0}";

        var porDia = cierres.Where(c => c.Jornada is not null)
            .GroupBy(c => c.Jornada!.FechaReferencia.DayOfWeek)
            .Select(g => new
            {
                dia = ObtenerNombreDia(g.Key),
                jornadas = g.Count(),
                ingresos_totales = g.Sum(c => c.IngresosOperativos),
                utilidad_total = g.Sum(c => c.UtilidadNeta),
                margen_promedio = Math.Round(g.Sum(c => c.IngresosOperativos) > 0 ? g.Sum(c => c.UtilidadNeta) / g.Sum(c => c.IngresosOperativos) * 100 : 0, 1),
                prom_diario = Math.Round(g.Average(c => c.IngresosOperativos), 0),
                rentables = g.Count(c => c.EstadoDia == "rentable")
            })
            .OrderByDescending(d => d.ingresos_totales).ToList();

        return JsonSerializer.Serialize(new { dias = porDia, mejor_dia = porDia.First().dia, peor_dia = porDia.Last().dia });
    }

    private async Task<string> ToolEstructuraCostos(long negocioId, DateTimeOffset desde)
    {
        var totalFijosDia = await _db.CostosFijos.Where(c => c.NegocioId == negocioId && c.EliminadoEn == null).SumAsync(c => c.EquivalenteDiario);
        var totalNominaDia = await _db.Empleados.Where(e => e.NegocioId == negocioId && e.EliminadoEn == null).SumAsync(e => e.CostoDiario);

        var cierres = await _db.CierresJornada.Where(c => c.NegocioId == negocioId && c.CreadoEn >= desde).ToListAsync();
        var result = new Dictionary<string, object>
        {
            ["costos_fijos_dia"] = totalFijosDia,
            ["nomina_dia"] = totalNominaDia,
            ["costo_total_dia"] = totalFijosDia + totalNominaDia
        };

        if (cierres.Count > 0)
        {
            var ti = cierres.Sum(c => c.IngresosOperativos);
            if (ti > 0)
            {
                result["total_ingresos"] = ti;
                result["costo_ventas_pct"] = Math.Round(cierres.Sum(c => c.CostoVendido) / ti * 100, 1);
                result["gastos_jornada_pct"] = Math.Round(cierres.Sum(c => c.GastosJornada) / ti * 100, 1);
                result["costos_fijos_pct"] = Math.Round(cierres.Sum(c => c.CostosFijosDia) / ti * 100, 1);
                result["utilidad_neta_pct"] = Math.Round(cierres.Sum(c => c.UtilidadNeta) / ti * 100, 1);
            }
        }

        return JsonSerializer.Serialize(result);
    }

    private async Task<string> ToolCuentasPorCobrar(long negocioId)
    {
        var cuentas = await _db.VentasCredito.Where(v => v.NegocioId == negocioId && v.Estado != "cobrado").ToListAsync();
        if (cuentas.Count == 0) return "{\"pendientes\":0,\"clientes\":0}";
        return JsonSerializer.Serialize(new { monto_pendiente = cuentas.Sum(c => c.MontoTotal - c.MontoCobrado), clientes = cuentas.Count });
    }

    // ──────── PARSEO DIAGNÓSTICO ─────────────────────────────

    private static DiagnosticoIAResponse ParsearDiagnostico(string raw, int tokens)
    {
        var json = raw.Trim();
        if (json.StartsWith("```"))
        {
            var start = json.IndexOf('\n');
            if (start > 0) json = json[(start + 1)..];
            var end = json.LastIndexOf("```");
            if (end > 0) json = json[..end].Trim();
        }

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            return new DiagnosticoIAResponse
            {
                DatosInsuficientes = false,
                EstadoGeneral = root.TryGetProperty("estado_general", out var eg) ? eg.GetString() ?? "" : raw[..Math.Min(raw.Length, 400)],
                ConsejoGeneral = root.TryGetProperty("consejo_general", out var cg) ? cg.GetString() ?? "" : "",
                MensajeInicial = root.TryGetProperty("mensaje_inicial", out var mi) ? mi.GetString() ?? "" : "He analizado los datos. ¿Sobre qué quieres profundizar?",
                PuntosPositivos = ParsearSubLista<PuntoPositivo>(root, "puntos_positivos", r => new PuntoPositivo
                {
                    Titulo = r.TryGetProperty("titulo", out var t) ? t.GetString() ?? "" : "",
                    Detalle = r.TryGetProperty("detalle", out var d) ? d.GetString() ?? "" : ""
                }),
                PuntosMejorar = ParsearSubLista<PuntoMejorar>(root, "puntos_mejorar", r => new PuntoMejorar
                {
                    Titulo = r.TryGetProperty("titulo", out var t) ? t.GetString() ?? "" : "",
                    Detalle = r.TryGetProperty("detalle", out var d) ? d.GetString() ?? "" : "",
                    ConsejoEspecifico = r.TryGetProperty("consejo_especifico", out var ce) ? ce.GetString() ?? "" : "",
                    ContextoConceptual = r.TryGetProperty("contexto_conceptual", out var cc) ? cc.GetString() ?? "" : ""
                }),
                TokensUsados = tokens
            };
        }
        catch (JsonException)
        {
            return new DiagnosticoIAResponse
            {
                DatosInsuficientes = false,
                EstadoGeneral = raw[..Math.Min(raw.Length, 600)],
                PuntosPositivos = [], PuntosMejorar = [], ConsejoGeneral = "",
                MensajeInicial = "He analizado los datos. ¿Sobre qué quieres profundizar?",
                TokensUsados = tokens
            };
        }
    }

    private static List<T> ParsearSubLista<T>(JsonElement root, string key, Func<JsonElement, T> factory)
    {
        var list = new List<T>();
        if (root.TryGetProperty(key, out var arr) && arr.ValueKind == JsonValueKind.Array)
            foreach (var item in arr.EnumerateArray())
                list.Add(factory(item));
        return list;
    }

    private static string ObtenerNombreDia(DayOfWeek dia) => dia switch
    {
        DayOfWeek.Monday => "Lunes", DayOfWeek.Tuesday => "Martes",
        DayOfWeek.Wednesday => "Miércoles", DayOfWeek.Thursday => "Jueves",
        DayOfWeek.Friday => "Viernes", DayOfWeek.Saturday => "Sábado",
        DayOfWeek.Sunday => "Domingo", _ => dia.ToString()
    };
}

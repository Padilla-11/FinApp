using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Finop.API.Data;
using Finop.API.Models.DTOs.IA;
using Finop.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Finop.API.Services.Implementations;

public class IAService : IIAService
{
    private readonly FinopDbContext _db;
    private readonly IAccesoService _acceso;
    private readonly IConfiguration _config;
    private readonly HttpClient _http;

    public IAService(FinopDbContext db, IAccesoService acceso, IConfiguration config, IHttpClientFactory factory)
    {
        _db = db;
        _acceso = acceso;
        _config = config;
        _http = factory.CreateClient("OpenCodeGo");
    }

    public async Task<ConsultaIAResponse> ConsultarAsync(
        long negocioId, long usuarioId, ConsultaIARequest request)
    {
        await _acceso.VerificarAccesoAsync(negocioId, usuarioId);

        var fechaInicio = DateTimeOffset.UtcNow.AddDays(-request.PeriodoDias);

        var contexto = await ConstruirContextoAsync(negocioId, fechaInicio);
        var promptSistema = ConstruirPromptSistema(contexto);
        var respuesta = await LlamarIA(promptSistema, request);

        return respuesta;
    }

    private async Task<string> ConstruirContextoAsync(long negocioId, DateTimeOffset desde)
    {
        var sb = new StringBuilder();

        var negocio = await _db.Negocios.FindAsync(negocioId);
        if (negocio is null) return "Sin datos del negocio.";

        var diasSemana = negocio.DiasOperacion?.Length ?? 6;
        var diasMes = Math.Round(diasSemana * 4.33);

        sb.AppendLine($"📊 NEGOCIO: {negocio.Nombre} | {negocio.TipoActividad ?? "Sin tipo"} | {diasSemana} días/semana (~{diasMes} días/mes)");
        sb.AppendLine();

        var productos = await _db.Productos
            .Where(p => p.NegocioId == negocioId && p.EliminadoEn == null && p.Activo)
            .OrderBy(p => p.Nombre)
            .ToListAsync();

        if (productos.Count > 0)
        {
            var margenPromedio = productos.Average(p => p.MargenPorcentaje);
            sb.AppendLine($"📦 PRODUCTOS ({productos.Count} activos, margen promedio {margenPromedio:F1}%)");

            var conteos = await _db.ConteosProductosCierre
                .Include(c => c.Cierre)
                .Where(c => c.NegocioId == negocioId && c.Cierre.CreadoEn >= desde)
                .ToListAsync();

            if (conteos.Count > 0)
            {
                var topVendidos = conteos
                    .GroupBy(c => c.ProductoId)
                    .Select(g => new
                    {
                        ProductoId = g.Key,
                        TotalUnidades = g.Sum(x => (decimal)x.UnidadesVendidas),
                        TotalBeneficio = g.Sum(x => x.SubtotalUtilidad)
                    })
                    .OrderByDescending(x => x.TotalUnidades)
                    .Take(5)
                    .ToList();

                var topVendidosNombres = topVendidos
                    .Select(t =>
                    {
                        var p = productos.FirstOrDefault(p => p.Id == t.ProductoId);
                        return p is null ? null : $"  {p.Nombre} ({t.TotalUnidades} unid, ${t.TotalBeneficio:F0} beneficio)";
                    })
                    .Where(x => x is not null)
                    .ToList();

                if (topVendidosNombres.Count > 0)
                    sb.AppendLine("Top 5 más vendidos:" + Environment.NewLine + string.Join(Environment.NewLine, topVendidosNombres));

                var topRentables = conteos
                    .GroupBy(c => c.ProductoId)
                    .Select(g => new
                    {
                        ProductoId = g.Key,
                        TotalBeneficio = g.Sum(x => x.SubtotalUtilidad)
                    })
                    .OrderByDescending(x => x.TotalBeneficio)
                    .Take(5)
                    .ToList();

                var topRentablesNombres = topRentables
                    .Select(t =>
                    {
                        var p = productos.FirstOrDefault(pr => pr.Id == t.ProductoId);
                        return p is null ? null : $"  {p.Nombre} (${t.TotalBeneficio:F0} utilidad total)";
                    })
                    .Where(x => x is not null)
                    .ToList();

                if (topRentablesNombres.Count > 0)
                    sb.AppendLine("Top 5 más rentables:" + Environment.NewLine + string.Join(Environment.NewLine, topRentablesNombres));
            }
            else
            {
                sb.AppendLine("  (No hay datos de conteos en este período. Realiza conteos físicos para análisis detallado.)");
            }
            sb.AppendLine();
        }

        var costosFijos = await _db.CostosFijos
            .Where(c => c.NegocioId == negocioId && c.EliminadoEn == null)
            .OrderBy(c => c.Nombre)
            .ToListAsync();

        var empleados = await _db.Empleados
            .Where(e => e.NegocioId == negocioId && e.EliminadoEn == null)
            .OrderBy(e => e.Nombre)
            .ToListAsync();

        var totalFijosDia = costosFijos.Sum(c => c.EquivalenteDiario);
        var totalNominaDia = empleados.Sum(e => e.CostoDiario);

        sb.AppendLine($"💰 COSTOS FIJOS: ${totalFijosDia:F0}/día ({costosFijos.Count} items) | 👥 NÓMINA: ${totalNominaDia:F0}/día ({empleados.Count} empleados)");
        sb.AppendLine($"   Costo total diario (fijos + nómina): ${totalFijosDia + totalNominaDia:F0}");

        if (costosFijos.Count > 0)
        {
            foreach (var c in costosFijos)
                sb.AppendLine($"   {c.Nombre}: ${c.Valor:F0}/{c.Frecuencia} (≈${c.EquivalenteDiario:F0}/día)");
        }

        if (empleados.Count > 0)
        {
            foreach (var e in empleados)
                sb.AppendLine($"   {e.Nombre}{(string.IsNullOrEmpty(e.Cargo) ? "" : $" ({e.Cargo})")}: ${e.ValorPago:F0}/{e.TipoPago} (≈${e.CostoDiario:F0}/día)");
        }
        sb.AppendLine();

        var cierres = await _db.CierresJornada
            .Where(c => c.NegocioId == negocioId && c.CreadoEn >= desde)
            .Include(c => c.Jornada)
            .OrderByDescending(c => c.CreadoEn)
            .ToListAsync();

        if (cierres.Count > 0)
        {
            var totalIngresos = cierres.Sum(c => c.IngresosOperativos);
            var totalUtilidad = cierres.Sum(c => c.UtilidadNeta);
            var margenProm = cierres.Average(c => c.MargenGanancia);
            var diasRentables = cierres.Count(c => c.EstadoDia == "rentable");
            var diasPerdida = cierres.Count(c => c.EstadoDia == "perdida");
            var promDiario = cierres.Count > 0 ? totalIngresos / cierres.Count : 0;
            var puntoEquilibrio = cierres.FirstOrDefault()?.PuntoEquilibrioDia ?? 0;

            sb.AppendLine($"📈 HISTORIAL ÚLTIMOS {requestPeriodo(desde)} DÍAS");
            sb.AppendLine($"   Jornadas operadas: {cierres.Count}");
            sb.AppendLine($"   Ingresos totales: ${totalIngresos:N0}");
            sb.AppendLine($"   Utilidad neta: ${totalUtilidad:N0}");
            sb.AppendLine($"   Margen promedio: {margenProm:F1}%");
            sb.AppendLine($"   Días rentables: {diasRentables}/{cierres.Count} | Días con pérdida: {diasPerdida}");
            sb.AppendLine($"   Promedio diario: ${promDiario:N0}");
            sb.AppendLine($"   Punto equilibrio último cierre: ${puntoEquilibrio:N0}");

            var porDia = cierres
                .GroupBy(c => c.Jornada.FechaReferencia.DayOfWeek)
                .Select(g => new
                {
                    DiaSemana = g.Key,
                    Nombre = ObtenerNombreDia(g.Key),
                    Jornadas = g.Count(),
                    IngresosTotal = g.Sum(c => c.IngresosOperativos),
                    UtilidadTotal = g.Sum(c => c.UtilidadNeta),
                    MargenProm = g.Average(c => c.MargenGanancia),
                    Rentables = g.Count(c => c.EstadoDia == "rentable"),
                    Perdida = g.Count(c => c.EstadoDia == "perdida"),
                    PromDiario = g.Average(c => c.IngresosOperativos)
                })
                .OrderByDescending(d => d.IngresosTotal)
                .ToList();

            if (porDia.Count > 0)
            {
                sb.AppendLine();
                sb.AppendLine("📅 DESGLOSE POR DÍA DE LA SEMANA");
                foreach (var d in porDia)
                {
                    sb.AppendLine($"   {d.Nombre}: {d.Jornadas} jornadas, ${d.IngresosTotal:N0} ingreso total (prom ${d.PromDiario:N0}/día), ${d.UtilidadTotal:N0} utilidad, margen {d.MargenProm:F1}% | Rentables: {d.Rentables}/{d.Jornadas}");
                }
                var mejor = porDia.First();
                var peor = porDia.Last();
                sb.AppendLine($"   ➡️ Mejor día: {mejor.Nombre} (${mejor.PromDiario:N0} prom/día, ${mejor.UtilidadTotal:N0} utilidad total)");
                sb.AppendLine($"   ⬇️ Peor día: {peor.Nombre} (${peor.PromDiario:N0} prom/día, ${peor.UtilidadTotal:N0} utilidad total)");
            }
        }
        else
        {
            sb.AppendLine($"📈 HISTORIAL: Sin jornadas cerradas en los últimos {requestPeriodo(desde)} días.");
        }
        sb.AppendLine();

        var cuentasPendientes = await _db.VentasCredito
            .Where(v => v.NegocioId == negocioId && v.Estado != "cobrado")
            .ToListAsync();

        if (cuentasPendientes.Count > 0)
        {
            var totalPendiente = cuentasPendientes.Sum(c => c.MontoTotal - c.MontoCobrado);
            sb.AppendLine($"💳 CUENTAS POR COBRAR: ${totalPendiente:F0} pendientes ({cuentasPendientes.Count} clientes)");
        }
        else
        {
            sb.AppendLine("💳 CUENTAS POR COBRAR: Sin cuentas pendientes ✅");
        }
        sb.AppendLine();

        var alertas = new List<string>();

        var jornadaAbierta = await _db.Jornadas
            .AnyAsync(j => j.NegocioId == negocioId && j.Estado == "abierta");
        if (jornadaAbierta)
            alertas.Add("Tienes una jornada abierta sin cerrar");

        if (cierres.Count >= 2)
        {
            var ultimas = cierres.Take(2).ToList();
            if (ultimas.All(c => c.EstadoDia == "perdida"))
                alertas.Add("Llevas 2+ jornadas consecutivas con pérdida");
        }

        if (cuentasPendientes.Sum(c => c.MontoTotal - c.MontoCobrado) > 0)
            alertas.Add($"Tienes ${cuentasPendientes.Sum(c => c.MontoTotal - c.MontoCobrado):F0} por cobrar");

        if (productos.Count > 0)
        {
            var margenProm = productos.Average(p => p.MargenPorcentaje);
            if (margenProm < 20)
                alertas.Add($"Margen promedio bajo ({margenProm:F1}%), por debajo del 20% recomendado");
        }

        sb.AppendLine(alertas.Count > 0
            ? $"⚠️ ALERTAS:{Environment.NewLine}" + string.Join(Environment.NewLine, alertas.Select(a => $"   • {a}"))
            : "⚠️ ALERTAS: Sin alertas activas ✅");

        return sb.ToString();
    }

    private static int requestPeriodo(DateTimeOffset desde)
    {
        return (int)Math.Ceiling((DateTimeOffset.UtcNow - desde).TotalDays);
    }

    private static string ObtenerNombreDia(DayOfWeek dia) => dia switch
    {
        DayOfWeek.Monday    => "Lunes",
        DayOfWeek.Tuesday   => "Martes",
        DayOfWeek.Wednesday => "Miércoles",
        DayOfWeek.Thursday  => "Jueves",
        DayOfWeek.Friday    => "Viernes",
        DayOfWeek.Saturday  => "Sábado",
        DayOfWeek.Sunday    => "Domingo",
        _                   => dia.ToString()
    };

    private static string ConstruirPromptSistema(string contexto)
    {
        return $@"Eres FinOp IA 🤖, asistente financiero experto para microempresas colombianas.

REGLAS:
1. Siempre responde en español, claro, práctico y empático.
2. Usa emojis apropiadamente 🎯📊💡.
3. Sé concreto: da máximo 3 párrafos a menos que pidan análisis detallado.
4. Nunca inventes datos ni estadísticas. Solo usa la información proporcionada.
5. Si faltan datos, indícalo amablemente y sugiere qué registrar.
6. Prioriza recomendaciones por impacto (qué cambio genera más beneficio).
7. Cuando sugieras mejoras, incluye números estimados si es posible.
8. Da respuestas cortas y directas cuando la pregunta sea simple.

CONTEXTO FINANCIERO ACTUAL:
{contexto}

INSTRUCCIÓN: Responde como asistente financiero personal del dueño del negocio. Sé directo, útil y evita generalidades.";
    }

    private async Task<ConsultaIAResponse> LlamarIA(string promptSistema, ConsultaIARequest request)
    {
        var mensajes = new List<object>();

        mensajes.Add(new { role = "system", content = promptSistema });

        if (request.Historial is not null)
        {
            foreach (var m in request.Historial)
                mensajes.Add(new { role = m.Rol, content = m.Contenido });
        }

        mensajes.Add(new { role = "user", content = request.Mensaje });

        var body = new
        {
            model = _config["IA:Modelo"] ?? "deepseek-v4-flash",
            messages = mensajes,
            max_tokens = int.Parse(_config["IA:MaxTokens"] ?? "1000"),
            temperature = double.Parse(_config["IA:Temperature"] ?? "0.7", CultureInfo.InvariantCulture)
        };

        var json = JsonSerializer.Serialize(body);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var baseUrl = _config["IA:BaseUrl"] ?? "https://opencode.ai/zen/go/v1";
        var fullUrl = $"{baseUrl}/chat/completions";

        HttpResponseMessage response;
        try
        {
            response = await _http.PostAsync(fullUrl, content);
        }
        catch (Exception ex)
        {
            return new ConsultaIAResponse
            {
                Respuesta = $"Error de conexión con el servicio IA: {ex.Message}",
                TokensUsados = 0
            };
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            return new ConsultaIAResponse
            {
                Respuesta = $"Error del servicio IA ({response.StatusCode}): {errorBody}",
                TokensUsados = 0
            };
        }

        var responseJson = await response.Content.ReadAsStringAsync();

        var result = JsonSerializer.Deserialize<OpenAIChatResponse>(
            responseJson,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        var msg = result?.Choices?.FirstOrDefault()?.Message;
        var contentText = !string.IsNullOrEmpty(msg?.Content) ? msg.Content : msg?.ReasoningContent;
        var tokens = result?.Usage?.TotalTokens ?? 0;

        return new ConsultaIAResponse
        {
            Respuesta = !string.IsNullOrEmpty(contentText)
                ? contentText
                : "No pude generar una respuesta. Intenta de nuevo.",
            TokensUsados = tokens
        };
    }
}

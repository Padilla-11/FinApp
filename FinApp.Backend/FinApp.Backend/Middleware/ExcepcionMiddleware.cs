using System.Net;
using System.Text.Json;
using Finop.API.Models.DTOs;

namespace Finop.API.Middleware;

public class ExcepcionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExcepcionMiddleware> _logger;

    public ExcepcionMiddleware(RequestDelegate next, ILogger<ExcepcionMiddleware> logger)
    { _next = next; _logger = logger; }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error no controlado en {Path}", context.Request.Path);
            await ManejarExcepcionAsync(context, ex);
        }
    }

    private static async Task ManejarExcepcionAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, mensaje) = ex switch
        {
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, ex.Message),
            KeyNotFoundException        => (HttpStatusCode.NotFound,     ex.Message),
            InvalidOperationException   => (HttpStatusCode.BadRequest,   ex.Message),
            ArgumentException           => (HttpStatusCode.BadRequest,   ex.Message),
            _                           => (HttpStatusCode.InternalServerError,
                                           "Ocurrió un error inesperado. Intente más tarde.")
        };

        context.Response.StatusCode = (int)statusCode;

        var respuesta = ApiResponse<object>.Fallo(mensaje);
        var json = JsonSerializer.Serialize(respuesta, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}

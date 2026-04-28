using System.Text;
using Finop.API.Data;
using Finop.API.Helpers;
using Finop.API.Middleware;
using Finop.API.Services.Implementations;
using Finop.API.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ─────────────────────────────────────────────────────────────
// BASE DE DATOS — PostgreSQL + EF Core
// ─────────────────────────────────────────────────────────────
builder.Services.AddDbContext<FinopDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsql => npgsql.EnableRetryOnFailure(3)
    )
    .UseSnakeCaseNamingConvention()   // mapeo automático camelCase → snake_case
);

// ─────────────────────────────────────────────────────────────
// AUTENTICACIÓN JWT
// ─────────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("Jwt:Key no configurado en appsettings.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew                = TimeSpan.Zero   // Sin tolerancia extra de tiempo
        };

        // Devolver 401 con formato JSON estándar
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async ctx =>
            {
                ctx.HandleResponse();
                ctx.Response.StatusCode  = 401;
                ctx.Response.ContentType = "application/json";
                await ctx.Response.WriteAsync(
                    "{\"exito\":false,\"mensaje\":\"No autorizado. Token inválido o expirado.\",\"errores\":[]}");
            }
        };
    });

builder.Services.AddAuthorization();

// ─────────────────────────────────────────────────────────────
// INYECCIÓN DE DEPENDENCIAS — Servicios
// ─────────────────────────────────────────────────────────────
builder.Services.AddScoped<JwtHelper>();

// Auth
builder.Services.AddScoped<IAuthService, AuthService>();

// Acceso (compartido entre todos los servicios de negocio)
builder.Services.AddScoped<IAccesoService, AccesoService>();

// Configuración del negocio
builder.Services.AddScoped<INegocioService,    NegocioService>();
builder.Services.AddScoped<IProductoService,   ProductoService>();
builder.Services.AddScoped<ICostoFijoService,  CostoFijoService>();
builder.Services.AddScoped<IEmpleadoService,   EmpleadoService>();

// Operación diaria
builder.Services.AddScoped<IJornadaService,      JornadaService>();
builder.Services.AddScoped<IMovimientoService,   MovimientoService>();
builder.Services.AddScoped<IVentaCreditoService, VentaCreditoService>();
builder.Services.AddScoped<ICierreService,       CierreService>();

// Simulador
builder.Services.AddScoped<ISimuladorService, SimuladorService>();

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddPolicy("FinopPolicy", policy =>
        policy
            .WithOrigins(
                "http://localhost:3000",   // React dev
                "http://localhost:5173",   // Vite dev
                "https://finop.app"        // Producción
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()
    )
);

// ─────────────────────────────────────────────────────────────
// CONTROLLERS + SWAGGER
// ─────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy        = null; // PascalCase en JSON
        opts.JsonSerializerOptions.DefaultIgnoreCondition      =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title       = "FINOP API",
        Version     = "v1",
        Description = "Sistema Web de Análisis Financiero para Microempresas",
        Contact     = new OpenApiContact { Name = "FINOP" }
    });

    // Botón Authorize en Swagger para JWT
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        Type         = SecuritySchemeType.Http,
        Scheme       = "Bearer",
        BearerFormat = "JWT",
        In           = ParameterLocation.Header,
        Description  = "Ingrese el token JWT. Ejemplo: Bearer {token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });

    // Incluir comentarios XML de los controladores
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath)) c.IncludeXmlComments(xmlPath);
});

// ─────────────────────────────────────────────────────────────
// BUILD
// ─────────────────────────────────────────────────────────────
var app = builder.Build();

// Middleware de errores globales (primero en el pipeline)
app.UseMiddleware<ExcepcionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "FINOP API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors("FinopPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// ─────────────────────────────────────────────────────────────
// HEALTH CHECK MÍNIMO
// ─────────────────────────────────────────────────────────────
app.MapGet("/", () => Results.Ok(new
{
    app     = "FINOP API",
    version = "1.0",
    status  = "online",
    tiempo  = DateTimeOffset.UtcNow
})).ExcludeFromDescription();

app.Run();

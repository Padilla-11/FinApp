# FINOP API — Backend .NET 8

Sistema Web de Análisis Financiero para Microempresas.

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Framework | ASP.NET Core 8 Web API |
| ORM | Entity Framework Core 8 |
| Base de datos | PostgreSQL 15+ |
| Autenticación | JWT Bearer |
| Documentación | Swagger / OpenAPI |
| Hash contraseñas | BCrypt.Net |

---

## Estructura del proyecto

```
Finop.API/
├── Controllers/               → 8 controladores REST
│   ├── AuthController         → POST /api/auth/registrar · login
│   ├── NegociosController     → CRUD negocios + gestión miembros
│   ├── ProductosController    → CRUD productos y categorías
│   ├── CostosFijosController  → CRUD costos fijos
│   ├── EmpleadosController    → CRUD empleados
│   ├── JornadasController     → Apertura, historial y movimientos
│   ├── VentasCreditoController→ Cuentas por cobrar y cobros
│   ├── CierresController      → Cierre, historial y correcciones
│   └── SimuladorController    → Preview y escenarios guardados
│
├── Services/
│   ├── Interfaces/            → Contratos de todos los servicios
│   └── Implementations/       → Lógica de negocio completa
│
├── Models/
│   ├── Entities/              → 16 entidades (1:1 con el SQL)
│   └── DTOs/                  → DTOs de Request y Response
│
├── Data/
│   └── FinopDbContext.cs      → Configuración EF Core + PostgreSQL
│
├── Helpers/
│   ├── JwtHelper.cs           → Generación de tokens
│   └── ContextoUsuario.cs     → Extractor de usuario del token
│
└── Middleware/
    └── ExcepcionMiddleware.cs → Manejo global de errores → JSON estándar
```

---

## Configuración inicial

### 1. Prerrequisitos

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- PostgreSQL 15+
- La base de datos creada con el script `finop_base_de_datos.sql`

### 2. Cadena de conexión

Editar `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=finop_db;Username=postgres;Password=TU_PASSWORD"
  },
  "Jwt": {
    "Key": "CLAVE_SECRETA_MINIMO_32_CARACTERES_CAMBIA_ESTO",
    "Issuer": "Finop.API",
    "Audience": "Finop.Client",
    "ExpirationMinutes": 1440
  }
}
```

> **Importante:** En producción, nunca incluir credenciales en `appsettings.json`. Usar variables de entorno o Azure Key Vault.

### 3. Ejecutar

```bash
cd Finop.API
dotnet restore
dotnet run
```

La API queda disponible en:
- `https://localhost:7000` (HTTPS)
- `http://localhost:5000` (HTTP)
- `http://localhost:5000/swagger` → Documentación interactiva

---

## Endpoints principales

### Autenticación (pública)

```
POST /api/auth/registrar      → Crear cuenta nueva
POST /api/auth/login          → Obtener token JWT
```

### Negocios

```
GET    /api/negocios                         → Mis negocios
POST   /api/negocios                         → Crear negocio
GET    /api/negocios/{id}                    → Ver negocio
PUT    /api/negocios/{id}                    → Actualizar
DELETE /api/negocios/{id}                    → Eliminar (soft)
POST   /api/negocios/{id}/miembros           → Invitar operador
DELETE /api/negocios/{id}/miembros/{userId}  → Remover miembro
```

### Configuración del negocio

```
# Productos
GET|POST              /api/negocios/{id}/productos
GET|PUT|DELETE        /api/negocios/{id}/productos/{productoId}
GET|POST              /api/negocios/{id}/productos/categorias
DELETE                /api/negocios/{id}/productos/categorias/{catId}

# Costos fijos
GET|POST              /api/negocios/{id}/costos-fijos
PUT|DELETE            /api/negocios/{id}/costos-fijos/{costoId}

# Empleados
GET|POST              /api/negocios/{id}/empleados
PUT|DELETE            /api/negocios/{id}/empleados/{empleadoId}
```

### Jornada operativa

```
POST   /api/negocios/{id}/jornadas                              → Abrir jornada
GET    /api/negocios/{id}/jornadas/activa                       → Jornada abierta actual
GET    /api/negocios/{id}/jornadas                              → Historial paginado
GET    /api/negocios/{id}/jornadas/{jornadaId}                  → Ver jornada

GET    /api/negocios/{id}/jornadas/{jornadaId}/movimientos      → Listar movimientos
POST   /api/negocios/{id}/jornadas/{jornadaId}/movimientos      → Registrar movimiento
DELETE /api/negocios/{id}/jornadas/{jornadaId}/movimientos/{mId}→ Eliminar movimiento
```

### Cuentas por cobrar

```
GET    /api/negocios/{id}/cuentas-por-cobrar                       → Pendientes
POST   /api/negocios/{id}/jornadas/{jornadaId}/ventas-credito      → Registrar venta
POST   /api/negocios/{id}/cuentas-por-cobrar/{ventaId}/cobros      → Registrar cobro
```

### Cierre de jornada

```
POST   /api/negocios/{id}/jornadas/{jornadaId}/cierre   → Confirmar cierre
GET    /api/negocios/{id}/jornadas/{jornadaId}/cierre   → Ver cierre
GET    /api/negocios/{id}/historial                      → Historial de cierres
PATCH  /api/negocios/{id}/cierres/{cierreId}            → Corregir cierre (auditoría)
```

### Simulador financiero

```
POST   /api/negocios/{id}/simulador/preview             → Preview sin guardar
POST   /api/negocios/{id}/simulador/escenarios          → Guardar escenario
GET    /api/negocios/{id}/simulador/escenarios          → Listar escenarios
GET    /api/negocios/{id}/simulador/escenarios/{escId}  → Ver escenario
DELETE /api/negocios/{id}/simulador/escenarios/{escId}  → Eliminar (soft)
```

---

## Roles y permisos

| Acción | Propietario | Operador |
|---|:---:|:---:|
| Ver datos del negocio | ✅ | ✅ |
| Abrir jornada | ✅ | ✅ |
| Registrar movimientos | ✅ | ✅ |
| Registrar venta a crédito | ✅ | ✅ |
| Crear/editar productos | ✅ | ❌ |
| Crear/editar costos fijos | ✅ | ❌ |
| Cerrar jornada | ✅ | ❌ |
| Corregir cierres | ✅ | ❌ |
| Usar simulador | ✅ | ❌ |
| Invitar/remover miembros | ✅ | ❌ |
| Eliminar negocio | ✅ | ❌ |

---

## Respuesta estándar de la API

Todas las respuestas siguen este formato:

```json
{
  "Exito": true,
  "Mensaje": "Descripción opcional",
  "Data": { ... },
  "Errores": []
}
```

En caso de error:

```json
{
  "Exito": false,
  "Mensaje": "Descripción del error",
  "Data": null,
  "Errores": []
}
```

### Códigos HTTP utilizados

| Código | Situación |
|---|---|
| 200 OK | Operación exitosa |
| 201 Created | Recurso creado |
| 400 Bad Request | Validación o regla de negocio |
| 401 Unauthorized | Token inválido o ausente |
| 404 Not Found | Recurso no encontrado |
| 500 Internal Server Error | Error inesperado |

---

## Lógica del cierre de jornada

El cierre calcula automáticamente:

1. **Caja esperada** = `caja_inicial` + Σ(monto × signo) de movimientos que afectan caja
2. **Diferencia de caja** = `caja_final_registrada` − `caja_esperada`
3. **Costos fijos del día** = Σ(equivalente_diario de costos_fijos) + Σ(costo_diario de empleados)
4. **Ingresos operativos y costo vendido**:
   - Con conteo de productos: suma directa de unidades × precio/costo
   - Sin conteo: estimado desde movimientos + margen promedio histórico
5. **Utilidad neta** = ingresos − costo_vendido − gastos_jornada − costos_fijos_día
6. **Punto de equilibrio** = costos_fijos_día ÷ margen_contribución
7. **Estado del día**: `rentable` | `equilibrio` | `perdida`

---

## Variables de entorno recomendadas para producción

```bash
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection="Host=...;Database=finop_db;..."
Jwt__Key="clave-super-secreta-minimo-32-caracteres"
Jwt__ExpirationMinutes=480
```

# Sistema de Autenticación y Autorización — FinApp

Documento técnico que describe en profundidad el flujo completo de autenticación (quién eres) y autorización (qué puedes hacer) en la plataforma FinApp, cubriendo tanto el backend (ASP.NET Core) como el frontend (React).

---

## 1. Visión General del Flujo

El sistema de seguridad de FinApp se basa en **JSON Web Tokens (JWT)** y sigue este flujo general:

1. El usuario se registra o inicia sesión enviando correo y contraseña.
2. El backend valida las credenciales, genera un **token JWT firmado** y lo devuelve al cliente.
3. El frontend almacena ese token y lo adjunta en **cada petición posterior** mediante un interceptor HTTP.
4. El backend valida el token en cada petición protegida y extrae la identidad del usuario.
5. Antes de ejecutar operaciones sobre un negocio específico, el sistema verifica que el usuario tenga acceso a ese negocio y, en algunos casos, que sea el **propietario**.

---

## 2. Backend — ASP.NET Core

### 2.1 Configuración Central (`Program.cs`)

Este es el punto de configuración de toda la autenticación. Registra los servicios en el contenedor de dependencias y configura el pipeline HTTP.

**Servicios registrados:**
- `AddAuthentication(JwtBearerDefaults.AuthenticationScheme)`: Activa la autenticación JWT usando el esquema estándar de Bearer tokens.
- `TokenValidationParameters`: Configura la validación estricta del token:
  - `ValidateIssuer = true`: Verifica que el emisor del token sea el configurado (`Jwt:Issuer`).
  - `ValidateAudience = true`: Verifica que la audiencia sea la correcta (`Jwt:Audience`).
  - `ValidateLifetime = true`: Rechaza tokens expirados.
  - `ValidateIssuerSigningKey = true`: Valida la firma digital con la clave secreta.
  - `ClockSkew = TimeSpan.Zero`: No permite tolerancia de tiempo; un token expirado a las 14:00:00 es rechazado exactamente a esa hora.
- `AddAuthorization()`: Activa el sistema de autorización basado en claims/políticas.
- `AddScoped<JwtHelper>()`: Inyecta el generador de tokens.
- `AddScoped<IAuthService, AuthService>()`: Inyecta el servicio de autenticación.
- `AddScoped<IAccesoService, AccesoService>()`: Inyecta el verificador de permisos por negocio.

**Configuración de CORS:**
- Política `FinopPolicy` que permite orígenes específicos (`localhost:3000`, `localhost:5173`, `https://finop.app`) con credenciales. Esto permite que el frontend en desarrollo y producción se comunique con la API.

**Swagger con soporte JWT:**
- Se agrega un botón "Authorize" en la interfaz de Swagger para probar endpoints protegidos enviando el token Bearer.

**Pipeline HTTP:**
```
ExcepcionMiddleware → HttpsRedirection → CORS → Authentication → Authorization → Controllers
```

El orden es crítico: `Authentication` debe ir antes que `Authorization` y después de `CORS`, para que cada petición primero sea identificada y luego evaluada en permisos.

---

### 2.2 Controlador de Autenticación (`AuthController.cs`)

Controlador delegado que expone dos endpoints públicos (sin `[Authorize]`):

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `POST /api/auth/registrar` | `RegistrarAsync` | Recibe `RegisterRequest`, delega a `IAuthService` y devuelve `ApiResponse<AuthResponse>`. |
| `POST /api/auth/login` | `LoginAsync` | Recibe `LoginRequest`, delega a `IAuthService` y devuelve `ApiResponse<AuthResponse>`. |

**Características clave:**
- Usa inyección de dependencias por constructor (`IAuthService`).
- No contiene lógica de negocio; solo recibe, delega y formatea respuestas.
- Las respuestas siempre usan el wrapper `ApiResponse<T>` para consistencia.

---

### 2.3 Servicio de Autenticación (`AuthService.cs`)

Contiene toda la lógica de negocio de registro e inicio de sesión.

**Registro (`RegistrarAsync`):**
1. Verifica si ya existe un usuario activo (`EliminadoEn == null`) con el mismo correo.
2. Si existe, lanza `InvalidOperationException` → HTTP 400.
3. Crea la entidad `Usuario` con:
   - `Nombre` limpiado de espacios.
   - `Correo` en minúsculas y sin espacios.
   - `ContrasenaHash` generado con **BCrypt** (algoritmo de hashing unidireccional con salt automático).
4. Guarda en base de datos y devuelve `AuthResponse` vía `BuildResponse`.

**Login (`LoginAsync`):**
1. Busca el usuario por correo (minúsculas) que no esté eliminado.
2. Si no existe, lanza `UnauthorizedAccessException` → HTTP 401.
3. Verifica la contraseña con `BCrypt.Verify`. Si falla, lanza `UnauthorizedAccessException`.
4. Si es válida, devuelve `AuthResponse` vía `BuildResponse`.

**Construcción de respuesta (`BuildResponse`):**
- Genera el token JWT llamando a `JwtHelper.GenerarToken(...)`.
- Consulta la tabla `UsuariosNegocios` para obtener el primer `NegocioId` asociado al usuario (para facilitar el onboarding).
- Devuelve un objeto `AuthResponse` que contiene:
  - `Token`: El JWT firmado.
  - `Nombre`, `Correo`, `UsuarioId`: Datos del usuario.
  - `NegocioId`: El negocio predeterminado (0 si no tiene).
  - `Expira`: Fecha de expiración calculada desde la configuración.
  - `Usuario`: Objeto anidado con `Id`, `Nombre`, `Correo`.

---

### 2.4 Generador de Tokens JWT (`JwtHelper.cs`)

Clase responsable de crear el token de seguridad. Recibe `IConfiguration` para leer los parámetros de `appsettings.json`.

**Proceso de generación:**
1. Lee la clave secreta (`Jwt:Key`) y la convierte en un `SymmetricSecurityKey`.
2. Crea credenciales de firma usando **HMAC-SHA256**.
3. Define los **claims** (afirmaciones dentro del token):
   - `sub` (Subject): ID del usuario.
   - `email`: Correo del usuario.
   - `name`: Nombre del usuario.
   - `jti` (JWT ID): Identificador único UUID para evitar replay attacks.
4. Establece la fecha de expiración sumando `Jwt:ExpirationMinutes` al momento actual UTC.
5. Construye el `JwtSecurityToken` con emisor, audiencia, claims, expiración y credenciales.
6. Escribe el token como string y lo devuelve.

**Seguridad:**
- La clave secreta debe tener **mínimo 32 caracteres** para ser compatible con HMAC-SHA256.
- El token es **firmado, no encriptado**: cualquiera puede leer los claims, pero nadie puede modificarlo sin la clave secreta.

---

### 2.5 Extractor de Usuario desde Claims (`ContextoUsuario.cs`)

Clase estática que extrae la identidad del usuario autenticado desde el contexto HTTP.

**Funcionamiento:**
- Recibe el `ClaimsPrincipal` (proporcionado automáticamente por ASP.NET Core después de validar el JWT).
- Busca el claim `NameIdentifier` (estándar de .NET) o `sub` (estándar JWT).
- Si no lo encuentra, lanza `UnauthorizedAccessException`.
- Convierte el valor a `long` (tipo de ID de usuario).

**Uso típico en controladores:**
```csharp
var usuarioId = ContextoUsuario.ObtenerUsuarioId(User);
```
`User` es una propiedad del `ControllerBase` que contiene el `ClaimsPrincipal` del request actual.

---

### 2.6 Control de Acceso por Negocio (`AccesoService.cs`)

Este servicio implementa la **autorización** (qué puede hacer el usuario). Se inyecta en **todos** los servicios de negocio (Jornada, Producto, Cierre, etc.).

**Métodos:**

| Método | Descripción |
|--------|-------------|
| `VerificarAccesoAsync(negocioId, usuarioId)` | Comprueba en la tabla `UsuariosNegocios` si existe una relación activa entre el usuario y el negocio. Si no, lanza `UnauthorizedAccessException`. |
| `VerificarPropietarioAsync(negocioId, usuarioId)` | Llama `ObtenerRolAsync` y verifica que sea exactamente `"propietario"`. Si no, lanza `UnauthorizedAccessException`. |
| `ObtenerRolAsync(negocioId, usuarioId)` | Devuelve el rol (`"propietario"` o `"operador"`) del usuario en ese negocio. Si no tiene acceso, lanza `UnauthorizedAccessException`. |

**Arquitectura:**
- `AccesoService` se inyecta como `IAccesoService` en cada servicio de dominio.
- Al inicio de cada operación protegida, el servicio llama `await _acceso.VerificarAccesoAsync(negocioId, usuarioId)`.
- Las operaciones críticas (cerrar jornada, corregir cierres, gestionar productos, etc.) usan `VerificarPropietarioAsync`.

---

### 2.7 DTOs de Autenticación (`AuthDTOs.cs`)

Define los contratos de entrada y salida del módulo de autenticación.

**Entrada:**
- `RegisterRequest`: `Nombre` (requerido, max 100), `Correo` (requerido, formato email), `Contrasena` (requerido, mínimo 8 caracteres).
- `LoginRequest`: `Correo` (requerido, email), `Contrasena` (requerido).

**Salida:**
- `AuthResponse`: Contiene el `Token`, datos del usuario, `NegocioId` y `Expira`.
- `UsuarioDto`: Representación pública del usuario (`Id`, `Nombre`, `Correo`) sin información sensible.

**Validaciones:**
- Usan `System.ComponentModel.DataAnnotations` para validar automáticamente antes de que lleguen al servicio.
- ASP.NET Core devuelve HTTP 400 automáticamente si las validaciones fallan.

---

### 2.8 Middleware de Excepciones (`ExcepcionMiddleware.cs`)

Middleware global que captura cualquier excepción no controlada y la traduce a una respuesta HTTP + JSON estandarizada.

**Mapeo de excepciones a HTTP:**

| Excepción | HTTP | Uso |
|-----------|------|-----|
| `UnauthorizedAccessException` | 401 | Token inválido, expirado, acceso denegado a negocio, solo propietario. |
| `KeyNotFoundException` | 404 | Recurso no existe (ej. negocio, producto). |
| `InvalidOperationException` | 400 | Regla de negocio violada (ej. correo duplicado). |
| `ArgumentException` | 400 | Argumento inválido. |
| Cualquier otra | 500 | Error interno del servidor. |

**Respuesta JSON:**
Siempre usa `ApiResponse<object>.Fallo(mensaje)` con el formato estándar de la API, serializado en camelCase para el frontend.

**Ventaja:** El frontend siempre recibe la misma estructura de respuesta, sin importar si el error vino de auth, validación o un bug inesperado.

---

## 3. Frontend — React / Vite

### 3.1 Cliente HTTP con Interceptores (`client.js`)

Instancia centralizada de **Axios** que maneja automáticamente la autenticación.

**Interceptor de Request (antes de enviar):**
- Lee `finop_token` desde `localStorage`.
- Si existe, lo adjunta al header `Authorization: Bearer {token}`.
- Todas las peticiones a la API llevan el token sin que los componentes tengan que hacerlo manualmente.

**Interceptor de Response (al recibir respuesta):**
- Si el status es **401** (token expirado o inválido):
  1. Elimina `finop_token` y `finop_user` de `localStorage`.
  2. Redirige forzosamente a `/login` con `window.location.href`.
- Esto asegura que si el backend rechaza una petición por token inválido, el usuario es desconectado inmediatamente.

**Configuración base:**
- `baseURL`: Toma la URL desde la variable de entorno `VITE_API_URL` o usa `http://localhost:5025` por defecto.

---

### 3.2 API de Autenticación (`auth.js`)

Módulo que abstrae las llamadas a los endpoints de auth.

```javascript
export const authApi = {
  login: (data) => client.post('/api/auth/login', data),
  registrar: (data) => client.post('/api/auth/registrar', data),
};
```

- Recibe objetos con los datos del formulario.
- Retorna la promesa de Axios, que los componentes consumen con `async/await`.

---

### 3.3 Estado Global de Autenticación (`AppContext.jsx`)

Contexto de React que mantiene y sincroniza el estado de sesión en toda la aplicación.

**Estados mantenidos:**
- `user`: Datos del usuario (objeto `UsuarioDto`).
- `token`: El JWT string.
- `isAuth`: Booleano derivado (`!!token`).
- `negocio`: El negocio actualmente seleccionado.
- `negocios`: Lista de negocios del usuario.
- `rol`: Rol dentro del negocio activo (`"propietario"` o `"operador"`).

**Persistencia en localStorage:**
- `finop_token`: El JWT.
- `finop_user`: JSON del usuario.
- `finop_negocio`: JSON del negocio seleccionado.
- Al recargar la página, el contexto lee estos valores para restaurar la sesión automáticamente.

**Métodos principales:**

| Método | Descripción |
|--------|-------------|
| `login(correo, contrasena)` | Llama `authApi.login`, guarda token/usuario en localStorage y estado, luego carga y selecciona el negocio asociado. |
| `registrar(nombre, correo, contrasena)` | Llama `authApi.registrar`, guarda token/usuario igual que login. |
| `logout()` | Elimina todo de localStorage y resetea el estado a null. |
| `seleccionarNegocio(neg)` | Guarda el negocio en localStorage y actualiza el rol derivado. |
| `cargarNegocios()` | Carga la lista de negocios del usuario autenticado. Auto-selecciona el primero si no hay ninguno activo. |

**Efecto de sincronización:**
- Un `useEffect` escucha `isAuth`. Cuando cambia a `true`, automáticamente llama `cargarNegocios()`.

---

### 3.4 Ruta Protegida (`ProtectedRoute.jsx`)

Componente que envuelve rutas privadas y decide si renderizarlas o redirigir.

```jsx
export default function ProtectedRoute() {
  const { isAuth } = useApp();
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
}
```

- Si `isAuth` es `true`, renderiza la ruta hija (`<Outlet />`).
- Si es `false`, redirige a `/login` sin dejar entrada en el historial (`replace`).
- Todas las rutas privadas (Dashboard, Jornada, Cierre, etc.) están envueltas por este componente.

---

## 4. Flujo Completo Paso a Paso

### 4.1 Registro de Usuario

```
┌─────────────┐     POST /api/auth/registrar      ┌──────────────┐
│  Registro   │ ─────────────────────────────────> │ AuthController│
│   .jsx      │    {Nombre, Correo, Contrasena}    └──────┬───────┘
└─────────────┘                                          │
                                                         ▼
                                              ┌──────────────────┐
                                              │   AuthService     │
                                              │ RegistrarAsync()  │
                                              └────────┬───────────┘
                                                       │
                              ┌────────────────────────┼────────────────────────┐
                              ▼                        ▼                        ▼
                    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
                    │ Validar DTO  │          │ BCrypt Hash  │          │ Guardar en   │
                    │ (Data Annotations)│      │ (con salt)   │          │ PostgreSQL   │
                    └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
                           │                        │                        │
                           └────────────────────────┴────────────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │   JwtHelper      │
                                              │ GenerarToken()   │
                                              └────────┬─────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │  AuthResponse    │
                                              │  {Token, User}   │
                                              └────────┬─────────┘
                                                       │
                                                       ▼
┌─────────────┐     200 OK + Token JWT              ┌──────────────┐
│  AppContext  │ <────────────────────────────────── │ AuthController│
│  login()     │                                     └──────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ localStorage │
│ finop_token  │
│ finop_user   │
└─────────────┘
```

### 4.2 Inicio de Sesión

```
┌─────────────┐     POST /api/auth/login          ┌──────────────┐
│   Login      │ ─────────────────────────────────> │ AuthController│
│   .jsx       │    {Correo, Contrasena}            └──────┬───────┘
└─────────────┘                                          │
                                                         ▼
                                              ┌──────────────────┐
                                              │   AuthService     │
                                              │   LoginAsync()    │
                                              └────────┬───────────┘
                                                       │
                              ┌────────────────────────┼────────────────────────┐
                              ▼                        ▼                        ▼
                    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
                    │ Buscar usuario│         │ BCrypt.Verify│         │ Generar JWT │
                    │ por correo   │          │ contrasena   │          │ con claims  │
                    └──────┬──────┘          └──────┬──────┘          └──────┬──────┘
                           │                        │                        │
                           └────────────────────────┴────────────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │  AuthResponse    │
                                              │  {Token, User,   │
                                              │   NegocioId}     │
                                              └────────┬─────────┘
                                                       │
                                                       ▼
┌─────────────┐     200 OK + Token JWT              ┌──────────────┐
│  AppContext  │ <────────────────────────────────── │ AuthController│
│  login()     │                                     └──────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ localStorage │
│ finop_token  │
│ finop_user   │
│ finop_negocio│
└─────────────┘
```

### 4.3 Petición Autenticada (Cualquier operación posterior)

```
┌─────────────┐     GET /api/negocios/5/jornadas    ┌──────────────┐
│  Componente  │ ─────────────────────────────────> │  Controller   │
│  React       │    Authorization: Bearer <token>   └──────┬───────┘
└─────────────┘                                          │
       ▲                                                 │
       │         200 OK + Datos                         │
       │         (si pasa validaciones)                  │
       │                                         ┌──────┴───────┐
       │                                         │  client.js   │
       │                                         │  Interceptor  │
       │                                         │  (adjunta token)
       │                                         └──────┬───────┘
       │                                                │
       │                                         ┌──────┴───────┐
       │                                         │   ASP.NET    │
       │                                         │  Middleware  │
       │                                         │  JwtBearer   │
       │                                         │  Validate    │
       │                                         └──────┬───────┘
       │                                                │
       │                                         ┌──────┴───────┐
       │                                         │  Controller  │
       │                                         │  Obtener     │
       │                                         │  usuarioId   │
       │                                         │  (Claims)    │
       │                                         └──────┬───────┘
       │                                                │
       │                                         ┌──────┴───────┐
       │                                         │ AccesoService │
       │                                         │ VerificarAcceso│
       │                                         │ (negocioId)  │
       │                                         └──────┬───────┘
       │                                                │
       │                                         ┌──────┴───────┐
       │                                         │  Service     │
       │                                         │  (ej.        │
       │                                         │  Jornada)    │
       │                                         └──────┬───────┘
       │                                                │
       │                                         ┌──────┴───────┐
       │                                         │  Respuesta   │
       │                                         │  ApiResponse │
       │                                         └──────────────┘
```

### 4.4 Verificación de Rol Propietario

```
Controller → AccesoService.VerificarPropietarioAsync(negocioId, usuarioId)
                │
                ▼
        ┌─────────────────┐
        │ ObtenerRolAsync │
        │  (tabla UN)     │
        └────────┬────────┘
                 │
        ┌────────┴────────┐
        │   Rol == "propietario" ?
        └────────┬────────┘
            Sí /   \ No
             │       │
             ▼       ▼
      Continuar   UnauthorizedAccessException
                   → 401 → Frontend logout → /login
```

---

## 5. Manejo de Errores y Expiración

### Escenarios de error y su comportamiento:

| Escenario | Backend | Frontend |
|-----------|---------|----------|
| Token expirado o inválido | JwtBearer devuelve 401 con mensaje JSON | Interceptor 401 limpia localStorage y redirige a `/login` |
| Usuario no tiene acceso al negocio | `AccesoService` lanza `UnauthorizedAccessException` → 401 | Toast de error y/o redirección según implementación del componente |
| Usuario es operador intentando acción de propietario | `VerificarPropietarioAsync` lanza 401 | Mismo manejo que arriba; la UI debería ocultar esos botones preventivamente |
| Credenciales incorrectas en login | `UnauthorizedAccessException` → 401 | Mensaje de error en el formulario |
| Correo duplicado en registro | `InvalidOperationException` → 400 | Mensaje de error en el formulario |
| Error inesperado del servidor | `ExcepcionMiddleware` → 500 con mensaje genérico | Toast de error genérico |

---

## 6. Seguridad — Consideraciones Técnicas

1. **Contraseñas nunca se almacenan en texto plano:** Solo se guarda el hash BCrypt.
2. **BCrypt incluye salt automático:** Cada hash es único incluso para contraseñas iguales.
3. **Token firmado (HMAC-SHA256):** La integridad del token es verificable, pero el contenido (claims) es legible. No almacenar información sensible en los claims.
4. **ClockSkew = 0:** El token expira exactamente a la hora indicada, sin tolerancia. Esto reduce la ventana de ataque si un token es robado.
5. **Soft delete:** Los usuarios "eliminados" se marcan con `EliminadoEn`, pero sus registros históricos se preservan. Un usuario eliminado no puede autenticarse porque las consultas filtran `EliminadoEn == null`.
6. **CORS restringido:** Solo orígenes explícitamente configurados pueden llamar a la API, evitando ataques de sitios maliciosos.
7. **Autorización en el servidor:** Aunque el frontend oculte botones, todas las operaciones sensibles validan el rol en el backend. El frontend es solo una conveniencia, no una seguridad.

---

## 7. Resumen de Archivos

### Backend (C#)

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `Program.cs` | 208 | Configuración de autenticación JWT, autorización, CORS, Swagger e inyección de dependencias. |
| `Controllers/AuthController.cs` | 30 | Endpoints públicos de registro y login. |
| `Services/Implementations/AuthService.cs` | 77 | Lógica de registro, login, hashing BCrypt y construcción de respuesta. |
| `Services/Implementations/AccesoService.cs` | 38 | Verificación de acceso a negocios y validación de rol propietario. |
| `Services/Interfaces/IServices.cs` | 107 | Contratos `IAuthService` e `IAccesoService`. |
| `Helpers/JwtHelper.cs` | 37 | Generación de tokens JWT firmados con claims. |
| `Helpers/ContextoUsuario.cs` | 17 | Extracción de `usuarioId` desde claims del request. |
| `Models/DTOs/Auth/AuthDTOs.cs` | 46 | DTOs de entrada (`RegisterRequest`, `LoginRequest`) y salida (`AuthResponse`). |
| `Middleware/ExcepcionMiddleware.cs` | 52 | Manejo global de excepciones con mapeo a HTTP estándar. |

### Frontend (React)

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `api/client.js` | 30 | Instancia Axios con interceptores de token (request) y 401 (response). |
| `api/auth.js` | 6 | Métodos `login` y `registrar` que llaman a la API. |
| `context/AppContext.jsx` | 116 | Estado global de autenticación, persistencia en localStorage, manejo de sesión. |
| `components/layout/ProtectedRoute.jsx` | 7 | Protección de rutas privadas basada en `isAuth`. |

---

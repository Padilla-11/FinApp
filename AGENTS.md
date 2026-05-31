# AGENTS.md — FinApp / FINOP

## Project Overview

Full-stack financial analysis app for micro-businesses.
- **Frontend**: React 19 + Vite (`FinApp - Frontend/`)
- **Backend**: ASP.NET Core 10 Web API (`FinApp - Backend/FinApp - Backend/`)
- **Database**: PostgreSQL with EF Core (snake_case naming convention)
- **Solution**: `FinApp - Backend/FinApp - Backend.slnx`

## Build / Lint / Run Commands

### Frontend
```bash
cd "FinApp - Frontend"
npm install        # install dependencies
npm run dev        # start Vite dev server
npm run build      # production build
npm run lint       # ESLint (eslint .)
npm run preview    # preview production build
```

### Backend
```bash
cd "FinApp - Backend"
dotnet build                  # build solution
dotnet run --project "FinApp - Backend/FinApp - Backend.csproj"
dotnet watch run --project "FinApp - Backend/FinApp - Backend.csproj"
dotnet format                 # format code
dotnet ef migrations add <Name> --project "FinApp - Backend/FinApp - Backend.csproj"
dotnet ef database update --project "FinApp - Backend/FinApp - Backend.csproj"
```

> **No test projects currently exist.** If adding tests:
> - Frontend: install `vitest` or `jest`, run with `npx vitest run` or `npx jest`.
> - Backend: add an xUnit/NUnit project and run `dotnet test` or `dotnet test --filter "FullyQualifiedName~ClassName"` for a single class.

## Code Style Guidelines

### Frontend (React / JSX / JS)
- **Imports**: React hooks first, then libraries, then absolute `api/`, `components/`, `context/`, `pages/`, `utils/` paths, then relative `../` paths.
- **Formatting**: 2-space indentation, single quotes, semicolons optional but be consistent.
- **Types**: No TypeScript. Use JSDoc sparingly. PropTypes are not used.
- **Naming**:
  - Components: `PascalCase` files and function names (`Dashboard.jsx`, `AppLayout.jsx`)
  - Hooks / utilities: `camelCase` (`useApp`, `fmt`, `fmtFecha`)
  - API objects: `camelCase` + `Api` suffix (`authApi`, `negociosApi`)
  - CSS classes: `kebab-case` with `fo-` prefix for custom app styles (`fo-kpi`, `badge-success`, `alert-danger`)
- **Components**: Prefer default exports for pages. Named exports okay for reusable UI primitives in `components/ui/`.
- **State**: Use `useState`, `useEffect`, `useContext`. Global state lives in `AppContext`.
- **API calls**: Always use the pre-configured `client` from `api/client.js` (adds JWT and handles 401). Wrap domain calls in objects exported from `api/{domain}.js`.
- **Error handling**: API errors surface via `err.response?.data`. Use `try/finally` for loading states. Toast with `react-hot-toast` for user feedback.
- **Async patterns**: `Promise.allSettled` preferred when firing independent requests.
- **Comments**: Use `// ── SECTION ──` dividers for major page sections.

### Backend (C# / .NET)
- **Imports**: System → Microsoft → Third-party → Project (`Finop.API.*`). Keep `using` blocks alphabetically within groups.
- **Formatting**: 4-space indentation.
- **Types**: Nullable reference types enabled (`<Nullable>enable</Nullable>`). Use `?` for nullable strings/objects.
- **Naming**:
  - Classes / interfaces: `PascalCase`
  - Interfaces: prefixed with `I` (`IAuthService`, `INegocioService`)
  - DTOs: suffixed with `Request` or `Response` (`RegisterRequest`, `NegocioResponse`)
  - Async methods: suffixed with `Async` (`RegistrarAsync`, `ObtenerPorIdAsync`)
  - Private fields: `_camelCase` with `readonly` where injected (`private readonly IAuthService _auth;`)
  - Database entities: `PascalCase` properties; EF Core maps to `snake_case` columns automatically via `.UseSnakeCaseNamingConvention()`.
- **Architecture**:
  - Controllers → thin, delegate to services.
  - Services → business logic, implement interfaces.
  - DTOs → grouped by domain under `Models/DTOs/{Domain}/`.
  - Entities → `Models/Entities/`.
- **API responses**: Always wrap in `ApiResponse<T>`:
  ```csharp
  return Ok(ApiResponse<AuthResponse>.Ok(resultado, "Mensaje."));
  return BadRequest(ApiResponse<object>.Fallo("Mensaje", errores));
  ```
- **Error handling**: Global `ExcepcionMiddleware` catches unhandled exceptions. Prefer throwing `UnauthorizedAccessException`, `KeyNotFoundException`, `InvalidOperationException`, or `ArgumentException` for specific HTTP mappings.
- **Auth**: `[ApiController]` + `[Route("api/...")]`. JWT via `Authorize` attribute. Service injection via constructor with target-typed `new()` or expression-bodied constructors.
- **CORS policy**: `FinopPolicy` configured in `Program.cs`.

## Project Conventions

- **Language**: Business logic, entities, DTOs, and UI labels are in **Spanish** (e.g., `Jornada`, `Movimiento`, `Cierre`, `Negocio`).
- **Currency**: COP Colombian peso. Use `fmt()` and `fmtK()` utilities on frontend.
- **Dates**: Backend uses `DateTimeOffset.UtcNow` where possible; frontend formats with `es-CO` locale.
- **Icons**: Use `@heroicons/react/20/solid` or `lucide-react`.
- **Environment variables**:
  - Frontend: `VITE_API_URL` (defaults to `http://localhost:5025`)
  - Backend: standard `appsettings.json` / `appsettings.Development.json`

## Rules / Instructions

There are no Cursor rules (`.cursorrules` / `.cursor/rules/`) or GitHub Copilot instructions (`.github/copilot-instructions.md`) in this repository.

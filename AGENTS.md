# GRIDXD — Contexto y Reglas del Proyecto

## Stack
| Capa | Tecnología | Despliegue |
|------|-----------|------------|
| Frontend | React 18 + Vite 7 + TypeScript 5.8 + Tailwind 3 | Vercel |
| Backend | Python 3.12 + FastAPI | Google Cloud Run |
| DB/Auth/Storage | Supabase (PostgreSQL + RLS) | Supabase Cloud |
| Pagos | Stripe (Checkout, Portal, Webhooks) | Edge Functions |
| AI | Gemini 1.5 Flash (style extraction + SVG gen) | vía API |
| Package Manager | Bun | — |

## Estructura
```
src/           → Frontend React (api/, components/, hooks/, lib/, pages/)
backend/       → Python FastAPI (main.py, auth_middleware.py, ...)
supabase/      → Edge Functions + Migraciones SQL
packages/      → Figma Plugin
.github/       → CI/CD (Vercel + Cloud Run)
```

## Reglas Estrictas

### Código
- **Nada de `any`** — tipar siempre con TypeScript, usar `zod` para validación de runtime
- **Nada de `console.log`** — usar `logger` de `@/lib/logger` (se purga en producción)
- **Errores estandarizados** — frontend usa `AppError` de `@/lib/errors`; backend usa `AppException`
- **No duplicar schemas** — los schemas Zod viven en `@/lib/api.ts`; el resto importa de ahí
- **Componentes shadcn** — no modificar directamente, extender con wrapper si hace falta
- **CSS** — usar Tailwind utility classes, no CSS modules ni archivos CSS sueltos
- **Imports** — usar alias `@/` para src, rutas relativas solo dentro del mismo módulo

### Git
- **Commits** en inglés, formato conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `perf:`, `docs:`
- **Branches** — `feature/<nombre>`, `fix/<nombre>`, `refactor/<nombre>`
- **Nunca** committear `.env`, `.env.local`, keys reales, `__pycache__/`, `node_modules/`
- **Antes de commit** ejecutar: `npm run lint && npm run typecheck && npm run test`

### APIs Externas
- **Stripe**: keys test vs live verificadas antes de deploy. Webhook signing secret obligatorio.
- **Gemini**: API key con rotación periódica. Health check reporta si está configurada.
- **Supabase**: JWT expira cada 1h. El frontend refresca automáticamente.
- **Cualquier token/key** documentar en `API.md` con fecha de expiración y plan asociado.

## Pipeline de Trabajo
```
1. git pull --rebase origin main
2. git checkout -b <tipo>/<descripcion>
3. npm run lint && npm run typecheck && npm run test   (verificar estado inicial)
4. Implementar cambios
5. npm run lint && npm run typecheck && npm run test   (verificar cambios)
6. git add -A && git commit -m "<tipo>: <descripcion>"
7. git push -u origin <branch>
8. Crear PR a main (GitHub)
9. Esperar CI checks → Merge → Auto-deploy
```

## Comandos
```bash
npm run dev          # Frontend en localhost:8080
npm run build        # Build producción
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm run test         # Vitest
cd backend && python main.py   # Backend local
```

## Registro de Sesiones
Al finalizar cada sesión de trabajo, agregar un entry aquí:

### [2026-05-24] Sesión inicial — Jordi
- **Objetivo:** Configurar repositorio, establecer base sólida del proyecto
- **Cambios:**
  - Renombrado proyecto de `vite_react_shadcn_ts` a `gridxd`
  - Creado `AGENTS.md` (contexto + reglas + workflow)
  - Creado `CONTRIBUTING.md` (pipeline detallado)
  - Creado `API.md` (contratos de APIs + lifetimes)
  - Creado `src/lib/errors.ts` (sistema de errores estandarizado)
  - Creado `backend/app_exceptions.py` (excepciones backend)
  - Mejorado health check con monitoreo de servicios externos
  - Eliminado `src/App.css` (dead code)
  - Eliminado `src/lib/schemas.ts` (duplicado, consolidado en api.ts)
  - Habilitado `strict: true` en tsconfig, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`
  - Actualizado `.gitignore` (__pycache__, *.pyc)
  - Agregado script `typecheck` a package.json
- **PRs:** Ninguno aún (cambios directos a main)
- **Próximos pasos:** Verificar que todo compila y los tests pasan

### [2026-05-24] Sesión de estandarización — opencode
- **Objetivo:** Establecer base sólida con reglas estrictas, error handling, monitoreo de APIs, organización de código
- **Cambios:**
  - `AGENTS.md` — creado con stack, reglas estrictas, pipeline de trabajo, registro de sesiones
  - `CONTRIBUTING.md` — pipeline detallado con pasos pre/post commit y debugging guide
  - `API.md` — contratos de endpoints, lifetimes de tokens/keys, planes y límites
  - `src/lib/errors.ts` — `AppError` class con códigos categorizados (`TOKEN_EXPIRED`, `RATE_LIMITED`, etc.) + `classifyApiError` + `handleApiError`
  - `backend/app_exceptions.py` — `AppException`, `UnauthorizedException`, `RateLimitException`, `ValidationException`, `InternalException`, `ServiceUnavailableException`
  - `backend/main.py` — health check mejorado con `services` status, logging estructurado JSON, global error handlers con `AppException`, reemplazados `HTTPException` por `AppException`
  - `backend/auth_middleware.py` — reemplazados `HTTPException` por `AppException`
  - `package.json` — renombrado a `gridxd`, version `2.0.0`, agregado script `typecheck`
  - `tsconfig.app.json` — habilitado `strict: true`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`
  - `.gitignore` — agregado `__pycache__/`, `*.pyc`, `*.pyo`, `.venv/`, `venv/`
  - Eliminado `src/App.css` (dead code, no importado en ningún lado)
  - Eliminado `src/lib/schemas.ts` (duplicado, consolidado en `api.ts`)
  - Reemplazados todos los `console.error()` por `logger.error()` en 7 archivos frontend
  - Eliminados todos los `any` types en frontend y edge functions
  - Instaladas dependencias faltantes: `vitest`, `jsdom`, `@testing-library/jest-dom`
- **Verificación:** `lint` 0 errors, `typecheck` 0 errors, `test` 1 pass / 1 pre-existing fail / 1 pre-existing env error
- **Next:** Arreglar tests pre-existentes, desplegar cambios a GitHub

### [2026-05-25] Auditoría y fixes — opencode
- **Objetivo:** Auditar el proyecto completo, eliminar valores hardcoded, dead code, duplicaciones, console.logs, y mejorar configuración
- **Cambios:**
  - **Hardcoded values → env vars:**
    - `Admin.tsx`: email admin (`VITE_ADMIN_EMAIL`) + Cloud Run URL (`VITE_CLOUD_RUN_URL`)
    - `Admin.tsx`: placeholder webhook secret reemplazado por `••••••••••••••••`
    - `Index.tsx`: Railway URL antigua → enlace relativo `/health`
    - `HistorySection.tsx`: project ID Supabase → `VITE_SUPABASE_PROJECT_ID`
    - `customer-portal/index.ts`: fallback origin `lovable.app` → `gridxd.vercel.app`
    - `stripe-webhook/index.ts`: Stripe product IDs → `STRIPE_PRODUCT_PROPLUS` env var
    - `check-subscription/index.ts`: hardcoded TIERS eliminado (lee de DB directo)
  - **Dead code eliminado (8 archivos, ~5MB):**
    - `src/hooks/use-mobile.tsx`, `src/components/SidebarIconGenerator.tsx`, `src/components/NavLink.tsx`
    - `src/assets/hero-logo.png`, `gridxd-logo.png`, `gridxd-logo-text.png`, `Blueprint_in_Bloom.mp4`
    - `public/placeholder.svg`
  - **CORS unificado:** creado `supabase/functions/_shared/cors.ts` + `_shared/supabase-admin.ts`
  - **Edge Functions limpias:** eliminados todos `console.log/error/warn` (18 llamadas), reemplazados por shared helpers
  - **print() → logger:** `style_extractor.py` (3 prints → logger)
  - **Theme conflict fix:** `Header.tsx` — eliminado `useState(isDark)` + `useEffect` que duplicaba el `ThemeToggle` de `next-themes`
  - **Auth polling optimizado:** `AuthContext.tsx` — de `setInterval(60s)` a `setInterval(5min) + visibilitychange` (sin llamadas en idle)
  - **Config:** `tsconfig.json` raíz alineado con `strict: true`; `index.html` TODOs stale eliminados, OG image local; `package.json` scripts `lint:fix`, `ci`, `clean` agregados
- **Verificación:** `lint` 0 errors, `typecheck` 0 errors, `test` 1 pass / 2 pre-existing fails
- **Archivos creados:** `_shared/cors.ts`, `_shared/supabase-admin.ts`
- **Archivos eliminados:** 8 dead code files
- **Próximos pasos:** Arreglar tests pre-existentes, integrar `src/lib/errors.ts` en componentes, hacer commit y push

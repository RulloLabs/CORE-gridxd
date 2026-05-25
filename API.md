# GRIDXD — API Contracts & Lifetimes

## Backend Endpoints (FastAPI — Cloud Run)

| Endpoint | Método | Auth | Input | Output |
|----------|--------|------|-------|--------|
| `/health` | GET | No | — | `{status, engine, style_ai, auth, version, services}` |
| `/extract-style` | POST | JWT | image (multipart) | `{style: VisualStyle}` |
| `/generate-icon` | POST | JWT | icon_name, dna (JSON), variant | `{svg: string}` |
| `/process-image` | POST | JWT | image + options | `{zipUrl, images[], visualStyle?}` |

### Schemas
Ver `src/lib/api.ts` → `VisualStyleSchema`, `ProcessedResultSchema`

## Supabase Edge Functions

| Function | Trigger | Auth | Propósito |
|----------|---------|------|-----------|
| `check-subscription` | HTTP GET | JWT | Devuelve plan y estado |
| `create-checkout` | HTTP POST | JWT | Crea sesión Stripe Checkout |
| `customer-portal` | HTTP GET | JWT | Portal de gestión Stripe |
| `stripe-webhook` | HTTP POST | Stripe-Signature | Procesa eventos de Stripe |

## Lifetime de Tokens y Keys

| Servicio | Key/Token | Lifetime | Renovación | Alerta si expira en |
|----------|-----------|----------|------------|-------------------|
| Supabase Auth | JWT de sesión | 1 hora | Automática (Supabase SDK) | — |
| Supabase Auth | Refresh token | 30 días | Automática (Supabase SDK) | 7 días |
| Gemini API | API Key | Indefinido (manual) | Rotación periódica manual | Health check reporta si no configurada |
| Stripe Test | Secret key | Indefinido | — | Verificar antes de deploy a prod |
| Stripe Live | Secret key | Indefinido | Rotar si se sospecha fuga | Health check reporta modo |
| Supabase Service Role | Service role key | Indefinido | Rotación desde dashboard | 30 días (recomendado) |

## Planes y Límites

| Plan | Precio | Usos/día | Backend AI | Batch | Variantes | ZIP múltiple |
|------|--------|----------|------------|-------|-----------|-------------|
| Free | Gratis | 3 | No (client-side) | No | 1 | No |
| Pro | €9/mes | 100 | Sí | Sí | 1 | No |
| Pro+ | €19/mes | Ilimitado | Sí | Sí | 3 | Sí |

## Migraciones DB
Ver `supabase/migrations/` — orden cronológico.

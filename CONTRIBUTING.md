# Contributing to GRIDXD

## Workflow

### 1. Before Starting
```bash
git checkout main
git pull --rebase origin main
git checkout -b <tipo>/<descripcion>
```

### 2. During Development
- Follow rules in `AGENTS.md`
- Run checks frequently:
  ```bash
  npm run lint
  npm run typecheck
  npm run test
  ```

### 3. Before Commit
```bash
npm run lint && npm run typecheck && npm run test
```
- Verify no `.env` or secrets are staged: `git status`
- Verify `.gitignore` covers any new generated files

### 4. Commit Convention
```
<tipo>: <descripción en inglés (imperativo)>

Tipos: feat, fix, refactor, chore, perf, docs, style, test
```

### 5. Push & PR
```bash
git add -A
git commit -m "feat: add icon batch processing"
git push -u origin <branch>
```
- Create PR on GitHub against `main`
- Wait for CI checks to pass
- Merge → auto-deploy

## Debugging

### Aislar errores rápidamente

| Síntoma | Dónde mirar primero |
|---------|-------------------|
| Backend devuelve 500 | `backend/main.py` — logs de la request |
| Frontend no carga | `src/App.tsx` — ErrorBoundary captura el error |
| Stripe no procesa | `supabase/functions/stripe-webhook/index.ts` |
| Auth falla | `src/contexts/AuthContext.tsx` + `src/api/authService.ts` |
| Token expirado | `src/api/api.ts:getAuthHeaders()` — JWT refresh automático |
| API externa caída | `GET /health` — reporta estado de Gemini, Supabase, Stripe |

### Health Check
```bash
curl http://localhost:8000/health
```
Devuelve estado del engine, AI, auth y versión.

## Code Review Checklist
- [ ] Sin `any` en TypeScript
- [ ] Sin `console.log` (usa `logger`)
- [ ] Errores usan `AppError` / `AppException`
- [ ] Schemas Zod consolidados en `@/lib/api.ts`
- [ ] Tests pasan
- [ ] Lint y typecheck pasan
- [ ] Variables de entorno no committeadas

# GRIDXD - Environment & Secrets Flow (Producción 2026)

Este documento centraliza el flujo de variables de entorno y secretos entre todas las plataformas que componen la infraestructura de GRIDXD. Su objetivo es evitar regresiones, problemas de sincronización de secretos y asegurar que la política de "Cero Claves en el Repositorio" se mantenga estricta.

## 🏗️ Arquitectura de Entornos

La aplicación utiliza tres plataformas clave, cada una con su propia responsabilidad y gestión de secretos:

1. **Vercel**: Frontend (React/Vite).
2. **Supabase**: Base de Datos, Autenticación y Edge Functions.
3. **Railway**: Backend especializado y Workers (IA, Procesamiento pesado de imágenes).

---

## 1. Vercel (Frontend)

El frontend necesita claves públicas para conectarse con los servicios externos.
**Importante**: Nunca colocar claves privadas (secretas) en el panel de Vercel para el frontend si empiezan por `VITE_`, ya que se inyectarán en el bundle público.

### Variables Requeridas (Panel de Vercel)

- `VITE_SUPABASE_URL`: URL del proyecto de Supabase.
- `VITE_SUPABASE_ANON_KEY`: Clave anónima pública de Supabase.
- `VITE_STRIPE_PUBLISHABLE_KEY`: Clave pública de Stripe (usada rara vez en frontend si usamos Checkout Sessions, pero útil para Elements).
- `VITE_RAILWAY_API_URL`: URL pública del servicio de Railway (usado para comprobar el health check y fallback).

---

## 2. Supabase (Database, Auth, Edge Functions)

Las Edge Functions actúan como el middleware principal para pagos y sincronización. Necesitan secretos del lado del servidor.

### Variables Requeridas (.env en Supabase)

Las Edge Functions leen los secretos configurados vía la CLI de Supabase (`supabase secrets set`).

- `STRIPE_SECRET_KEY`: Clave secreta de Stripe para crear sesiones y acceder al API (empieza por `sk_live_` o `sk_test_`).
- `STRIPE_WEBHOOK_SECRET`: Clave del endpoint del webhook de Stripe (empieza por `whsec_`) para verificar las firmas.
- `SUPABASE_URL`: Normalmente inyectada automáticamente por el entorno de Supabase.
- `SUPABASE_ANON_KEY`: Inyectada automáticamente por Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Clave maestra (NUNCA EXPORTARLA). Inyectada para que las edge functions puedan hacer bypass del RLS si es necesario.

### Configuración de Auth (Google)

En el panel de Supabase (Authentication -> Providers -> Google):

- **Client ID**: Obtenido desde Google Cloud Console.
- **Client Secret**: Obtenido desde Google Cloud Console.
- **Redirect URIs**:
  Asegurarse de incluir la URL exacta de producción:
  - `https://gridxd.com` (o el dominio exacto en Vercel)
  - `https://gridxd.com/` (con slash)

---

## 3. Google Cloud Run (Backend Workers / IA)
 
 Cloud Run gestiona el backend intensivo (FastAPI/Python) para la generación de vectores o procesamiento avanzado. Es una infraestructura *serverless* que escala a cero cuando no se usa.
 
 ### Variables Requeridas (Panel de Google Cloud Console / Secrets)
 
 - `SUPABASE_URL`: Para conectarse a la DB y Storage.
 - `SUPABASE_SERVICE_ROLE_KEY`: Para lecturas/escrituras administrativas y subida de assets.
 - `SUPABASE_JWT_SECRET`: Para validar los tokens de los usuarios.
 - `GEMINI_API_KEY`: Clave para la IA de Google.
 - `PORT`: El puerto de escucha (Cloud Run lo inyecta automáticamente, por defecto 8080).
 
 ---
 
 ## 🔄 Flujo de Sincronización en Despliegues
 
 1. **Github Actions (`.github/workflows/deploy.yml`)**:
    - Gestiona el despliegue automático del Frontend a Vercel.
    - Requiere los secretos: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
 
 2. **Github Actions (`.github/workflows/deploy-backend.yml`)**:
    - Gestiona el despliegue del Backend a Google Cloud Run.
    - Requiere los secretos: `GCP_PROJECT_ID`, `GCP_SA_KEY`, además de los secretos del backend listados arriba.
 
 3. **Webhooks de Stripe**:
   - El Webhook de Stripe en el panel de desarrollador debe apuntar a la URL de producción de la Edge Function: `https://[PROJECT_REF].supabase.co/functions/v1/stripe-webhook`.
   - Una vez configurado, el `whsec_...` generado debe subirse a Supabase mediante `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`.

3. **Prevención de Errores de Redirect (OAuth)**:
   - Los fallos en AuthModal (ahora resueltos) solían suceder porque el `redirectTo` contenía `localhost` en el código. Ahora se usa `window.location.origin` de forma dinámica.
   - Si se añade un nuevo dominio custom a Vercel, debe registrarse obligatoriamente en Supabase Auth -> URL Configuration -> Site URL & Additional Redirect URLs.

## 🔐 Check-list antes del Lanzamiento Final (Go-Live)

- [ ] Comprobar que Stripe está en modo **Live** y las claves empiezan por `sk_live_`.
- [ ] Verificar que el webhook de Stripe en producción apunta a la URL real de Supabase y el secreto coincide.
- [ ] Probar el registro con Google en producción (sin que lance "redirect_uri_mismatch").
- [ ] Comprobar que la URL de Cloud Run es correcta en el panel de Vercel (`VITE_GRIDXD_API_URL`).

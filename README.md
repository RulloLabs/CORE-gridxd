# ⚡ GridXD: Generador de Sistemas de Iconos con IA

GridXD es una plataforma SaaS premium diseñada para diseñadores de producto senior que necesitan extraer, generar y exportar sistemas de iconos profesionales a partir de mockups o conceptos usando Inteligencia Artificial.

## 🏗️ Arquitectura General

El proyecto se divide en dos entornos principales:

### 1. Frontend (GridXD Dashboard)

- **Framework:** React + Vite
- **Estilos:** Tailwind CSS (Modo Oscuro Premium, Glassmorphism)
- **Iconos:** Lucide-React
- **Gestión de Estado:** React Context (Auth, Suscripción)
- **Despliegue:** Vercel

### 2. Backend (GridXD Engine)

- **Núcleo:** Python (FastAPI) — **Stateless Architecture**
- **Procesamiento de Imagen:** OpenCV, rembg (Eliminación de fondo), ImageTracer
- **Modelos IA:** Gemini 1.5 Flash (Extracción de estilo y generación SVG)
- **Despliegue:** **Google Cloud Run (Serverless)**
- **Almacenamiento de Salida:** Supabase Storage (en lugar de disco local para escalabilidad total)

### 3. Infraestructura y Servicios

- **Auth y Base de Datos:** Supabase (PostgreSQL)
- **Pagos:** Stripe (Checkout, Portal de Cliente, Webhooks)
- **Almacenamiento:** Supabase Storage (Assets procesados)

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js 18+
- Cuenta de Supabase
- Cuenta de Stripe (Modo Test)
- API Key de Google AI (Gemini)

### Instalación Local

1. **Clonar el repositorio:**

   ```bash
   git clone <repo-url>
   cd gridxd-main
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno:**
   Crear un archivo `.env.local` con lo siguiente:

   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_PUBLISHABLE_KEY=tu_clave_anon_de_supabase
   VITE_GRIDXD_API_URL=http://localhost:8000
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. **Ejecutar el servidor de desarrollo:**

   ```bash
   npm run dev
   ```

## 🔐 Seguridad y Cumplimiento

- **Gestión de Claves:** Todas las claves sensibles deben almacenarse en `.env` y nunca subirse al repositorio.
- **RLS (Row Level Security):** Todas las tablas de la base de datos tienen políticas RLS estrictas que garantizan que los usuarios solo accedan a sus propios datos.
- **Webhooks de Stripe:** Se implementa verificación de firma de webhooks para prevenir suplantación.

## 🛳️ Despliegue

### Frontend (Vercel)

- Conectar tu repositorio de GitHub a Vercel.
- Configurar las variables de entorno en el panel de Vercel.
- La rama `main` se despliega automáticamente con cada push.

### Backend (Google Cloud Run)
 
 - Desplegar el servicio Python usando el `Dockerfile` incluido.
 - Se recomienda usar el workflow de GitHub Actions `.github/workflows/deploy-backend.yml` para automatizar el build a Artifact Registry y el despliegue a Cloud Run.
 - Asegurar que todas las variables de entorno (`GEMINI_API_KEY`, `SUPABASE_URL`, etc.) estén configuradas en los secretos de GitHub.

## 📂 Estructura del Proyecto

```text
gridxd-main/
├── public/                  # Assets estáticos
├── src/
│   ├── components/          # Componentes React (UI, Modales, Modos)
│   ├── contexts/            # Contextos (Auth, Suscripción)
│   ├── hooks/               # Hooks personalizados
│   ├── integrations/        # Configuración Supabase, tipos
│   ├── lib/                 # API client, utilidades
│   └── pages/               # Páginas principales
├── supabase/
│   └── functions/           # Edge Functions (webhooks, suscripciones)
├── backend/                 # Servicio Python (FastAPI + IA)
└── .env.local               # Variables de entorno (NO commitear)
```

## ✨ Funciones Estrella 2026

- **Style Extractor (Gemini Vision):** Análisis automático del ADN visual de cualquier mockup.
- **Generate Mode:** Generación de iconos SVG únicos que siguen estrictamente el estilo detectado.
- **Extract Mode:** Detección de activos con escalado a 2K y eliminación de fondo en lote.
- **Ecosistema Multi-plataforma:** Plugin para Figma y CLI para terminal integrados.

## 📋 Estado y Roadmap

Consulta [TODO.md](./TODO.md) para el estado actual del desarrollo y funcionalidades futuras.

---

> **Última actualización:** 29 de abril de 2026

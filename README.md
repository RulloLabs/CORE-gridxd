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

- **Núcleo:** Python (FastAPI)
- **Procesamiento de Imagen:** OpenCV, rembg (Eliminación de fondo), ImageTracer
- **Modelos IA:** Gemini 1.5 Flash (Extracción de estilo y generación SVG)
- **Despliegue:** Railway / Docker

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

### Backend (Railway)

- Desplegar el servicio Python usando el `Dockerfile` incluido.
- Asegurar que `STRIPE_WEBHOOK_SECRET` y `GEMINI_API_KEY` estén configuradas en las variables de Railway.

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

## 📋 Estado y Roadmap

Consulta [TODO.md](./TODO.md) para el estado actual del desarrollo y funcionalidades futuras.

---

> **Última actualización:** 28 de abril de 2026

# 🛡️ SEGURIDAD Y CONSIGNAS (CRÍTICO)
- **Cero Keys en Repo:** NUNCA subas claves API (.env) al repositorio. El archivo `.gitignore` debe blindar siempre `.env`, `.env.local` y similares. 
- **Validación de .gitignore:** Antes de cualquier commit/push, verificar que los archivos sensibles no estén siendo rastreados por Git.
- **Antigravity Rule:** Si detectas una clave real en un archivo de texto, enmascárala inmediatamente con un placeholder.

# 📝 GRIDXD: Tareas y Mejoras Pendientes (2026)

## 🚀 LANZAMIENTO INMEDIATO Y MONETIZACIÓN (HOY)
- [x] **App Pública (Vercel):** Frontend desplegado y linkeado.
- [x] **Backend (Railway):** API alojada en infraestructura escalable.
- [x] **Stripe Listo:** Configuración de checkout preparada para "medir si alguien paga".
- [x] **Figma Plugin (V1 MVP):** Empujando la UI para subir imágenes directo desde Figma.

## 🔥 NEXT LEVEL ROADMAP: "The System Generator" (Q3/Q4 2026)
*Product Vision: "Stop manually extracting icons from AI mockups. Get a complete UI icon pack from any image in seconds."*

### 1. Sistema Dual de Modos (UX/UI)
- [x] **Modo 1 - Extraer (Actual Core):** Detecta iconos de mockups y los empaqueta.
- [x] **Modo 2 - Generar (Evolución):** Entiende el estilo visual de un logo/imagen y genera un sistema de iconos coherente desde cero. **(Implementado v1.5: Inyección Manual + 24 Iconos Base)**.

### 2. Generación Estilizada (Backend IA)
- [x] **Style Extractor:** Integrado Gemini Vision en `/extract-style`. Muestra paleta, mood, stroke, corner radius y más en la UI (StyleCard).
- [x] **Generador Generativo (Gemini SVG Architect):** Conexión con el backend para crear iconos únicos en formato SVG que siguen estrictamente el ADN visual extraído.np
- [x] **Gestión de UI:** Menú lateral en el editor web para inyectar iconos faltantes en el pack (Home, User, Settings, etc.).

### 3. Core 
Icon Set (El Pack Estándar Profesional)
- [x] **Estandarización de Output:** Forzar estructura estricta en el ZIP final garantizando que parezca un producto pro. (Implementado: Estructura de carpetas y nombrado estándar).
- [x] **Brand Refresh:** Logo neón oficial desplegado en Header y Hero. (Sin fondo, premium setup).
- [x] **UI Cleanup:** Eliminada redundancia en configuración de ZIP y modernizados los iconos de la landing page.

### 4. Pack Styles & Personalización
- [x] **Selector de Estilos Globales:** Ofrecer 3 variaciones al exportar o generar: Outline, Filled, Duotone.
- [x] **Características PRO+:** Exportar las 3 variantes en un único ZIP (3 carpetas separadas).
- [x] **Selector de Pack Completo:** Opciones para generar 8, 24, 48 o 100 iconos base. (V1: 48)
- [x] **Modo Batch:** Procesar múltiples imágenes de manera simultánea (Bulk Extract).

### 5. Integración Externa
- [x] **Figma Plugin (V2):** Integración bidireccional (pull de frames, push de assets directos a Figma sin descargar ZIP).

### 6. Pruebas & Calidad (QA)
- [/] **Stripe E2E:** Testar flujo de pago en producción (compra test tarjeta 4242, verificación de webhooks y sincronización de base de datos/plan). [IDs de producto actualizados]

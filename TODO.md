# 📝 GRIDXD: Tareas y Mejoras Pendientes (2026)

## 🛠️ Prioridad Alta (Q2 2026)
- [x] **Vectorización (PNG to SVG):** Integrado mediante `imagetracerjs` para ofrecer descarga vectorial.
- [x] **Soporte de Alta Resolución (2K):** Implementado escalado a 2048px por defecto.
- [x] **Configuración VITE_GRIDXD_API_URL:** Backend desplegado en Railway, URL configurada en Vercel.
- [x] **Landing Page - Social Proof:** Sección de testimonios y casos de uso añadida.
- [x] **Modo "Diseño":** Toggle de fondo del canvas (Cuadrícula / Blanco / Negro / Transparente).
- [x] **Optimización de imágenes:** Compresión DEFLATE + escala 1024px opcional antes de generar el ZIP.

## 🚀 Mejoras de Producto
- [x] **Editor Web Integrado:** UI para que el usuario pueda borrar cuadros de detección erróneos o añadir nuevos manualmente.
- [x] **Historial de usuario:** Tabla en Supabase `processing_history` para guardar logs de archivos procesados y previsualizaciones.

## 🎨 Diseño y UX
- [x] **Ajuste Óptico Dinámico:** IA que sugiera el centrado óptico de los iconos detectados.

## 🔗 Ecosistema
- [ ] API Documentation (Swagger/OpenAPI) — FastAPI lo genera automáticamente en `/docs`.
- [ ] Prototipo de Plugin para Figma.
- [ ] CLI Tool para procesar carpetas locales.

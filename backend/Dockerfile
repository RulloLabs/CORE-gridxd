FROM python:3.12-slim-bookworm

# Evitar la creación de archivos .pyc y habilitar el buffer de logs inmediatamente
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Instalación de dependencias del sistema y limpieza de caché en un solo paso
# 'apt-get upgrade' es vital para corregir vulnerabilidades del sistema base
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Crear un usuario no-root por seguridad (Principio de menor privilegio)
RUN useradd -m -u 1000 gridxd && \
    chown -R gridxd:gridxd /app

# Primero copiamos solo requirements para aprovechar la caché de Docker
COPY --chown=gridxd:gridxd requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiamos el resto del código
COPY --chown=gridxd:gridxd . .

# Cambiar al usuario no-root
USER gridxd

# Railway asigna el puerto dinámicamente mediante $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]

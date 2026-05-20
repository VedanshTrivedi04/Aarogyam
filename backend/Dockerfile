### Frontend build stage
FROM node:20-alpine AS frontend-build
WORKDIR /frontend

# Copy only package manifest to leverage Docker cache
COPY ../frontend/package.json ./
RUN npm install

# Copy frontend source and build
COPY ../frontend/ ./

# Allow build-time overrides for Vite envs
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

RUN npm run build


### Python / Django runtime stage
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libpq-dev \
        curl \
        pkg-config \
        libcairo2-dev \
        libpango1.0-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip \
    && pip install -r /app/requirements.txt

# Copy app sources
COPY . /app

# Copy built frontend into Django STATIC_ROOT
COPY --from=frontend-build /frontend/dist /app/staticfiles

RUN chmod +x /app/docker/entrypoint.sh

EXPOSE 7860

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["sh", "-c", "gunicorn config.asgi:application -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:${PORT:-7860} --workers 4 --timeout 120"]

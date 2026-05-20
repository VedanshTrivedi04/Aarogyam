#!/bin/sh
set -e

echo "=== aarogyam backend startup starting ==="

# 1. Run migrations in production (only if RUN_MIGRATIONS is set to true)
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "Running database migrations..."
    python manage.py migrate --noinput
    echo "Seeding data..."
    python scripts/seed_all_data.py || echo "Seeding main data skipped or failed"
    python scripts/seed_permissions.py || echo "Seeding permissions skipped or failed"
fi

# 2. Collect static files for Whitenoise to serve
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Celery is configured in CELERY_TASK_ALWAYS_EAGER mode in production settings,
# which runs Celery tasks synchronously inside the Daphne web server.
# This prevents the container from running out of RAM (saves 250MB+).

# 3. Start Uvicorn ASGI Server (single worker, foreground)
echo "Starting Uvicorn ASGI server on port $PORT..."
exec uvicorn config.asgi:application --host 0.0.0.0 --port "$PORT" --workers 1 --log-level info

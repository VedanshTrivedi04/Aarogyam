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

# 3. Start Celery Worker in background
echo "Starting Celery worker..."
celery -A config worker -l info > /tmp/celery-worker.log 2>&1 &

# 4. Start Celery Beat in background
echo "Starting Celery beat..."
celery -A config beat -l info > /tmp/celery-beat.log 2>&1 &

# 5. Start Daphne Web Server (foreground, listening to the port Render gives us)
echo "Starting Daphne ASGI server on port $PORT..."
exec daphne -b 0.0.0.0 -p "$PORT" config.asgi:application

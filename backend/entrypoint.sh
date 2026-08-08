#!/bin/sh
set -e

# Only the backend server needs to run migrations before it starts — celery_worker
# and celery_beat use this same image with a different command (e.g. "celery"), and
# would otherwise race the backend to apply migrations concurrently on every deploy.
if [ "$1" = "uvicorn" ]; then
  echo "Running database migrations..."
  alembic upgrade head
fi

exec "$@"

#!/bin/sh
set -e

echo "Esperando a PostgreSQL..."
until python -c "import psycopg2; psycopg2.connect(
    dbname='$POSTGRES_DB',
    user='$POSTGRES_USER',
    password='$POSTGRES_PASSWORD',
    host='$POSTGRES_HOST',
    port='5432'
)" 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL listo."

python manage.py makemigrations --noinput
python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"

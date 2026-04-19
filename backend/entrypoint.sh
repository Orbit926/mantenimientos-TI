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

echo "Verificando superusuario..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser(
        username='admin',
        password='admin123',
        first_name='Administrador',
        last_name='Sistema',
        email='admin@chivas.mx',
        puesto='Administrador del Sistema',
    )
    print('✓ Superusuario admin/admin123 creado')
else:
    print(f'✓ Superusuario ya existe: {User.objects.filter(is_superuser=True).first().username}')
"

echo "Verificando checklist items..."
python manage.py shell -c "
from mantenimientos.models import ChecklistItem
if ChecklistItem.objects.count() == 0:
    items = [
        ('hardware','Verificar estado físico del equipo',1),
        ('hardware','Revisar conexiones de cables',2),
        ('hardware','Inspeccionar ventiladores y disipadores',3),
        ('hardware','Verificar integridad de puertos USB/HDMI',4),
        ('software','Actualizar sistema operativo',5),
        ('software','Actualizar antivirus y ejecutar escaneo',6),
        ('software','Verificar licencias de software',7),
        ('software','Limpiar archivos temporales',8),
        ('red','Verificar conectividad de red',9),
        ('red','Probar velocidad de conexión',10),
        ('red','Revisar configuración de firewall',11),
        ('seguridad','Verificar respaldos automáticos',12),
        ('seguridad','Revisar políticas de contraseñas',13),
        ('seguridad','Auditar accesos y permisos',14),
    ]
    ChecklistItem.objects.bulk_create([ChecklistItem(categoria=c,nombre=n,orden=o) for c,n,o in items])
    print(f'✓ {ChecklistItem.objects.count()} checklist items creados automáticamente')
else:
    print(f'✓ {ChecklistItem.objects.count()} checklist items ya existen')
"

exec "$@"

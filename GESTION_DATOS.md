# 📊 Guía de Gestión de Datos

Todas las formas de agregar, modificar y eliminar datos en el sistema.

---

## 🎯 Métodos Disponibles

### 1️⃣ Django Admin (Recomendado para edición rápida)

**Acceso:** http://localhost/admin  
**Credenciales:** `admin` / `admin123`

#### ✅ Ventajas:
- Interfaz visual completa
- Edición inline de relaciones
- Filtros y búsqueda avanzada
- Validación automática
- Acciones en lote (eliminar múltiples)

#### 📝 Cómo usar:

```bash
# 1. Abrir navegador
open http://localhost/admin

# 2. Login con admin/admin123

# 3. Navegar a la sección deseada:
#    - Equipos → Equipos
#    - Mantenimientos → Mantenimientos
#    - Mantenimientos → Items de Checklist
#    - Mantenimientos → Respuestas de Checklist
#    - Mantenimientos → Firmas
```

**Para editar datos incorrectos:**
1. Buscar el registro (usa filtros o búsqueda)
2. Click en el registro
3. Modificar campos
4. Guardar

**Para eliminar:**
1. Seleccionar checkbox de registros
2. En "Acción" → "Eliminar registros seleccionados"
3. Confirmar

---

### 2️⃣ Script de Seed (Resetear todo con datos frescos)

**Archivo:** `backend/seed_data.py`

#### 🔄 Resetear completamente la base de datos:

```bash
# Elimina TODOS los datos y crea nuevos
docker compose exec backend python seed_data.py
```

**⚠️ ADVERTENCIA:** Esto borra:
- Todos los equipos
- Todos los mantenimientos
- Todas las respuestas de checklist
- Todas las firmas
- Todos los items de checklist

Luego crea datos frescos desde cero.

#### ✏️ Personalizar datos del seed:

Editar `backend/seed_data.py` y modificar:

```python
# Línea 57-65: Ubicaciones
ubicaciones = [
    'Tu ubicación 1',
    'Tu ubicación 2',
    # ...
]

# Línea 67-76: Colaboradores
colaboradores = [
    ('Nombre Completo', 'email@chivas.mx', 'Puesto'),
    # ...
]

# Línea 78-105: Equipos (agregar/quitar)
equipos_data = [
    {'tipo': 'laptop', 'marca': 'Dell', 'modelo': 'Latitude 5430', 'serie': 'ABC123'},
    # ...
]

# Línea 188-197: Técnicos
tecnicos = [
    'Ing. Nombre Apellido',
    # ...
]
```

Después de editar, ejecutar:
```bash
docker compose exec backend python seed_data.py
```

---

### 3️⃣ Django Shell (Para scripts Python avanzados)

**Acceso:**
```bash
docker compose exec backend python manage.py shell
```

#### Ejemplos de uso:

**Agregar un equipo:**
```python
from equipos.models import Equipo
from datetime import date, timedelta

equipo = Equipo.objects.create(
    codigo_interno='CHV-LAP-9999',
    tipo_equipo='laptop',
    marca='Dell',
    modelo='Latitude 7430',
    numero_serie='SN123456',
    ubicacion='Oficinas Verde Valle - Piso 4',
    colaborador_nombre='Pedro López',
    colaborador_correo='pedro.lopez@chivas.mx',
    colaborador_puesto='Analista',
    fecha_proximo_mantenimiento=date.today() + timedelta(days=30)
)
print(f"✓ Equipo creado: {equipo.id}")
```

**Modificar equipos en lote:**
```python
from equipos.models import Equipo

# Cambiar ubicación de todos los laptops Dell
Equipo.objects.filter(
    tipo_equipo='laptop',
    marca='Dell'
).update(ubicacion='Nueva ubicación')

print(f"✓ Actualizados {Equipo.objects.filter(marca='Dell').count()} equipos")
```

**Eliminar equipos específicos:**
```python
from equipos.models import Equipo

# Eliminar por código
Equipo.objects.filter(codigo_interno='CHV-LAP-0001').delete()

# Eliminar todos los dados de baja
count, _ = Equipo.objects.filter(activo=False).delete()
print(f"✓ Eliminados {count} equipos de baja")
```

**Agregar mantenimiento:**
```python
from mantenimientos.models import Mantenimiento
from equipos.models import Equipo
from datetime import date

equipo = Equipo.objects.first()

mant = Mantenimiento.objects.create(
    equipo=equipo,
    departamento_area='Tecnología',
    responsable_area=equipo.colaborador_nombre,
    tecnico_nombre='Ing. Roberto Guzmán',
    fecha_ejecucion=date.today(),
    hora_inicio='09:00',
    hora_fin='11:00',
    actividades_realizadas='Mantenimiento preventivo completo',
    materiales_utilizados='Alcohol isopropílico, aire comprimido',
    estado_equipo_post='operativo',
    observaciones_tecnico='Equipo en óptimas condiciones',
    estatus='cerrado'
)
print(f"✓ Mantenimiento creado: {mant.id}")
```

**Ver estadísticas:**
```python
from equipos.models import Equipo
from mantenimientos.models import Mantenimiento

print(f"Equipos activos: {Equipo.objects.filter(activo=True).count()}")
print(f"Equipos de baja: {Equipo.objects.filter(activo=False).count()}")
print(f"Mantenimientos totales: {Mantenimiento.objects.count()}")
print(f"Mantenimientos abiertos: {Mantenimiento.objects.filter(estatus='abierto').count()}")
print(f"Mantenimientos cerrados: {Mantenimiento.objects.filter(estatus='cerrado').count()}")
```

**Salir del shell:**
```python
exit()
```

---

### 4️⃣ API REST (Desde código o Postman)

**Base URL:** http://localhost/api/

#### Endpoints disponibles:

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/equipos/` | Listar equipos |
| POST | `/api/equipos/` | Crear equipo |
| GET | `/api/equipos/{id}/` | Ver detalle |
| PUT/PATCH | `/api/equipos/{id}/` | Actualizar |
| DELETE | `/api/equipos/{id}/` | Eliminar |
| GET | `/api/mantenimientos/` | Listar mantenimientos |
| POST | `/api/mantenimientos/` | Crear mantenimiento |
| GET | `/api/mantenimientos/{id}/` | Ver detalle |
| PUT/PATCH | `/api/mantenimientos/{id}/` | Actualizar |
| DELETE | `/api/mantenimientos/{id}/` | Eliminar |

#### Ejemplos con curl:

**Crear equipo:**
```bash
curl -X POST http://localhost/api/equipos/ \
  -H "Content-Type: application/json" \
  -d '{
    "codigo_interno": "CHV-SRV-0050",
    "tipo_equipo": "servidor",
    "marca": "Dell",
    "modelo": "PowerEdge R750",
    "numero_serie": "SRV-2024-050",
    "ubicacion": "Datacenter Akron",
    "colaborador_nombre": "Admin TI",
    "colaborador_correo": "admin.ti@chivas.mx",
    "colaborador_puesto": "Administrador de Sistemas"
  }'
```

**Actualizar equipo:**
```bash
curl -X PATCH http://localhost/api/equipos/1/ \
  -H "Content-Type: application/json" \
  -d '{
    "ubicacion": "Nueva ubicación actualizada"
  }'
```

**Eliminar equipo:**
```bash
curl -X DELETE http://localhost/api/equipos/1/
```

**Listar con filtros:**
```bash
# Solo laptops activas
curl "http://localhost/api/equipos/?tipo_equipo=laptop&activo=true"

# Mantenimientos cerrados
curl "http://localhost/api/mantenimientos/?estatus=cerrado"
```

---

### 5️⃣ Frontend (Interfaz de usuario)

**Acceso:** http://localhost

#### Agregar datos:
- **Equipos:** Click en "Equipos" → "+ Nuevo equipo"
- **Mantenimientos:** Click en "Mantenimientos" → "+ Nuevo mantenimiento"

#### Editar datos:
- Navegar al detalle del registro
- Click en botón "Editar"
- Modificar campos
- Guardar

#### Eliminar datos:
- **Equipos:** En detalle → "Dar de baja" (no elimina, solo marca como inactivo)
- **Mantenimientos:** No hay opción de eliminar desde UI (usar Admin o Shell)

---

### 6️⃣ SQL Directo (Avanzado)

**⚠️ Solo para usuarios avanzados**

```bash
# Conectar a PostgreSQL
docker compose exec db psql -U chivas_user -d chivas_mantenimientos

# Ver tablas
\dt

# Consultar equipos
SELECT id, codigo_interno, marca, modelo, activo FROM equipos_equipo LIMIT 10;

# Actualizar
UPDATE equipos_equipo SET ubicacion = 'Nueva ubicación' WHERE id = 1;

# Eliminar
DELETE FROM equipos_equipo WHERE id = 1;

# Salir
\q
```

---

## 🎯 Casos de Uso Comunes

### Caso 1: Corregir datos de un equipo específico

**Opción más rápida:** Django Admin
1. http://localhost/admin
2. Equipos → Buscar por código
3. Editar → Guardar

### Caso 2: Eliminar todos los datos y empezar de cero

```bash
docker compose exec backend python seed_data.py
```

### Caso 3: Agregar 10 equipos nuevos rápidamente

**Opción 1:** Django Admin (uno por uno)  
**Opción 2:** Editar `seed_data.py` y agregar a `equipos_data`  
**Opción 3:** Django Shell con loop:

```python
from equipos.models import Equipo

for i in range(10):
    Equipo.objects.create(
        codigo_interno=f'CHV-NEW-{i+1:04d}',
        tipo_equipo='laptop',
        marca='HP',
        modelo=f'EliteBook {8400+i}',
        numero_serie=f'HP-{i+1:04d}',
        ubicacion='Oficina Central',
        colaborador_nombre=f'Usuario {i+1}',
        colaborador_correo=f'usuario{i+1}@chivas.mx',
        colaborador_puesto='Empleado'
    )
print("✓ 10 equipos creados")
```

### Caso 4: Cambiar todos los técnicos de "Roberto" a "Fernando"

**Django Shell:**
```python
from mantenimientos.models import Mantenimiento

count = Mantenimiento.objects.filter(
    tecnico_nombre__icontains='Roberto'
).update(tecnico_nombre='Ing. Fernando Castillo Pérez')

print(f"✓ Actualizados {count} mantenimientos")
```

### Caso 5: Eliminar mantenimientos de prueba

**Django Shell:**
```python
from mantenimientos.models import Mantenimiento

# Eliminar mantenimientos abiertos
Mantenimiento.objects.filter(estatus='abierto').delete()

# O eliminar por fecha
from datetime import date
Mantenimiento.objects.filter(fecha_ejecucion__lt=date(2025, 1, 1)).delete()
```

---

## 📌 Recomendaciones

1. **Para ediciones rápidas:** Usa Django Admin
2. **Para resetear todo:** Ejecuta `seed_data.py`
3. **Para operaciones en lote:** Usa Django Shell
4. **Para desarrollo/testing:** Usa la API REST
5. **Para usuarios finales:** Usa el Frontend

---

## 🆘 Troubleshooting

**Error: "relation does not exist"**
```bash
# Correr migraciones
docker compose exec backend python manage.py migrate
```

**Error: "UNIQUE constraint failed"**
- Estás intentando crear un registro con código_interno duplicado
- Cambia el código o elimina el registro existente primero

**No veo cambios en el frontend**
```bash
# Limpiar cache del navegador o abrir en incógnito
# O reconstruir frontend
docker compose up --build frontend
```

**Quiero volver a estado inicial**
```bash
# Eliminar volumen de base de datos
docker compose down -v
docker compose up -d db backend
docker compose exec backend python manage.py migrate
docker compose exec backend python seed_data.py
```

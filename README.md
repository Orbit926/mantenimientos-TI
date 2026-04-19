# Sistema de Gestión de Mantenimiento de Equipos TI - Chivas

Sistema web completo para la administración y seguimiento de mantenimientos de equipos de tecnología.

## 🚀 Stack Tecnológico

### Backend
- **Django 5.2** + Django REST Framework
- **PostgreSQL 16** como base de datos
- **JWT** (Simple JWT) para autenticación
- **xhtml2pdf** para generación de PDFs
- **Ollama** (gemma4:e4b) para chatbot IA con tool-calling y visión
- **Docker** para containerización

### Frontend
- **React 19** con Vite 8
- **Material UI v9** para componentes
- **React Router 7** para navegación
- **Axios** para consumo de API
- **Recharts** para gráficas y analytics
- **react-signature-canvas** para firmas digitales
- **react-markdown** para renderizado de respuestas del chatbot

## 📦 Inicio Rápido

### 1. Clonar y configurar

```bash
# Clonar el repositorio
git clone <repo-url>
cd mantenimientos

# Crear archivo .env desde el ejemplo
cp .env.example .env

# (Opcional) Editar .env y cambiar DJANGO_SECRET_KEY
```

### 2. Levantar con Docker Compose

```bash
# Build y start de todos los servicios
docker compose up --build

# El entrypoint automáticamente:
# - Espera a PostgreSQL
# - Corre migraciones
# - Ejecuta collectstatic
```

### 3. Cargar datos de prueba

```bash
# Poblar la base de datos con datos realistas
docker compose exec backend python seed_data.py

# Crear superusuario para Django Admin
docker compose exec backend python manage.py createsuperuser
```

**Superusuario de prueba ya creado:**
- Usuario: `admin`
- Password: `admin123`

## 🌐 Acceso a la Aplicación

| Servicio | URL | Descripción |
|---|---|---|
| **Frontend** | http://localhost | App React (producción via nginx) |
| **Backend API** | http://localhost/api/ | Django REST API |
| **Django Admin** | http://localhost/admin/ | Panel administrativo |
| **Backend directo** | http://localhost:8000 | Django dev server (solo desarrollo) |
| **Ollama** | http://localhost:11434 | Servidor LLM (debe correr en el host) |

## 📊 Datos de Prueba Incluidos

El script `seed_data.py` genera:

- **26 equipos** (laptops, desktops, servidores, impresoras, switches, routers, monitores, tablets)
  - 23 activos
  - 3 dados de baja
- **40 mantenimientos** distribuidos en los últimos 12 meses
  - 38 cerrados
  - 2 abiertos
- **14 items de checklist** categorizados (hardware, software, red, seguridad)
- **250 respuestas de checklist** con observaciones
- **40 firmas** (técnico + usuario por cada mantenimiento cerrado)

Ubicaciones realistas:
- Oficinas Verde Valle
- Estadio Akron
- Centro de Alto Rendimiento
- Tienda oficial
- Academia Chivas

## 🛠️ Desarrollo Local

### Frontend con hot reload

```bash
# Terminal 1 - Solo backend y DB
docker compose up db backend

# Terminal 2 - Vite dev server
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Backend - comandos útiles

```bash
# Crear migraciones
docker compose exec backend python manage.py makemigrations

# Aplicar migraciones
docker compose exec backend python manage.py migrate

# Shell de Django
docker compose exec backend python manage.py shell

# Logs en tiempo real
docker compose logs -f backend
```

## 📁 Estructura del Proyecto

```
mantenimientos/
├── backend/
│   ├── config/              # Settings, URLs principales
│   ├── equipos/             # App de equipos
│   ├── mantenimientos/      # App de mantenimientos
│   ├── dashboard/           # App de métricas y analytics
│   ├── usuarios/            # App de autenticación (JWT) y técnicos
│   ├── chat/                # Chatbot IA (Ollama + tool-calling)
│   │   ├── tools/           # Registry, executor y tools de negocio
│   │   ├── orchestrator.py  # Loop de orquestación agente
│   │   └── ollama_client.py # Cliente HTTP para Ollama
│   ├── templates/pdf/       # Template HTML para PDFs
│   ├── seed_data.py         # Script de datos de prueba
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # Cliente Axios + servicios de chat
│   │   ├── components/      # Componentes reutilizables + ChatWidget
│   │   ├── layouts/         # Layout principal + sidebar
│   │   ├── pages/           # Páginas de la app
│   │   ├── routes/          # Configuración de rutas
│   │   ├── services/        # Servicios de API por módulo
│   │   ├── utils/           # Constantes y formatters
│   │   └── theme.js         # Tema MUI personalizado
│   ├── nginx.conf           # Config nginx con proxy a backend
│   └── package.json
├── docker-compose.yml
├── CHATBOT_DOCS.md          # Documentación detallada del chatbot
└── .env.example
```

## 🎯 Funcionalidades Principales

### Gestión de Equipos
- ✅ Registro de equipos con código interno único
- ✅ Clasificación por tipo (laptop, desktop, servidor, etc.)
- ✅ Asignación a colaboradores
- ✅ Control de fechas de mantenimiento
- ✅ Proceso de baja con motivo y fecha

### Mantenimientos
- ✅ Creación de órdenes de mantenimiento
- ✅ Checklist personalizable por categorías
- ✅ Registro de actividades y materiales
- ✅ Captura de firmas digitales (técnico + usuario)
- ✅ Generación automática de PDF
- ✅ Estados: borrador → pendiente firma técnico → pendiente firma usuario → completado

### Dashboard
- ✅ Métricas clave (equipos activos, mantenimientos, próximos, vencidos)
- ✅ Tabla de próximos mantenimientos
- ✅ Historial de mantenimientos recientes

### Analytics
- ✅ Gráficas de mantenimientos por mes
- ✅ Distribución por técnico y estatus
- ✅ Métricas de riesgo

### Chatbot IA
- ✅ Asistente conversacional con Ollama (gemma4:e4b)
- ✅ Tool-calling automático para consultar datos en tiempo real
- ✅ 16 herramientas de negocio (búsqueda, estadísticas, programación)
- ✅ Análisis de imágenes (modelo multimodal)
- ✅ Historial de conversación en sesión
- ✅ Documentación completa en `CHATBOT_DOCS.md`

### Gestión de Técnicos
- ✅ Alta, edición y listado de técnicos
- ✅ Asignación a mantenimientos
- ✅ Vista de carga de trabajo

### Reportes
- ✅ Historial con filtros avanzados
- ✅ Próximos mantenimientos con alertas visuales
- ✅ Exportación a PDF de cada mantenimiento

## 🔐 Seguridad

- Autenticación JWT (access + refresh tokens)
- Variables de entorno para secretos (`.env` no versionado)
- CORS configurado para desarrollo
- Django Secret Key rotable
- PostgreSQL con credenciales configurables

## � API Endpoints

Todos bajo el prefijo `/api/`.

| Módulo | Endpoint | Método | Descripción |
|---|---|---|---|
| **Auth** | `/api/auth/login/` | POST | Login → access + refresh tokens |
| | `/api/auth/refresh/` | POST | Renovar access token |
| | `/api/auth/logout/` | POST | Invalidar refresh token |
| | `/api/auth/me/` | GET | Usuario autenticado |
| | `/api/auth/register/` | POST | Registrar nuevo usuario |
| **Equipos** | `/api/equipos/` | GET/POST | CRUD de equipos (ViewSet) |
| | `/api/equipos/{id}/` | GET/PUT/PATCH/DELETE | Detalle de equipo |
| **Mantenimientos** | `/api/mantenimientos/` | GET/POST | CRUD de mantenimientos (ViewSet) |
| | `/api/mantenimientos/{id}/` | GET/PUT/PATCH/DELETE | Detalle de mantenimiento |
| | `/api/checklist-items/` | GET/POST | Items de checklist |
| **Técnicos** | `/api/tecnicos/` | GET/POST | CRUD de técnicos (ViewSet) |
| **Dashboard** | `/api/dashboard/resumen/` | GET | Métricas principales |
| | `/api/dashboard/proximos-mantenimientos/` | GET | Próximos mantenimientos |
| | `/api/dashboard/mantenimientos-realizados/` | GET | Mantenimientos recientes |
| | `/api/analytics/` | GET | Datos para gráficas |
| **Chatbot** | `/api/chat/` | POST | Conversación de texto |
| | `/api/chat/imagen/` | POST | Análisis de imagen (multipart) |

## �📝 Notas de Producción

Para despliegue en producción:

1. Cambiar `DJANGO_DEBUG=False` en `.env`
2. Configurar `DJANGO_ALLOWED_HOSTS` con dominio real
3. Usar secretos seguros (no los del `.env.example`)
4. Configurar volumen persistente para `media/` (firmas y PDFs)
5. Usar nginx con SSL/TLS
6. Configurar backup automático de PostgreSQL
7. Asegurar que Ollama esté accesible (`OLLAMA_URL`) y el modelo descargado

## 📞 Soporte

Para dudas o problemas:
- Revisar logs: `docker compose logs -f`
- Verificar estado: `docker compose ps`
- Reiniciar servicios: `docker compose restart`
- Documentación del chatbot: `CHATBOT_DOCS.md`

---

**Desarrollado para Club Deportivo Guadalajara** 🔴⚪

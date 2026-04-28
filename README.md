# Sistema de Gestión de Mantenimiento de Equipos TI - Chivas

Sistema web completo para la administración y seguimiento de mantenimientos de equipos de tecnología.

## 🚀 Stack Tecnológico

### Infraestructura / Docker

| Software | Versión | Rol |
|---|---|---|
| Docker Compose | v2 | Orquestación de servicios |
| Python | 3.12 (slim-bookworm) | Imagen base del backend |
| Node.js | 24 (bookworm-slim) | Build del frontend |
| Nginx | 1.29.8 | Servidor web / reverse proxy |
| PostgreSQL | 16.13 (bookworm) | Base de datos |

### Backend (Python)

| Paquete | Versión | Rol |
|---|---|---|
| Django | 5.2 | Framework web |
| Django REST Framework | 3.16.0 | API REST |
| djangorestframework-simplejwt | 5.5.0 | Autenticación JWT |
| psycopg2-binary | 2.9.9 | Driver PostgreSQL |
| django-cors-headers | 4.7.0 | CORS |
| xhtml2pdf | 0.2.17 | Generación de PDFs |
| Pillow | 11.2.1 | Procesamiento de imágenes (firmas, evidencias) |
| Gunicorn | 23.0.0 | Servidor WSGI de producción |

### Frontend (Node)

| Paquete | Versión | Rol |
|---|---|---|
| React | ^19.2.4 | UI framework |
| React DOM | ^19.2.4 | Renderizado DOM |
| Vite | ^8.0.4 | Bundler / dev server |
| @mui/material | ^9.0.0 | Componentes UI |
| @mui/icons-material | ^9.0.0 | Iconografía |
| @emotion/react | ^11.14.0 | CSS-in-JS (requerido por MUI) |
| @emotion/styled | ^11.14.1 | CSS-in-JS (requerido por MUI) |
| Axios | ^1.14.0 | Cliente HTTP |
| React Router DOM | ^7.14.0 | Navegación / rutas |
| Recharts | ^2.15.3 | Gráficas y analytics |
| react-signature-canvas | ^1.1.0-alpha.2 | Firmas digitales |
| react-markdown | ^10.1.0 | Renderizado Markdown (chatbot) |

### Servicios Externos

| Software | Versión | Rol |
|---|---|---|
| Ollama | (host) + gemma4:e4b | Chatbot IA con tool-calling y visión |

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
# - Inicia Gunicorn
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
| **Frontend** | http://localhost:8081 | App React (producción via nginx) |
| **Backend API** | http://localhost:8081/api/ | Django REST API (proxy via nginx) |
| **Django Admin** | http://localhost:8081/admin/ | Panel administrativo |
| **Ollama** | http://localhost:11434 | Servidor LLM (debe correr en el host) |

> **Nota:** El frontend se expone en el puerto **8081** para evitar conflictos con servicios existentes en el puerto 80. Puedes cambiarlo en `docker-compose.yml`.

## 📊 Datos de Prueba Incluidos

El script `seed_data.py` genera:

- **26 equipos** (laptops, desktops, servidores, impresoras, switches, routers, monitores, etc.)
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
│   ├── equipos/             # App de equipos (CRUD, CSV import/export, baja)
│   ├── mantenimientos/      # App de mantenimientos (CRUD, PDF, CSV export, firmas, checklist, evidencias)
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
- ✅ Clasificación por tipo (laptop, desktop, servidor, impresora, switch, router, access point, UPS, monitor, otro)
- ✅ Asignación a colaboradores
- ✅ Control de fechas de mantenimiento
- ✅ Proceso de baja con motivo y fecha
- ✅ Importación masiva desde CSV
- ✅ Exportación a CSV con filtros

### Mantenimientos
- ✅ Creación de órdenes de mantenimiento (se guarda automáticamente como borrador)
- ✅ Tipo de mantenimiento: preventivo, correctivo, diagnóstico u otro
- ✅ Checklist técnico personalizable por categorías
- ✅ Catálogos de actividades y materiales (selección por checkbox)
- ✅ Captura de firmas digitales (técnico + usuario) con declaración de conformidad
- ✅ Subida de evidencias fotográficas (antes, durante, después)
- ✅ Generación automática de PDF (borrador con marca de agua, final sin ella)
- ✅ Vista previa del PDF antes de completar el mantenimiento
- ✅ Exportación a CSV con filtros (estatus, técnico, tipo, rango de fechas)
- ✅ Filtros avanzados en listado: estatus, técnico, tipo de mantenimiento, rango de fechas
- ✅ Chips de color por tipo de mantenimiento y estado del equipo

### Dashboard
- ✅ Métricas clave (equipos activos, mantenimientos, próximos, vencidos)
- ✅ Tabla de próximos mantenimientos
- ✅ Historial de mantenimientos recientes

### Próximos Mantenimientos
- ✅ Vista de calendario con alcance de hasta 2 años
- ✅ Alertas visuales para mantenimientos próximos y vencidos

### Analytics
- ✅ Gráficas de mantenimientos por mes
- ✅ Distribución por técnico y estatus
- ✅ Métricas de riesgo
- ✅ Filtros por rango de fechas

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

## 🔐 Seguridad

- Autenticación JWT (access + refresh tokens)
- Variables de entorno para secretos (`.env` no versionado)
- CORS configurado para desarrollo
- Django Secret Key rotable
- PostgreSQL con credenciales configurables
- Detección de navegador no-Chromium con banner informativo

## 🔗 API Endpoints

Todos bajo el prefijo `/api/`.

| Módulo | Endpoint | Método | Descripción |
|---|---|---|---|
| **Auth** | `/api/auth/login/` | POST | Login → access + refresh tokens |
| | `/api/auth/refresh/` | POST | Renovar access token |
| | `/api/auth/logout/` | POST | Invalidar refresh token |
| | `/api/auth/me/` | GET | Usuario autenticado |
| | `/api/auth/register/` | POST | Registrar nuevo usuario |
| **Equipos** | `/api/equipos/` | GET/POST | Listado y creación de equipos |
| | `/api/equipos/{id}/` | GET/PATCH | Detalle y edición de equipo |
| | `/api/equipos/{id}/baja/` | POST | Dar de baja un equipo |
| | `/api/equipos/{id}/mantenimientos/` | GET | Mantenimientos de un equipo |
| | `/api/equipos/exportar-csv/` | GET | Exportar equipos a CSV |
| | `/api/equipos/importar-csv/` | POST | Importar equipos desde CSV (multipart) |
| **Mantenimientos** | `/api/mantenimientos/` | GET/POST | Listado y creación (filtros: `estatus`, `tecnico`, `tipo_mantenimiento`, `equipo`, `desde`, `hasta`) |
| | `/api/mantenimientos/{id}/` | GET/PATCH | Detalle y edición |
| | `/api/mantenimientos/{id}/cerrar/` | POST | Completar mantenimiento (valida datos, firmas, genera PDF final) |
| | `/api/mantenimientos/{id}/generar-pdf/` | POST | Generar/regenerar PDF |
| | `/api/mantenimientos/{id}/pdf/` | GET | Obtener URL del PDF |
| | `/api/mantenimientos/{id}/checklist/` | GET/POST | Respuestas del checklist técnico |
| | `/api/mantenimientos/{id}/firmas/` | GET/POST | Firmas (técnico y usuario) |
| | `/api/mantenimientos/{id}/evidencias/` | GET/POST | Evidencias fotográficas |
| | `/api/mantenimientos/{id}/evidencias/{eid}/` | DELETE | Eliminar evidencia |
| | `/api/mantenimientos/exportar-csv/` | GET | Exportar mantenimientos a CSV |
| | `/api/checklist-items/` | GET | Items de checklist activos |
| | `/api/actividades-catalogo/` | GET | Catálogo de actividades |
| | `/api/materiales-catalogo/` | GET | Catálogo de materiales |
| **Técnicos** | `/api/tecnicos/` | GET/POST | CRUD de técnicos |
| **Dashboard** | `/api/dashboard/resumen/` | GET | Métricas principales |
| | `/api/dashboard/proximos-mantenimientos/` | GET | Próximos mantenimientos |
| | `/api/dashboard/mantenimientos-realizados/` | GET | Mantenimientos recientes |
| | `/api/analytics/` | GET | Datos para gráficas (filtros: `desde`, `hasta`) |
| **Chatbot** | `/api/chat/` | POST | Conversación de texto |
| | `/api/chat/imagen/` | POST | Análisis de imagen (multipart) |

## 📝 Notas de Producción

Para despliegue en producción:

1. Cambiar `DJANGO_DEBUG=False` en `.env`
2. Configurar `DJANGO_ALLOWED_HOSTS` con dominio real
3. Usar secretos seguros (no los del `.env.example`)
4. Configurar volumen persistente para `media/` (firmas, evidencias y PDFs)
5. Usar nginx con SSL/TLS
6. Configurar backup automático de PostgreSQL
7. Asegurar que Ollama esté accesible (`OLLAMA_URL`) y el modelo descargado
8. El puerto de exposición se configura en `docker-compose.yml` (por defecto `8081:80`)

## 📞 Soporte

Para dudas o problemas:
- Revisar logs: `docker compose logs -f`
- Verificar estado: `docker compose ps`
- Reiniciar servicios: `docker compose restart`
- Rebuild completo: `docker compose up --build`
- Documentación del chatbot: `CHATBOT_DOCS.md`

---

**Desarrollado para Club Deportivo Guadalajara** 🔴⚪

# Informe de Auditoría de Seguridad y Calidad

# Resumen General
- Este proyecto es un sistema de gestión de mantenimientos preventivos y correctivos.
- **Frontend**: Construido con **React (v19)** y **MBE (Material UI)**, utilizando **Vite** como herramienta de construcción.
- **Backend**: Basado en **Django (v5.2)** con **Django REST Framework**, utilizando **PostgreSQL** como base de datos relacional.
- **IA**: Integra capacidades de inteligencia artificial mediante **Ollama** para procesamiento de texto y visión (análisis de imágenes).
- **Infraestructura**: Completamente dockerizado utilizando **Docker Compose**, con servicios para la base de datos, el backend y el frontend (servido por Nginx).

# Vulnerabilidades de Seguridad
- **Credenciales de Superusuario Hardcodeadas (CRÍTICO)**: 
  - En `backend/entrypoint.sh`, el script crea automáticamente un superusuario con el usuario `admin` y la contraseña `admin123`. Esto permite que cualquier persona con acceso al contenedor o al proceso de despliegue pueda tomar control total del sistema.
- **Configuración Insegura de Django por Defecto (ALTO)**:
  - En `backend/config/settings.py`, el `SECRET_KEY` tiene un valor de respaldo (`django-inact-dev-key-change-in-production`) que es predecible.
  - `DEBUG` se establece en `True` por defecto si la variable de entorno no está presente, lo que expone información sensible (traza de errores, configuración) en caso de errores.
  - `CORS_ALLOW_API_ORIGINS` (vía `CORS_ALLOW_ALL_ORIGINS`) se activa automáticamente cuando `DEBUG=True`, permitiendo que cualquier dominio realice peticiones al backend.
  - `DJANGO_ALLOWED_HOSTS` tiene como valor por defecto `*`, lo que facilita ataques de *Host Header Injection*.
- **Cambio de Contraseña sin Verificación (MEDIO)**:
  - En `backend/usuarios/views.py`, el endpoint `cambiar_password` permite actualizar la contraseña sin solicitar la contraseña actual, lo que facilita ataques de secuestro de sesión si un atacante logra realizar una petición CSRF o si hay un fallo en la autenticación.
- **Riesgo de XSS (MEDIO)**:
  - El backend almacena grandes bloques de texto en `TextField` (ej. `actividades_realizadas`, `observaciones_tecnico`). Si el frontend renderiza este contenido utilizando propiedades que permitan HTML (como `dangerouslySetInnerHTML` en React o componentes de Markdown mal configurados) sin una sanitización adecuada, un atacante podría inyectar scripts maliciosos.

# Mejoras de Código
- **Uso de Servidor de Producción**: 
  - El `backend/Dockerfile` utiliza `python manage.py runserver` en su `CMD`. Este comando no está diseñado para producción, ya que no es eficiente para manejar múltiples peticiones concurrentes y es vulnerable a ataques de denigaicón de servicio. Se recomienda usar **Gunicorn** o **Uvicorn**.
- **Principio de Responsabilidad Única (SOLID)**:
  - El `backend/entrypoint.sh` está asumiendo demasiadas responsabilidades: esperar a la DB, ejecutar migraciones, crear datos semilla y crear usuarios. Sería mejor separar la inicialización de la base de datos de la lógica de negocio.
- **Tipado y Validación**:
  - En `backend/usuarios/views.py`, la validación de la longitud de la contraseña en `cambiar_password` es manual (`len(password) < 6`). Se debería delegar esto al validador de Django o al Serializer para mantener la consistencia.

# Dependencias Inseguras
- **Versiones de Software Experimentales/Futuras**:
  - El proyecto menciona `Django==5.2` y `node:24`. A la fecha actual, estas versiones podrían no ser estables o ser demasiado experimentales para un entorno de producción, lo que introduce riesgos de inestabilidad y falta de parches de seguridad.
- **Dependencias de Node.js**:
  - Se recomienda ejecutar `npm audit` regularmente en el directorio `frontend` para detectar vulnerabilidades en las librerías de MUI, Axios y React.

# Estilo de Codificación
- **Consistencia**: El proyecto sigue buenas prácticas en la separación de responsabilidades (Serializers, Views, Models).
- **Nomenclatura**: Se observa una buena nomenclatura en el backend (uso de `Tecnico`, `Equipo`, `Manteiminto`) y consistencia en el uso de `snake_case` para Python y `camelCase` para JavaScript.
- **Documentación**: El uso de docstrings en los modelos y views es adecuado, lo que facilita el mantenimiento.

# Recomendaciones para la Dockerización
- **Gestión de Secretos**:
  - Aunque se usa un `.env.example`, el archivo `backend/entrypoint.sh` contiene datos sensibles que no deberían estar en el código fuente. Las credenciales del superusuario deben ser inyectadas vía variables de entorno.
- **Seguridad de Contenedores**:
  - El volumen `backend:./backend:/app` en `docker-compose.yml` es excelente para desarrollo, pero en producción debe eliminarse para evitar que cambios en el host afecten la integridad del contenedor.
  - Se recomienda utilizar imágenes base más específicas y ligeras, y asegurar que el proceso de `build` no incluya herramientas de compilación (como `gcc`, `libpq-dev`) en la imagen final de ejecución (usar multi-stage builds para el backend también).
- **Redes**:
  - La red `app_network` está bien implementada para aislar los servicios, pero se debería asegurar que el puerto de la base de datos (5432) no esté expuesto al host, solo accesible dentro de la red de Docker.

# Recomendaciones Adicionales
- **Estrategia de Backup**: Dado que el sistema gestiona información crítica de activos, se debe implementar una política de backups automáticos para el volumen `postgres_data`.
- **Monitoreo y Logging**: Se recomienda integrar una solución de centralización de logs (como ELK Stack o Loki) para auditar las acciones de los técnicos en tiempo real.
- **Escalabilidad**: La arquitectura actual es monolítica. Si el número de equipos aumenta drásticamente, se debería considerar la separación del servicio de Chat (IA) en un microservicio independiente para no saturar los recursos del backend principal.
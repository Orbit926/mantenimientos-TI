# Documentación del Chatbot de Mantenimiento

Asistente IA integrado en el sistema de gestión de mantenimientos de Chivas. Usa un LLM local (Ollama) con **tool-calling** para consultar datos reales del sistema (equipos, mantenimientos, técnicos) y además permite analizar imágenes mediante un modelo multimodal.

---

## 1. Arquitectura general

Modelo de **orquestación por agente** con loop de tool-calling:

1. **Usuario** escribe en el `ChatWidget` del frontend.
2. **Frontend** (`frontend/src/api/chat.js`) hace `POST /api/chat/` con `{message, history}`.
3. **Backend** (`chat.views.ChatView`) delega en `chat.orchestrator.run()`.
4. **Orquestador** construye mensajes `[system, ...history, user]`, inyecta el catálogo de tools en el *system prompt* y llama a Ollama.
5. **Ollama** responde SIEMPRE con JSON:
   - `{"type": "tool_call", "tool": "...", "arguments": {...}}` → se ejecuta la tool y el resultado se inyecta como mensaje del usuario; se vuelve al paso 4.
   - `{"type": "final", "message": "..."}` → se devuelve al frontend.
6. Si no hay `final` antes de `MAX_ITERATIONS = 5`, se aborta con error controlado.

```
Usuario ──▶ ChatWidget ──▶ /api/chat/ ──▶ orchestrator ──▶ Ollama
                                            ▲     │
                                            │     ▼
                                          tool  (JSON)
                                         result   │
                                            │     ▼
                                          executor ◀── registry (tools)
```

---

## 2. Componentes del backend

| Archivo | Rol |
|---|---|
| `backend/chat/views.py` | DRF views: `ChatView` (texto) e `ImageChatView` (visión). |
| `backend/chat/urls.py` | Rutas `chat/` e `chat/imagen/` (montadas bajo `/api/`). |
| `backend/chat/orchestrator.py` | Loop de tool-calling, parsing robusto de JSON, control de iteraciones. |
| `backend/chat/ollama_client.py` | Único punto de contacto con la API de Ollama (`/api/chat` y `/api/generate`). |
| `backend/chat/tools/registry.py` | Decorador `@register` + catálogo en memoria. |
| `backend/chat/tools/executor.py` | Despacha la llamada al handler y captura excepciones. |
| `backend/chat/tools/inventory.py` | Implementación de todas las tools de negocio. |

### Orquestador (`orchestrator.py`)
- Construye el *system prompt* a partir de `tools_schema_for_prompt()` de forma que el modelo conozca las tools sin tenerlas hard-codeadas.
- Historial limitado a los últimos 10 turnos.
- `_extract_json()` tolera respuestas con texto alrededor o bloques ```` ```json ```` gracias a fallbacks regex.
- Si el modelo responde texto plano en la primera iteración, lo devuelve tal cual como fallback graceful.

### Cliente Ollama (`ollama_client.py`)
- `chat(messages)` → `POST {OLLAMA_URL}/api/chat` con `format: 'json'` y `temperature: 0.2` para maximizar tool-calling correcto.
- `describe_image(bytes, prompt)` → `POST {OLLAMA_URL}/api/generate` con imagen en base64. Requiere modelo multimodal.
- Errores controlados se encapsulan en `OllamaError`.

### Registry (`registry.py`)
```python
@register(
    name="buscar_equipos",
    description="...",
    parameters={"query": {"type": "string", "description": "...", "required": True}},
)
def buscar_equipos(arguments: dict) -> dict:
    ...
```
El registry expone:
- `all_tools()` — metadata sin handler.
- `tools_schema_for_prompt()` — texto inyectado en el system prompt.

---

## 3. Endpoints HTTP

### `POST /api/chat/`
Conversación de texto.

**Request:**
```json
{
  "message": "¿Qué equipos tienen mantenimiento vencido?",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```
**Response:** `{"reply": "..."}`
**Errores:** `400` (mensaje vacío), `502` (modelo confundido), `503` (Ollama caído), `500` (interno).

### `POST /api/chat/imagen/`
Análisis de imagen (multipart/form-data).

**Campos:**
- `image` (file, requerido) — JPEG/PNG/WEBP/GIF, máx **10 MB**.
- `prompt` (string, opcional) — instrucción adicional en español.

**Response:** `{"description": "..."}`
**Errores:** `400` (falta imagen), `413` (excede 10 MB), `415` (tipo no permitido), `503`, `500`.

---

## 4. Catálogo actual de tools

Todas están en `backend/chat/tools/inventory.py` y se importan automáticamente al cargar `orchestrator.py` (`import chat.tools.inventory`).

### Consultas de equipos
| Tool | Parámetros | Descripción |
|---|---|---|
| `buscar_equipos` | `query` (str, req), `campo` (str, opt: `codigo`/`serie`/`colaborador`/`marca_modelo`/`auto`) | Búsqueda unificada. Sustituye a las tools deprecadas por serie, código y usuario. |
| `obtener_detalle_equipo` | `equipo_id` (int, req) | Detalle + últimos 5 mantenimientos. |
| `obtener_historial_equipo` | `equipo_id` (int, req), `limite` (int, opt, máx 50) | Historial cronológico completo. |
| `obtener_equipos_por_estado` | `estado` (str, req: `ACTIVO`/`DISPONIBLE`/`BAJA`) | Listado por estado. Recomendado solo para ver inventario libre. |
| `obtener_equipos_sin_mantenimiento` | `dias` (int, opt, por defecto 90) | Equipos que nunca tuvieron mantenimiento o cuyo último fue hace más de N días. Distinto de mantenimientos vencidos. |
| `listar_colaboradores_con_equipo` | `busqueda` (str, opt) | Índice de colaboradores con al menos un equipo asignado. |

### Mantenimientos
| Tool | Parámetros | Descripción |
|---|---|---|
| `obtener_mantenimientos_vencidos` | — | Equipos con `fecha_proximo_mantenimiento` pasada. |
| `obtener_mantenimientos_proximos` | `dias` (int, opt, por defecto 30) | Equipos con mantenimiento programado en los próximos N días. |
| `buscar_mantenimiento` | `id` (int, req) | Detalle completo: técnico, actividades, checklist, riesgo, firma. |
| `listar_mantenimientos_recientes` | `dias` (int, opt, por defecto 7), `estatus` (str, opt) | Actividad reciente con filtro opcional de estatus. |
| `obtener_mantenimientos_pendientes_firma` | `tipo` (str, opt: `tecnico`/`usuario`/`ambos`) | Pendientes de firma. |
| `obtener_equipos_con_riesgo` | — | Mantenimientos que reportaron `riesgo_presentado=True`. |
| `estadisticas_mantenimientos` | `desde`, `hasta` (YYYY-MM-DD, opt) | Conteo total, por estatus, top técnicos, por mes. Por defecto últimos 90 días. |
| `programar_mantenimiento` | `equipo_id` (int, req), `fecha` (YYYY-MM-DD, req) | **Única tool de escritura.** Actualiza `fecha_proximo_mantenimiento` del equipo. No crea un mantenimiento. |

### Técnicos y resumen
| Tool | Parámetros | Descripción |
|---|---|---|
| `listar_tecnicos_activos` | — | Técnicos activos con conteo de carga. |
| `listar_mantenimientos_por_tecnico` | `tecnico` (str, req), `estatus` (str, opt) | Mantenimientos asignados a un técnico. |
| `obtener_carga_tecnico` | `tecnico` (str, req) | Detalle de UN técnico: pendientes, completados del mes, último mantenimiento, total histórico. |
| `obtener_resumen_general` | — | Dashboard ejecutivo para preguntas amplias. Primera tool sugerida. |

> **Estatus válidos:** `BORRADOR`, `PENDIENTE_FIRMA_TECNICO`, `PENDIENTE_FIRMA_USUARIO`, `COMPLETADO`.

---

## 5. Frontend

### `frontend/src/components/chat/ChatWidget.jsx`
Widget flotante persistente. Mantiene `messages` localmente, gestiona estado de carga, envía el historial al backend en cada turno.

### `frontend/src/api/chat.js`
Capa de red — usa el cliente axios común (`api/client.js`) y expone `sendMessage(message, history)` y la subida de imágenes.

---

## 6. Añadir una nueva tool

1. **Implementar el handler** en `backend/chat/tools/inventory.py` (o un archivo nuevo como `mitool.py`):
   ```python
   from .registry import register

   @register(
       name="nombre_tool",
       description="Qué hace (el modelo lo lee literalmente).",
       parameters={
           "param1": {"type": "string", "description": "...", "required": True},
           "param2": {"type": "integer", "description": "...", "required": False},
       },
   )
   def nombre_tool(arguments: dict) -> dict:
       # Validar args, consultar ORM, devolver dict serializable
       return {"ok": True, "data": ...}
   ```
2. **Garantizar que se importe al iniciar Django.** Si la creas en un archivo nuevo, añade la importación en `backend/chat/orchestrator.py`:
   ```python
   import chat.tools.inventory  # noqa: F401
   import chat.tools.mitool     # noqa: F401  ← nueva
   ```
3. **Buenas prácticas:**
   - Validar argumentos al inicio; devolver `{"error": "..."}` en vez de lanzar excepciones.
   - Retornar siempre JSON-serializable (usa `.isoformat()` para fechas).
   - Loggear con `logger.info("[Tool] nombre args=...")`.
   - Mantener descripciones cortas y distintivas — un modelo chico como `gemma4:e4b` se confunde con tools solapadas.

---

## 7. Configuración y despliegue

### Variables de entorno (`backend/config/settings.py`)
| Variable | Default | Descripción |
|---|---|---|
| `OLLAMA_URL` | `http://host.docker.internal:11434` | URL base del servidor Ollama. |
| `OLLAMA_MODEL` | `gemma4:e4b` | Modelo a usar. Debe soportar tool-calling y, para `/chat/imagen/`, visión. |

### Requisitos de Ollama
```bash
# Instalar y arrancar Ollama (host)
ollama serve

# Descargar el modelo configurado
ollama pull gemma4:e4b
```
El backend (en Docker) accede al host vía `host.docker.internal`. Si corres todo en local sin Docker, exporta `OLLAMA_URL=http://localhost:11434`.

---

## 8. Solución de problemas

| Síntoma | Causa probable | Qué revisar |
|---|---|---|
| `503` "No se pudo conectar con la IA" | Ollama no responde. | `curl $OLLAMA_URL/api/tags`. Verificar `OLLAMA_URL`. |
| `502` "respuesta que no pude interpretar" | Modelo no devuelve JSON válido. | Subir `temperature` ↓, revisar logs `[Orchestrator]`, confirmar que el modelo soporta `format: json`. |
| "no pudo completar la consulta en el tiempo permitido" | Loop de tool-calls sin converger (>5). | Tool mal descrita o parámetros ambiguos. Simplificar `description`. |
| Descripción de imagen vacía | Modelo no es multimodal. | Usar un modelo con visión (`llava`, `gemma3` multimodal, etc.). |
| Tool no aparece para el modelo | No se importó el módulo. | Añadir `import chat.tools.xxx` en `orchestrator.py`. |

### Logs relevantes
El logger `chat` está en `DEBUG` cuando `DEBUG=True`. Filtrar por prefijos:
- `[Ollama]` — llamadas HTTP al modelo.
- `[Orchestrator]` — iteraciones y parsing.
- `[Executor]` / `[Tool]` — ejecución de tools.
- `[ToolRegistry]` — registro al arranque.
"""
Orquestador de tool-calling.

Flujo:
  1. Construye messages con system prompt + historial + mensaje del usuario.
  2. Llama a Ollama.
  3. Parsea la respuesta JSON del modelo:
       {"type": "tool_call", "tool": "nombre", "arguments": {...}}
       {"type": "final",     "message": "texto al usuario"}
  4. Si es tool_call: ejecuta la tool, agrega resultado al contexto, vuelve a 2.
  5. Si es final (o se alcanzan MAX_ITERATIONS): devuelve el mensaje.
  6. Cualquier error (JSON inválido, tool desconocida, Ollama caído) → error controlado.
"""
import json
import logging
import re

from .ollama_client import OllamaError, chat as ollama_chat
from .tools.executor import ToolExecutionError, ToolNotFoundError, execute
from .tools.registry import tools_schema_for_prompt

# Importar las tools para que se registren al cargar el módulo
import chat.tools.inventory  # noqa: F401

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 5

SYSTEM_PROMPT_TEMPLATE = """Eres un asistente de soporte técnico del sistema de mantenimiento de equipos de TI de Chivas.
Ayudas a los técnicos con dudas sobre equipos, mantenimientos y procedimientos.
Responde SIEMPRE en español, de forma concisa y profesional.

Tienes acceso a las siguientes herramientas para consultar información real del sistema:
{tools}

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con JSON válido, sin texto adicional antes ni después.
2. Si necesitas consultar datos del sistema, usa:
   {{"type": "tool_call", "tool": "nombre_tool", "arguments": {{"param": "valor"}}}}
3. Cuando tengas suficiente información para responder al usuario, usa:
   {{"type": "final", "message": "tu respuesta en español"}}
4. Si no necesitas ninguna tool, responde directamente con type=final.
5. NUNCA inventes datos. Si no tienes la información, dilo claramente en type=final.
6. Solo usa las tools listadas arriba. No inventes tools nuevas.
7. Cuando necesites el detalle de un equipo, usa el campo "equipo_id" del resultado previo como argumento equipo_id de obtener_detalle_equipo. NUNCA uses un ID que no venga de un resultado previo de tool.
"""


def _build_system_prompt() -> str:
    tools_text = tools_schema_for_prompt()
    if not tools_text:
        tools_text = "  (ninguna disponible por ahora)"
    return SYSTEM_PROMPT_TEMPLATE.format(tools=tools_text)


def _extract_json(raw: str) -> dict:
    """
    Intenta extraer un objeto JSON de la respuesta del modelo.
    Maneja casos donde el modelo incluye markdown o texto extra.
    """
    # Intento directo
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Buscar bloque ```json ... ```
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Buscar primer { ... } en el string
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"No se pudo extraer JSON válido de la respuesta: {raw[:300]!r}")


def run(user_message: str, history: list[dict]) -> str:
    """
    Punto de entrada principal del orquestador.

    Args:
        user_message: mensaje del usuario.
        history: lista de {"role": "user"|"assistant", "content": "..."}

    Returns:
        Texto final para mostrar al usuario.

    Raises:
        OllamaError: si Ollama no está disponible.
        RuntimeError: para otros errores controlados.
    """
    system_prompt = _build_system_prompt()

    # Construir lista de mensajes para Ollama
    messages: list[dict] = [{'role': 'system', 'content': system_prompt}]

    # Historial reciente (máx 10 turnos)
    for entry in history[-10:]:
        role = entry.get('role')
        content = entry.get('content', '')
        if role in ('user', 'assistant') and content:
            messages.append({'role': role, 'content': content})

    messages.append({'role': 'user', 'content': user_message})

    for iteration in range(1, MAX_ITERATIONS + 1):
        logger.info("[Orchestrator] iteración %d/%d  messages=%d",
                    iteration, MAX_ITERATIONS, len(messages))

        # ── Llamada a Ollama ──────────────────────────────────────
        try:
            raw_response = ollama_chat(messages)
        except OllamaError:
            raise  # propagar al view

        # ── Parsear JSON del modelo ───────────────────────────────
        try:
            parsed = _extract_json(raw_response)
        except ValueError as exc:
            logger.warning("[Orchestrator] JSON inválido en iter %d: %s", iteration, exc)
            # Si el modelo respondió texto plano (fallback graceful)
            if iteration == 1 and raw_response:
                logger.info("[Orchestrator] usando respuesta de texto plano como fallback")
                return raw_response
            raise RuntimeError(
                "El modelo devolvió una respuesta que no pude interpretar. "
                "Intenta reformular tu pregunta."
            ) from exc

        response_type = parsed.get('type', '').lower()

        # ── Respuesta final ───────────────────────────────────────
        if response_type == 'final':
            final_msg = (parsed.get('message') or '').strip()
            if not final_msg:
                raise RuntimeError("El modelo devolvió una respuesta final vacía.")
            logger.info("[Orchestrator] respuesta final en iter %d", iteration)
            return final_msg

        # ── Tool call ─────────────────────────────────────────────
        if response_type == 'tool_call':
            tool_name = parsed.get('tool', '')
            arguments = parsed.get('arguments') or {}

            # Agregar el tool_call al contexto como mensaje del asistente
            messages.append({'role': 'assistant', 'content': raw_response})

            try:
                tool_result = execute(tool_name, arguments)
            except ToolNotFoundError as exc:
                tool_result = {'error': str(exc)}
            except ToolExecutionError as exc:
                tool_result = {'error': str(exc)}

            # Inyectar resultado como mensaje del sistema (tool result)
            result_content = (
                f"Resultado de la tool '{tool_name}':\n"
                f"{json.dumps(tool_result, ensure_ascii=False, default=str)}"
            )
            messages.append({'role': 'user', 'content': result_content})
            logger.info("[Orchestrator] tool %r ejecutada, continúa loop", tool_name)
            continue

        # ── Tipo desconocido ──────────────────────────────────────
        logger.warning("[Orchestrator] type desconocido: %r raw=%r", response_type, raw_response[:200])
        # Intentar usar como texto plano si parece una respuesta
        if raw_response and response_type == '':
            return raw_response
        raise RuntimeError(
            f"El modelo respondió con un tipo desconocido: '{response_type}'. "
            "Intenta de nuevo."
        )

    # ── Se agotaron las iteraciones ───────────────────────────────
    logger.warning("[Orchestrator] se alcanzó MAX_ITERATIONS=%d sin respuesta final", MAX_ITERATIONS)
    raise RuntimeError(
        "El asistente no pudo completar la consulta en el tiempo permitido. "
        "Intenta con una pregunta más específica."
    )

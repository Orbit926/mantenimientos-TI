"""
Ejecutor de tools.
Recibe el nombre y los argumentos validados por el orquestador,
llama al handler correspondiente y devuelve el resultado serializable.
"""
import logging

from .registry import get_tool

logger = logging.getLogger(__name__)


class ToolNotFoundError(Exception):
    pass


class ToolExecutionError(Exception):
    pass


def execute(tool_name: str, arguments: dict) -> dict:
    """
    Ejecuta una tool por nombre.

    Returns:
        dict con el resultado de la tool.

    Raises:
        ToolNotFoundError: si el nombre no está registrado.
        ToolExecutionError: si el handler lanza una excepción.
    """
    tool = get_tool(tool_name)
    if tool is None:
        logger.warning("[Executor] tool desconocida solicitada: %r", tool_name)
        raise ToolNotFoundError(
            f"La tool '{tool_name}' no existe. "
            f"Usa solo las tools definidas en el system prompt."
        )

    logger.info("[Executor] ejecutando %s args=%s", tool_name, arguments)
    try:
        result = tool['handler'](arguments)
        logger.info("[Executor] %s → %s", tool_name, str(result)[:200])
        return result
    except Exception as exc:
        logger.exception("[Executor] error en tool %s: %s", tool_name, exc)
        raise ToolExecutionError(
            f"Error al ejecutar '{tool_name}': {exc}"
        ) from exc

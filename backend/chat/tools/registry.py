"""
Registro central de tools disponibles para el modelo.

Cada tool es un dict con:
  - name        : identificador único (snake_case)
  - description : qué hace (visible al modelo)
  - parameters  : dict de nombre → {type, description, required}
  - handler     : callable(arguments: dict) → dict  (NO se expone al modelo)
"""
import logging

logger = logging.getLogger(__name__)

_REGISTRY: dict[str, dict] = {}


def register(name: str, description: str, parameters: dict):
    """Decorador para registrar una función como tool."""
    def decorator(fn):
        _REGISTRY[name] = {
            'name': name,
            'description': description,
            'parameters': parameters,
            'handler': fn,
        }
        logger.debug("[ToolRegistry] tool registrada: %s", name)
        return fn
    return decorator


def get_tool(name: str) -> dict | None:
    return _REGISTRY.get(name)


def all_tools() -> list[dict]:
    """Devuelve la definición pública de todas las tools (sin el handler)."""
    return [
        {k: v for k, v in tool.items() if k != 'handler'}
        for tool in _REGISTRY.values()
    ]


def tools_schema_for_prompt() -> str:
    """
    Formatea las tools como texto para inyectar en el system prompt.
    """
    lines = []
    for t in all_tools():
        params = ', '.join(
            f"{k} ({v['type']}{'?' if not v.get('required', True) else ''}): {v['description']}"
            for k, v in t['parameters'].items()
        )
        lines.append(f"  - {t['name']}({params}): {t['description']}")
    return '\n'.join(lines)

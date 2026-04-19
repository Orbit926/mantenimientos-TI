"""
Cliente HTTP mínimo para la API de Ollama.
Único lugar que sabe cómo hablar con Ollama.
"""
import base64
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings

logger = logging.getLogger(__name__)


class OllamaError(Exception):
    """Error controlado al comunicarse con Ollama."""


def chat(messages: list[dict], timeout: int = 90) -> str:
    """
    Envía una lista de mensajes a Ollama (formato /api/chat) y devuelve
    el texto de la respuesta del asistente.

    Raises:
        OllamaError: si la conexión falla o la respuesta es inválida.
    """
    model = settings.OLLAMA_MODEL
    url = f"{settings.OLLAMA_URL.rstrip('/')}/api/chat"

    payload = json.dumps({
        'model': model,
        'messages': messages,
        'stream': False,
        'format': 'json',       # forzamos respuesta JSON pura
        'options': {
            'temperature': 0.2, # respuestas más deterministas para tool-calling
        },
    }).encode('utf-8')

    logger.debug("[Ollama] POST %s  model=%s  messages=%d", url, model, len(messages))

    try:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read().decode('utf-8'))
    except urllib.error.URLError as exc:
        raise OllamaError(f"No se pudo conectar con Ollama: {exc.reason}") from exc
    except Exception as exc:
        raise OllamaError(f"Error inesperado al llamar a Ollama: {exc}") from exc

    content = body.get('message', {}).get('content', '').strip()
    if not content:
        raise OllamaError("Ollama devolvió una respuesta vacía.")

    logger.debug("[Ollama] respuesta (%d chars): %s", len(content), content[:200])
    return content


def describe_image(image_bytes: bytes, prompt: str = '', timeout: int = 120) -> str:
    """
    Envía una imagen a Ollama para que la describa.
    Usa el endpoint /api/generate con el campo `images` (lista de base64).
    El modelo debe ser multimodal (ej: llava, gemma3:4b con visión).

    Returns:
        Texto descriptivo de la imagen.

    Raises:
        OllamaError: si la conexión falla o la respuesta es inválida.
    """
    model = settings.OLLAMA_MODEL
    url = f"{settings.OLLAMA_URL.rstrip('/')}/api/generate"

    image_b64 = base64.b64encode(image_bytes).decode('utf-8')
    user_prompt = prompt.strip() or (
        "Describe detalladamente esta imagen en español. "
        "Si ves equipos de cómputo, hardware o daños, descríbelos con precisión técnica."
    )

    payload = json.dumps({
        'model': model,
        'prompt': user_prompt,
        'images': [image_b64],
        'stream': False,
        'options': {'temperature': 0.3},
    }).encode('utf-8')

    logger.info("[Ollama] describe_image model=%s image_size=%d bytes", model, len(image_bytes))

    try:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read().decode('utf-8'))
    except urllib.error.URLError as exc:
        raise OllamaError(f"No se pudo conectar con Ollama: {exc.reason}") from exc
    except Exception as exc:
        raise OllamaError(f"Error inesperado al llamar a Ollama: {exc}") from exc

    content = (body.get('response') or '').strip()
    if not content:
        raise OllamaError("Ollama devolvió una descripción vacía para la imagen.")

    logger.debug("[Ollama] describe_image respuesta (%d chars): %s", len(content), content[:200])
    return content

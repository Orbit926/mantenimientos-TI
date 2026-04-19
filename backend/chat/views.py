import logging

from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .ollama_client import OllamaError, describe_image
from .orchestrator import run as orchestrate

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
MAX_IMAGE_MB = 10


class ChatView(APIView):
    def post(self, request):
        message = (request.data.get('message') or '').strip()
        history = request.data.get('history') or []

        if not message:
            return Response(
                {'error': 'El campo message es requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info("[ChatView] user=%s message=%r", request.user, message[:80])

        try:
            reply = orchestrate(user_message=message, history=history)
            return Response({'reply': reply})

        except OllamaError as exc:
            logger.error("[ChatView] OllamaError: %s", exc)
            return Response(
                {'error': 'No se pudo conectar con la IA. Intenta nuevamente más tarde.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except RuntimeError as exc:
            logger.warning("[ChatView] RuntimeError: %s", exc)
            return Response(
                {'error': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as exc:
            logger.exception("[ChatView] error inesperado: %s", exc)
            return Response(
                {'error': 'Error interno del servidor. Intenta nuevamente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ImageChatView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        image_file = request.FILES.get('image')
        prompt = (request.data.get('prompt') or '').strip()

        if not image_file:
            return Response(
                {'error': 'Se requiere el campo image (multipart/form-data).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_type = getattr(image_file, 'content_type', '') or ''
        if content_type not in ALLOWED_IMAGE_TYPES:
            return Response(
                {'error': f'Tipo de archivo no permitido: {content_type}. Usa JPEG, PNG, WEBP o GIF.'},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )

        size_mb = image_file.size / (1024 * 1024)
        if size_mb > MAX_IMAGE_MB:
            return Response(
                {'error': f'La imagen supera el límite de {MAX_IMAGE_MB} MB.'},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        logger.info("[ImageChatView] user=%s image=%s size=%.2fMB prompt=%r",
                    request.user, image_file.name, size_mb, prompt[:80])

        try:
            image_bytes = image_file.read()
            description = describe_image(image_bytes, prompt=prompt)
            return Response({'description': description})

        except OllamaError as exc:
            logger.error("[ImageChatView] OllamaError: %s", exc)
            return Response(
                {'error': 'No se pudo analizar la imagen. Verifica que el modelo soporte visión.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            logger.exception("[ImageChatView] error inesperado: %s", exc)
            return Response(
                {'error': 'Error interno del servidor. Intenta nuevamente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

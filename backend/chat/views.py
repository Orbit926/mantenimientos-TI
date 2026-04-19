import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .ollama_client import OllamaError
from .orchestrator import run as orchestrate

logger = logging.getLogger(__name__)


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

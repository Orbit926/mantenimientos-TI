import json
import urllib.error
import urllib.request

from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

SYSTEM_PROMPT = (
    "Eres un asistente de soporte técnico del sistema de mantenimiento de equipos de TI de Chivas. "
    "Ayudas a los técnicos con dudas sobre el sistema, mantenimientos, equipos y procedimientos. "
    "Responde siempre en español, de forma concisa y profesional."
)


class ChatView(APIView):
    def post(self, request):
        message = (request.data.get('message') or '').strip()
        history = request.data.get('history') or []

        if not message:
            return Response(
                {'error': 'El campo message es requerido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build messages list for Ollama chat API
        messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
        for entry in history[-10:]:  # max 10 turns of context
            role = entry.get('role')
            content = entry.get('content', '')
            if role in ('user', 'assistant') and content:
                messages.append({'role': role, 'content': content})
        messages.append({'role': 'user', 'content': message})

        payload = json.dumps({
            'model': settings.OLLAMA_MODEL,
            'messages': messages,
            'stream': False,
        }).encode('utf-8')

        ollama_url = f"{settings.OLLAMA_URL.rstrip('/')}/api/chat"

        try:
            req = urllib.request.Request(
                ollama_url,
                data=payload,
                headers={'Content-Type': 'application/json'},
                method='POST',
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = json.loads(resp.read().decode('utf-8'))

            reply = body.get('message', {}).get('content', '').strip()
            if not reply:
                raise ValueError('Respuesta vacía del modelo.')

            return Response({'reply': reply})

        except urllib.error.URLError as exc:
            return Response(
                {'error': f'No se pudo conectar con Ollama: {exc.reason}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            return Response(
                {'error': f'Error al procesar la respuesta de la IA: {str(exc)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    MeSerializer,
    TecnicoPublicSerializer,
    TecnicoSerializer,
    TecnicoTokenObtainPairSerializer,
)

Tecnico = get_user_model()


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — devuelve access, refresh y user."""

    serializer_class = TecnicoTokenObtainPairSerializer
    permission_classes = []
    authentication_classes = []


class LogoutView(APIView):
    """POST /api/auth/logout/ — blacklist del refresh token."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response(
                {'detail': 'Se requiere el token de refresh.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except TokenError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    """GET /api/auth/me/ — perfil del usuario autenticado."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class RegisterView(APIView):
    """POST /api/auth/register/ — alta de técnico (solo admin)."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = TecnicoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(TecnicoSerializer(user).data, status=status.HTTP_201_CREATED)


class TecnicoViewSet(viewsets.ModelViewSet):
    """
    CRUD de técnicos.

    - Lectura: cualquier usuario autenticado (para dropdowns).
    - Escritura: solo admin (is_staff).
    """

    queryset = Tecnico.objects.all().order_by('first_name', 'last_name')
    serializer_class = TecnicoSerializer

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve'):
            # La vista de detalle para no-admin debe ser pública sin datos sensibles
            if not self.request.user.is_staff:
                return TecnicoPublicSerializer
        return TecnicoSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get_queryset(self):
        qs = super().get_queryset()
        activo = self.request.query_params.get('activo')
        if activo is not None:
            qs = qs.filter(activo=activo.lower() in ('1', 'true', 'yes', 'si', 'sí'))
        return qs

    def destroy(self, request, *args, **kwargs):
        # Soft-delete: marcar como inactivo en vez de borrar (preservar FK en mantenimientos).
        instance = self.get_object()
        instance.activo = False
        instance.is_active = False
        instance.save(update_fields=['activo', 'is_active'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='cambiar-password')
    def cambiar_password(self, request, pk=None):
        tecnico = self.get_object()
        password = request.data.get('password')
        if not password or len(password) < 6:
            return Response(
                {'detail': 'La contraseña debe tener al menos 6 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        tecnico.set_password(password)
        tecnico.save(update_fields=['password'])
        return Response({'detail': 'Contraseña actualizada.'})

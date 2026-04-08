from datetime import date, timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Equipo
from .serializers import EquipoBajaSerializer, EquipoDetailSerializer, EquipoListSerializer


class EquipoViewSet(viewsets.ModelViewSet):
    queryset = Equipo.objects.all()
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'list':
            return EquipoListSerializer
        return EquipoDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        activo = params.get('activo')
        if activo is not None:
            qs = qs.filter(activo=activo.lower() == 'true')

        if params.get('proximo') == 'true':
            hoy = date.today()
            qs = qs.filter(
                activo=True,
                fecha_proximo_mantenimiento__gte=hoy,
                fecha_proximo_mantenimiento__lte=hoy + timedelta(days=30),
            )

        if params.get('vencido') == 'true':
            qs = qs.filter(
                activo=True,
                fecha_proximo_mantenimiento__lt=date.today(),
            )

        return qs

    @action(detail=True, methods=['post'])
    def baja(self, request, pk=None):
        equipo = self.get_object()
        if not equipo.activo:
            return Response(
                {'detail': 'El equipo ya está dado de baja.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = EquipoBajaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        equipo.activo = False
        equipo.fecha_baja = timezone.now().date()
        equipo.motivo_baja = serializer.validated_data['motivo_baja']
        equipo.save()
        return Response(
            EquipoDetailSerializer(equipo, context={'request': request}).data
        )

    @action(detail=True, methods=['get'], url_path='mantenimientos')
    def mantenimientos(self, request, pk=None):
        from mantenimientos.serializers import MantenimientoListSerializer
        equipo = self.get_object()
        qs = equipo.mantenimientos.all()
        serializer = MantenimientoListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

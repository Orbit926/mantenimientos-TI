from datetime import date, timedelta

from rest_framework.response import Response
from rest_framework.views import APIView

from equipos.models import Equipo
from equipos.serializers import EquipoListSerializer
from mantenimientos.models import Mantenimiento
from mantenimientos.serializers import MantenimientoListSerializer

_DIAS_PROXIMO = 30


class DashboardResumenView(APIView):
    def get(self, request):
        hoy = date.today()
        limite_proximo = hoy + timedelta(days=_DIAS_PROXIMO)
        primer_dia_mes = hoy.replace(day=1)

        return Response({
            'total_equipos_activos': Equipo.objects.filter(activo=True).count(),
            'total_equipos_baja': Equipo.objects.filter(activo=False).count(),
            'mantenimientos_proximos': Equipo.objects.filter(
                activo=True,
                fecha_proximo_mantenimiento__gte=hoy,
                fecha_proximo_mantenimiento__lte=limite_proximo,
            ).count(),
            'mantenimientos_vencidos': Equipo.objects.filter(
                activo=True,
                fecha_proximo_mantenimiento__lt=hoy,
            ).count(),
            'mantenimientos_completados_mes': Mantenimiento.objects.filter(
                estatus='COMPLETADO',
                fecha_ejecucion__gte=primer_dia_mes,
            ).count(),
        })


class DashboardProximosView(APIView):
    def get(self, request):
        hoy = date.today()
        limite = hoy + timedelta(days=_DIAS_PROXIMO)
        equipos = Equipo.objects.filter(
            activo=True,
            fecha_proximo_mantenimiento__lte=limite,
        ).order_by('fecha_proximo_mantenimiento')
        return Response(EquipoListSerializer(equipos, many=True).data)


class DashboardRealizadosView(APIView):
    def get(self, request):
        mantenimientos = (
            Mantenimiento.objects
            .filter(estatus='COMPLETADO')
            .select_related('equipo')
            .order_by('-fecha_ejecucion')[:20]
        )
        return Response(MantenimientoListSerializer(mantenimientos, many=True).data)

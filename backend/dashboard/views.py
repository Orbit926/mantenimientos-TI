from collections import defaultdict
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, F, FloatField, Q
from django.db.models.functions import TruncMonth
from rest_framework.response import Response
from rest_framework.views import APIView

from equipos.models import Equipo
from equipos.serializers import EquipoListSerializer
from mantenimientos.models import Mantenimiento
from mantenimientos.serializers import MantenimientoListSerializer

Tecnico = get_user_model()
_DIAS_PROXIMO = 30


class DashboardResumenView(APIView):
    def get(self, request):
        hoy = date.today()
        limite_proximo = hoy + timedelta(days=_DIAS_PROXIMO)
        primer_dia_mes = hoy.replace(day=1)

        return Response({
            'total_equipos_activos': Equipo.objects.exclude(estado='BAJA').count(),
            'total_equipos_baja': Equipo.objects.filter(estado='BAJA').count(),
            'mantenimientos_proximos': Equipo.objects.filter(
                fecha_proximo_mantenimiento__gte=hoy,
                fecha_proximo_mantenimiento__lte=limite_proximo,
            ).exclude(estado='BAJA').count(),
            'mantenimientos_vencidos': Equipo.objects.filter(
                fecha_proximo_mantenimiento__lt=hoy,
            ).exclude(estado='BAJA').count(),
            'mantenimientos_completados_mes': Mantenimiento.objects.filter(
                estatus='COMPLETADO',
                fecha_ejecucion__gte=primer_dia_mes,
            ).count(),
        })


class DashboardProximosView(APIView):
    def get(self, request):
        hoy = date.today()
        try:
            dias = int(request.query_params.get('dias', _DIAS_PROXIMO))
        except (TypeError, ValueError):
            dias = _DIAS_PROXIMO
        limite = hoy + timedelta(days=dias)
        equipos = Equipo.objects.filter(
            fecha_proximo_mantenimiento__lte=limite,
        ).exclude(estado='BAJA').order_by('fecha_proximo_mantenimiento')
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


class AnalyticsView(APIView):
    def get(self, request):
        hoy = date.today()
        hace_12_meses = hoy - timedelta(days=365)
        primer_dia_mes = hoy.replace(day=1)

        qs_all = Mantenimiento.objects.all()
        qs_completados = qs_all.filter(estatus='COMPLETADO')

        # ── KPIs globales ──────────────────────────────────────────
        total = qs_all.count()
        completados = qs_completados.count()
        borradores = qs_all.filter(estatus='BORRADOR').count()
        este_mes = qs_completados.filter(fecha_ejecucion__gte=primer_dia_mes).count()

        equipos_activos = Equipo.objects.exclude(estado='BAJA').count()
        equipos_vencidos = Equipo.objects.filter(
            fecha_proximo_mantenimiento__lt=hoy,
        ).exclude(estado='BAJA').count()
        equipos_a_tiempo = Equipo.objects.filter(
            fecha_proximo_mantenimiento__gte=hoy,
            fecha_proximo_mantenimiento__lte=hoy + timedelta(days=30),
        ).exclude(estado='BAJA').count()

        pct_a_tiempo = round(
            ((equipos_activos - equipos_vencidos) / equipos_activos * 100)
            if equipos_activos else 0,
            1,
        )

        # ── Mantenimientos por estado de equipo post ───────────────
        por_estado = list(
            qs_completados
            .values('estado_equipo_post')
            .annotate(total=Count('id'))
            .order_by('-total')
        )
        estado_labels = {
            'OPERATIVO': 'Operativo',
            'OPERATIVO_OBSERVACIONES': 'Op. con observaciones',
            'NO_OPERATIVO': 'No operativo',
            '': 'Sin registrar',
        }
        por_estado_fmt = [
            {'label': estado_labels.get(r['estado_equipo_post'], r['estado_equipo_post']),
             'value': r['total']}
            for r in por_estado
        ]

        # ── Mantenimientos por mes (últimos 12 meses) ──────────────
        por_mes_qs = (
            qs_all
            .filter(fecha_ejecucion__gte=hace_12_meses)
            .annotate(mes=TruncMonth('fecha_ejecucion'))
            .values('mes', 'estatus')
            .annotate(total=Count('id'))
            .order_by('mes')
        )
        meses_dict = defaultdict(lambda: {'completados': 0, 'borradores': 0})
        for row in por_mes_qs:
            key = row['mes'].strftime('%b %Y') if row['mes'] else ''
            if row['estatus'] == 'COMPLETADO':
                meses_dict[key]['completados'] += row['total']
            else:
                meses_dict[key]['borradores'] += row['total']
        por_mes = [
            {'mes': k, **v}
            for k, v in sorted(meses_dict.items(),
                                key=lambda x: x[0])
        ]

        # ── Mantenimientos por tipo de equipo ──────────────────────
        por_tipo = list(
            qs_completados
            .values(tipo=F('equipo__tipo_equipo'))
            .annotate(total=Count('id'))
            .order_by('-total')
        )
        tipo_labels = {
            'laptop': 'Laptop', 'desktop': 'Desktop', 'servidor': 'Servidor',
            'impresora': 'Impresora', 'switch': 'Switch', 'router': 'Router',
            'monitor': 'Monitor', 'tablet': 'Tablet', 'otro': 'Otro',
        }
        por_tipo_fmt = [
            {'label': tipo_labels.get(r['tipo'], r['tipo']), 'value': r['total']}
            for r in por_tipo
        ]

        # ── Carga de trabajo por técnico ───────────────────────────
        por_tecnico = list(
            qs_all
            .filter(tecnico__isnull=False)
            .values(
                tec_pk=F('tecnico__id'),
                nombre=F('tecnico__first_name'),
                apellido=F('tecnico__last_name'),
            )
            .annotate(
                total=Count('id'),
                completados_t=Count('id', filter=Q(estatus='COMPLETADO')),
                borradores_t=Count('id', filter=Q(estatus='BORRADOR')),
            )
            .order_by('-total')
        )
        por_tecnico_fmt = [
            {
                'tecnico': f"{r['nombre']} {r['apellido']}".strip(),
                'total': r['total'],
                'completados': r['completados_t'],
                'borradores': r['borradores_t'],
            }
            for r in por_tecnico
        ]

        # ── Con riesgo vs sin riesgo ───────────────────────────────
        con_riesgo = qs_completados.filter(riesgo_presentado=True).count()
        sin_riesgo = completados - con_riesgo

        # ── Equipos con más mantenimientos ────────────────────────
        top_equipos = list(
            qs_all
            .values(
                codigo=F('equipo__codigo_interno'),
                modelo=F('equipo__modelo'),
                marca=F('equipo__marca'),
                tipo=F('equipo__tipo_equipo'),
            )
            .annotate(total=Count('id'))
            .order_by('-total')[:8]
        )

        return Response({
            'kpis': {
                'total_mantenimientos': total,
                'completados': completados,
                'borradores': borradores,
                'este_mes': este_mes,
                'equipos_activos': equipos_activos,
                'equipos_vencidos': equipos_vencidos,
                'equipos_a_tiempo': equipos_a_tiempo,
                'pct_a_tiempo': pct_a_tiempo,
                'con_riesgo': con_riesgo,
                'sin_riesgo': sin_riesgo,
            },
            'por_mes': por_mes,
            'por_estado_equipo': por_estado_fmt,
            'por_tipo_equipo': por_tipo_fmt,
            'por_tecnico': por_tecnico_fmt,
            'top_equipos': top_equipos,
        })

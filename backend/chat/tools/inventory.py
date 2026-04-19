"""
Tools de inventario y mantenimiento.
Cada función recibe un dict de argumentos validados y devuelve un dict serializable.
Las queries usan el ORM de Django directamente — el modelo NUNCA accede a la BD.
"""
import logging
from datetime import date, timedelta

from .registry import register

logger = logging.getLogger(__name__)


# ─── buscar_equipo_por_serie (DEPRECADA: usar buscar_equipos) ─────

def buscar_equipo_por_serie(arguments: dict) -> dict:
    from equipos.models import Equipo

    serie = (arguments.get('serie') or '').strip()
    if not serie:
        return {'error': 'El parámetro serie es requerido.'}

    logger.info("[Tool] buscar_equipo_por_serie serie=%r", serie)

    try:
        eq = Equipo.objects.get(numero_serie__iexact=serie)
    except Equipo.DoesNotExist:
        return {'encontrado': False, 'mensaje': f'No se encontró ningún equipo con número de serie "{serie}".'}
    except Equipo.MultipleObjectsReturned:
        equipos = Equipo.objects.filter(numero_serie__iexact=serie)
        return {
            'encontrado': True,
            'multiples': True,
            'equipos': [_equipo_basico(e) for e in equipos],
        }

    return {'encontrado': True, 'equipo': _equipo_basico(eq)}


# ─── listar_equipos_por_usuario (DEPRECADA: usar buscar_equipos) ──

def listar_equipos_por_usuario(arguments: dict) -> dict:
    from equipos.models import Equipo

    usuario = (arguments.get('usuario') or '').strip()
    if not usuario:
        return {'error': 'El parámetro usuario es requerido.'}

    logger.info("[Tool] listar_equipos_por_usuario usuario=%r", usuario)

    equipos = Equipo.objects.filter(
        colaborador_nombre__icontains=usuario,
    ).exclude(estado='BAJA')

    if not equipos.exists():
        return {'encontrado': False, 'mensaje': f'No se encontraron equipos para el usuario "{usuario}".'}

    return {
        'encontrado': True,
        'total': equipos.count(),
        'equipos': [_equipo_basico(e) for e in equipos],
    }


# ─── obtener_mantenimientos_vencidos ──────────────────────────────

@register(
    name='obtener_mantenimientos_vencidos',
    description='Devuelve la lista de equipos cuyo próximo mantenimiento ya venció (fecha pasada).',
    parameters={},
)
def obtener_mantenimientos_vencidos(arguments: dict) -> dict:
    from equipos.models import Equipo

    logger.info("[Tool] obtener_mantenimientos_vencidos")

    hoy = date.today()
    equipos = Equipo.objects.filter(
        fecha_proximo_mantenimiento__lt=hoy,
    ).exclude(estado='BAJA').order_by('fecha_proximo_mantenimiento')

    if not equipos.exists():
        return {'total': 0, 'mensaje': 'No hay equipos con mantenimiento vencido.'}

    return {
        'total': equipos.count(),
        'fecha_consulta': hoy.isoformat(),
        'equipos': [
            {
                **_equipo_basico(e),
                'dias_vencido': (hoy - e.fecha_proximo_mantenimiento).days,
            }
            for e in equipos
        ],
    }


# ─── obtener_mantenimientos_proximos ──────────────────────────────

@register(
    name='obtener_mantenimientos_proximos',
    description='Devuelve equipos con mantenimiento programado en los próximos N días.',
    parameters={
        'dias': {
            'type': 'integer',
            'description': 'Número de días hacia adelante a considerar (por defecto 30)',
            'required': False,
        },
    },
)
def obtener_mantenimientos_proximos(arguments: dict) -> dict:
    from equipos.models import Equipo

    try:
        dias = int(arguments.get('dias') or 30)
        dias = max(1, min(dias, 365))
    except (TypeError, ValueError):
        dias = 30

    logger.info("[Tool] obtener_mantenimientos_proximos dias=%d", dias)

    hoy = date.today()
    limite = hoy + timedelta(days=dias)
    equipos = Equipo.objects.filter(
        fecha_proximo_mantenimiento__gte=hoy,
        fecha_proximo_mantenimiento__lte=limite,
    ).exclude(estado='BAJA').order_by('fecha_proximo_mantenimiento')

    if not equipos.exists():
        return {
            'total': 0,
            'mensaje': f'No hay equipos con mantenimiento programado en los próximos {dias} días.',
        }

    return {
        'total': equipos.count(),
        'dias_consultados': dias,
        'fecha_consulta': hoy.isoformat(),
        'equipos': [
            {
                **_equipo_basico(e),
                'dias_para_mantenimiento': (e.fecha_proximo_mantenimiento - hoy).days,
            }
            for e in equipos
        ],
    }


# ─── obtener_detalle_equipo ───────────────────────────────────────

@register(
    name='obtener_detalle_equipo',
    description='Devuelve el detalle completo de un equipo incluyendo sus últimos mantenimientos.',
    parameters={
        'equipo_id': {
            'type': 'integer',
            'description': 'ID numérico del equipo',
            'required': True,
        },
    },
)
def obtener_detalle_equipo(arguments: dict) -> dict:
    from equipos.models import Equipo
    from mantenimientos.models import Mantenimiento

    try:
        equipo_id = int(arguments.get('equipo_id') or 0)
    except (TypeError, ValueError):
        return {'error': 'El parámetro equipo_id debe ser un número entero.'}

    if not equipo_id:
        return {'error': 'El parámetro equipo_id es requerido.'}

    logger.info("[Tool] obtener_detalle_equipo id=%d", equipo_id)

    try:
        eq = Equipo.objects.get(pk=equipo_id)
    except Equipo.DoesNotExist:
        return {'encontrado': False, 'mensaje': f'No existe ningún equipo con id={equipo_id}.'}

    mantenimientos = (
        Mantenimiento.objects
        .filter(equipo=eq)
        .select_related('tecnico')
        .order_by('-fecha_ejecucion')[:5]
    )

    return {
        'encontrado': True,
        'equipo': {
            **_equipo_basico(eq),
            'numero_serie': eq.numero_serie,
            'colaborador_correo': eq.colaborador_correo,
            'colaborador_puesto': eq.colaborador_puesto,
            'fecha_alta': eq.fecha_alta.isoformat() if eq.fecha_alta else None,
            'fecha_baja': eq.fecha_baja.isoformat() if eq.fecha_baja else None,
            'motivo_baja': eq.motivo_baja,
        },
        'ultimos_mantenimientos': [
            {
                'id': m.id,
                'fecha': m.fecha_ejecucion.isoformat(),
                'estatus': m.estatus,
                'tecnico': (
                    f"{m.tecnico.get_full_name() or m.tecnico.username}"
                    if m.tecnico else 'Sin asignar'
                ),
                'estado_equipo_post': m.estado_equipo_post,
                'riesgo': m.riesgo_presentado,
            }
            for m in mantenimientos
        ],
    }


# ─── buscar_equipo_por_codigo (DEPRECADA: usar buscar_equipos) ────

def buscar_equipo_por_codigo(arguments: dict) -> dict:
    from equipos.models import Equipo

    codigo = (arguments.get('codigo') or '').strip()
    if not codigo:
        return {'error': 'El parámetro codigo es requerido.'}

    logger.info("[Tool] buscar_equipo_por_codigo codigo=%r", codigo)

    try:
        eq = Equipo.objects.get(codigo_interno__iexact=codigo)
        return {'encontrado': True, 'equipo': _equipo_basico(eq)}
    except Equipo.DoesNotExist:
        return {'encontrado': False, 'mensaje': f'No se encontró ningún equipo con código "{codigo}".'}


# ─── obtener_equipos_por_estado ───────────────────────────────────

@register(
    name='obtener_equipos_por_estado',
    description=(
        'Lista todos los equipos filtrados por estado: ACTIVO, DISPONIBLE o BAJA. '
        'Úsala principalmente para ver el inventario libre (DISPONIBLE). '
        'Para conteos generales usa mejor obtener_resumen_general.'
    ),
    parameters={
        'estado': {
            'type': 'string',
            'description': 'Estado del equipo: ACTIVO, DISPONIBLE o BAJA',
            'required': True,
        },
    },
)
def obtener_equipos_por_estado(arguments: dict) -> dict:
    from equipos.models import Equipo

    estado = (arguments.get('estado') or '').strip().upper()
    if estado not in ('ACTIVO', 'DISPONIBLE', 'BAJA'):
        return {'error': 'El estado debe ser ACTIVO, DISPONIBLE o BAJA.'}

    logger.info("[Tool] obtener_equipos_por_estado estado=%r", estado)

    equipos = Equipo.objects.filter(estado=estado).order_by('codigo_interno')
    if not equipos.exists():
        return {'total': 0, 'estado': estado, 'mensaje': f'No hay equipos con estado {estado}.'}

    return {
        'total': equipos.count(),
        'estado': estado,
        'equipos': [_equipo_basico(e) for e in equipos],
    }


# ─── obtener_equipos_sin_mantenimiento ────────────────────────────

@register(
    name='obtener_equipos_sin_mantenimiento',
    description=(
        'Devuelve equipos activos que nunca han tenido mantenimiento o cuyo último '
        'mantenimiento fue hace más de N días. Distinto de obtener_mantenimientos_vencidos '
        '(esa usa fecha_proximo_mantenimiento programada; esta usa fecha_ultimo_mantenimiento).'
    ),
    parameters={
        'dias': {
            'type': 'integer',
            'description': 'Número de días mínimo sin mantenimiento (por defecto 90)',
            'required': False,
        },
    },
)
def obtener_equipos_sin_mantenimiento(arguments: dict) -> dict:
    from equipos.models import Equipo

    try:
        dias = int(arguments.get('dias') or 90)
        dias = max(1, min(dias, 3650))
    except (TypeError, ValueError):
        dias = 90

    logger.info("[Tool] obtener_equipos_sin_mantenimiento dias=%d", dias)

    limite = date.today() - timedelta(days=dias)
    equipos = Equipo.objects.filter(
        fecha_ultimo_mantenimiento__lt=limite,
    ).exclude(estado='BAJA').order_by('fecha_ultimo_mantenimiento')

    nunca = Equipo.objects.filter(
        fecha_ultimo_mantenimiento__isnull=True,
    ).exclude(estado='BAJA').order_by('codigo_interno')

    todos = list(equipos) + list(nunca)
    if not todos:
        return {'total': 0, 'mensaje': f'No hay equipos sin mantenimiento en los últimos {dias} días.'}

    return {
        'total': len(todos),
        'dias_sin_mantenimiento': dias,
        'equipos': [
            {
                **_equipo_basico(e),
                'dias_sin_mantenimiento': (
                    (date.today() - e.fecha_ultimo_mantenimiento).days
                    if e.fecha_ultimo_mantenimiento else 'nunca'
                ),
            }
            for e in todos
        ],
    }


# ─── buscar_mantenimiento ─────────────────────────────────────────

@register(
    name='buscar_mantenimiento',
    description='Devuelve el detalle completo de un mantenimiento por su ID: técnico, actividades, checklist, riesgos y estado del equipo.',
    parameters={
        'id': {
            'type': 'integer',
            'description': 'ID numérico del mantenimiento',
            'required': True,
        },
    },
)
def buscar_mantenimiento(arguments: dict) -> dict:
    from mantenimientos.models import Mantenimiento

    try:
        mant_id = int(arguments.get('id') or 0)
    except (TypeError, ValueError):
        return {'error': 'El parámetro id debe ser un número entero.'}

    if not mant_id:
        return {'error': 'El parámetro id es requerido.'}

    logger.info("[Tool] buscar_mantenimiento id=%d", mant_id)

    try:
        m = Mantenimiento.objects.select_related('equipo', 'tecnico').get(pk=mant_id)
    except Mantenimiento.DoesNotExist:
        return {'encontrado': False, 'mensaje': f'No existe mantenimiento con id={mant_id}.'}

    checklist = list(
        m.checklist_respuestas.select_related('checklist_item')
        .values('checklist_item__nombre', 'realizado', 'observacion')
    )

    return {
        'encontrado': True,
        'mantenimiento': {
            'id': m.id,
            'equipo': _equipo_basico(m.equipo),
            'tecnico': (
                f"{m.tecnico.get_full_name() or m.tecnico.username}"
                if m.tecnico else 'Sin asignar'
            ),
            'fecha_ejecucion': m.fecha_ejecucion.isoformat(),
            'hora_inicio': str(m.hora_inicio) if m.hora_inicio else None,
            'hora_fin': str(m.hora_fin) if m.hora_fin else None,
            'estatus': m.estatus,
            'actividades_realizadas': m.actividades_realizadas,
            'materiales_utilizados': m.materiales_utilizados,
            'estado_equipo_post': m.estado_equipo_post,
            'observaciones_tecnico': m.observaciones_tecnico,
            'riesgo_presentado': m.riesgo_presentado,
            'descripcion_riesgo': m.descripcion_riesgo if m.riesgo_presentado else None,
            'acciones_tomadas': m.acciones_tomadas if m.riesgo_presentado else None,
            'fecha_sugerida_proximo': (
                m.fecha_sugerida_proximo_mantenimiento.isoformat()
                if m.fecha_sugerida_proximo_mantenimiento else None
            ),
            'checklist': [
                {
                    'item': c['checklist_item__nombre'],
                    'realizado': c['realizado'],
                    'observacion': c['observacion'] or None,
                }
                for c in checklist
            ],
        },
    }


# ─── listar_mantenimientos_por_tecnico ────────────────────────────

@register(
    name='listar_mantenimientos_por_tecnico',
    description='Lista los mantenimientos asignados a un técnico, buscando por nombre o username.',
    parameters={
        'tecnico': {
            'type': 'string',
            'description': 'Nombre completo, nombre parcial o username del técnico',
            'required': True,
        },
        'estatus': {
            'type': 'string',
            'description': 'Filtrar por estatus: BORRADOR, COMPLETADO, PENDIENTE_FIRMA_TECNICO, PENDIENTE_FIRMA_USUARIO. Omitir para todos.',
            'required': False,
        },
    },
)
def listar_mantenimientos_por_tecnico(arguments: dict) -> dict:
    from django.db.models import Q
    from mantenimientos.models import Mantenimiento

    tecnico = (arguments.get('tecnico') or '').strip()
    estatus = (arguments.get('estatus') or '').strip().upper() or None

    if not tecnico:
        return {'error': 'El parámetro tecnico es requerido.'}

    logger.info("[Tool] listar_mantenimientos_por_tecnico tecnico=%r estatus=%r", tecnico, estatus)

    qs = Mantenimiento.objects.filter(
        Q(tecnico__first_name__icontains=tecnico) |
        Q(tecnico__last_name__icontains=tecnico) |
        Q(tecnico__username__icontains=tecnico)
    ).select_related('equipo', 'tecnico').order_by('-fecha_ejecucion')

    if estatus:
        qs = qs.filter(estatus=estatus)

    if not qs.exists():
        return {'encontrado': False, 'mensaje': f'No se encontraron mantenimientos para el técnico "{tecnico}".'}

    resumen = {
        'COMPLETADO': 0,
        'BORRADOR': 0,
        'PENDIENTE_FIRMA_TECNICO': 0,
        'PENDIENTE_FIRMA_USUARIO': 0,
    }
    registros = []
    for m in qs[:20]:
        resumen[m.estatus] = resumen.get(m.estatus, 0) + 1
        registros.append({
            'id': m.id,
            'equipo': f"{m.equipo.codigo_interno} — {m.equipo.marca} {m.equipo.modelo}",
            'fecha': m.fecha_ejecucion.isoformat(),
            'estatus': m.estatus,
        })

    return {
        'encontrado': True,
        'tecnico_buscado': tecnico,
        'total': qs.count(),
        'resumen_por_estatus': resumen,
        'mantenimientos': registros,
    }


# ─── obtener_historial_equipo ─────────────────────────────────────

@register(
    name='obtener_historial_equipo',
    description='Devuelve el historial completo de mantenimientos de un equipo en orden cronológico.',
    parameters={
        'equipo_id': {
            'type': 'integer',
            'description': 'ID numérico del equipo',
            'required': True,
        },
        'limite': {
            'type': 'integer',
            'description': 'Máximo de registros a devolver (por defecto 10, máximo 50)',
            'required': False,
        },
    },
)
def obtener_historial_equipo(arguments: dict) -> dict:
    from equipos.models import Equipo
    from mantenimientos.models import Mantenimiento

    try:
        equipo_id = int(arguments.get('equipo_id') or 0)
    except (TypeError, ValueError):
        return {'error': 'El parámetro equipo_id debe ser un número entero.'}

    if not equipo_id:
        return {'error': 'El parámetro equipo_id es requerido.'}

    try:
        limite = min(int(arguments.get('limite') or 10), 50)
    except (TypeError, ValueError):
        limite = 10

    logger.info("[Tool] obtener_historial_equipo id=%d limite=%d", equipo_id, limite)

    try:
        eq = Equipo.objects.get(pk=equipo_id)
    except Equipo.DoesNotExist:
        return {'encontrado': False, 'mensaje': f'No existe ningún equipo con id={equipo_id}.'}

    mantenimientos = (
        Mantenimiento.objects
        .filter(equipo=eq)
        .select_related('tecnico')
        .order_by('-fecha_ejecucion')[:limite]
    )

    return {
        'encontrado': True,
        'equipo': _equipo_basico(eq),
        'total_mantenimientos': eq.mantenimientos.count(),
        'mostrando': mantenimientos.count(),
        'historial': [
            {
                'id': m.id,
                'fecha': m.fecha_ejecucion.isoformat(),
                'estatus': m.estatus,
                'tecnico': (
                    f"{m.tecnico.get_full_name() or m.tecnico.username}"
                    if m.tecnico else 'Sin asignar'
                ),
                'estado_equipo_post': m.estado_equipo_post,
                'riesgo': m.riesgo_presentado,
                'actividades': m.actividades_realizadas[:120] + '…' if len(m.actividades_realizadas) > 120 else m.actividades_realizadas,
            }
            for m in mantenimientos
        ],
    }


# ─── obtener_resumen_general ──────────────────────────────────────

@register(
    name='obtener_resumen_general',
    description='Devuelve un resumen ejecutivo del estado actual del inventario: equipos, mantenimientos y técnicos.',
    parameters={},
)
def obtener_resumen_general(arguments: dict) -> dict:
    from django.db.models import Count
    from equipos.models import Equipo
    from mantenimientos.models import Mantenimiento
    from usuarios.models import Tecnico

    logger.info("[Tool] obtener_resumen_general")

    hoy = date.today()
    primer_dia_mes = hoy.replace(day=1)

    equipos_activos = Equipo.objects.filter(estado='ACTIVO').count()
    equipos_disponibles = Equipo.objects.filter(estado='DISPONIBLE').count()
    equipos_baja = Equipo.objects.filter(estado='BAJA').count()
    equipos_vencidos = Equipo.objects.filter(
        fecha_proximo_mantenimiento__lt=hoy,
    ).exclude(estado='BAJA').count()
    equipos_proximos = Equipo.objects.filter(
        fecha_proximo_mantenimiento__gte=hoy,
        fecha_proximo_mantenimiento__lte=hoy + timedelta(days=30),
    ).exclude(estado='BAJA').count()

    total_mantenimientos = Mantenimiento.objects.count()
    completados_mes = Mantenimiento.objects.filter(
        estatus='COMPLETADO',
        fecha_ejecucion__gte=primer_dia_mes,
    ).count()
    borradores = Mantenimiento.objects.filter(estatus='BORRADOR').count()
    pendientes_firma = Mantenimiento.objects.filter(
        estatus__in=['PENDIENTE_FIRMA_TECNICO', 'PENDIENTE_FIRMA_USUARIO']
    ).count()

    tecnicos_activos = Tecnico.objects.filter(is_active=True).count()

    return {
        'fecha_consulta': hoy.isoformat(),
        'equipos': {
            'activos': equipos_activos,
            'disponibles': equipos_disponibles,
            'baja': equipos_baja,
            'con_mantenimiento_vencido': equipos_vencidos,
            'con_mantenimiento_proximo_30d': equipos_proximos,
        },
        'mantenimientos': {
            'total_historico': total_mantenimientos,
            'completados_este_mes': completados_mes,
            'borradores_pendientes': borradores,
            'pendientes_firma': pendientes_firma,
        },
        'tecnicos': {
            'activos': tecnicos_activos,
        },
    }


# ─── listar_tecnicos_activos ──────────────────────────────────────

@register(
    name='listar_tecnicos_activos',
    description='Lista los técnicos activos del sistema con su carga de trabajo actual.',
    parameters={},
)
def listar_tecnicos_activos(arguments: dict) -> dict:
    from django.db.models import Count, Q
    from usuarios.models import Tecnico

    logger.info("[Tool] listar_tecnicos_activos")

    tecnicos = (
        Tecnico.objects
        .filter(is_active=True)
        .annotate(
            total_mantenimientos=Count('mantenimientos'),
            completados=Count('mantenimientos', filter=Q(mantenimientos__estatus='COMPLETADO')),
            borradores=Count('mantenimientos', filter=Q(mantenimientos__estatus='BORRADOR')),
            pendientes=Count('mantenimientos', filter=Q(
                mantenimientos__estatus__in=['PENDIENTE_FIRMA_TECNICO', 'PENDIENTE_FIRMA_USUARIO']
            )),
        )
        .order_by('-total_mantenimientos')
    )

    if not tecnicos.exists():
        return {'total': 0, 'mensaje': 'No hay técnicos activos registrados.'}

    return {
        'total': tecnicos.count(),
        'tecnicos': [
            {
                'id': t.id,
                'nombre': t.get_full_name() or t.username,
                'username': t.username,
                'email': t.email,
                'total_mantenimientos': t.total_mantenimientos,
                'completados': t.completados,
                'borradores': t.borradores,
                'pendientes_firma': t.pendientes,
            }
            for t in tecnicos
        ],
    }


# ─── programar_mantenimiento ──────────────────────────────────────

@register(
    name='programar_mantenimiento',
    description=(
        'Programa la fecha del próximo mantenimiento de un equipo. '
        'Actualiza el campo fecha_proximo_mantenimiento para que aparezca en el apartado de Próximos Mantenimientos. '
        'No crea ningún registro de mantenimiento, solo agenda la fecha.'
    ),
    parameters={
        'equipo_id': {
            'type': 'integer',
            'description': 'ID numérico del equipo',
            'required': True,
        },
        'fecha': {
            'type': 'string',
            'description': 'Fecha del próximo mantenimiento en formato YYYY-MM-DD (ej: 2025-06-15)',
            'required': True,
        },
    },
)
def programar_mantenimiento(arguments: dict) -> dict:
    from datetime import datetime
    from equipos.models import Equipo

    # ── equipo ───────────────────────────────────────────────────────
    try:
        equipo_id = int(arguments.get('equipo_id') or 0)
    except (TypeError, ValueError):
        return {'error': 'El parámetro equipo_id debe ser un número entero.'}
    if not equipo_id:
        return {'error': 'El parámetro equipo_id es requerido.'}

    try:
        equipo = Equipo.objects.get(pk=equipo_id)
    except Equipo.DoesNotExist:
        return {'error': f'No existe ningún equipo con id={equipo_id}.'}

    if equipo.estado == 'BAJA':
        return {'error': f'El equipo {equipo.codigo_interno} está dado de baja y no se le puede programar mantenimiento.'}

    # ── fecha ─────────────────────────────────────────────────────────
    fecha_str = (arguments.get('fecha') or '').strip()
    if not fecha_str:
        return {'error': 'El parámetro fecha es requerido (formato YYYY-MM-DD).'}
    try:
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
    except ValueError:
        return {'error': f'Formato de fecha inválido: "{fecha_str}". Usa YYYY-MM-DD.'}

    if fecha < date.today():
        return {'error': f'La fecha {fecha_str} ya pasó. Indica una fecha futura.'}

    logger.info(
        "[Tool] programar_mantenimiento equipo=%s fecha=%s",
        equipo.codigo_interno, fecha_str,
    )

    fecha_anterior = equipo.fecha_proximo_mantenimiento
    equipo.fecha_proximo_mantenimiento = fecha
    equipo.save(update_fields=['fecha_proximo_mantenimiento'])

    return {
        'ok': True,
        'equipo': f"{equipo.codigo_interno} — {equipo.marca} {equipo.modelo}",
        'fecha_anterior': fecha_anterior.isoformat() if fecha_anterior else None,
        'fecha_programada': fecha_str,
        'mensaje': (
            f'Próximo mantenimiento del equipo {equipo.codigo_interno} '
            f'programado para el {fecha_str}. '
            f'Ya aparece en el apartado de Próximos Mantenimientos.'
        ),
    }


# ─── listar_colaboradores_con_equipo ─────────────────────────────

@register(
    name='listar_colaboradores_con_equipo',
    description=(
        'Lista todos los colaboradores que tienen al menos un equipo asignado, '
        'con su nombre exacto tal como está en el sistema. Útil para saber el nombre '
        'correcto antes de buscar equipos por usuario.'
    ),
    parameters={
        'busqueda': {
            'type': 'string',
            'description': 'Filtrar por nombre parcial del colaborador (opcional)',
            'required': False,
        },
    },
)
def listar_colaboradores_con_equipo(arguments: dict) -> dict:
    from django.db.models import Count
    from equipos.models import Equipo

    busqueda = (arguments.get('busqueda') or '').strip()
    logger.info("[Tool] listar_colaboradores_con_equipo busqueda=%r", busqueda)

    qs = (
        Equipo.objects
        .exclude(colaborador_nombre='')
        .exclude(estado='BAJA')
    )
    if busqueda:
        qs = qs.filter(colaborador_nombre__icontains=busqueda)

    colaboradores = (
        qs.values('colaborador_nombre', 'colaborador_correo', 'colaborador_puesto')
        .annotate(total_equipos=Count('id'))
        .order_by('colaborador_nombre')
    )

    if not colaboradores:
        msg = (
            f'No se encontraron colaboradores con equipos asignados'
            f'{f" que coincidan con \"{busqueda}\"" if busqueda else ""}.'
        )
        return {'total': 0, 'mensaje': msg}

    return {
        'total': len(colaboradores),
        'colaboradores': [
            {
                'nombre': c['colaborador_nombre'],
                'correo': c['colaborador_correo'] or None,
                'puesto': c['colaborador_puesto'] or None,
                'equipos_asignados': c['total_equipos'],
            }
            for c in colaboradores
        ],
    }


# ─── buscar_equipos (unificada) ───────────────────────────────────

@register(
    name='buscar_equipos',
    description=(
        'Busca equipos de forma flexible por código interno, número de serie, '
        'nombre del colaborador o marca/modelo. Reemplaza buscar_equipo_por_serie, '
        'buscar_equipo_por_codigo y listar_equipos_por_usuario. '
        'Si no se especifica campo, intenta autodetectar el tipo de búsqueda.'
    ),
    parameters={
        'query': {
            'type': 'string',
            'description': 'Texto a buscar (código, serie, nombre de colaborador o marca/modelo)',
            'required': True,
        },
        'campo': {
            'type': 'string',
            'description': 'Campo a buscar: codigo, serie, colaborador, marca_modelo o auto (por defecto: auto)',
            'required': False,
        },
    },
)
def buscar_equipos(arguments: dict) -> dict:
    from django.db.models import Q
    from equipos.models import Equipo

    query = (arguments.get('query') or '').strip()
    campo = (arguments.get('campo') or 'auto').strip().lower()

    if not query:
        return {'error': 'El parámetro query es requerido.'}

    logger.info("[Tool] buscar_equipos query=%r campo=%r", query, campo)

    qs = Equipo.objects.exclude(estado='BAJA')

    if campo == 'codigo':
        qs = qs.filter(codigo_interno__iexact=query)
    elif campo == 'serie':
        qs = qs.filter(numero_serie__iexact=query)
    elif campo == 'colaborador':
        qs = qs.filter(colaborador_nombre__icontains=query)
    elif campo == 'marca_modelo':
        qs = qs.filter(Q(marca__icontains=query) | Q(modelo__icontains=query))
    else:  # auto
        qs = qs.filter(
            Q(codigo_interno__iexact=query) |
            Q(numero_serie__iexact=query) |
            Q(colaborador_nombre__icontains=query) |
            Q(marca__icontains=query) |
            Q(modelo__icontains=query)
        )

    qs = qs.order_by('codigo_interno')[:20]
    equipos = list(qs)

    if not equipos:
        return {
            'encontrado': False,
            'mensaje': f'No se encontraron equipos activos para "{query}".',
        }

    return {
        'encontrado': True,
        'total': len(equipos),
        'campo_usado': campo,
        'equipos': [_equipo_basico(e) for e in equipos],
    }


# ─── listar_mantenimientos_recientes ──────────────────────────────

@register(
    name='listar_mantenimientos_recientes',
    description='Lista los mantenimientos ejecutados en los últimos N días, opcionalmente filtrados por estatus.',
    parameters={
        'dias': {
            'type': 'integer',
            'description': 'Número de días hacia atrás (por defecto 7, máximo 365)',
            'required': False,
        },
        'estatus': {
            'type': 'string',
            'description': 'Filtrar por estatus: BORRADOR, COMPLETADO, PENDIENTE_FIRMA_TECNICO, PENDIENTE_FIRMA_USUARIO. Omitir para todos.',
            'required': False,
        },
    },
)
def listar_mantenimientos_recientes(arguments: dict) -> dict:
    from mantenimientos.models import Mantenimiento

    try:
        dias = int(arguments.get('dias') or 7)
        dias = max(1, min(dias, 365))
    except (TypeError, ValueError):
        dias = 7

    estatus = (arguments.get('estatus') or '').strip().upper() or None

    logger.info("[Tool] listar_mantenimientos_recientes dias=%d estatus=%r", dias, estatus)

    desde = date.today() - timedelta(days=dias)
    qs = (
        Mantenimiento.objects
        .filter(fecha_ejecucion__gte=desde)
        .select_related('equipo', 'tecnico')
        .order_by('-fecha_ejecucion')
    )
    if estatus:
        qs = qs.filter(estatus=estatus)

    total = qs.count()
    if total == 0:
        return {
            'total': 0,
            'dias_consultados': dias,
            'mensaje': f'No hay mantenimientos en los últimos {dias} días.',
        }

    return {
        'total': total,
        'dias_consultados': dias,
        'desde': desde.isoformat(),
        'mantenimientos': [
            {
                'id': m.id,
                'fecha': m.fecha_ejecucion.isoformat(),
                'estatus': m.estatus,
                'equipo': f"{m.equipo.codigo_interno} — {m.equipo.marca} {m.equipo.modelo}",
                'tecnico': (
                    f"{m.tecnico.get_full_name() or m.tecnico.username}"
                    if m.tecnico else 'Sin asignar'
                ),
                'riesgo': m.riesgo_presentado,
            }
            for m in qs[:30]
        ],
    }


# ─── obtener_equipos_con_riesgo ───────────────────────────────────

@register(
    name='obtener_equipos_con_riesgo',
    description=(
        'Devuelve equipos cuyo último mantenimiento reportó riesgo (riesgo_presentado=True). '
        'Útil para priorizar atención.'
    ),
    parameters={},
)
def obtener_equipos_con_riesgo(arguments: dict) -> dict:
    from mantenimientos.models import Mantenimiento

    logger.info("[Tool] obtener_equipos_con_riesgo")

    mants = (
        Mantenimiento.objects
        .filter(riesgo_presentado=True)
        .select_related('equipo', 'tecnico')
        .order_by('-fecha_ejecucion')[:30]
    )

    if not mants:
        return {'total': 0, 'mensaje': 'No hay mantenimientos con riesgo reportado.'}

    return {
        'total': len(mants),
        'equipos_con_riesgo': [
            {
                'mantenimiento_id': m.id,
                'fecha': m.fecha_ejecucion.isoformat(),
                'equipo': _equipo_basico(m.equipo),
                'descripcion_riesgo': m.descripcion_riesgo,
                'acciones_tomadas': m.acciones_tomadas,
                'tecnico': (
                    f"{m.tecnico.get_full_name() or m.tecnico.username}"
                    if m.tecnico else 'Sin asignar'
                ),
            }
            for m in mants
        ],
    }


# ─── obtener_mantenimientos_pendientes_firma ──────────────────────

@register(
    name='obtener_mantenimientos_pendientes_firma',
    description='Lista los mantenimientos que están pendientes de firma (de técnico o de usuario).',
    parameters={
        'tipo': {
            'type': 'string',
            'description': 'Tipo de firma pendiente: tecnico, usuario o ambos (por defecto: ambos)',
            'required': False,
        },
    },
)
def obtener_mantenimientos_pendientes_firma(arguments: dict) -> dict:
    from mantenimientos.models import Mantenimiento

    tipo = (arguments.get('tipo') or 'ambos').strip().lower()
    if tipo == 'tecnico':
        estatus_filter = ['PENDIENTE_FIRMA_TECNICO']
    elif tipo == 'usuario':
        estatus_filter = ['PENDIENTE_FIRMA_USUARIO']
    else:
        estatus_filter = ['PENDIENTE_FIRMA_TECNICO', 'PENDIENTE_FIRMA_USUARIO']

    logger.info("[Tool] obtener_mantenimientos_pendientes_firma tipo=%r", tipo)

    qs = (
        Mantenimiento.objects
        .filter(estatus__in=estatus_filter)
        .select_related('equipo', 'tecnico')
        .order_by('fecha_ejecucion')
    )

    total = qs.count()
    if total == 0:
        return {'total': 0, 'mensaje': 'No hay mantenimientos pendientes de firma.'}

    return {
        'total': total,
        'tipo': tipo,
        'mantenimientos': [
            {
                'id': m.id,
                'fecha': m.fecha_ejecucion.isoformat(),
                'estatus': m.estatus,
                'equipo': f"{m.equipo.codigo_interno} — {m.equipo.marca} {m.equipo.modelo}",
                'tecnico': (
                    f"{m.tecnico.get_full_name() or m.tecnico.username}"
                    if m.tecnico else 'Sin asignar'
                ),
            }
            for m in qs[:30]
        ],
    }


# ─── estadisticas_mantenimientos ──────────────────────────────────

@register(
    name='estadisticas_mantenimientos',
    description=(
        'Devuelve estadísticas de mantenimientos en un rango de fechas: '
        'total, desglose por estatus, por técnico y por mes. '
        'Si no se indican fechas, usa los últimos 90 días.'
    ),
    parameters={
        'desde': {
            'type': 'string',
            'description': 'Fecha inicial YYYY-MM-DD (inclusive). Por defecto: hace 90 días.',
            'required': False,
        },
        'hasta': {
            'type': 'string',
            'description': 'Fecha final YYYY-MM-DD (inclusive). Por defecto: hoy.',
            'required': False,
        },
    },
)
def estadisticas_mantenimientos(arguments: dict) -> dict:
    from datetime import datetime
    from django.db.models import Count
    from django.db.models.functions import TruncMonth
    from mantenimientos.models import Mantenimiento

    def _parse(s, default):
        s = (s or '').strip()
        if not s:
            return default
        try:
            return datetime.strptime(s, '%Y-%m-%d').date()
        except ValueError:
            return None

    hoy = date.today()
    desde = _parse(arguments.get('desde'), hoy - timedelta(days=90))
    hasta = _parse(arguments.get('hasta'), hoy)

    if desde is None or hasta is None:
        return {'error': 'Formato de fecha inválido. Usa YYYY-MM-DD.'}
    if desde > hasta:
        return {'error': 'La fecha desde no puede ser mayor que hasta.'}

    logger.info("[Tool] estadisticas_mantenimientos desde=%s hasta=%s", desde, hasta)

    qs = Mantenimiento.objects.filter(
        fecha_ejecucion__gte=desde,
        fecha_ejecucion__lte=hasta,
    )

    total = qs.count()
    if total == 0:
        return {
            'total': 0,
            'desde': desde.isoformat(),
            'hasta': hasta.isoformat(),
            'mensaje': 'No hay mantenimientos en el rango indicado.',
        }

    por_estatus = dict(
        qs.values_list('estatus').annotate(n=Count('id')).values_list('estatus', 'n')
    )
    por_tecnico = list(
        qs.values('tecnico__username', 'tecnico__first_name', 'tecnico__last_name')
        .annotate(n=Count('id'))
        .order_by('-n')[:10]
    )
    por_mes = list(
        qs.annotate(mes=TruncMonth('fecha_ejecucion'))
        .values('mes')
        .annotate(n=Count('id'))
        .order_by('mes')
    )
    con_riesgo = qs.filter(riesgo_presentado=True).count()

    return {
        'total': total,
        'desde': desde.isoformat(),
        'hasta': hasta.isoformat(),
        'con_riesgo': con_riesgo,
        'por_estatus': por_estatus,
        'top_tecnicos': [
            {
                'tecnico': (
                    f"{(t['tecnico__first_name'] or '').strip()} "
                    f"{(t['tecnico__last_name'] or '').strip()}".strip()
                    or t['tecnico__username']
                    or 'Sin asignar'
                ),
                'total': t['n'],
            }
            for t in por_tecnico
        ],
        'por_mes': [
            {'mes': r['mes'].strftime('%Y-%m') if r['mes'] else None, 'total': r['n']}
            for r in por_mes
        ],
    }


# ─── obtener_carga_tecnico ────────────────────────────────────────

@register(
    name='obtener_carga_tecnico',
    description=(
        'Devuelve la carga de trabajo detallada de un técnico específico: '
        'pendientes, completados del mes, último mantenimiento y total histórico. '
        'Usa esta tool cuando quieras ver el detalle de UN técnico (para listar todos usa listar_tecnicos_activos).'
    ),
    parameters={
        'tecnico': {
            'type': 'string',
            'description': 'Nombre, apellido o username del técnico',
            'required': True,
        },
    },
)
def obtener_carga_tecnico(arguments: dict) -> dict:
    from django.db.models import Q
    from mantenimientos.models import Mantenimiento
    from usuarios.models import Tecnico

    tecnico_q = (arguments.get('tecnico') or '').strip()
    if not tecnico_q:
        return {'error': 'El parámetro tecnico es requerido.'}

    logger.info("[Tool] obtener_carga_tecnico tecnico=%r", tecnico_q)

    tecnicos = Tecnico.objects.filter(
        Q(first_name__icontains=tecnico_q) |
        Q(last_name__icontains=tecnico_q) |
        Q(username__icontains=tecnico_q)
    )

    if not tecnicos.exists():
        return {'encontrado': False, 'mensaje': f'No se encontró técnico para "{tecnico_q}".'}

    if tecnicos.count() > 1:
        return {
            'encontrado': True,
            'multiples': True,
            'mensaje': 'Se encontraron múltiples técnicos, especifica con más detalle.',
            'candidatos': [
                {'username': t.username, 'nombre': t.get_full_name() or t.username}
                for t in tecnicos[:10]
            ],
        }

    t = tecnicos.first()
    hoy = date.today()
    primer_dia_mes = hoy.replace(day=1)

    mants = Mantenimiento.objects.filter(tecnico=t)
    total = mants.count()
    completados_mes = mants.filter(
        estatus='COMPLETADO', fecha_ejecucion__gte=primer_dia_mes,
    ).count()
    borradores = mants.filter(estatus='BORRADOR').count()
    pendientes_firma = mants.filter(
        estatus__in=['PENDIENTE_FIRMA_TECNICO', 'PENDIENTE_FIRMA_USUARIO']
    ).count()
    ultimo = mants.order_by('-fecha_ejecucion').first()

    return {
        'encontrado': True,
        'tecnico': {
            'id': t.id,
            'nombre': t.get_full_name() or t.username,
            'username': t.username,
            'email': t.email,
            'activo': t.is_active,
        },
        'total_historico': total,
        'completados_este_mes': completados_mes,
        'borradores': borradores,
        'pendientes_firma': pendientes_firma,
        'ultimo_mantenimiento': (
            {
                'id': ultimo.id,
                'fecha': ultimo.fecha_ejecucion.isoformat(),
                'estatus': ultimo.estatus,
                'equipo': f"{ultimo.equipo.codigo_interno} — {ultimo.equipo.marca} {ultimo.equipo.modelo}",
            }
            if ultimo else None
        ),
    }


# ─── helper ───────────────────────────────────────────────────────

def _equipo_basico(eq) -> dict:
    return {
        'equipo_id': eq.id,
        'id': eq.id,
        'codigo_interno': eq.codigo_interno,
        'marca': eq.marca,
        'modelo': eq.modelo,
        'tipo_equipo': eq.tipo_equipo,
        'ubicacion': eq.ubicacion,
        'colaborador_nombre': eq.colaborador_nombre or 'Sin asignar',
        'estado': eq.estado,
        'fecha_ultimo_mantenimiento': (
            eq.fecha_ultimo_mantenimiento.isoformat()
            if eq.fecha_ultimo_mantenimiento else None
        ),
        'fecha_proximo_mantenimiento': (
            eq.fecha_proximo_mantenimiento.isoformat()
            if eq.fecha_proximo_mantenimiento else None
        ),
    }

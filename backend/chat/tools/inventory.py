"""
Tools de inventario y mantenimiento.
Cada función recibe un dict de argumentos validados y devuelve un dict serializable.
Las queries usan el ORM de Django directamente — el modelo NUNCA accede a la BD.
"""
import logging
from datetime import date, timedelta

from .registry import register

logger = logging.getLogger(__name__)


# ─── buscar_equipo_por_serie ───────────────────────────────────────

@register(
    name='buscar_equipo_por_serie',
    description='Busca un equipo por su número de serie y devuelve sus datos básicos.',
    parameters={
        'serie': {
            'type': 'string',
            'description': 'Número de serie del equipo',
            'required': True,
        },
    },
)
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


# ─── listar_equipos_por_usuario ────────────────────────────────────

@register(
    name='listar_equipos_por_usuario',
    description='Lista los equipos asignados a un colaborador buscando por nombre.',
    parameters={
        'usuario': {
            'type': 'string',
            'description': 'Nombre (o parte del nombre) del colaborador',
            'required': True,
        },
    },
)
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


# ─── helper ───────────────────────────────────────────────────────

def _equipo_basico(eq) -> dict:
    return {
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

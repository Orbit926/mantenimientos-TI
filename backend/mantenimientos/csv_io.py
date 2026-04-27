"""Exportación de mantenimientos a CSV.

Export-only: los mantenimientos son datos históricos (con firmas, PDFs,
evidencias, etc.), por lo que la importación masiva en CSV no tiene sentido
y se omite deliberadamente.
"""
import csv

from django.http import HttpResponse


CSV_HEADERS = [
    'id',
    'fecha_ejecucion',
    'hora_inicio',
    'hora_fin',
    'estatus',
    'tipo_mantenimiento',
    'equipo_codigo',
    'equipo_marca',
    'equipo_modelo',
    'equipo_tipo',
    'equipo_ubicacion',
    'departamento_area',
    'responsable_area',
    'tecnico',
    'estado_equipo_post',
    'riesgo_presentado',
    'descripcion_riesgo',
    'acciones_tomadas',
    'actividades_realizadas',
    'materiales_utilizados',
    'observaciones_tecnico',
    'fecha_sugerida_proximo_mantenimiento',
    'created_at',
]


def _fmt(value):
    if value is None or value == '':
        return ''
    if hasattr(value, 'isoformat'):
        return value.isoformat(timespec='seconds') if hasattr(value, 'hour') else value.isoformat()
    return str(value)


def _tecnico_nombre(m):
    if not m.tecnico_id:
        return ''
    t = m.tecnico
    nombre = f"{t.first_name or ''} {t.last_name or ''}".strip()
    return nombre or t.username


def export_mantenimientos_csv(queryset, filename='mantenimientos.csv'):
    """Devuelve un HttpResponse con el contenido del queryset serializado a CSV.

    Usa BOM para que Excel interprete UTF-8 con acentos correctamente.
    Los campos de texto largo (actividades, materiales, observaciones) se
    incluyen tal cual; csv.writer escapa comillas y saltos de línea.
    """
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response.write('\ufeff')  # BOM para Excel

    writer = csv.writer(response)
    writer.writerow(CSV_HEADERS)

    # `select_related('equipo', 'tecnico')` se asume ya aplicado en el viewset.
    for m in queryset.iterator():
        eq = m.equipo
        writer.writerow([
            m.id,
            _fmt(m.fecha_ejecucion),
            _fmt(m.hora_inicio),
            _fmt(m.hora_fin),
            m.estatus,
            m.tipo_mantenimiento,
            eq.codigo_interno if eq else '',
            eq.marca if eq else '',
            eq.modelo if eq else '',
            eq.tipo_equipo if eq else '',
            eq.ubicacion if eq else '',
            m.departamento_area,
            m.responsable_area,
            _tecnico_nombre(m),
            m.estado_equipo_post,
            'Sí' if m.riesgo_presentado else 'No',
            m.descripcion_riesgo,
            m.acciones_tomadas,
            m.actividades_realizadas,
            m.materiales_utilizados,
            m.observaciones_tecnico,
            _fmt(m.fecha_sugerida_proximo_mantenimiento),
            _fmt(m.created_at),
        ])

    return response

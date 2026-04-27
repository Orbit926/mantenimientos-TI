"""Helpers para importar/exportar equipos en CSV.

No requiere dependencias externas: solo usa `csv` e `io` de la stdlib.
La estrategia de import es "todo o nada": si UNA fila falla, se aborta sin
crear ningún registro y se devuelve la lista de errores con su número de fila.
"""
import csv
import io

from django.db import transaction
from django.http import HttpResponse

from .models import Equipo
from .serializers import EquipoDetailSerializer


# Encabezados del CSV en orden de exportación.
# Los primeros son los campos editables (los mismos que acepta el serializer);
# los últimos son metadatos informativos (no se usan en import).
CSV_HEADERS_IMPORT = [
    'codigo_interno',
    'marca',
    'modelo',
    'numero_serie',
    'tipo_equipo',
    'ubicacion',
    'colaborador_nombre',
    'colaborador_correo',
    'colaborador_puesto',
    'fecha_proximo_mantenimiento',
]

CSV_HEADERS_EXPORT = CSV_HEADERS_IMPORT + [
    'estado',
    'fecha_alta',
    'fecha_baja',
    'fecha_ultimo_mantenimiento',
]

# Subconjunto de encabezados que NO pueden faltar en un CSV de import.
# El resto puede omitirse en el archivo (se asume vacío).
CSV_HEADERS_REQUIRED = [
    'codigo_interno',
    'marca',
    'modelo',
    'tipo_equipo',
    'ubicacion',
]


def _fmt_date(value):
    return value.isoformat() if value else ''


def export_equipos_csv(queryset, filename='equipos.csv'):
    """Devuelve un HttpResponse con el contenido del queryset serializado a CSV.

    Usa BOM (\ufeff) para que Excel reconozca UTF-8 con acentos correctamente.
    """
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response.write('\ufeff')  # BOM para Excel

    writer = csv.writer(response)
    writer.writerow(CSV_HEADERS_EXPORT)

    for eq in queryset.iterator():
        writer.writerow([
            eq.codigo_interno,
            eq.marca,
            eq.modelo,
            eq.numero_serie,
            eq.tipo_equipo,
            eq.ubicacion,
            eq.colaborador_nombre,
            eq.colaborador_correo,
            eq.colaborador_puesto,
            _fmt_date(eq.fecha_proximo_mantenimiento),
            eq.estado,
            _fmt_date(eq.fecha_alta),
            _fmt_date(eq.fecha_baja),
            _fmt_date(eq.fecha_ultimo_mantenimiento),
        ])

    return response


class CSVImportError(Exception):
    """Error de validación a nivel del archivo (no de filas individuales).

    Se usa para condiciones que impiden siquiera procesar el CSV: archivo
    vacío, encoding inválido, encabezados faltantes, etc.
    """

    def __init__(self, mensaje):
        super().__init__(mensaje)
        self.mensaje = mensaje


def import_equipos_csv(archivo, sync_estado=None):
    """Importa equipos desde un archivo CSV.

    `archivo`: objeto file-like (django UploadedFile, BytesIO, etc.).
    `sync_estado`: callable opcional que recibe un Equipo recién guardado
    para sincronizar su `estado`/`activo` (mismo método que usa el ViewSet
    en `perform_create`).

    Retorna un dict con: `creados`, `fallidos`, `errores`.

    Si hay errores, NO se crea ningún equipo (transacción atómica revertida)
    y `creados` será 0. La respuesta incluye el detalle por fila.

    Lanza `CSVImportError` para errores que impiden procesar el archivo.
    """
    # --- Decodificar ---------------------------------------------------
    raw = archivo.read()
    if not raw:
        raise CSVImportError('El archivo está vacío.')

    try:
        contenido = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        raise CSVImportError(
            'El archivo no está codificado en UTF-8. '
            'Guárdalo desde Excel como "CSV UTF-8 (delimitado por comas)".'
        )

    # --- Parsear --------------------------------------------------------
    reader = csv.DictReader(io.StringIO(contenido))
    if not reader.fieldnames:
        raise CSVImportError('El archivo no tiene encabezados.')

    headers = [(h or '').strip() for h in reader.fieldnames]
    faltantes = [h for h in CSV_HEADERS_REQUIRED if h not in headers]
    if faltantes:
        raise CSVImportError(
            f'Faltan encabezados obligatorios: {", ".join(faltantes)}. '
            f'Encabezados esperados: {", ".join(CSV_HEADERS_IMPORT)}.'
        )

    # --- Validar fila por fila -----------------------------------------
    errores = []
    filas_ok = []  # lista de (numero_fila, serializer_listo_para_save)
    codigos_vistos = {}  # codigo -> numero_fila (para detectar duplicados internos)

    for idx, raw_row in enumerate(reader, start=2):  # fila 1 = encabezados
        # Normaliza claves (espacios) y valores (strip).
        row = {
            (k or '').strip(): (v or '').strip() if isinstance(v, str) else v
            for k, v in raw_row.items()
            if k
        }

        # Saltar filas completamente vacías.
        if not any(row.values()):
            continue

        # Solo nos quedamos con campos importables.
        data = {k: row.get(k, '') for k in CSV_HEADERS_IMPORT}

        # Fechas vacías → None (el serializer las trata como null).
        if not data.get('fecha_proximo_mantenimiento'):
            data['fecha_proximo_mantenimiento'] = None

        # Detectar duplicados dentro del propio archivo.
        codigo = data.get('codigo_interno', '')
        if codigo:
            if codigo in codigos_vistos:
                errores.append({
                    'fila': idx,
                    'errores': {
                        'codigo_interno': [
                            f'El código "{codigo}" ya aparece en la fila '
                            f'{codigos_vistos[codigo]}.'
                        ]
                    },
                })
                continue
            codigos_vistos[codigo] = idx

        # Validación con el serializer existente (asegura las MISMAS reglas
        # que la API de creación normal: choices, unique, required, etc).
        ser = EquipoDetailSerializer(data=data)
        if ser.is_valid():
            filas_ok.append((idx, ser))
        else:
            errores.append({'fila': idx, 'errores': ser.errors})

    # --- Si hay errores, abortamos sin guardar nada --------------------
    if errores:
        return {
            'creados': 0,
            'fallidos': len(errores),
            'errores': errores,
        }

    if not filas_ok:
        raise CSVImportError('El archivo no contiene filas con datos.')

    # --- Guardado atómico ----------------------------------------------
    with transaction.atomic():
        for _, ser in filas_ok:
            equipo = ser.save()
            if sync_estado:
                sync_estado(equipo)
                equipo.save(update_fields=['estado', 'activo'])

    return {
        'creados': len(filas_ok),
        'fallidos': 0,
        'errores': [],
    }

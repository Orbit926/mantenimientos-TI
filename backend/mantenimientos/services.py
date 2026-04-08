import base64
import os
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from django.utils import timezone
from xhtml2pdf import pisa


def _imagen_a_base64(field):
    """Convierte un ImageField/FileField a data URI base64 para embeber en HTML."""
    if not field:
        return None
    full_path = os.path.join(settings.MEDIA_ROOT, field.name)
    if not os.path.exists(full_path):
        return None
    with open(full_path, 'rb') as f:
        data = f.read()
    ext = os.path.splitext(full_path)[1].lower().lstrip('.')
    mime = 'jpeg' if ext in ['jpg', 'jpeg'] else ext
    return f"data:image/{mime};base64,{base64.b64encode(data).decode()}"


def generar_pdf_mantenimiento(mantenimiento):
    """
    Genera el PDF oficial del mantenimiento, lo guarda localmente
    y actualiza los campos documento_pdf y documento_pdf_generado_en.
    """
    firmas_qs = mantenimiento.firmas.all()
    firmas = {f.tipo_firma: f for f in firmas_qs}

    context = {
        'mantenimiento': mantenimiento,
        'equipo': mantenimiento.equipo,
        'checklist': mantenimiento.checklist_respuestas.select_related('checklist_item').all(),
        'firma_tecnico': firmas.get('TECNICO'),
        'firma_usuario': firmas.get('USUARIO'),
        'firma_tecnico_b64': _imagen_a_base64(firmas['TECNICO'].firma_imagen) if 'TECNICO' in firmas else None,
        'firma_usuario_b64': _imagen_a_base64(firmas['USUARIO'].firma_imagen) if 'USUARIO' in firmas else None,
    }

    html_string = render_to_string('pdf/mantenimiento.html', context)
    buffer = BytesIO()
    status = pisa.CreatePDF(html_string, dest=buffer)

    if status.err:
        raise Exception('Error al generar el PDF del mantenimiento.')

    filename = f'mantenimiento_{mantenimiento.id}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.pdf'
    mantenimiento.documento_pdf.save(filename, ContentFile(buffer.getvalue()), save=False)
    mantenimiento.documento_pdf_generado_en = timezone.now()
    mantenimiento.save(update_fields=['documento_pdf', 'documento_pdf_generado_en'])

    return mantenimiento

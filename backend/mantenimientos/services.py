import base64
import os
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.template.loader import render_to_string
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont
from xhtml2pdf import pisa


_WATERMARK_CACHE = {}


def _watermark_borrador_b64(texto='BORRADOR'):
    """Genera (y cachea) una imagen PNG con el texto en diagonal para marca de agua."""
    if texto in _WATERMARK_CACHE:
        return _WATERMARK_CACHE[texto]

    W, H = 1400, 1800
    img = Image.new('RGBA', (W, H), (255, 255, 255, 0))

    # Lienzo auxiliar para rotar el texto
    txt_layer = Image.new('RGBA', (1800, 400), (255, 255, 255, 0))
    draw = ImageDraw.Draw(txt_layer)

    font = None
    for path in [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
        '/Library/Fonts/Arial Bold.ttf',
    ]:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, 260)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()

    # Texto rojo tenue, semitransparente
    draw.text((40, 40), texto, font=font, fill=(200, 0, 0, 75))

    rotated = txt_layer.rotate(30, expand=1, resample=Image.BICUBIC)
    x = (W - rotated.width) // 2
    y = (H - rotated.height) // 2
    img.paste(rotated, (x, y), rotated)

    buf = BytesIO()
    img.save(buf, format='PNG')
    data_uri = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    _WATERMARK_CACHE[texto] = data_uri
    return data_uri


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

    evidencias = []
    for ev in mantenimiento.evidencias.all():
        evidencias.append({
            'tipo_display': ev.get_tipo_display(),
            'descripcion': ev.descripcion,
            'imagen_b64': _imagen_a_base64(ev.imagen),
        })

    context = {
        'mantenimiento': mantenimiento,
        'equipo': mantenimiento.equipo,
        'checklist': mantenimiento.checklist_respuestas.select_related('checklist_item').all(),
        'evidencias': evidencias,
        'firma_tecnico': firmas.get('TECNICO'),
        'firma_usuario': firmas.get('USUARIO'),
        'firma_tecnico_b64': _imagen_a_base64(firmas['TECNICO'].firma_imagen) if 'TECNICO' in firmas else None,
        'firma_usuario_b64': _imagen_a_base64(firmas['USUARIO'].firma_imagen) if 'USUARIO' in firmas else None,
        'watermark_b64': _watermark_borrador_b64() if mantenimiento.estatus != 'COMPLETADO' else None,
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

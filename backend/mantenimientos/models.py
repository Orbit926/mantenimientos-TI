from django.conf import settings
from django.db import models

from equipos.models import Equipo


class ChecklistItem(models.Model):
    nombre = models.CharField(max_length=200)
    categoria = models.CharField(max_length=100, blank=True)
    activo = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name = 'Item de Checklist'
        verbose_name_plural = 'Items de Checklist'

    def __str__(self):
        return self.nombre


class Mantenimiento(models.Model):
    ESTADO_EQUIPO_CHOICES = [
        ('OPERATIVO', 'Operativo'),
        ('OPERATIVO_OBSERVACIONES', 'Operativo con observaciones'),
        ('NO_OPERATIVO', 'No operativo'),
    ]
    ESTATUS_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('PENDIENTE_FIRMA_TECNICO', 'Pendiente firma técnico'),
        ('PENDIENTE_FIRMA_USUARIO', 'Pendiente firma usuario'),
        ('COMPLETADO', 'Completado'),
    ]

    equipo = models.ForeignKey(Equipo, on_delete=models.PROTECT, related_name='mantenimientos')
    departamento_area = models.CharField(max_length=200)
    responsable_area = models.CharField(max_length=200)
    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='mantenimientos',
        null=True, blank=True,
    )
    fecha_ejecucion = models.DateField()
    hora_inicio = models.TimeField(null=True, blank=True)
    hora_fin = models.TimeField(null=True, blank=True)
    actividades_realizadas = models.TextField(blank=True)
    materiales_utilizados = models.TextField(blank=True)
    estado_equipo_post = models.CharField(max_length=30, choices=ESTADO_EQUIPO_CHOICES, blank=True)
    observaciones_tecnico = models.TextField(blank=True)
    riesgo_presentado = models.BooleanField(default=False)
    descripcion_riesgo = models.TextField(blank=True)
    acciones_tomadas = models.TextField(blank=True)
    fecha_sugerida_proximo_mantenimiento = models.DateField(null=True, blank=True)
    estatus = models.CharField(max_length=30, choices=ESTATUS_CHOICES, default='BORRADOR')
    documento_pdf = models.FileField(upload_to='documentos/mantenimientos/', null=True, blank=True)
    documento_pdf_generado_en = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-fecha_ejecucion', '-created_at']
        verbose_name = 'Mantenimiento'
        verbose_name_plural = 'Mantenimientos'

    def __str__(self):
        return f"Mantenimiento #{self.id} - {self.equipo.codigo_interno} ({self.fecha_ejecucion})"


class ChecklistRespuesta(models.Model):
    mantenimiento = models.ForeignKey(
        Mantenimiento, on_delete=models.CASCADE, related_name='checklist_respuestas'
    )
    checklist_item = models.ForeignKey(
        ChecklistItem, on_delete=models.PROTECT, related_name='respuestas'
    )
    realizado = models.BooleanField(default=False)
    observacion = models.CharField(max_length=500, blank=True)

    class Meta:
        unique_together = ('mantenimiento', 'checklist_item')
        verbose_name = 'Respuesta de Checklist'
        verbose_name_plural = 'Respuestas de Checklist'

    def __str__(self):
        return f"{self.mantenimiento_id} - {self.checklist_item.nombre}"


class EvidenciaMantenimiento(models.Model):
    """
    Fotografías que sirven como evidencia del estado del equipo durante un mantenimiento.

    La imagen se almacena usando el backend de storage configurado en settings
    (DEFAULT_FILE_STORAGE). Por defecto es el sistema de archivos local
    (MEDIA_ROOT/evidencias/mantenimientos/), pero puede cambiarse a S3, GCS u
    otro bucket simplemente configurando django-storages, sin modificar este modelo.
    """
    TIPO_CHOICES = [
        ('ANTES', 'Antes del mantenimiento'),
        ('DURANTE', 'Durante el mantenimiento'),
        ('DESPUES', 'Después del mantenimiento'),
        ('GENERAL', 'Evidencia general'),
    ]

    mantenimiento = models.ForeignKey(
        Mantenimiento, on_delete=models.CASCADE, related_name='evidencias'
    )
    imagen = models.ImageField(upload_to='evidencias/mantenimientos/')
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='GENERAL')
    descripcion = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['tipo', 'created_at']
        verbose_name = 'Evidencia de Mantenimiento'
        verbose_name_plural = 'Evidencias de Mantenimiento'

    def __str__(self):
        return f"Evidencia {self.tipo} - Mantenimiento #{self.mantenimiento_id}"


class Firma(models.Model):
    TIPO_CHOICES = [
        ('TECNICO', 'Técnico'),
        ('USUARIO', 'Usuario'),
    ]

    mantenimiento = models.ForeignKey(
        Mantenimiento, on_delete=models.CASCADE, related_name='firmas'
    )
    tipo_firma = models.CharField(max_length=10, choices=TIPO_CHOICES)
    nombre_firmante = models.CharField(max_length=200)
    cargo_firmante = models.CharField(max_length=200, blank=True)
    firma_imagen = models.ImageField(upload_to='firmas/')
    fecha_firma = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('mantenimiento', 'tipo_firma')
        verbose_name = 'Firma'
        verbose_name_plural = 'Firmas'

    def __str__(self):
        return f"Firma {self.tipo_firma} - Mantenimiento #{self.mantenimiento_id}"

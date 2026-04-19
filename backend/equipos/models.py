from django.db import models


class Equipo(models.Model):
    ESTADO_CHOICES = [
        ('ACTIVO', 'Activo'),
        ('DISPONIBLE', 'Disponible'),
        ('BAJA', 'Baja'),
    ]

    TIPO_CHOICES = [
        ('LAPTOP', 'Laptop'),
        ('DESKTOP', 'Desktop'),
        ('IMPRESORA', 'Impresora'),
        ('SERVIDOR', 'Servidor'),
        ('MONITOR', 'Monitor'),
        ('OTRO', 'Otro'),
    ]

    codigo_interno = models.CharField(max_length=50, unique=True)
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    numero_serie = models.CharField(max_length=100, blank=True)
    tipo_equipo = models.CharField(max_length=50, choices=TIPO_CHOICES)
    ubicacion = models.CharField(max_length=200)
    colaborador_nombre = models.CharField(max_length=200, blank=True)
    colaborador_correo = models.EmailField(blank=True)
    colaborador_puesto = models.CharField(max_length=200, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='DISPONIBLE')
    activo = models.BooleanField(default=True)  # kept for backward-compat queries
    fecha_alta = models.DateField(auto_now_add=True)
    fecha_baja = models.DateField(null=True, blank=True)
    motivo_baja = models.TextField(null=True, blank=True)
    fecha_ultimo_mantenimiento = models.DateField(null=True, blank=True)
    fecha_proximo_mantenimiento = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['codigo_interno']
        verbose_name = 'Equipo'
        verbose_name_plural = 'Equipos'

    def __str__(self):
        return f"{self.codigo_interno} - {self.marca} {self.modelo}"

from django.contrib import admin

from .models import Equipo


@admin.register(Equipo)
class EquipoAdmin(admin.ModelAdmin):
    list_display = ['codigo_interno', 'marca', 'modelo', 'tipo_equipo', 'ubicacion', 'activo', 'fecha_proximo_mantenimiento']
    list_filter = ['activo', 'tipo_equipo']
    search_fields = ['codigo_interno', 'marca', 'modelo', 'colaborador_nombre']

from django.contrib import admin

from .models import ChecklistItem, ChecklistRespuesta, EvidenciaMantenimiento, Firma, Mantenimiento


@admin.register(ChecklistItem)
class ChecklistItemAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'categoria', 'orden', 'activo']
    list_filter = ['activo', 'categoria']
    ordering = ['orden']


class ChecklistRespuestaInline(admin.TabularInline):
    model = ChecklistRespuesta
    extra = 0


class FirmaInline(admin.TabularInline):
    model = Firma
    extra = 0
    readonly_fields = ['fecha_firma']


class EvidenciaInline(admin.TabularInline):
    model = EvidenciaMantenimiento
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Mantenimiento)
class MantenimientoAdmin(admin.ModelAdmin):
    list_display = ['id', 'equipo', 'tecnico_nombre', 'fecha_ejecucion', 'estatus', 'estado_equipo_post']
    list_filter = ['estatus', 'estado_equipo_post', 'riesgo_presentado']
    search_fields = ['equipo__codigo_interno', 'tecnico_nombre', 'departamento_area']
    inlines = [ChecklistRespuestaInline, EvidenciaInline, FirmaInline]
    readonly_fields = ['created_at', 'updated_at', 'documento_pdf_generado_en']

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import Tecnico


@admin.register(Tecnico)
class TecnicoAdmin(DjangoUserAdmin):
    ordering = ('first_name', 'last_name')
    list_display = ('username', 'get_full_name', 'puesto', 'activo', 'is_staff', 'is_active')
    list_filter = ('activo', 'is_staff', 'is_active')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'puesto')

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Información personal'), {'fields': ('first_name', 'last_name', 'email', 'puesto')}),
        (_('Estado'), {'fields': ('activo', 'is_active')}),
        (_('Permisos'), {'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Fechas importantes'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'first_name', 'last_name', 'puesto', 'password1', 'password2'),
        }),
    )

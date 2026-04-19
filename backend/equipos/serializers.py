from rest_framework import serializers
from .models import Equipo


class EquipoListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipo
        fields = [
            'id', 'codigo_interno', 'marca', 'modelo', 'tipo_equipo',
            'ubicacion', 'colaborador_nombre', 'estado', 'activo',
            'fecha_ultimo_mantenimiento', 'fecha_proximo_mantenimiento',
        ]


class EquipoDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipo
        fields = '__all__'
        read_only_fields = [
            'estado', 'activo', 'fecha_alta', 'fecha_baja', 'motivo_baja',
            'fecha_ultimo_mantenimiento',
            'created_at', 'updated_at',
        ]


class EquipoBajaSerializer(serializers.Serializer):
    motivo_baja = serializers.CharField(required=True, min_length=5)

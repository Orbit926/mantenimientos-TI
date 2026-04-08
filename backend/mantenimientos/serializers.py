from rest_framework import serializers

from .models import ChecklistItem, ChecklistRespuesta, Firma, Mantenimiento


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = ['id', 'nombre', 'categoria', 'activo', 'orden']


class ChecklistRespuestaSerializer(serializers.ModelSerializer):
    checklist_item_nombre = serializers.CharField(source='checklist_item.nombre', read_only=True)

    class Meta:
        model = ChecklistRespuesta
        fields = ['id', 'checklist_item', 'checklist_item_nombre', 'realizado', 'observacion']


class _ChecklistRespuestaInputSerializer(serializers.Serializer):
    checklist_item = serializers.PrimaryKeyRelatedField(queryset=ChecklistItem.objects.filter(activo=True))
    realizado = serializers.BooleanField(default=False)
    observacion = serializers.CharField(required=False, allow_blank=True, default='')


class ChecklistRespuestaBulkSerializer(serializers.Serializer):
    respuestas = _ChecklistRespuestaInputSerializer(many=True)

    def save(self):
        mantenimiento = self.context['mantenimiento']
        for item in self.validated_data['respuestas']:
            ChecklistRespuesta.objects.update_or_create(
                mantenimiento=mantenimiento,
                checklist_item=item['checklist_item'],
                defaults={
                    'realizado': item['realizado'],
                    'observacion': item.get('observacion', ''),
                },
            )


class FirmaSerializer(serializers.ModelSerializer):
    firma_imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = Firma
        fields = [
            'id', 'tipo_firma', 'nombre_firmante', 'cargo_firmante',
            'firma_imagen', 'firma_imagen_url', 'fecha_firma',
        ]
        extra_kwargs = {'firma_imagen': {'write_only': True}}

    def get_firma_imagen_url(self, obj):
        request = self.context.get('request')
        if obj.firma_imagen and request:
            return request.build_absolute_uri(obj.firma_imagen.url)
        return None


class MantenimientoListSerializer(serializers.ModelSerializer):
    equipo_codigo = serializers.CharField(source='equipo.codigo_interno', read_only=True)
    equipo_descripcion = serializers.SerializerMethodField()

    class Meta:
        model = Mantenimiento
        fields = [
            'id', 'equipo', 'equipo_codigo', 'equipo_descripcion',
            'departamento_area', 'tecnico_nombre', 'fecha_ejecucion',
            'estatus', 'estado_equipo_post', 'created_at',
        ]

    def get_equipo_descripcion(self, obj):
        return f"{obj.equipo.marca} {obj.equipo.modelo}"


class MantenimientoDetailSerializer(serializers.ModelSerializer):
    documento_pdf_url = serializers.SerializerMethodField()
    firmas = FirmaSerializer(many=True, read_only=True, context={'request': None})
    checklist_respuestas = ChecklistRespuestaSerializer(many=True, read_only=True)

    class Meta:
        model = Mantenimiento
        fields = '__all__'
        read_only_fields = [
            'estatus', 'documento_pdf', 'documento_pdf_generado_en',
            'created_at', 'updated_at',
        ]

    def get_documento_pdf_url(self, obj):
        request = self.context.get('request')
        if obj.documento_pdf and request:
            return request.build_absolute_uri(obj.documento_pdf.url)
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        ret['firmas'] = FirmaSerializer(
            instance.firmas.all(), many=True, context={'request': request}
        ).data
        return ret

    def validate_equipo(self, value):
        if not value.activo:
            raise serializers.ValidationError('No se puede crear un mantenimiento para un equipo inactivo.')
        return value

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import ChecklistItem, EvidenciaMantenimiento, Mantenimiento
from .serializers import (
    ChecklistItemSerializer,
    ChecklistRespuestaBulkSerializer,
    ChecklistRespuestaSerializer,
    EvidenciaSerializer,
    FirmaSerializer,
    MantenimientoDetailSerializer,
    MantenimientoListSerializer,
)
from .services import generar_pdf_mantenimiento


class ChecklistItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ChecklistItem.objects.filter(activo=True)
    serializer_class = ChecklistItemSerializer


class MantenimientoViewSet(viewsets.ModelViewSet):
    queryset = Mantenimiento.objects.select_related('equipo').all()
    # 'delete' se permite solo para la acción personalizada de eliminar evidencias.
    # El recurso principal /mantenimientos/{id}/ bloquea DELETE en destroy() más abajo.
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'list':
            return MantenimientoListSerializer
        return MantenimientoDetailSerializer

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'detail': 'Método "DELETE" no permitido.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        mantenimiento = self.get_object()
        if mantenimiento.estatus == 'COMPLETADO':
            return Response(
                {'detail': 'El mantenimiento ya está completado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mantenimiento.estatus = 'COMPLETADO'
        mantenimiento.save(update_fields=['estatus', 'updated_at'])

        equipo = mantenimiento.equipo
        equipo.fecha_ultimo_mantenimiento = mantenimiento.fecha_ejecucion
        if mantenimiento.fecha_sugerida_proximo_mantenimiento:
            equipo.fecha_proximo_mantenimiento = mantenimiento.fecha_sugerida_proximo_mantenimiento
        equipo.save(update_fields=['fecha_ultimo_mantenimiento', 'fecha_proximo_mantenimiento'])

        return Response(
            MantenimientoDetailSerializer(mantenimiento, context={'request': request}).data
        )

    @action(detail=True, methods=['post'], url_path='generar-pdf')
    def generar_pdf(self, request, pk=None):
        mantenimiento = self.get_object()
        if not mantenimiento.tecnico_nombre or not mantenimiento.fecha_ejecucion:
            return Response(
                {'detail': 'El mantenimiento no tiene la información mínima para generar el PDF.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            mantenimiento = generar_pdf_mantenimiento(mantenimiento)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(
            MantenimientoDetailSerializer(mantenimiento, context={'request': request}).data
        )

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        mantenimiento = self.get_object()
        if not mantenimiento.documento_pdf:
            return Response(
                {'detail': 'El PDF aún no ha sido generado.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({
            'documento_pdf_url': request.build_absolute_uri(mantenimiento.documento_pdf.url),
            'generado_en': mantenimiento.documento_pdf_generado_en,
        })

    @action(detail=True, methods=['get', 'post'])
    def checklist(self, request, pk=None):
        mantenimiento = self.get_object()

        if request.method == 'GET':
            respuestas = mantenimiento.checklist_respuestas.select_related('checklist_item').all()
            return Response(ChecklistRespuestaSerializer(respuestas, many=True).data)

        serializer = ChecklistRespuestaBulkSerializer(
            data=request.data, context={'mantenimiento': mantenimiento}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        respuestas = mantenimiento.checklist_respuestas.select_related('checklist_item').all()
        return Response(
            ChecklistRespuestaSerializer(respuestas, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser])
    def firmas(self, request, pk=None):
        mantenimiento = self.get_object()

        if request.method == 'GET':
            firmas = mantenimiento.firmas.all()
            return Response(
                FirmaSerializer(firmas, many=True, context={'request': request}).data
            )

        serializer = FirmaSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        tipo = serializer.validated_data['tipo_firma']
        if mantenimiento.firmas.filter(tipo_firma=tipo).exists():
            return Response(
                {'detail': f'Ya existe una firma de tipo {tipo} para este mantenimiento.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.save(mantenimiento=mantenimiento)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get', 'post'], parser_classes=[MultiPartParser, FormParser])
    def evidencias(self, request, pk=None):
        """
        GET  /api/mantenimientos/{id}/evidencias/      — lista todas las evidencias
        POST /api/mantenimientos/{id}/evidencias/      — sube una nueva (multipart/form-data)
            fields: imagen (file, required), tipo (ANTES|DURANTE|DESPUES|GENERAL), descripcion
        """
        mantenimiento = self.get_object()

        if request.method == 'GET':
            evidencias = mantenimiento.evidencias.all()
            return Response(
                EvidenciaSerializer(evidencias, many=True, context={'request': request}).data
            )

        serializer = EvidenciaSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(mantenimiento=mantenimiento)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['delete'],
        url_path=r'evidencias/(?P<evidencia_id>\d+)',
    )
    def eliminar_evidencia(self, request, pk=None, evidencia_id=None):
        """DELETE /api/mantenimientos/{id}/evidencias/{evidencia_id}/ — elimina evidencia"""
        mantenimiento = self.get_object()
        try:
            evidencia = mantenimiento.evidencias.get(pk=evidencia_id)
        except EvidenciaMantenimiento.DoesNotExist:
            return Response(
                {'detail': 'Evidencia no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Eliminar también el archivo del storage (funciona con local y con S3)
        evidencia.imagen.delete(save=False)
        evidencia.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

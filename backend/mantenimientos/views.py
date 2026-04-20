from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import ActividadCatalogo, ChecklistItem, EvidenciaMantenimiento, Mantenimiento, MaterialCatalogo
from .serializers import (
    ActividadCatalogoSerializer,
    ChecklistItemSerializer,
    ChecklistRespuestaBulkSerializer,
    ChecklistRespuestaSerializer,
    EvidenciaSerializer,
    FirmaSerializer,
    MantenimientoDetailSerializer,
    MantenimientoListSerializer,
    MaterialCatalogoSerializer,
)
from .services import generar_pdf_mantenimiento


class ActividadCatalogoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActividadCatalogo.objects.filter(activo=True)
    serializer_class = ActividadCatalogoSerializer


class MaterialCatalogoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MaterialCatalogo.objects.filter(activo=True)
    serializer_class = MaterialCatalogoSerializer


class ChecklistItemViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ChecklistItem.objects.filter(activo=True)
    serializer_class = ChecklistItemSerializer


class MantenimientoViewSet(viewsets.ModelViewSet):
    queryset = Mantenimiento.objects.select_related('equipo', 'tecnico').all()

    # 'delete' se permite solo para la acción personalizada de eliminar evidencias.
    # El recurso principal /mantenimientos/{id}/ bloquea DELETE en destroy() más abajo.
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        tecnico_id = self.request.query_params.get('tecnico')
        if tecnico_id:
            qs = qs.filter(tecnico_id=tecnico_id)
        equipo_id = self.request.query_params.get('equipo')
        if equipo_id:
            qs = qs.filter(equipo_id=equipo_id)
        estatus = self.request.query_params.get('estatus')
        if estatus:
            qs = qs.filter(estatus=estatus)
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return MantenimientoListSerializer
        return MantenimientoDetailSerializer

    def create(self, request, *args, **kwargs):
        equipo_id = request.data.get('equipo')
        if equipo_id:
            borrador = Mantenimiento.objects.filter(
                equipo_id=equipo_id, estatus='BORRADOR'
            ).first()
            if borrador:
                serializer = MantenimientoDetailSerializer(
                    borrador, context={'request': request}
                )
                data = serializer.data
                data['existing_borrador'] = True
                return Response(data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        mantenimiento = self.get_object()
        if mantenimiento.estatus != 'BORRADOR':
            return Response(
                {'detail': 'Solo se pueden eliminar mantenimientos en estado BORRADOR.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        mantenimiento = self.get_object()
        if mantenimiento.estatus == 'COMPLETADO':
            return Response(
                {'detail': 'El mantenimiento ya está completado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        errores = []

        # Datos generales
        if not mantenimiento.equipo_id:
            errores.append('Falta el equipo.')
        if not mantenimiento.tecnico_id:
            errores.append('Falta el técnico responsable.')
        if not mantenimiento.fecha_ejecucion:
            errores.append('Falta la fecha de ejecución.')
        if not (mantenimiento.departamento_area or '').strip():
            errores.append('Falta el departamento / área.')
        if not (mantenimiento.responsable_area or '').strip():
            errores.append('Falta el responsable del área.')

        # Actividades
        if not (mantenimiento.actividades_realizadas or '').strip():
            errores.append('Falta describir las actividades realizadas.')

        # Estado post-mantenimiento
        if not (mantenimiento.estado_equipo_post or '').strip():
            errores.append('Falta el estado del equipo post-mantenimiento.')
        if not mantenimiento.fecha_sugerida_proximo_mantenimiento:
            errores.append('Falta la fecha sugerida del próximo mantenimiento.')

        # Firmas
        tipos_firma = set(
            mantenimiento.firmas.values_list('tipo_firma', flat=True)
        )
        firmas_data = {
            f.tipo_firma: f for f in mantenimiento.firmas.all()
        }
        for tipo, label in [('TECNICO', 'técnico'), ('USUARIO', 'usuario')]:
            if tipo not in tipos_firma:
                errores.append(f'Falta la firma del {label}.')
            else:
                firma = firmas_data[tipo]
                if not (firma.nombre_firmante or '').strip():
                    errores.append(f'Falta el nombre del firmante ({label}).')
                if not (firma.cargo_firmante or '').strip():
                    errores.append(f'Falta el puesto/cargo del firmante ({label}).')

        if errores:
            return Response(
                {'detail': 'No se puede completar el mantenimiento.', 'errores': errores},
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
        if not mantenimiento.tecnico_id or not mantenimiento.fecha_ejecucion:
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

        tipo = request.data.get('tipo_firma')
        existing = mantenimiento.firmas.filter(tipo_firma=tipo).first()
        if existing:
            serializer = FirmaSerializer(
                existing, data=request.data, partial=True, context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        serializer = FirmaSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
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

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ActividadCatalogoViewSet, ChecklistItemViewSet, MantenimientoViewSet, MaterialCatalogoViewSet

router = DefaultRouter()
router.register('mantenimientos', MantenimientoViewSet, basename='mantenimiento')
router.register('checklist-items', ChecklistItemViewSet, basename='checklist-item')
router.register('actividades-catalogo', ActividadCatalogoViewSet, basename='actividad-catalogo')
router.register('materiales-catalogo', MaterialCatalogoViewSet, basename='material-catalogo')

urlpatterns = [
    path('', include(router.urls)),
]

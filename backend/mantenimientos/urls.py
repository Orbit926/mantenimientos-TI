from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChecklistItemViewSet, MantenimientoViewSet

router = DefaultRouter()
router.register('mantenimientos', MantenimientoViewSet, basename='mantenimiento')
router.register('checklist-items', ChecklistItemViewSet, basename='checklist-item')

urlpatterns = [
    path('', include(router.urls)),
]

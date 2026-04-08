from django.urls import path

from .views import DashboardProximosView, DashboardRealizadosView, DashboardResumenView

urlpatterns = [
    path('dashboard/resumen/', DashboardResumenView.as_view()),
    path('dashboard/proximos-mantenimientos/', DashboardProximosView.as_view()),
    path('dashboard/mantenimientos-realizados/', DashboardRealizadosView.as_view()),
]

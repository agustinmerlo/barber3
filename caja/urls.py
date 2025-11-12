# caja/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Movimientos CRUD
    path('', views.listar_crear_movimientos, name='listar_crear_movimientos'),
    path('<int:movimiento_id>/', views.detalle_movimiento, name='detalle_movimiento'),
    
    # Estadísticas
    path('estadisticas/', views.estadisticas_caja, name='estadisticas_caja'),
    
    # Cierres de caja
    path('cierres/', views.listar_crear_cierres, name='listar_crear_cierres'),
]
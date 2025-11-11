# reservas/urls.py
from django.urls import path
from . import views

app_name = 'reservas'

urlpatterns = [
    # Crear nueva reserva (cliente)
    path('crear/', views.crear_reserva, name='crear_reserva'),
    
    # Listar reservas de un cliente específico
    path('cliente/', views.listar_reservas_cliente, name='listar_reservas_cliente'),
    
    # Listar reservas (admin - con filtros opcionales)
    path('', views.listar_reservas, name='listar_reservas'),
    
    # 🆕 Acciones específicas PRIMERO (para que no las capture la ruta genérica)
    path('<int:reserva_id>/confirmar/', views.confirmar_reserva, name='confirmar_reserva'),
    path('<int:reserva_id>/rechazar/', views.rechazar_reserva, name='rechazar_reserva'),
    
    # 🆕 Ruta genérica para GET/PATCH/PUT al FINAL
    path('<int:reserva_id>/', views.actualizar_reserva, name='reserva_detail'),
]
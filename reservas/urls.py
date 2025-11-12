# reservas/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Listar y crear
    path('', views.listar_reservas, name='listar_reservas'),
    path('crear/', views.crear_reserva, name='crear_reserva'),
    
    # Horarios disponibles
    path('horarios/', views.horarios_disponibles, name='horarios_disponibles'),
    
    # Operaciones específicas de una reserva
    path('<int:reserva_id>/', views.actualizar_reserva, name='actualizar_reserva'),
    path('<int:reserva_id>/confirmar/', views.confirmar_reserva, name='confirmar_reserva'),
    path('<int:reserva_id>/rechazar/', views.rechazar_reserva, name='rechazar_reserva'),
    
    # 🆕 Nuevo endpoint para registrar pago restante
    path('<int:reserva_id>/pagar-restante/', views.registrar_pago_restante, name='registrar_pago_restante'),
    
    # Panel del cliente
    path('cliente/', views.listar_reservas_cliente, name='listar_reservas_cliente'),
    path('cliente/contadores/', views.reservas_cliente_contadores, name='reservas_cliente_contadores'),
]
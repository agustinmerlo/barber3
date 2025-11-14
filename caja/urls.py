# caja/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MovimientoCajaViewSet, CierreCajaViewSet, TurnoCajaViewSet

router = DefaultRouter()
router.register(r'movimientos', MovimientoCajaViewSet, basename='movimiento')
router.register(r'cierres', CierreCajaViewSet, basename='cierre')
router.register(r'turnos', TurnoCajaViewSet, basename='turno')

urlpatterns = router.urls 
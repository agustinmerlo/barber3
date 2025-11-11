from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MovimientoCajaViewSet

router = DefaultRouter()
router.register(r'caja', MovimientoCajaViewSet, basename='caja')

urlpatterns = [
    # ... tus otras URLs
    path('api/', include(router.urls)),
]
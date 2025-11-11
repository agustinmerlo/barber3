from rest_framework import viewsets
from rest_framework.permissions import AllowAny  # ⬅️ Cambiado
from .models import Servicio
from .serializers import ServicioSerializer


class ServicioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para manejar operaciones CRUD de servicios.
    IMPORTANTE: Permite operaciones sin autenticación (solo para desarrollo)
    """
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    permission_classes = [AllowAny]  # ⬅️ Permite todo sin autenticación
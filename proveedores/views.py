from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import Proveedor
from .serializers import ProveedorSerializer

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  # ← Cualquier autenticado puede escribir

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "company", "email", "phone"]
    ordering_fields = ["name", "company", "created_at", "updated_at", "active"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        active = self.request.query_params.get("active")
        if active in ("true", "false"):
            qs = qs.filter(active=(active == "true"))
        return qs
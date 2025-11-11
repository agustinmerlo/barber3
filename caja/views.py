from rest_framework import viewsets
from .models import MovimientoCaja
from .serializers import MovimientoCajaSerializer

class MovimientoCajaViewSet(viewsets.ModelViewSet):
    queryset = MovimientoCaja.objects.all()
    serializer_class = MovimientoCajaSerializer
    
    def get_queryset(self):
        queryset = MovimientoCaja.objects.all()
        
        # Filtros opcionales
        tipo = self.request.query_params.get('tipo', None)
        metodo_pago = self.request.query_params.get('metodo_pago', None)
        categoria = self.request.query_params.get('categoria', None)
        fecha_desde = self.request.query_params.get('fecha_desde', None)
        fecha_hasta = self.request.query_params.get('fecha_hasta', None)
        
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        if metodo_pago:
            queryset = queryset.filter(metodo_pago=metodo_pago)
        if categoria:
            queryset = queryset.filter(categoria=categoria)
        if fecha_desde:
            queryset = queryset.filter(fecha__gte=fecha_desde)
        if fecha_hasta:
            queryset = queryset.filter(fecha__lte=fecha_hasta)
            
        return queryset
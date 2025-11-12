# caja/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Count, Q
from decimal import Decimal
from datetime import datetime

from .models import MovimientoCaja, CierreCaja
from .serializers import (
    MovimientoCajaSerializer, 
    CierreCajaSerializer,
    CierreCajaCreateSerializer
)


class MovimientoCajaViewSet(viewsets.ModelViewSet):
    queryset = MovimientoCaja.objects.all()
    serializer_class = MovimientoCajaSerializer
    permission_classes = [AllowAny]


class CierreCajaViewSet(viewsets.ModelViewSet):
    queryset = CierreCaja.objects.all()
    serializer_class = CierreCajaSerializer
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def cerrar_caja(self, request):
        """
        Endpoint para cerrar caja y generar el reporte
        POST /api/caja/cierres/cerrar_caja/
        
        Body:
        {
            "fecha_apertura": "2025-11-12T12:00:00Z",
            "monto_inicial": 20000.00,
            "efectivo_real": 27000.00,
            "observaciones": "Todo ok",
            "usuario_apertura_id": 1
        }
        """
        try:
            # Validar datos
            fecha_apertura_str = request.data.get('fecha_apertura')
            monto_inicial = request.data.get('monto_inicial')
            efectivo_real = request.data.get('efectivo_real')
            observaciones = request.data.get('observaciones', '')
            usuario_apertura_id = request.data.get('usuario_apertura_id')
            
            if not fecha_apertura_str or not monto_inicial or efectivo_real is None:
                return Response({
                    'error': 'Faltan campos requeridos: fecha_apertura, monto_inicial, efectivo_real'
                }, status=400)
            
            # Parsear fecha de apertura
            try:
                fecha_apertura = datetime.fromisoformat(fecha_apertura_str.replace('Z', '+00:00'))
                if timezone.is_naive(fecha_apertura):
                    fecha_apertura = timezone.make_aware(fecha_apertura)
            except:
                return Response({'error': 'Formato de fecha_apertura inválido'}, status=400)
            
            monto_inicial = Decimal(str(monto_inicial))
            efectivo_real = Decimal(str(efectivo_real))
            
            # Obtener movimientos del turno
            movimientos = MovimientoCaja.objects.filter(
                fecha_creacion__gte=fecha_apertura,
                fecha_creacion__lte=timezone.now(),
                cierre_caja__isnull=True  # Solo movimientos sin cierre
            )
            
            # Calcular totales
            # Efectivo
            ingresos_efectivo = movimientos.filter(
                tipo='ingreso',
                metodo_pago='efectivo'
            ).aggregate(total=Sum('monto'))['total'] or Decimal('0')
            
            egresos_efectivo = movimientos.filter(
                tipo='egreso',
                metodo_pago='efectivo'
            ).aggregate(total=Sum('monto'))['total'] or Decimal('0')
            
            # Otros medios
            ingresos_otros = movimientos.filter(
                tipo='ingreso'
            ).exclude(metodo_pago='efectivo').aggregate(total=Sum('monto'))['total'] or Decimal('0')
            
            egresos_otros = movimientos.filter(
                tipo='egreso'
            ).exclude(metodo_pago='efectivo').aggregate(total=Sum('monto'))['total'] or Decimal('0')
            
            # Efectivo esperado
            efectivo_esperado = monto_inicial + ingresos_efectivo - egresos_efectivo
            diferencia = efectivo_real - efectivo_esperado
            
            # Desglose por método de pago
            desglose_metodos = {}
            for metodo in ['efectivo', 'tarjeta', 'transferencia', 'mercadopago']:
                ingresos = movimientos.filter(
                    tipo='ingreso',
                    metodo_pago=metodo
                ).aggregate(total=Sum('monto'))['total'] or Decimal('0')
                
                egresos = movimientos.filter(
                    tipo='egreso',
                    metodo_pago=metodo
                ).aggregate(total=Sum('monto'))['total'] or Decimal('0')
                
                desglose_metodos[metodo] = {
                    'ingresos': float(ingresos),
                    'egresos': float(egresos),
                    'neto': float(ingresos - egresos)
                }
            
            # Desglose por categoría
            categorias = movimientos.values('categoria').distinct()
            desglose_categorias = {}
            for cat in categorias:
                categoria = cat['categoria']
                ingresos = movimientos.filter(
                    tipo='ingreso',
                    categoria=categoria
                ).aggregate(total=Sum('monto'))['total'] or Decimal('0')
                
                egresos = movimientos.filter(
                    tipo='egreso',
                    categoria=categoria
                ).aggregate(total=Sum('monto'))['total'] or Decimal('0')
                
                desglose_categorias[categoria] = {
                    'ingresos': float(ingresos),
                    'egresos': float(egresos),
                    'neto': float(ingresos - egresos)
                }
            
            # Contadores
            cantidad_movimientos = movimientos.count()
            cantidad_ingresos = movimientos.filter(tipo='ingreso').count()
            cantidad_egresos = movimientos.filter(tipo='egreso').count()
            
            # Crear cierre de caja
            cierre = CierreCaja.objects.create(
                fecha_apertura=fecha_apertura,
                fecha_cierre=timezone.now(),
                usuario_apertura_id=usuario_apertura_id if usuario_apertura_id else None,
                usuario_cierre=request.user if request.user.is_authenticated else None,
                monto_inicial=monto_inicial,
                total_ingresos_efectivo=ingresos_efectivo,
                total_egresos_efectivo=egresos_efectivo,
                total_ingresos_otros=ingresos_otros,
                total_egresos_otros=egresos_otros,
                efectivo_esperado=efectivo_esperado,
                efectivo_real=efectivo_real,
                diferencia=diferencia,
                desglose_metodos=desglose_metodos,
                desglose_categorias=desglose_categorias,
                cantidad_movimientos=cantidad_movimientos,
                cantidad_ingresos=cantidad_ingresos,
                cantidad_egresos=cantidad_egresos,
                observaciones=observaciones,
                esta_cerrado=True
            )
            
            # Asociar movimientos al cierre
            movimientos.update(cierre_caja=cierre)
            
            # Serializar respuesta
            serializer = CierreCajaSerializer(cierre)
            
            return Response({
                'mensaje': 'Caja cerrada exitosamente',
                'cierre': serializer.data
            }, status=201)
            
        except Exception as e:
            print(f"Error al cerrar caja: {e}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': f'Error al cerrar caja: {str(e)}'
            }, status=500)
    
    @action(detail=False, methods=['get'])
    def historial(self, request):
        """
        Obtener historial de cierres de caja
        GET /api/caja/cierres/historial/
        """
        cierres = CierreCaja.objects.all().order_by('-fecha_cierre')
        serializer = CierreCajaSerializer(cierres, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def detalle_completo(self, request, pk=None):
        """
        Obtener detalle completo de un cierre incluyendo todos sus movimientos
        GET /api/caja/cierres/{id}/detalle_completo/
        """
        try:
            cierre = self.get_object()
            serializer = CierreCajaSerializer(cierre)
            return Response(serializer.data)
        except CierreCaja.DoesNotExist:
            return Response({'error': 'Cierre no encontrado'}, status=404)


@api_view(['GET'])
@permission_classes([AllowAny])
def movimientos_sin_cierre(request):
    """
    Obtener movimientos que aún no están asociados a ningún cierre
    GET /api/caja/movimientos-sin-cierre/
    """
    fecha_desde = request.query_params.get('fecha_desde')
    
    movimientos = MovimientoCaja.objects.filter(cierre_caja__isnull=True)
    
    if fecha_desde:
        try:
            fecha = datetime.fromisoformat(fecha_desde.replace('Z', '+00:00'))
            if timezone.is_naive(fecha):
                fecha = timezone.make_aware(fecha)
            movimientos = movimientos.filter(fecha_creacion__gte=fecha)
        except:
            pass
    
    serializer = MovimientoCajaSerializer(movimientos, many=True)
    return Response(serializer.data)
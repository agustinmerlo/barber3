# caja/serializers.py
from rest_framework import serializers
from .models import MovimientoCaja, CierreCaja
from django.contrib.auth import get_user_model

User = get_user_model()

class MovimientoCajaSerializer(serializers.ModelSerializer):
    barbero_nombre = serializers.SerializerMethodField()
    usuario_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = MovimientoCaja
        fields = [
            'id', 'tipo', 'monto', 'descripcion', 'metodo_pago', 
            'categoria', 'fecha', 'hora', 'barbero', 'barbero_nombre',
            'reserva', 'usuario_registro', 'usuario_nombre',
            'comprobante', 'fecha_creacion', 'cierre_caja'
        ]
        read_only_fields = ['fecha', 'hora', 'fecha_creacion']
    
    def get_barbero_nombre(self, obj):
        if obj.barbero:
            return obj.barbero.get_full_name() or obj.barbero.username
        return None
    
    def get_usuario_nombre(self, obj):
        if obj.usuario_registro:
            return obj.usuario_registro.get_full_name() or obj.usuario_registro.username
        return None


class CierreCajaSerializer(serializers.ModelSerializer):
    usuario_apertura_nombre = serializers.SerializerMethodField()
    usuario_cierre_nombre = serializers.SerializerMethodField()
    duracion_turno = serializers.ReadOnlyField()
    tipo_diferencia = serializers.ReadOnlyField()
    movimientos_detalle = MovimientoCajaSerializer(
        source='movimientos',
        many=True,
        read_only=True
    )
    
    class Meta:
        model = CierreCaja
        fields = [
            'id', 'fecha_apertura', 'fecha_cierre',
            'usuario_apertura', 'usuario_apertura_nombre',
            'usuario_cierre', 'usuario_cierre_nombre',
            'monto_inicial', 'total_ingresos_efectivo', 'total_egresos_efectivo',
            'total_ingresos_otros', 'total_egresos_otros',
            'efectivo_esperado', 'efectivo_real', 'diferencia',
            'desglose_metodos', 'desglose_categorias',
            'cantidad_movimientos', 'cantidad_ingresos', 'cantidad_egresos',
            'observaciones', 'esta_cerrado', 'duracion_turno', 'tipo_diferencia',
            'movimientos_detalle'
        ]
        read_only_fields = ['fecha_cierre', 'duracion_turno', 'tipo_diferencia']
    
    def get_usuario_apertura_nombre(self, obj):
        if obj.usuario_apertura:
            return obj.usuario_apertura.get_full_name() or obj.usuario_apertura.username
        return None
    
    def get_usuario_cierre_nombre(self, obj):
        if obj.usuario_cierre:
            return obj.usuario_cierre.get_full_name() or obj.usuario_cierre.username
        return None


class CierreCajaCreateSerializer(serializers.Serializer):
    """
    Serializer para crear un cierre de caja
    """
    fecha_apertura = serializers.DateTimeField()
    monto_inicial = serializers.DecimalField(max_digits=10, decimal_places=2)
    observaciones = serializers.CharField(required=False, allow_blank=True)
    usuario_apertura_id = serializers.IntegerField(required=False)
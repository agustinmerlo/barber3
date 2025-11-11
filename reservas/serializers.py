# reservas/serializers.py
from rest_framework import serializers
from .models import Reserva

class ReservaSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Reserva
    """
    resto_a_pagar = serializers.ReadOnlyField()
    
    # ✅ Campos adicionales del barbero
    barbero_username = serializers.CharField(source='barbero.username', read_only=True)
    barbero_email = serializers.CharField(source='barbero.email', read_only=True)
    
    class Meta:
        model = Reserva
        fields = [
            'id',
            'nombre_cliente',
            'apellido_cliente',
            'telefono_cliente',
            'email_cliente',
            'fecha',
            'horario',
            'barbero',           # ← ForeignKey
            'barbero_id',        # ← Para compatibilidad
            'barbero_nombre',
            'barbero_username',  # ← NUEVO
            'barbero_email',     # ← NUEVO
            'servicios',
            'total',
            'seña',
            'resto_a_pagar',
            'duracion_total',
            'comprobante',
            'estado',
            'fecha_creacion',
            'fecha_confirmacion',
            'notas_admin',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_confirmacion', 'barbero_username', 'barbero_email']


class ReservaCreateSerializer(serializers.Serializer):
    """
    Serializador específico para crear reservas
    """
    reserva = serializers.JSONField()
    cliente = serializers.JSONField()
    comprobante = serializers.ImageField()
    monto = serializers.DecimalField(max_digits=10, decimal_places=2)
    estado = serializers.CharField(default='pendiente')
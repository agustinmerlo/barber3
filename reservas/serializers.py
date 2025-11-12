# -*- coding: utf-8 -*-
from rest_framework import serializers
from .models import Reserva


class ReservaSerializer(serializers.ModelSerializer):
    """
    Serializador para el modelo Reserva
    """
    pendiente = serializers.SerializerMethodField()
    resto_a_pagar = serializers.SerializerMethodField()
    
    # Campos adicionales del barbero
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
            'barbero',
            'barbero_id',
            'barbero_nombre',
            'barbero_username',
            'barbero_email',
            'servicios',
            'total',
            'seña',
            'saldo_pagado',
            'pendiente',
            'resto_a_pagar',
            'metodo_pago',
            'fecha_pago',
            'estado_pago',
            'duracion_total',
            'comprobante',
            'estado',
            'fecha_creacion',
            'fecha_confirmacion',
            'notas_admin',
        ]
        read_only_fields = ['id', 'fecha_creacion', 'fecha_confirmacion', 'barbero_username', 'barbero_email', 'pendiente', 'resto_a_pagar']

    def get_pendiente(self, obj):
        return obj.pendiente

    def get_resto_a_pagar(self, obj):
        return obj.resto_a_pagar

    def update(self, instance, validated_data):
        # Actualizar todos los campos recibidos
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # El método save() del modelo ya calcula el estado_pago automáticamente
        instance.save()
        return instance


class ReservaCreateSerializer(serializers.Serializer):
    """
    Serializador específico para crear reservas
    """
    reserva = serializers.JSONField()
    cliente = serializers.JSONField()
    comprobante = serializers.ImageField()
    monto = serializers.DecimalField(max_digits=10, decimal_places=2) 
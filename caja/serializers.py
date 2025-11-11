from rest_framework import serializers
from .models import MovimientoCaja

class MovimientoCajaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovimientoCaja
        fields = '__all__'
        read_only_fields = ['hora', 'created_at', 'updated_at']
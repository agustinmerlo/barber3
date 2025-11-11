# barbers/serializers.py
from rest_framework import serializers
from .models import Barber

class BarberSerializer(serializers.ModelSerializer):
    # ✅ Campos adicionales calculados
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = Barber
        fields = [
            "id",
            "user_id",           # ← NUEVO
            "username",          # ← NUEVO
            "email",             # ← NUEVO
            "name",
            "specialty",
            "work_schedule",
            "photo",
            "is_deleted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user_id", "username", "email", "is_deleted", "created_at", "updated_at"]
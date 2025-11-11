# usuarios/serializers.py
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role', 'telefono', 'direccion', 'fecha_nacimiento', 'activo']


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer completo del usuario con perfil
    """
    profile = UserProfileSerializer(read_only=True)
    role = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'date_joined', 'profile', 'role']
        read_only_fields = ['id', 'date_joined']
    
    def get_role(self, obj):
        """
        Devuelve el rol efectivo:
        - superuser/staff → 'admin'
        - si no, profile.role (o 'cliente' por defecto)
        """
        if obj.is_superuser or obj.is_staff:
            return 'admin'
        return getattr(getattr(obj, 'profile', None), 'role', 'cliente')


class UserListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listar usuarios con rol efectivo
    """
    role = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    activo = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_active', 'role', 'role_display', 'activo', 'date_joined']
    
    def get_role(self, obj):
        """
        Devuelve el rol efectivo:
        - superuser/staff → 'admin'
        - si no, profile.role (o 'cliente' por defecto)
        """
        if obj.is_superuser or obj.is_staff:
            return 'admin'
        return getattr(getattr(obj, 'profile', None), 'role', 'cliente')
    
    def get_role_display(self, obj):
        """
        Devuelve el nombre display del rol
        """
        role = self.get_role(obj)
        display_map = {
            'admin': 'Administrador',
            'barbero': 'Barbero',
            'cliente': 'Cliente'
        }
        return display_map.get(role, 'Cliente')
    
    def get_activo(self, obj):
        """
        Devuelve si el usuario está activo
        """
        if hasattr(obj, 'profile'):
            return obj.profile.activo
        return obj.is_active


class UserRoleUpdateSerializer(serializers.Serializer):
    """
    Serializer para actualizar solo el rol del usuario
    """
    role = serializers.ChoiceField(choices=['admin', 'barbero', 'cliente'])
    
    def update(self, instance, validated_data):
        role = validated_data.get('role')
        
        # Actualizar is_staff si es admin
        if role == 'admin':
            instance.is_staff = True
        else:
            instance.is_staff = False
        
        instance.save()
        
        # Actualizar el perfil
        if hasattr(instance, 'profile'):
            instance.profile.role = role
            instance.profile.save()
        
        return instance


class UserRegisterSerializer(serializers.ModelSerializer):
    """
    Serializer para el registro de nuevos usuarios
    """
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8, label="Confirmar contraseña")

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden"})
        
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({"email": "Este email ya está registrado"})
        
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user
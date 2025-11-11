# usuarios/views.py
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db.models import Q

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action, api_view, permission_classes

from .serializers import (
    UserRegisterSerializer,
    UserSerializer,
    UserListSerializer,
    UserRoleUpdateSerializer
)


# -------------------------------------------------------------------
# 1️⃣ REGISTRO
# -------------------------------------------------------------------
class RegisterView(APIView):
    """
    Registro de nuevos usuarios.
    """
    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response(
                {
                    "message": "Registro exitoso",
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email
                    },
                    "token": token.key
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# -------------------------------------------------------------------
# 2️⃣ LOGIN POR EMAIL (devuelve ROL EFECTIVO)
# -------------------------------------------------------------------
class EmailLoginView(APIView):
    """
    Login usando email + password. Devuelve rol EFECTIVO:
    - superuser/staff => 'admin'
    - si no, role de profile (o 'cliente' si no existe)
    """
    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response(
                {"error": "Email y password son requeridos"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "Usuario no encontrado"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_auth = authenticate(username=user.username, password=password)
        if not user_auth:
            return Response(
                {"error": "Credenciales inválidas"},
                status=status.HTTP_400_BAD_REQUEST
            )

        token, _ = Token.objects.get_or_create(user=user_auth)

        role = 'admin' if (user_auth.is_superuser or user_auth.is_staff) else (
            getattr(getattr(user_auth, 'profile', None), 'role', 'cliente')
        )

        return Response({
            "token": token.key,
            "username": user_auth.username,
            "email": user_auth.email,
            "role": role,                # ← EFECTIVO
            "is_staff": user_auth.is_staff,
            "user_id": user_auth.id
        }, status=status.HTTP_200_OK)


# -------------------------------------------------------------------
# 3️⃣ PERFIL (rol EFECTIVO)
# -------------------------------------------------------------------
class UserDetailView(APIView):
    """
    Devuelve la información del usuario autenticado + rol EFECTIVO.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = 'admin' if (user.is_superuser or user.is_staff) else (
            getattr(getattr(user, 'profile', None), 'role', 'cliente')
        )

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": role,                # ← EFECTIVO
            "is_staff": user.is_staff
        }, status=status.HTTP_200_OK)


# -------------------------------------------------------------------
# 4️⃣ VIEWSET EMPLEADOS (ADMIN) - ✅ FILTRADO CORREGIDO
# -------------------------------------------------------------------
class EmpleadoViewSet(viewsets.ModelViewSet):
    """
    Gestión de usuarios y roles (solo Admin).
    ✅ Ahora filtra solo admin y barberos.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        """
        Devuelve solo usuarios con rol 'admin' o 'barbero':
        - Superusers/staff (son admin efectivo)
        - Usuarios con profile.role = 'admin' o 'barbero'
        """
        return User.objects.filter(
            Q(is_superuser=True) |  # Superusers son admin
            Q(is_staff=True) |      # Staff son admin
            Q(profile__role='admin') |  # Profile admin
            Q(profile__role='barbero')  # Profile barbero
        ).select_related('profile').distinct().order_by('-date_joined')

    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        return UserSerializer

    @action(detail=True, methods=['patch'], url_path='cambiar-rol')
    def cambiar_rol(self, request, pk=None):
        """
        PATCH /api/usuarios/empleados/{id}/cambiar-rol/
        Body: { "role": "admin" | "barbero" | "cliente" }
        - Superusers/staff NUNCA se degradan (se fuerza a 'admin').
        - Para usuarios normales, se persiste en user.profile.role
        """
        user = self.get_object()

        # 1) Blindaje: superuser/staff siempre admin
        if user.is_superuser or user.is_staff:
            if hasattr(user, 'profile') and user.profile.role != 'admin':
                user.profile.role = 'admin'
                user.profile.save(update_fields=['role'])
            return Response({
                'message': 'Usuario superuser/staff: rol forzado a admin.',
                'user': UserListSerializer(user).data
            }, status=status.HTTP_200_OK)

        # 2) Usuarios normales
        new_role = (request.data.get('role') or '').lower().strip()
        if new_role not in ('admin', 'barbero', 'cliente'):
            return Response({'detail': 'Rol inválido'}, status=status.HTTP_400_BAD_REQUEST)

        # Asegura profile
        if not hasattr(user, 'profile'):
            from usuarios.models import UserProfile
            UserProfile.objects.get_or_create(user=user, defaults={'role': 'cliente'})

        if user.profile.role != new_role:
            user.profile.role = new_role
            user.profile.save(update_fields=['role'])

        return Response({
            'message': f'Rol actualizado a {new_role}',
            'user': UserListSerializer(user).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='toggle-activo')
    def toggle_activo(self, request, pk=None):
        """
        Activa/desactiva un usuario
        PATCH /api/usuarios/empleados/{id}/toggle-activo/
        """
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()

        if hasattr(user, 'profile'):
            user.profile.activo = user.is_active
            user.profile.save()

        return Response({
            'message': f'Usuario {"activado" if user.is_active else "desactivado"}',
            'user': UserListSerializer(user).data
        }, status=status.HTTP_200_OK)


# -------------------------------------------------------------------
# 5️⃣ /api/usuarios/auth/me  (FUENTE DE VERDAD para rol)
# -------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    u = request.user
    role = 'admin' if (u.is_superuser or u.is_staff) else (
        getattr(getattr(u, 'profile', None), 'role', 'cliente')
    )
    return Response({
        "user_id": u.id,
        "username": u.username,
        "email": u.email,
        "role": role,
        "is_superuser": u.is_superuser,
        "is_staff": u.is_staff,
    }, status=status.HTTP_200_OK)
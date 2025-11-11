# usuarios/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, EmailLoginView, UserDetailView, EmpleadoViewSet, me

router = DefaultRouter()
router.register(r'empleados', EmpleadoViewSet, basename='empleados')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', EmailLoginView.as_view(), name='email-login'),
    path('profile/', UserDetailView.as_view(), name='user-detail'),
    path('auth/me', me, name='auth-me'),  # ← NUEVO
    path('', include(router.urls)),
]

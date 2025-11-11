from django.urls import path
from .views import RegisterView, EmailLoginView

from django.urls import path
from .views import RegisterView, EmailLoginView, UserDetailView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', EmailLoginView.as_view(), name='login'),
    path('perfil/', UserDetailView.as_view(), name='perfil'),
]
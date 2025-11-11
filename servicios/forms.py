# usuarios/serializers.py (El código correcto que ya usas)

from rest_framework import serializers
from django.contrib.auth.models import User 
from django.contrib.auth.password_validation import validate_password
# ...

class UserRegisterSerializer(serializers.ModelSerializer):
    # ... (toda la lógica de validación y creación)
    pass
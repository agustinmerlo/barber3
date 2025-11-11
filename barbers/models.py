# barbers/models.py
from django.db import models
from django.contrib.auth.models import User

# ✅ Manager personalizado para ocultar los registros eliminados
class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

class Barber(models.Model):
    # ✅ NUEVO: Vinculación con User
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='barber_profile',
        null=True,  # Temporal para migración
        blank=True,
        help_text="Usuario asociado a este barbero"
    )
    
    name = models.CharField(max_length=100)
    specialty = models.CharField(max_length=200, blank=True)
    work_schedule = models.CharField(max_length=200, blank=True)
    photo = models.ImageField(upload_to='barbers/', null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ✅ Managers
    objects = SoftDeleteManager()      # devuelve solo los activos
    all_objects = models.Manager()     # incluye los eliminados

    # ✅ Métodos utilitarios
    def soft_delete(self):
        self.is_deleted = True
        self.save()

    def restore(self):
        self.is_deleted = False
        self.save()

    @property
    def user_id(self):
        """ID del usuario asociado (para compatibilidad con reservas)"""
        return self.user.id if self.user else None

    def __str__(self):
        return f"{self.name} ({self.user.username if self.user else 'Sin usuario'})"

    class Meta:
        ordering = ['-created_at']
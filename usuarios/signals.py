# usuarios/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile

@receiver(post_save, sender=User)
def create_or_sync_profile(sender, instance, created, **kwargs):
    """
    Garantiza que cada User tenga UserProfile y que:
    - superuser/staff => role 'admin'
    - resto => mantiene role actual o por defecto 'cliente'
    """
    profile, _ = UserProfile.objects.get_or_create(user=instance)
    desired_role = 'admin' if (instance.is_superuser or instance.is_staff) else (profile.role or 'cliente')
    if profile.role != desired_role:
        profile.role = desired_role
        profile.save(update_fields=['role'])

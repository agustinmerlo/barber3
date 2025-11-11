# proveedores/models.py
from django.db import models


class Proveedor(models.Model):
    TIPO_CHOICES = [
        ('productos_cabello', 'Productos para el cabello'),
    ]
    
    name = models.CharField(max_length=200, verbose_name="Nombre")
    company = models.CharField(max_length=200, blank=True, verbose_name="Empresa")
    email = models.EmailField(blank=True, verbose_name="Email")
    phone = models.CharField(max_length=50, blank=True, verbose_name="Teléfono")
    direccion = models.CharField(max_length=300, blank=True, verbose_name="Dirección")
    tipo = models.CharField(
        max_length=50,
        choices=TIPO_CHOICES,
        default='productos_cabello',  # ✅ CORREGIDO
        verbose_name="Tipo"
    )
    active = models.BooleanField(default=True, verbose_name="Activo")
    notes = models.TextField(blank=True, verbose_name="Notas")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Creado")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Actualizado")

    class Meta:
        verbose_name = "Proveedor"
        verbose_name_plural = "Proveedores"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.company or 'Sin empresa'})"
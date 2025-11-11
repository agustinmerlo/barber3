from django.contrib import admin
from .models import Servicio

@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    """
    Configuración del panel de administración para Servicios
    """
    list_display = ['nombre', 'precio', 'duracion', 'activo', 'creado_en']
    list_filter = ['activo', 'creado_en']
    search_fields = ['nombre', 'descripcion']
    list_editable = ['precio', 'duracion', 'activo']
    ordering = ['nombre']
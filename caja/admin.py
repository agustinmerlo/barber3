# caja/admin.py
from django.contrib import admin
from .models import MovimientoCaja, CierreCaja

@admin.register(MovimientoCaja)
class MovimientoCajaAdmin(admin.ModelAdmin):
    list_display = ['id', 'tipo', 'monto', 'descripcion', 'metodo_pago', 'categoria', 'fecha', 'cierre_caja']
    list_filter = ['tipo', 'metodo_pago', 'categoria', 'fecha']
    search_fields = ['descripcion']
    date_hierarchy = 'fecha'
    ordering = ['-fecha_creacion']

@admin.register(CierreCaja)
class CierreCajaAdmin(admin.ModelAdmin):
    list_display = ['id', 'fecha_cierre', 'monto_inicial', 'efectivo_esperado', 'efectivo_real', 'diferencia', 'cantidad_movimientos']
    list_filter = ['fecha_cierre', 'esta_cerrado']
    search_fields = ['observaciones']
    date_hierarchy = 'fecha_cierre'
    ordering = ['-fecha_cierre']
    readonly_fields = ['fecha_cierre', 'duracion_turno', 'tipo_diferencia'] 
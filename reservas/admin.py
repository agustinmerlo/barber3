# reservas/admin.py
from django.contrib import admin, messages
from django.utils.html import format_html, format_html_join
from django.utils.safestring import mark_safe
from django.utils import timezone
from .models import Reserva

def fmt_money(value):
    try:
        n = float(value)
    except (TypeError, ValueError):
        n = 0.0
    # Formato AR: separadores de miles, 2 decimales
    return f"$ {n:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    """
    Panel de administración para Reservas
    """
    list_display = (
        'id',
        'nombre_completo',
        'fecha',
        'horario',
        'barbero_nombre',
        'total_display',
        'seña_display',
        'estado_badge',
        'fecha_creacion',
    )
    list_filter = ('estado', 'fecha', 'barbero_nombre')
    search_fields = ('id', 'nombre_cliente', 'apellido_cliente', 'email_cliente', 'telefono_cliente', 'barbero_nombre')
    readonly_fields = ('fecha_creacion', 'comprobante_preview', 'servicios_pretty')
    ordering = ('-fecha_creacion',)
    list_per_page = 25
    date_hierarchy = 'fecha'

    fieldsets = (
        ('Cliente', {
            'fields': ('nombre_cliente', 'apellido_cliente', 'telefono_cliente', 'email_cliente')
        }),
        ('Reserva', {
            'fields': ('fecha', 'horario', 'barbero_id', 'barbero_nombre', 'servicios_pretty', 'duracion_total')
        }),
        ('Pago', {
            'fields': ('total', 'seña', 'comprobante', 'comprobante_preview')
        }),
        ('Estado', {
            'fields': ('estado', 'notas_admin', 'fecha_creacion', 'fecha_confirmacion')
        }),
    )

    # ---------- Displays ----------
    def nombre_completo(self, obj):
        return f"{obj.nombre_cliente} {obj.apellido_cliente}"
    nombre_completo.short_description = "Cliente"

    def total_display(self, obj):
        return fmt_money(obj.total)
    total_display.short_description = "Total"

    def seña_display(self, obj):
        # Campo original se llama 'seña' (con ñ)
        return fmt_money(getattr(obj, 'seña', 0))
    seña_display.short_description = "Seña"

    def estado_badge(self, obj):
        colors = {
            'pendiente': '#ff9800',
            'confirmada': '#4caf50',
            'rechazada': '#f44336',
            'cancelada': '#9e9e9e',
        }
        return format_html(
            '<span style="background-color:{};color:#fff;padding:4px 8px;border-radius:6px;font-weight:600;">{}</span>',
            colors.get(obj.estado, '#000'),
            obj.get_estado_display()
        )
    estado_badge.short_description = "Estado"
    estado_badge.admin_order_field = 'estado'

    def comprobante_preview(self, obj):
        if obj.comprobante:
            url = obj.comprobante.url
            return format_html(
                '<a href="{}" target="_blank"><img src="{}" style="max-width:300px;max-height:300px;border:1px solid #ddd;border-radius:8px;"/></a>',
                url, url
            )
        return "Sin comprobante"
    comprobante_preview.short_description = "Vista previa del comprobante"

    def servicios_pretty(self, obj):
        """
        Muestra el JSON de servicios en una etiqueta <pre> para lectura.
        Si tu JSON tiene estructura [{nombre, precio, cantidad, duracion}] se listan amigablemente.
        """
        data = obj.servicios or []
        if isinstance(data, list) and data and isinstance(data[0], dict):
            # Render amigable por item si tiene estructura dict
            rows = []
            for s in data:
                nombre = s.get('nombre') or s.get('name') or 'Servicio'
                precio = fmt_money(s.get('precio') or s.get('price') or 0)
                cant = s.get('cantidad') or s.get('qty') or 1
                dur = s.get('duracion') or s.get('duration') or ''
                rows.append(f"• {nombre} — {precio} x {cant}  {f'({dur})' if dur else ''}")
            return mark_safe("<br>".join(rows))
        # Fallback: pretty JSON
        import json as _json
        return mark_safe(f"<pre style='white-space:pre-wrap'>{_json.dumps(data, ensure_ascii=False, indent=2)}</pre>")
    servicios_pretty.short_description = "Servicios"

    # ---------- Acciones ----------
    actions = ('accion_confirmar', 'accion_rechazar', 'accion_cancelar')

    @admin.action(description="✔️ Marcar como CONFIRMADA")
    def accion_confirmar(self, request, queryset):
        updated = 0
        for r in queryset:
            if r.estado != 'confirmada':
                r.estado = 'confirmada'
                r.fecha_confirmacion = timezone.now()
                r.save(update_fields=['estado', 'fecha_confirmacion'])
                updated += 1
        if updated:
            self.message_user(request, f"{updated} reserva(s) confirmadas.", messages.SUCCESS)
        else:
            self.message_user(request, "No había reservas para confirmar.", messages.INFO)

    @admin.action(description="⛔ Marcar como RECHAZADA")
    def accion_rechazar(self, request, queryset):
        updated = queryset.exclude(estado='rechazada').update(estado='rechazada')
        if updated:
            self.message_user(request, f"{updated} reserva(s) rechazadas.", messages.WARNING)
        else:
            self.message_user(request, "No había reservas para rechazar.", messages.INFO)

    @admin.action(description="🕓 Marcar como CANCELADA")
    def accion_cancelar(self, request, queryset):
        updated = queryset.exclude(estado='cancelada').update(estado='cancelada')
        if updated:
            self.message_user(request, f"{updated} reserva(s) canceladas.", messages.INFO)
        else:
            self.message_user(request, "No había reservas para cancelar.", messages.INFO)

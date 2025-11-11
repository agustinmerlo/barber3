from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal


class Reserva(models.Model):
    """
    Modelo para almacenar las reservas de los clientes
    """
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente de Verificación'),
        ('confirmada', 'Confirmada'),
        ('rechazada', 'Rechazada'),
        ('cancelada', 'Cancelada'),
    ]
    
    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
        ('mercadopago', 'Mercado Pago'),
    ]
    
    # ==========================================
    # DATOS DEL CLIENTE
    # ==========================================
    nombre_cliente = models.CharField(
        max_length=100,
        verbose_name="Nombre del cliente"
    )
    apellido_cliente = models.CharField(
        max_length=100,
        verbose_name="Apellido del cliente"
    )
    telefono_cliente = models.CharField(
        max_length=20,
        verbose_name="Teléfono"
    )
    email_cliente = models.EmailField(
        verbose_name="Email del cliente"
    )
    
    # ==========================================
    # DATOS DE LA RESERVA
    # ==========================================
    fecha = models.DateField(
        verbose_name="Fecha de la cita"
    )
    horario = models.TimeField(
        verbose_name="Hora de la cita"
    )
    
    # ✅ ForeignKey al barbero (User)
    barbero = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='reservas_como_barbero',
        null=True,
        blank=True,
        help_text="Usuario barbero asignado"
    )
    
    # Nombre del barbero (redundante pero útil)
    barbero_nombre = models.CharField(
        max_length=100,
        verbose_name="Nombre del barbero",
        blank=True
    )
    
    servicios = models.JSONField(
        verbose_name="Servicios contratados",
        help_text="Lista de servicios en formato JSON"
    )
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Total del servicio"
    )
    seña = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Seña pagada (30%)"
    )
    
    # ==========================================
    # ✅ NUEVOS CAMPOS PARA GESTIÓN DE PAGOS
    # ==========================================
    saldo_pagado = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Saldo pagado en el local",
        help_text="Monto pagado posteriormente en la barbería"
    )
    metodo_pago = models.CharField(
        max_length=20,
        blank=True,
        choices=METODO_PAGO_CHOICES,
        verbose_name="Método de pago del saldo"
    )
    fecha_pago = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha del último pago"
    )
    
    duracion_total = models.IntegerField(
        verbose_name="Duración total en minutos"
    )
    
    # ==========================================
    # COMPROBANTE Y ESTADO
    # ==========================================
    comprobante = models.ImageField(
        upload_to='comprobantes/%Y/%m/%d/',
        verbose_name="Comprobante de pago"
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        verbose_name="Estado de la reserva"
    )
    
    # ==========================================
    # METADATOS
    # ==========================================
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de creación"
    )
    fecha_confirmacion = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Fecha de confirmación"
    )
    notas_admin = models.TextField(
        blank=True,
        verbose_name="Notas del administrador"
    )
    
    class Meta:
        verbose_name = "Reserva"
        verbose_name_plural = "Reservas"
        ordering = ['-fecha_creacion']
    
    def save(self, *args, **kwargs):
        # ✅ Auto-sincronizar barbero_nombre cuando hay barbero
        if self.barbero and not self.barbero_nombre:
            if hasattr(self.barbero, 'barber_profile'):
                self.barbero_nombre = self.barbero.barber_profile.name
            else:
                self.barbero_nombre = self.barbero.get_full_name() or self.barbero.username
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Reserva #{self.id} - {self.nombre_cliente} {self.apellido_cliente} ({self.estado})"
    
    @property
    def resto_a_pagar(self):
        """Calcula el resto que debe pagar en la barbería"""
        try:
            total = Decimal(str(self.total)) if self.total else Decimal('0')
            sena = Decimal(str(self.seña)) if self.seña else Decimal('0')
            saldo = Decimal(str(self.saldo_pagado)) if self.saldo_pagado else Decimal('0')
            return total - sena - saldo
        except (ValueError, TypeError, AttributeError):
            return Decimal('0')
    
    @property
    def cliente_nombre_completo(self):
        """Retorna el nombre completo del cliente"""
        return f"{self.nombre_cliente} {self.apellido_cliente}"
    
    @property
    def esta_completamente_pagado(self):
        """Verifica si la reserva está completamente pagada"""
        return self.resto_a_pagar <= 0
    
    @property
    def tiene_pago_parcial(self):
        """Verifica si tiene algún pago registrado pero no está completo"""
        return (self.seña > 0 or self.saldo_pagado > 0) and not self.esta_completamente_pagado
    
    @property
    def porcentaje_pagado(self):
        """Calcula el porcentaje pagado del total"""
        try:
            if self.total <= 0:
                return 0
            pagado = Decimal(str(self.seña)) + Decimal(str(self.saldo_pagado))
            return round((pagado / Decimal(str(self.total))) * 100, 2)
        except (ValueError, TypeError, AttributeError, ZeroDivisionError):
            return 0
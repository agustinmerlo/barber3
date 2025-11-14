# caja/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

User = get_user_model()


class TurnoCaja(models.Model):
    """
    Modelo NUEVO para gestionar turnos de caja (apertura y cierre rápido)
    Coexiste con CierreCaja sin conflictos
    """
    ESTADO_CHOICES = [
        ('abierto', 'Abierto'),
        ('cerrado', 'Cerrado'),
    ]
    
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='abierto')
    
    # Apertura
    fecha_apertura = models.DateTimeField(default=timezone.now)
    monto_apertura = models.DecimalField(decimal_places=2, max_digits=10)
    usuario_apertura = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='turnos_abiertos'
    )
    
    # Cierre
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    monto_cierre = models.DecimalField(decimal_places=2, max_digits=10, null=True, blank=True)
    usuario_cierre = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='turnos_cerrados'
    )
    observaciones_cierre = models.TextField(blank=True, null=True)
    
    # Totales calculados
    total_ingresos_efectivo = models.DecimalField(decimal_places=2, default=0, max_digits=10)
    total_egresos_efectivo = models.DecimalField(decimal_places=2, default=0, max_digits=10)
    efectivo_esperado = models.DecimalField(decimal_places=2, default=0, max_digits=10)
    diferencia = models.DecimalField(decimal_places=2, default=0, max_digits=10)
    
    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-fecha_apertura']
        verbose_name = 'Turno de Caja'
        verbose_name_plural = 'Turnos de Caja'
    
    def __str__(self):
        fecha = self.fecha_apertura.strftime('%d/%m/%Y %H:%M')
        return f"Turno {self.id} - {fecha} ({self.estado})"
    
    def calcular_totales(self):
        """Calcula los totales del turno basándose en los movimientos"""
        movimientos = self.movimientos_turno.all()
        
        self.total_ingresos_efectivo = sum(
            m.monto for m in movimientos.filter(tipo='ingreso', metodo_pago='efectivo')
        ) or Decimal('0.00')
        
        self.total_egresos_efectivo = sum(
            m.monto for m in movimientos.filter(tipo='egreso', metodo_pago='efectivo')
        ) or Decimal('0.00')
        
        self.efectivo_esperado = (
            self.monto_apertura + 
            self.total_ingresos_efectivo - 
            self.total_egresos_efectivo
        )
        
        if self.monto_cierre is not None:
            self.diferencia = self.monto_cierre - self.efectivo_esperado
        
        self.save()
    
    def cerrar_turno(self, monto_cierre, observaciones='', usuario=None):
        """Cierra el turno de caja"""
        if self.estado == 'cerrado':
            raise ValueError("El turno ya está cerrado")
        
        self.estado = 'cerrado'
        self.fecha_cierre = timezone.now()
        self.monto_cierre = monto_cierre
        self.observaciones_cierre = observaciones
        self.usuario_cierre = usuario
        
        self.calcular_totales()
        self.save()


class MovimientoCaja(models.Model):
    """
    Modelo para registrar todos los movimientos de caja
    ✅ MANTIENE compatibilidad con CierreCaja
    ✅ AGREGA soporte para TurnoCaja
    """
    
    TIPO_CHOICES = [
        ('ingreso', 'Ingreso'),
        ('egreso', 'Egreso'),
    ]
    
    CATEGORIA_CHOICES = [
        ('servicios', 'Servicios'),
        ('productos', 'Productos'),
        ('gastos', 'Gastos'),
        ('sueldos', 'Sueldos'),
        ('alquiler', 'Alquiler'),
        ('servicios_publicos', 'Servicios Públicos'),
        ('otros', 'Otros'),
    ]
    
    METODO_PAGO_CHOICES = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
        ('mercadopago', 'Mercado Pago'),
    ]
    
    # ✅ MANTIENE: Relación con cierre de caja (tu código actual)
    cierre_caja = models.ForeignKey(
        'CierreCaja',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos',
        help_text="Cierre al que pertenece este movimiento"
    )
    
    # ✅ NUEVO: Relación con turno (opcional, no rompe nada)
    turno = models.ForeignKey(
        TurnoCaja,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_turno',
        help_text="Turno al que pertenece este movimiento"
    )
    
    # Campos principales
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    descripcion = models.TextField(blank=True, null=True)
    metodo_pago = models.CharField(
        max_length=20, 
        choices=METODO_PAGO_CHOICES, 
        default='efectivo'
    )
    categoria = models.CharField(
        max_length=50, 
        choices=CATEGORIA_CHOICES,
        default='servicios'
    )
    
    # Fecha y hora
    fecha = models.DateField(auto_now_add=True)
    hora = models.TimeField(auto_now_add=True)
    
    # Relaciones opcionales
    barbero = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='movimientos_caja',
        help_text="Barbero asociado al movimiento"
    )
    
    reserva = models.ForeignKey(
        'reservas.Reserva',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_caja',
        help_text="Reserva asociada (si aplica)"
    )
    
    usuario_registro = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='movimientos_registrados',
        help_text="Usuario que registró el movimiento"
    )
    
    # Campos adicionales
    comprobante = models.ImageField(
        upload_to='comprobantes_caja/', 
        null=True, 
        blank=True,
        help_text="Comprobante del movimiento"
    )
    
    # ✅ NUEVO: Control de edición
    es_editable = models.BooleanField(
        default=True,
        help_text="Si está en un turno cerrado, no se puede editar"
    )
    
    # Metadata
    fecha_creacion = models.DateTimeField(default=timezone.now)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-fecha_creacion']
        verbose_name = 'Movimiento de Caja'
        verbose_name_plural = 'Movimientos de Caja'
        indexes = [
            models.Index(fields=['-fecha_creacion']),
            models.Index(fields=['tipo', 'categoria']),
            models.Index(fields=['cierre_caja']),
            models.Index(fields=['turno']),
        ]
    
    def __str__(self):
        signo = '+' if self.tipo == 'ingreso' else '-'
        desc = self.descripcion[:50] if self.descripcion else 'Sin descripción'
        return f"{signo}${self.monto} - {desc} ({self.fecha})"
    
    @property
    def monto_con_signo(self):
        """Retorna el monto con signo según el tipo"""
        return self.monto if self.tipo == 'ingreso' else -self.monto
    
    def save(self, *args, **kwargs):
        """Verificar si pertenece a un turno cerrado antes de guardar"""
        if self.pk and self.turno and self.turno.estado == 'cerrado':
            self.es_editable = False
        
        super().save(*args, **kwargs)
        
        # Actualizar totales del turno si existe
        if self.turno:
            self.turno.calcular_totales()


class CierreCaja(models.Model):
    """
    ✅ MANTIENE tu modelo actual SIN cambios
    """
    # Fechas
    fecha_apertura = models.DateTimeField()
    fecha_cierre = models.DateTimeField(default=timezone.now)
    
    # Usuarios
    usuario_apertura = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cierres_apertura',
        help_text="Usuario que abrió la caja"
    )
    usuario_cierre = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cierres_cierre',
        help_text="Usuario que cerró la caja"
    )
    
    # Montos
    monto_inicial = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Monto inicial en efectivo al abrir la caja"
    )
    
    # Totales en efectivo
    total_ingresos_efectivo = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0
    )
    total_egresos_efectivo = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0
    )
    
    # Totales otros medios
    total_ingresos_otros = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Total ingresos en tarjeta, transferencia, etc"
    )
    total_egresos_otros = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Total egresos en tarjeta, transferencia, etc"
    )
    
    # Efectivo
    efectivo_esperado = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        help_text="Efectivo que debería haber en caja"
    )
    efectivo_real = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        help_text="Efectivo contado al cerrar"
    )
    diferencia = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0,
        help_text="Diferencia entre efectivo esperado y real"
    )
    
    # Desgloses
    desglose_metodos = models.JSONField(
        default=dict,
        help_text="Desglose de movimientos por método de pago"
    )
    desglose_categorias = models.JSONField(
        default=dict,
        help_text="Desglose de movimientos por categoría"
    )
    
    # Contadores
    cantidad_movimientos = models.IntegerField(default=0)
    cantidad_ingresos = models.IntegerField(default=0)
    cantidad_egresos = models.IntegerField(default=0)
    
    # Otros
    observaciones = models.TextField(blank=True, null=True)
    esta_cerrado = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-fecha_cierre']
        verbose_name = 'Cierre de Caja'
        verbose_name_plural = 'Cierres de Caja'
        indexes = [
            models.Index(fields=['-fecha_cierre']),
        ]
    
    def __str__(self):
        fecha = self.fecha_cierre.strftime('%d/%m/%Y %H:%M')
        return f"Cierre {self.id} - {fecha}"
    
    @property
    def duracion_turno(self):
        """Calcula la duración del turno en horas"""
        if self.fecha_apertura and self.fecha_cierre:
            delta = self.fecha_cierre - self.fecha_apertura
            return round(delta.total_seconds() / 3600, 2)
        return 0
    
    @property
    def tipo_diferencia(self):
        """Retorna si hay sobrante o faltante"""
        if self.diferencia > 0:
            return "sobrante"
        elif self.diferencia < 0:
            return "faltante"
        return "exacto"
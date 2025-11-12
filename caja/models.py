# caja/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal

User = get_user_model()

class TurnoCaja(models.Model):
    """
    Modelo para gestionar turnos de caja (apertura y cierre)
    """
    ESTADO_CHOICES = [
        ('abierto', 'Abierto'),
        ('cerrado', 'Cerrado'),
    ]
    
    # Información del turno
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='abierto')
    
    # Apertura
    fecha_apertura = models.DateTimeField(default=timezone.now)
    monto_apertura = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        help_text="Monto inicial en efectivo al abrir la caja"
    )
    usuario_apertura = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='turnos_abiertos',
        help_text="Usuario que abrió la caja"
    )
    
    # Cierre
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    monto_cierre = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Efectivo contado al cerrar la caja"
    )
    usuario_cierre = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='turnos_cerrados',
        help_text="Usuario que cerró la caja"
    )
    observaciones_cierre = models.TextField(blank=True, null=True)
    
    # Totales calculados
    total_ingresos_efectivo = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Total de ingresos en efectivo del turno"
    )
    total_egresos_efectivo = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Total de egresos en efectivo del turno"
    )
    efectivo_esperado = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Efectivo que debería haber en caja"
    )
    diferencia = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        help_text="Diferencia entre efectivo esperado y contado"
    )
    
    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-fecha_apertura']
        verbose_name = 'Turno de Caja'
        verbose_name_plural = 'Turnos de Caja'
        indexes = [
            models.Index(fields=['-fecha_apertura']),
            models.Index(fields=['estado']),
        ]
    
    def __str__(self):
        fecha = self.fecha_apertura.strftime('%d/%m/%Y %H:%M')
        return f"Turno {self.id} - {fecha} ({self.estado})"
    
    def calcular_totales(self):
        """Calcula los totales del turno basándose en los movimientos"""
        movimientos = self.movimientos.all()
        
        # Solo efectivo
        self.total_ingresos_efectivo = sum(
            m.monto for m in movimientos.filter(
                tipo='ingreso', 
                metodo_pago='efectivo'
            )
        ) or Decimal('0.00')
        
        self.total_egresos_efectivo = sum(
            m.monto for m in movimientos.filter(
                tipo='egreso', 
                metodo_pago='efectivo'
            )
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
    
    # Relación con turno
    turno = models.ForeignKey(
        TurnoCaja,
        on_delete=models.CASCADE,
        related_name='movimientos',
        null=True,
        blank=True,
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
    
    # Campo para bloquear edición
    es_editable = models.BooleanField(
        default=True,
        help_text="Si está en un turno cerrado, no se puede editar"
    )
    
    # Metadata
    fecha_creacion = models.DateTimeField(default=timezone.now)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-fecha', '-hora']
        verbose_name = 'Movimiento de Caja'
        verbose_name_plural = 'Movimientos de Caja'
        indexes = [
            models.Index(fields=['-fecha', '-hora']),
            models.Index(fields=['tipo', 'categoria']),
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
    
    def clean(self):
        """Validaciones personalizadas"""
        from django.core.exceptions import ValidationError
        
        if self.monto and self.monto <= 0:
            raise ValidationError({'monto': 'El monto debe ser mayor a 0'})
        
        if self.tipo == 'ingreso' and self.categoria == 'gastos':
            raise ValidationError({
                'categoria': 'Un ingreso no puede tener categoría "gastos"'
            })
        
        # Validar que no se edite un movimiento de un turno cerrado
        if self.pk and self.turno and self.turno.estado == 'cerrado':
            raise ValidationError({
                'turno': 'No se puede modificar un movimiento de un turno cerrado'
            })


class CierreCaja(models.Model):
    """
    Modelo para registrar cierres de caja periódicos (diarios/semanales/mensuales)
    Independiente de los turnos individuales
    """
    fecha_cierre = models.DateField()
    fecha_desde = models.DateField()
    fecha_hasta = models.DateField()
    
    # Totales generales
    total_ingresos = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_egresos = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    saldo_neto = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Desglose por método de pago
    efectivo_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tarjeta_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    transferencia_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    mercadopago_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Usuario que realizó el cierre
    usuario_cierre = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='cierres_realizados'
    )
    
    observaciones = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-fecha_cierre']
        verbose_name = 'Cierre de Caja Periódico'
        verbose_name_plural = 'Cierres de Caja Periódicos'
    
    def __str__(self):
        return f"Cierre {self.fecha_cierre} (${self.saldo_neto})"
    
    def calcular_totales(self):
        """Calcula los totales basándose en los movimientos del período"""
        movimientos = MovimientoCaja.objects.filter(
            fecha__gte=self.fecha_desde,
            fecha__lte=self.fecha_hasta
        )
        
        self.total_ingresos = sum(
            m.monto for m in movimientos.filter(tipo='ingreso')
        ) or Decimal('0.00')
        
        self.total_egresos = sum(
            m.monto for m in movimientos.filter(tipo='egreso')
        ) or Decimal('0.00')
        
        self.saldo_neto = self.total_ingresos - self.total_egresos
        
        # Desglose por método
        for metodo in ['efectivo', 'tarjeta', 'transferencia', 'mercadopago']:
            total = sum(
                m.monto for m in movimientos.filter(
                    tipo='ingreso',
                    metodo_pago=metodo
                )
            ) or Decimal('0.00')
            setattr(self, f'{metodo}_total', total)
        
        self.save()
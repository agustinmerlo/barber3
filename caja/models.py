from django.db import models

class MovimientoCaja(models.Model):
    TIPOS = [
        ('ingreso', 'Ingreso'),
        ('egreso', 'Egreso'),
    ]
    
    METODOS_PAGO = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
        ('mercadopago', 'Mercado Pago'),
    ]
    
    CATEGORIAS = [
        ('servicios', 'Servicios'),
        ('productos', 'Productos'),
        ('gastos', 'Gastos'),
        ('sueldos', 'Sueldos'),
        ('alquiler', 'Alquiler'),
        ('servicios_publicos', 'Servicios Públicos'),
        ('otros', 'Otros'),
    ]
    
    tipo = models.CharField(max_length=10, choices=TIPOS)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    descripcion = models.TextField(blank=True, null=True)
    metodo_pago = models.CharField(max_length=20, choices=METODOS_PAGO, default='efectivo')
    categoria = models.CharField(max_length=30, choices=CATEGORIAS, default='servicios')
    fecha = models.DateField()
    hora = models.TimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-fecha', '-hora']
        verbose_name = 'Movimiento de Caja'
        verbose_name_plural = 'Movimientos de Caja'
    
    def __str__(self):
        return f"{self.tipo.upper()} - ${self.monto} - {self.fecha}"
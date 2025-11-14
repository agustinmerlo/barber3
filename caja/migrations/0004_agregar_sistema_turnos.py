# caja/migrations/0004_agregar_sistema_turnos.py
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('caja', '0003_auto_20251114_0119'),
    ]

    operations = [
        # Ya creamos todo en MySQL, así que solo registramos los cambios
        migrations.CreateModel(
            name='TurnoCaja',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('estado', models.CharField(choices=[('abierto', 'Abierto'), ('cerrado', 'Cerrado')], default='abierto', max_length=10)),
                ('fecha_apertura', models.DateTimeField(default=django.utils.timezone.now)),
                ('monto_apertura', models.DecimalField(decimal_places=2, max_digits=10)),
                ('fecha_cierre', models.DateTimeField(blank=True, null=True)),
                ('monto_cierre', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('observaciones_cierre', models.TextField(blank=True, null=True)),
                ('total_ingresos_efectivo', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('total_egresos_efectivo', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('efectivo_esperado', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('diferencia', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
                ('usuario_apertura', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='turnos_abiertos', to=settings.AUTH_USER_MODEL)),
                ('usuario_cierre', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='turnos_cerrados', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Turno de Caja',
                'verbose_name_plural': 'Turnos de Caja',
                'ordering': ['-fecha_apertura'],
            },
        ),
        migrations.AddField(
            model_name='movimientocaja',
            name='turno',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movimientos_turno', to='caja.turnocaja'),
        ),
        migrations.AddField(
            model_name='movimientocaja',
            name='es_editable',
            field=models.BooleanField(default=True),
        ),
    ]
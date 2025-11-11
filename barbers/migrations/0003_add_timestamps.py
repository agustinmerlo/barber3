from django.db import migrations, models
import django.utils.timezone

class Migration(migrations.Migration):

    dependencies = [
        ('barbers', '0002_barber_delete_servicio'),
    ]

    operations = [
        migrations.AddField(
            model_name='barber',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='barber',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
        ),
    ]

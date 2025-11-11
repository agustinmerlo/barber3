from django.contrib import admin
from .models import Barber

@admin.register(Barber)
class BarberAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'specialty', 'work_schedule', 'is_deleted', 'created_at')
    list_filter = ('is_deleted',)
    search_fields = ('name', 'specialty')
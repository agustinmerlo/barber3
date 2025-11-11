from django.contrib import admin
from .models import Proveedor

@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "email", "phone", "active", "created_at")
    list_filter = ("active", "created_at")
    search_fields = ("name", "company", "email", "phone")
    ordering = ("-created_at",)
    list_per_page = 25

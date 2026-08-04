from django.contrib import admin
from .models import Therapy, Schedule


@admin.register(Therapy)
class TherapyAdmin(admin.ModelAdmin):
    list_display = ['name', 'duration', 'price', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ['patient', 'therapy', 'therapist', 'date', 'start_time', 'status']
    list_filter = ['status', 'date']
    search_fields = ['patient__email', 'name', 'email']
    date_hierarchy = 'date'
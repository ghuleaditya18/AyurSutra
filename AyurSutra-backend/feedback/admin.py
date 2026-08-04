from django.contrib import admin
from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'service_taken', 'rating', 'created_at']
    list_filter = ['rating']
    search_fields = ['full_name', 'email', 'contact']
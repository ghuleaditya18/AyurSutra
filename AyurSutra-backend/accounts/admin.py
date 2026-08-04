from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Message, Notification


class UserAdmin(BaseUserAdmin):
    model = User
    list_display = ['email', 'phone', 'role', 'patient_id', 'is_active', 'is_staff']
    list_filter = ['role', 'is_active']
    search_fields = ['email', 'phone', 'patient_id']
    ordering = ['-id']

    fieldsets = (
        (None, {'fields': ('email', 'phone', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'age', 'gender', 'address')}),
        ('Role & Status', {'fields': ('role', 'patient_id', 'qr_data', 'is_active', 'is_staff', 'is_superuser')}),
        ('Permissions', {'fields': ('groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'phone', 'username', 'role', 'password1', 'password2'),
        }),
    )


admin.site.register(User, UserAdmin)
admin.site.register(Message)
admin.site.register(Notification)

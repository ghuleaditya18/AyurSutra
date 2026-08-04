from rest_framework import serializers
from .models import Therapy, Schedule


class TherapySerializer(serializers.ModelSerializer):
    class Meta:
        model = Therapy
        fields = '__all__'


class ScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Schedule
        fields = '__all__'
        read_only_fields = ['qr_data', 'created_at', 'updated_at']
        extra_kwargs = {'patient': {'required': False}, 'name': {'required': False}, 'email': {'required': False}}
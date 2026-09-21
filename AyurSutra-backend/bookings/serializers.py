from datetime import time, datetime, timedelta, date
from django.utils import timezone
from rest_framework import serializers
from .models import Therapy, Schedule


class TherapySerializer(serializers.ModelSerializer):
    class Meta:
        model = Therapy
        fields = '__all__'


class ScheduleSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    therapy_name = serializers.SerializerMethodField()
    therapist_name = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            'id', 'patient', 'patient_name', 'name', 'email',
            'therapy', 'therapy_name', 'therapist', 'therapist_name',
            'date', 'start_time', 'end_time', 'status', 'qr_data',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'patient', 'name', 'email', 'qr_data',
            'created_at', 'updated_at', 'patient_name',
            'therapy_name', 'therapist_name'
        ]
        extra_kwargs = {
            'therapist': {'required': False, 'allow_null': True},
            'end_time': {'required': False},
        }

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None

        # Resolve therapy, date, start_time, therapist
        therapy = attrs.get('therapy') or (self.instance.therapy if self.instance else None)
        booking_date = attrs.get('date') or (self.instance.date if self.instance else None)
        start_time = attrs.get('start_time') or (self.instance.start_time if self.instance else None)
        therapist = attrs.get('therapist') if 'therapist' in attrs else (self.instance.therapist if self.instance else None)

        # Determine if this is a new booking or if date/time is being modified
        is_date_or_time_changing = (self.instance is None) or ('date' in attrs) or ('start_time' in attrs)

        # Sunday check
        if is_date_or_time_changing and booking_date and booking_date.weekday() == 6:
            raise serializers.ValidationError({"date": "The hospital is closed on Sundays. Please choose Monday through Saturday."})

        # Past date and past time slot check for today (only when creating or changing date/time)
        if is_date_or_time_changing and booking_date:
            now_dt = timezone.localtime()
            if booking_date < now_dt.date():
                raise serializers.ValidationError({"date": "Date cannot be in the past."})
            if booking_date == now_dt.date() and start_time:
                st_seconds = start_time.hour * 3600 + start_time.minute * 60 + start_time.second
                now_seconds = now_dt.hour * 3600 + now_dt.minute * 60 + now_dt.second
                if st_seconds <= now_seconds:
                    raise serializers.ValidationError({"start_time": "Cannot book an appointment for a past time slot today."})

        # Check that start_time is one of the 5 daily session slots (only when creating or changing slot)
        from .models import DAILY_SLOT_START_TIMES
        if is_date_or_time_changing and start_time and start_time not in DAILY_SLOT_START_TIMES:
            raise serializers.ValidationError({"start_time": "Start time must be one of the 5 designated daily session slots (09:00 AM, 11:00 AM, 01:30 PM, 04:00 PM, 06:00 PM)."})

        # Calculate / validate end_time
        if therapy and start_time:
            duration = therapy.duration
            end_dt = datetime.combine(date.today(), start_time) + timedelta(minutes=duration)
            end_time = end_dt.time()
            if is_date_or_time_changing and end_time > time(19, 0):
                raise serializers.ValidationError({"start_time": "Slot end time exceeds hospital closing time (7:00 PM)."})
            if 'end_time' not in attrs:
                attrs['end_time'] = end_time

        # Check therapist overlap
        if therapist and booking_date and start_time and attrs.get('end_time'):
            end_time = attrs['end_time']
            overlapping = Schedule.objects.filter(
                therapist=therapist,
                date=booking_date,
                status__in=['applied', 'scheduled']
            )
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)

            if overlapping.filter(start_time__lt=end_time, end_time__gt=start_time).exists():
                raise serializers.ValidationError({"therapist": "This therapist already has an appointment booked during this time slot."})

        # Role-based status & modification checks
        if user and user.is_authenticated:
            # Therapist cannot modify another therapist's booking
            if user.role == 'therapist' and self.instance:
                if self.instance.therapist and self.instance.therapist != user:
                    raise serializers.ValidationError({"therapist": "You cannot modify another therapist's appointment."})

            # Patient modification guards
            if user.role == 'patient' and self.instance:
                if self.instance.patient != user:
                    raise serializers.ValidationError({"patient": "You cannot modify another patient's appointment."})
                if self.instance.status in ['scheduled', 'completed', 'cancelled']:
                    if any(k in attrs for k in ('date', 'start_time', 'end_time', 'therapy', 'therapist')):
                        raise serializers.ValidationError({"non_field_errors": [f"Cannot reschedule or modify an appointment that is already {self.instance.status}."]})

            new_status = attrs.get('status')
            if self.instance and new_status and new_status != self.instance.status:
                current_status = self.instance.status
                if user.role == 'patient':
                    if new_status in ['scheduled', 'completed']:
                        raise serializers.ValidationError({"status": "Patients cannot change booking status to scheduled or completed."})
                    if current_status in ['completed', 'cancelled']:
                        raise serializers.ValidationError({"status": f"Cannot modify a booking that is already {current_status}."})
                elif user.role == 'therapist':
                    if current_status == 'applied' and new_status == 'completed':
                        raise serializers.ValidationError({"status": "Applied booking must be confirmed (scheduled) before completing."})
                    if current_status == 'completed' and new_status != 'completed':
                        raise serializers.ValidationError({"status": "Cannot modify an already completed appointment."})

        return attrs

    def get_patient_name(self, obj):
        if obj.patient:
            full_name = f"{obj.patient.first_name} {obj.patient.last_name}".strip()
            if full_name:
                return full_name
            return obj.patient.email
        return obj.name or "Patient"

    def get_therapy_name(self, obj):
        return obj.therapy.name if obj.therapy else ""

    def get_therapist_name(self, obj):
        if obj.therapist:
            full_name = f"{obj.therapist.first_name} {obj.therapist.last_name}".strip()
            if full_name:
                return full_name
            return obj.therapist.email
        return "Not assigned"
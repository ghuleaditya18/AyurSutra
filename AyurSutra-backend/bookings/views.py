from datetime import datetime, timedelta, time
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Therapy, Schedule, DAILY_SLOT_START_TIMES
from .serializers import TherapySerializer, ScheduleSerializer
from accounts.permissions import IsAdminOrReadOnly


def send_notification(user, message):
    if user:
        from accounts.models import Notification
        try:
            Notification.objects.create(user=user, message=message)
        except Exception:
            pass


def notify_admins(message):
    from accounts.models import Notification, User
    try:
        admins = User.objects.filter(role='admin')
        for admin in admins:
            Notification.objects.create(user=admin, message=message)
    except Exception:
        pass


class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return Schedule.objects.filter(patient=user)
        if user.role == 'therapist':
            queryset = Schedule.objects.filter(therapist=user)
            specialization = getattr(getattr(user, 'therapist_profile', None), 'specialization', user.specialization)
            if specialization:
                queryset = queryset | Schedule.objects.filter(
                    Q(therapist__isnull=True) | Q(therapist=user),
                    therapy__name__iexact=specialization,
                )
            return queryset.distinct()
        return Schedule.objects.all()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'patient':
            instance = serializer.save(
                patient=user,
                name=f"{user.first_name} {user.last_name}".strip() or user.email,
                email=user.email,
                status='applied'
            )
        else:
            patient_id = self.request.data.get('patient')
            patient = None
            if patient_id:
                from accounts.models import User
                patient = User.objects.filter(id=patient_id, role='patient').first()
            if not patient:
                patient = user
            instance = serializer.save(
                patient=patient,
                name=f"{patient.first_name} {patient.last_name}".strip() or patient.email,
                email=patient.email
            )

        # Send Notifications for new booking
        patient_display = f"{instance.patient.first_name} {instance.patient.last_name}".strip() if instance.patient and instance.patient.first_name else (instance.name or instance.email or "Patient")
        therapy_name = instance.therapy.name if instance.therapy else "Therapy"
        time_slot = f"{instance.start_time.strftime('%I:%M %p')} - {instance.end_time.strftime('%I:%M %p')}" if instance.start_time and instance.end_time else str(instance.start_time)
        date_str = str(instance.date)

        if instance.therapist:
            send_notification(
                instance.therapist,
                f"New Booking Request: {patient_display} applied for {therapy_name} on {date_str} at {time_slot}."
            )
        else:
            # Unassigned booking -> notify matching therapists
            from accounts.models import User
            therapists = User.objects.filter(role='therapist')
            if instance.therapy:
                matching = therapists.filter(specialization__icontains=instance.therapy.name)
                if matching.exists():
                    therapists = matching
            for t in therapists:
                send_notification(
                    t,
                    f"New Booking Request: {patient_display} applied for {therapy_name} on {date_str} at {time_slot}."
                )

        notify_admins(
            f"New Booking: {patient_display} applied for {therapy_name} on {date_str} ({time_slot})."
        )

    def perform_update(self, serializer):
        user = self.request.user
        old_status = serializer.instance.status
        old_date = serializer.instance.date
        old_start = serializer.instance.start_time

        if user.role == 'therapist' and not serializer.instance.therapist:
            instance = serializer.save(therapist=user)
        else:
            instance = serializer.save()

        new_status = instance.status
        patient_display = f"{instance.patient.first_name} {instance.patient.last_name}".strip() if instance.patient and instance.patient.first_name else (instance.name or instance.email or "Patient")
        therapy_name = instance.therapy.name if instance.therapy else "Therapy"
        therapist_display = f"Dr. {instance.therapist.first_name} {instance.therapist.last_name}".strip() if instance.therapist and instance.therapist.first_name else (f"Dr. {instance.therapist.email}" if instance.therapist else "Therapist")
        time_slot = f"{instance.start_time.strftime('%I:%M %p')} - {instance.end_time.strftime('%I:%M %p')}" if instance.start_time and instance.end_time else str(instance.start_time)
        date_str = str(instance.date)

        # Notify on status changes
        if old_status != new_status:
            if new_status == 'scheduled':
                send_notification(
                    instance.patient,
                    f"Appointment Confirmed: Your {therapy_name} therapy on {date_str} at {time_slot} is scheduled with {therapist_display}."
                )
                notify_admins(
                    f"Appointment Scheduled: {therapy_name} for {patient_display} scheduled with {therapist_display} on {date_str}."
                )
            elif new_status == 'completed':
                send_notification(
                    instance.patient,
                    f"Session Completed: Your {therapy_name} session on {date_str} with {therapist_display} has been marked completed."
                )
                notify_admins(
                    f"Session Completed: {patient_display}'s {therapy_name} session on {date_str} marked completed."
                )
            elif new_status == 'cancelled':
                if user.role == 'patient':
                    if instance.therapist:
                        send_notification(
                            instance.therapist,
                            f"Appointment Cancelled: Patient {patient_display} cancelled their {therapy_name} session on {date_str} ({time_slot})."
                        )
                    notify_admins(
                        f"Appointment Cancelled: {patient_display} cancelled {therapy_name} booking on {date_str}."
                    )
                else:
                    send_notification(
                        instance.patient,
                        f"Appointment Cancelled: Your {therapy_name} appointment on {date_str} at {time_slot} was cancelled by {therapist_display}."
                    )
                    notify_admins(
                        f"Appointment Cancelled: {therapist_display} cancelled appointment for {patient_display} on {date_str}."
                    )
        elif (old_date != instance.date or old_start != instance.start_time) and user != instance.patient:
            send_notification(
                instance.patient,
                f"Appointment Rescheduled: Your {therapy_name} session is updated to {date_str} at {time_slot} with {therapist_display}."
            )

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'therapist' and instance.therapist and instance.therapist != user:
            raise permissions.exceptions.PermissionDenied("You cannot delete another therapist's appointment.")

        patient = instance.patient
        therapist = instance.therapist
        therapy_name = instance.therapy.name if instance.therapy else "Therapy"
        date_str = str(instance.date)

        instance.delete()

        if patient and patient != user:
            send_notification(
                patient,
                f"Appointment Removed: Your appointment for {therapy_name} on {date_str} has been removed."
            )
        if therapist and therapist != user:
            send_notification(
                therapist,
                f"Appointment Removed: The {therapy_name} appointment on {date_str} was deleted."
            )

    @action(detail=False, methods=['get'], url_path='available-slots', permission_classes=[permissions.IsAuthenticated])
    def available_slots(self, request):
        therapy_id = request.query_params.get('therapy')
        date_str = request.query_params.get('date')
        therapist_id = request.query_params.get('therapist')

        if not therapy_id:
            return Response({"error": "therapy parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not date_str:
            return Response({"error": "date parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        therapy = get_object_or_404(Therapy, id=therapy_id)

        try:
            booking_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format. Expected YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        now_dt = timezone.localtime()
        if booking_date < now_dt.date():
            return Response({"error": "Cannot check slots for past dates."}, status=status.HTTP_400_BAD_REQUEST)

        if booking_date.weekday() == 6:
            return Response({
                "therapy": {"id": therapy.id, "name": therapy.name, "duration": therapy.duration},
                "date": date_str,
                "is_sunday": True,
                "message": "The hospital is closed on Sundays.",
                "slots": []
            })

        duration = therapy.duration
        slots = []

        booked_intervals = []
        if therapist_id:
            existing = Schedule.objects.filter(
                therapist_id=therapist_id,
                date=booking_date,
                status__in=['applied', 'scheduled']
            )
            for item in existing:
                b_start = datetime.combine(booking_date, item.start_time)
                b_end = datetime.combine(booking_date, item.end_time)
                booked_intervals.append((b_start, b_end))

        for start_t in DAILY_SLOT_START_TIMES:
            slot_start = datetime.combine(booking_date, start_t)
            slot_end = slot_start + timedelta(minutes=duration)

            # Skip if slot end exceeds 7:00 PM
            if slot_end.time() > time(19, 0):
                continue

            # If today, skip slots whose start_time is already in the past
            if booking_date == now_dt.date():
                st_seconds = slot_start.hour * 3600 + slot_start.minute * 60
                now_seconds = now_dt.hour * 3600 + now_dt.minute * 60 + now_dt.second
                if st_seconds <= now_seconds:
                    continue

            is_available = True
            for b_start, b_end in booked_intervals:
                if slot_start < b_end and slot_end > b_start:
                    is_available = False
                    break

            slots.append({
                "start_time": slot_start.strftime('%H:%M:%S'),
                "end_time": slot_end.strftime('%H:%M:%S'),
                "label": f"{slot_start.strftime('%I:%M %p')} - {slot_end.strftime('%I:%M %p')}",
                "available": is_available
            })

        return Response({
            "therapy": {
                "id": therapy.id,
                "name": therapy.name,
                "duration": therapy.duration
            },
            "date": date_str,
            "is_sunday": False,
            "slots": slots
        })


class TherapyViewSet(viewsets.ModelViewSet):
    queryset = Therapy.objects.filter(is_active=True)
    serializer_class = TherapySerializer
    permission_classes = [IsAdminOrReadOnly]

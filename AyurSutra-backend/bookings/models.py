from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from accounts.models import User


def validate_not_past_date(value):
    if value < timezone.now().date():
        raise ValidationError("Date cannot be in the past.")


class Therapy(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    duration = models.PositiveIntegerField(
        help_text="Duration in minutes",
        validators=[MinValueValidator(1), MaxValueValidator(480)],
    )
    price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Schedule(models.Model):
    STATUS_CHOICES = (
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    patient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='schedules',
    )
    name = models.CharField(max_length=100)      # snapshot of patient name
    email = models.EmailField()                  # snapshot of patient email
    therapy = models.ForeignKey(Therapy, on_delete=models.CASCADE, related_name='schedules')
    therapist = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_schedules',
    )
    date = models.DateField(validators=[validate_not_past_date])
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='scheduled', db_index=True)
    qr_data = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('therapist', 'date', 'start_time')
        ordering = ['-date', 'start_time']
        indexes = [
            models.Index(fields=['date', 'status']),
        ]

    def clean(self):
        # end_time must be after start_time
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError("End time must be after start time.")

        # role correctness
        if self.patient_id and self.patient.role != 'patient':
            raise ValidationError("Assigned patient must have role='patient'.")

        if self.therapist_id and self.therapist.role != 'therapist':
            raise ValidationError("Assigned therapist must have role='therapist'.")

        # overlap check — same therapist, same date, overlapping time range
        if self.therapist_id and self.date and self.start_time and self.end_time:
            overlapping = Schedule.objects.filter(
                therapist_id=self.therapist_id,
                date=self.date,
                status='scheduled',
            ).exclude(pk=self.pk).filter(
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
            )
            if overlapping.exists():
                raise ValidationError("This therapist already has an overlapping booking at this time.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient} - {self.therapy} - {self.date} {self.start_time}"
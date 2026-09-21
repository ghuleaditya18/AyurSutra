from django.db import models, transaction
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from .managers import UserManager

phone_validator = RegexValidator(r'^[6-9]\d{9}$', 'Enter a valid 10-digit Indian Phone Number')


class User(AbstractUser):
    ROLE_CHOICES = (
        ('patient', 'Patient'),
        ('therapist', 'Therapist'),
        ('admin', 'Admin'),
    )
    GENDER_CHOICES = (
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    )

    objects = UserManager()

    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=10, unique=True, validators=[phone_validator])
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='patient', db_index=True)
    age = models.PositiveIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(120)])
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    address = models.CharField(max_length=255, blank=True)
    specialization = models.CharField(max_length=100, blank=True)
    patient_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    qr_data = models.TextField(blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []   # username no longer manually required — auto-generated below

    def clean(self):
        if self.is_superuser or self.role == "admin":
            return
    
        if self.role == 'patient':
            if self.age is None:
                raise ValidationError({'age': 'Age is required for patients.'})
            if not self.gender:
                raise ValidationError({'gender': 'Gender is required for patients.'})

    def save(self, *args, **kwargs):
        # Normalize inputs
        if self.email:
            self.email = self.email.strip().lower()
        if self.phone:
            self.phone = self.phone.strip()
        if self.specialization:
            self.specialization = self.specialization.strip()

        if self.role != 'patient':
            self.patient_id = None
        if self.role != 'therapist':
            self.specialization = ''

        # Auto-generate username from email if not set (keeps signup to email/phone/password only)
        if not self.username:
            base_username = self.email.split('@')[0] if self.email else 'user'
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exclude(pk=self.pk).exists():
                username = f"{base_username}{counter}"
                counter += 1
            self.username = username

        self.full_clean(exclude=['password'])

        if self.role == 'patient' and not self.patient_id:
            with transaction.atomic():
                last_user = (
                    User.objects.select_for_update()
                    .filter(patient_id__startswith='AYR-')
                    .order_by('-patient_id')
                    .first()
                )
                last_num = int(last_user.patient_id.split('-')[1]) if last_user else 0
                self.patient_id = f"AYR-{last_num + 1:04d}"
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return self.email


class PatientProfile(models.Model):
    GENDER_CHOICES = (
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='patient_profile'
    )
    patient_id = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        db_index=True
    )
    age = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(120)]
    )
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES
    )
    address = models.CharField(
        max_length=255,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.patient_id:
            with transaction.atomic():
                last_profile = (
                    PatientProfile.objects.select_for_update()
                    .filter(patient_id__startswith='AYR-')
                    .order_by('-patient_id')
                    .first()
                )
                if last_profile and last_profile.patient_id:
                    try:
                        last_num = int(last_profile.patient_id.split('-')[1])
                    except (IndexError, ValueError):
                        last_num = 0
                else:
                    last_user = (
                        User.objects.select_for_update()
                        .filter(patient_id__startswith='AYR-')
                        .order_by('-patient_id')
                        .first()
                    )
                    last_num = int(last_user.patient_id.split('-')[1]) if last_user and last_user.patient_id else 0

                self.patient_id = f"AYR-{last_num + 1:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.patient_id or 'Patient'} - {self.user.email}"


class TherapistProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='therapist_profile'
    )
    specialization = models.CharField(
        max_length=100,
        blank=True
    )
    qualification = models.CharField(
        max_length=100,
        blank=True
    )
    is_available = models.BooleanField(
        default=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        full_name = f"{self.user.first_name} {self.user.last_name}".strip() or self.user.email
        return f"Dr. {full_name} ({self.specialization or 'General'})"


class Message(models.Model):
    to = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages_received')
    from_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages_sent')
    subject = models.CharField(max_length=255, default='No Subject')
    body = models.TextField()
    date = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ['-date']


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    read = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

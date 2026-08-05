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
                    .filter(role='patient', patient_id__isnull=False)
                    .order_by('-id')
                    .first()
                )
                last_num = int(last_user.patient_id.split('-')[1]) if last_user else 0
                self.patient_id = f"AYR-{last_num + 1:04d}"
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)

    def __str__(self):
        return self.email


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
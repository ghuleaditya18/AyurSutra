from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator

contact_validator = RegexValidator(
    r'^[6-9]\d{9}$',
    'Enter a valid 10-digit Indian phone number'
)


class Feedback(models.Model):
    full_name = models.CharField(max_length=100)
    contact = models.CharField(
        max_length=10,
        blank=True,
        validators=[contact_validator],
    )
    email = models.EmailField(blank=True)
    service_taken = models.CharField(max_length=100, blank=True)
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5",
    )
    symptoms = models.TextField(blank=True)
    improvements = models.TextField(blank=True)
    suggestions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.strip().lower()
        if self.contact:
            self.contact = self.contact.strip()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} - {self.rating}/5"
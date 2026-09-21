from django.db import migrations


def populate_profiles(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    PatientProfile = apps.get_model('accounts', 'PatientProfile')
    TherapistProfile = apps.get_model('accounts', 'TherapistProfile')

    # Populate PatientProfile for existing patient users
    for user in User.objects.filter(role='patient'):
        if not PatientProfile.objects.filter(user=user).exists():
            age = user.age if user.age is not None else 25
            gender = user.gender if user.gender else 'Other'
            address = user.address if user.address else ''
            patient_id = user.patient_id

            if not patient_id:
                # Generate standard format
                last_prof = PatientProfile.objects.filter(patient_id__startswith='AYR-').order_by('-patient_id').first()
                last_num = int(last_prof.patient_id.split('-')[1]) if last_prof and last_prof.patient_id else user.id
                patient_id = f"AYR-{last_num + 1:04d}"

            PatientProfile.objects.create(
                user=user,
                patient_id=patient_id,
                age=age,
                gender=gender,
                address=address,
            )

    # Populate TherapistProfile for existing therapist users
    for user in User.objects.filter(role='therapist'):
        if not TherapistProfile.objects.filter(user=user).exists():
            TherapistProfile.objects.create(
                user=user,
                specialization=user.specialization or '',
                is_available=True,
            )


def reverse_populate(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_patientprofile_therapistprofile'),
    ]

    operations = [
        migrations.RunPython(populate_profiles, reverse_populate),
    ]

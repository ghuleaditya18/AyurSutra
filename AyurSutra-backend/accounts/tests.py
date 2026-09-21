from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, PatientProfile, TherapistProfile


class AccountsAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            email='patient@example.com',
            password='Password123',
            phone='9876543210',
            role='patient',
            age=30,
            gender='Male',
            first_name='John',
            last_name='Doe'
        )
        # Ensure profile exists for test fixture
        PatientProfile.objects.get_or_create(
            user=self.patient,
            defaults={
                'age': 30,
                'gender': 'Male',
                'address': '100 Health Blvd',
                'patient_id': self.patient.patient_id or 'AYR-0001'
            }
        )
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='Password123',
            phone='9876543211',
            role='admin'
        )

    def test_user_registration_with_name(self):
        data = {
            'name': 'Jane Smith',
            'email': 'jane@example.com',
            'phone': '9876543212',
            'password': 'Password123',
            'age': 25,
            'gender': 'Female',
            'address': '123 Street'
        }
        response = self.client.post('/api/register/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email='jane@example.com')
        self.assertEqual(new_user.first_name, 'Jane')
        self.assertEqual(new_user.last_name, 'Smith')
        self.assertTrue(hasattr(new_user, 'patient_profile'))
        self.assertEqual(new_user.patient_profile.age, 25)
        self.assertEqual(new_user.patient_profile.gender, 'Female')

    def test_user_profile_endpoint(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get('/api/users/profile/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'patient@example.com')
        self.assertEqual(response.data['name'], 'John Doe')
        self.assertEqual(response.data['age'], 30)

    def test_admin_stats_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', response.data)
        self.assertIn('pending_feedback', response.data)

    def test_user_profile_update(self):
        self.client.force_authenticate(user=self.patient)
        data = {
            'address': '456 Wellness Way',
            'phone': '9876543999'
        }
        response = self.client.patch('/api/users/profile/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.phone, '9876543999')
        profile = self.patient.patient_profile
        profile.refresh_from_db()
        self.assertEqual(profile.address, '456 Wellness Way')

    def test_custom_token_obtain_pair_returns_user_payload(self):
        response = self.client.post('/api/token/', {
            'email': 'patient@example.com',
            'password': 'Password123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'patient@example.com')
        self.assertEqual(response.data['user']['role'], 'patient')
        self.assertEqual(response.data['user']['name'], 'John Doe')

    def test_admin_can_update_user(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'Jonathan Doe',
            'phone': '9876543888',
            'specialization': 'Panchakarma Expert',
            'role': 'therapist'
        }
        response = self.client.patch(f'/api/users/{self.patient.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.patient.refresh_from_db()
        self.assertEqual(self.patient.first_name, 'Jonathan')
        self.assertEqual(self.patient.phone, '9876543888')
        self.assertEqual(self.patient.role, 'therapist')
        self.assertTrue(hasattr(self.patient, 'therapist_profile'))
        self.assertEqual(self.patient.therapist_profile.specialization, 'Panchakarma Expert')

    def test_admin_can_delete_user(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/users/{self.patient.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=self.patient.id).exists())

    def test_admin_cannot_delete_self(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/users/{self.admin.id}/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(User.objects.filter(id=self.admin.id).exists())

    def test_patient_cannot_delete_user(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.delete(f'/api/users/{self.admin.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patient_cannot_update_another_user(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.patch(f'/api/users/{self.admin.id}/', {'name': 'Hacked Admin'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_therapist_cannot_delete_user(self):
        therapist = User.objects.create_user(
            email='therapist@example.com',
            password='Password123',
            phone='9876543299',
            role='therapist'
        )
        self.client.force_authenticate(user=therapist)
        response = self.client.delete(f'/api/users/{self.patient.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_registration_creates_user_and_patient_profile(self):
        data = {
            'name': 'Pooja Verma',
            'email': 'pooja@example.com',
            'phone': '9876543277',
            'password': 'Password123',
            'age': 29,
            'gender': 'Female',
            'address': '78 Ayurveda Marg'
        }
        response = self.client.post('/api/register/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email='pooja@example.com')
        self.assertTrue(hasattr(new_user, 'patient_profile'))
        self.assertEqual(new_user.patient_profile.age, 29)
        self.assertEqual(new_user.patient_profile.gender, 'Female')
        self.assertEqual(new_user.patient_profile.address, '78 Ayurveda Marg')
        self.assertTrue(new_user.patient_profile.patient_id.startswith('AYR-'))

    def test_staff_create_therapist_creates_user_and_therapist_profile(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'Dr. Priya Sharma',
            'email': 'priya.sharma@ayursutra.com',
            'phone': '9876543266',
            'password': 'Password123',
            'role': 'therapist',
            'specialization': 'Nasya',
            'qualification': 'BAMS, MD Ayurveda'
        }
        response = self.client.post('/api/staff/create/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_therapist = User.objects.get(email='priya.sharma@ayursutra.com')
        self.assertTrue(hasattr(new_therapist, 'therapist_profile'))
        self.assertEqual(new_therapist.therapist_profile.specialization, 'Nasya')
        self.assertEqual(new_therapist.therapist_profile.qualification, 'BAMS, MD Ayurveda')

        # Verify User model itself does NOT have qualification field definition
        user_field_names = [f.name for f in User._meta.get_fields()]
        self.assertNotIn('qualification', user_field_names)

        # Verify UserSerializer exposes qualification for therapist
        self.client.force_authenticate(user=new_therapist)
        profile_res = self.client.get('/api/users/profile/')
        self.assertEqual(profile_res.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_res.data['specialization'], 'Nasya')
        self.assertEqual(profile_res.data['qualification'], 'BAMS, MD Ayurveda')

    def test_admin_creation_does_not_create_unnecessary_profile(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'name': 'Manager Officer',
            'email': 'manager@ayursutra.com',
            'phone': '9876543255',
            'password': 'Password123',
            'role': 'admin'
        }
        response = self.client.post('/api/staff/create/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_admin = User.objects.get(email='manager@ayursutra.com')
        self.assertFalse(hasattr(new_admin, 'patient_profile'))
        self.assertFalse(hasattr(new_admin, 'therapist_profile'))

from datetime import time, datetime, timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from bookings.models import Therapy, Schedule


class BookingsAPITestCase(TestCase):
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
        self.therapist = User.objects.create_user(
            email='therapist@example.com',
            password='Password123',
            phone='9876543211',
            role='therapist',
            first_name='Doctor',
            last_name='Ayur'
        )
        self.therapy = Therapy.objects.create(
            name='Shirodhara',
            description='Relaxing head therapy',
            duration=60,
            price=1500.00
        )

    def test_authenticated_patient_schedule_creation(self):
        self.client.force_authenticate(user=self.patient)
        current = timezone.now().date() + timezone.timedelta(days=1)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        data = {
            'therapy': self.therapy.id,
            'therapist': self.therapist.id,
            'date': current.isoformat(),
            'start_time': '11:00:00',
            'end_time': '12:00:00'
        }
        response = self.client.post('/api/schedules/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Schedule.objects.count(), 1)
        schedule = Schedule.objects.first()
        self.assertEqual(schedule.patient, self.patient)
        self.assertEqual(schedule.status, 'applied')
        self.assertEqual(response.data['status'], 'applied')
        self.assertEqual(response.data['patient_name'], 'John Doe')
        self.assertEqual(response.data['therapy_name'], 'Shirodhara')
        self.assertEqual(response.data['therapist_name'], 'Doctor Ayur')

    def test_therapist_can_confirm_applied_to_scheduled(self):
        current = timezone.now().date() + timezone.timedelta(days=2)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        schedule = Schedule.objects.create(
            patient=self.patient,
            name='John Doe',
            email='patient@example.com',
            therapy=self.therapy,
            therapist=self.therapist,
            date=current,
            start_time='11:00:00',
            end_time='12:00:00',
            status='applied'
        )
        self.client.force_authenticate(user=self.therapist)
        response = self.client.patch(f'/api/schedules/{schedule.id}/', {'status': 'scheduled'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        schedule.refresh_from_db()
        self.assertEqual(schedule.status, 'scheduled')

    def test_therapist_can_update_status_of_today_past_slot_appointment(self):
        today = timezone.localtime().date()
        if today.weekday() == 6:
            return  # Sunday

        schedule = Schedule.objects.create(
            patient=self.patient,
            name='John Doe',
            email='patient@example.com',
            therapy=self.therapy,
            therapist=self.therapist,
            date=today,
            start_time='09:00:00',
            end_time='10:00:00',
            status='applied'
        )
        self.client.force_authenticate(user=self.therapist)
        response = self.client.patch(f'/api/schedules/{schedule.id}/', {'status': 'scheduled'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        schedule.refresh_from_db()
        self.assertEqual(schedule.status, 'scheduled')

    def test_patient_cannot_change_status_to_scheduled(self):
        current = timezone.now().date() + timezone.timedelta(days=3)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        schedule = Schedule.objects.create(
            patient=self.patient,
            name='John Doe',
            email='patient@example.com',
            therapy=self.therapy,
            therapist=self.therapist,
            date=current,
            start_time='16:00:00',
            end_time='17:00:00',
            status='applied'
        )
        self.client.force_authenticate(user=self.patient)
        response = self.client.patch(f'/api/schedules/{schedule.id}/', {'status': 'scheduled'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        schedule.refresh_from_db()
        self.assertEqual(schedule.status, 'applied')

    def test_therapist_can_complete_scheduled_booking(self):
        current = timezone.now().date() + timezone.timedelta(days=4)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        schedule = Schedule.objects.create(
            patient=self.patient,
            name='John Doe',
            email='patient@example.com',
            therapy=self.therapy,
            therapist=self.therapist,
            date=current,
            start_time='16:00:00',
            end_time='17:00:00',
            status='scheduled'
        )
        self.client.force_authenticate(user=self.therapist)
        response = self.client.patch(f'/api/schedules/{schedule.id}/', {'status': 'completed'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        schedule.refresh_from_db()
        self.assertEqual(schedule.status, 'completed')

    def test_cannot_complete_applied_booking_without_scheduling(self):
        current = timezone.now().date() + timezone.timedelta(days=5)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        schedule = Schedule.objects.create(
            patient=self.patient,
            name='John Doe',
            email='patient@example.com',
            therapy=self.therapy,
            therapist=self.therapist,
            date=current,
            start_time='09:00:00',
            end_time='10:00:00',
            status='applied'
        )
        self.client.force_authenticate(user=self.therapist)
        response = self.client.patch(f'/api/schedules/{schedule.id}/', {'status': 'completed'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        schedule.refresh_from_db()
        self.assertEqual(schedule.status, 'applied')

    def test_sunday_booking_rejected(self):
        self.client.force_authenticate(user=self.patient)
        current = timezone.now().date() + timezone.timedelta(days=1)
        while current.weekday() != 6:
            current += timezone.timedelta(days=1)

        data = {
            'therapy': self.therapy.id,
            'therapist': self.therapist.id,
            'date': current.isoformat(),
            'start_time': '11:00:00'
        }
        response = self.client.post('/api/schedules/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('closed on Sundays', str(response.data))

    def test_30_minute_therapy_slot(self):
        nasya = Therapy.objects.create(name='Nasya Test', duration=30, price=900.00)
        self.client.force_authenticate(user=self.patient)
        current = timezone.now().date() + timezone.timedelta(days=1)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        data = {
            'therapy': nasya.id,
            'date': current.isoformat(),
            'start_time': '09:00:00'
        }
        response = self.client.post('/api/schedules/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['start_time'], '09:00:00')
        self.assertEqual(response.data['end_time'], '09:30:00')

    def test_45_minute_therapy_slot(self):
        basti = Therapy.objects.create(name='Basti Test', duration=45, price=1400.00)
        self.client.force_authenticate(user=self.patient)
        current = timezone.now().date() + timezone.timedelta(days=2)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        data = {
            'therapy': basti.id,
            'date': current.isoformat(),
            'start_time': '13:30:00'
        }
        response = self.client.post('/api/schedules/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['start_time'], '13:30:00')
        self.assertEqual(response.data['end_time'], '14:15:00')

    def test_60_minute_therapy_slot_9am(self):
        self.client.force_authenticate(user=self.patient)
        current = timezone.now().date() + timezone.timedelta(days=3)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        data = {
            'therapy': self.therapy.id,
            'date': current.isoformat(),
            'start_time': '09:00:00'
        }
        response = self.client.post('/api/schedules/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['start_time'], '09:00:00')
        self.assertEqual(response.data['end_time'], '10:00:00')

    def test_final_valid_slot_ending_at_7pm(self):
        self.client.force_authenticate(user=self.patient)
        current = timezone.now().date() + timezone.timedelta(days=4)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        data = {
            'therapy': self.therapy.id,
            'date': current.isoformat(),
            'start_time': '18:00:00'
        }
        response = self.client.post('/api/schedules/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['start_time'], '18:00:00')
        self.assertEqual(response.data['end_time'], '19:00:00')

    def test_invalid_slot_time_rejected(self):
        self.client.force_authenticate(user=self.patient)
        current = timezone.now().date() + timezone.timedelta(days=6)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        data = {
            'therapy': self.therapy.id,
            'date': current.isoformat(),
            'start_time': '10:00:00'  # 10:00 AM is in between slot 1 (9:00) and slot 2 (11:00) break
        }
        response = self.client.post('/api/schedules/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('designated daily session slots', str(response.data))

    def test_past_slot_for_today_rejected(self):
        self.client.force_authenticate(user=self.patient)
        today = timezone.localtime().date()
        if today.weekday() == 6:
            return  # Closed on Sunday

        data = {
            'therapy': self.therapy.id,
            'date': today.isoformat(),
            'start_time': '09:00:00'
        }
        # If current time is after 09:00, 9 AM today must be rejected
        if timezone.localtime().time() > time(9, 0):
            response = self.client.post('/api/schedules/', data)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('past time slot', str(response.data))

    def test_overlapping_therapist_booking_rejected(self):
        self.client.force_authenticate(user=self.patient)
        current = timezone.now().date() + timezone.timedelta(days=7)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        Schedule.objects.create(
            patient=self.patient,
            name='John Doe',
            email='patient@example.com',
            therapy=self.therapy,
            therapist=self.therapist,
            date=current,
            start_time='09:00:00',
            end_time='10:00:00',
            status='scheduled'
        )

        data = {
            'therapy': self.therapy.id,
            'therapist': self.therapist.id,
            'date': current.isoformat(),
            'start_time': '09:00:00'
        }
        response = self.client.post('/api/schedules/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('already has an appointment' in str(response.data) or 'unique set' in str(response.data))

    def test_available_slots_endpoint(self):
        self.client.force_authenticate(user=self.patient)
        current = timezone.now().date() + timezone.timedelta(days=8)
        if current.weekday() == 6:
            current += timezone.timedelta(days=1)

        response = self.client.get(f'/api/schedules/available-slots/?therapy={self.therapy.id}&date={current.isoformat()}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('slots', response.data)
        self.assertEqual(len(response.data['slots']), 5)  # Exactly 5 spaced slots
        self.assertEqual(response.data['slots'][0]['start_time'], '09:00:00')
        self.assertEqual(response.data['slots'][0]['end_time'], '10:00:00')
        self.assertEqual(response.data['slots'][1]['start_time'], '11:00:00')
        self.assertEqual(response.data['slots'][2]['start_time'], '13:30:00')
        self.assertEqual(response.data['slots'][3]['start_time'], '16:00:00')
        self.assertEqual(response.data['slots'][4]['start_time'], '18:00:00')
        self.assertEqual(response.data['slots'][4]['end_time'], '19:00:00')

    def test_therapist_cannot_modify_another_therapist_booking(self):
        other_therapist = User.objects.create_user(
            email='therapist2@example.com',
            password='Password123',
            phone='9876543299',
            role='therapist',
            first_name='Dr',
            last_name='Other'
        )
        future_date = (timezone.now() + timezone.timedelta(days=10)).date()
        if future_date.weekday() == 6:
            future_date += timezone.timedelta(days=1)

        schedule = Schedule.objects.create(
            patient=self.patient,
            name='John Doe',
            email='patient@example.com',
            therapy=self.therapy,
            therapist=self.therapist,
            date=future_date,
            start_time='09:00:00',
            end_time='10:00:00',
            status='scheduled'
        )
        self.client.force_authenticate(user=other_therapist)
        response = self.client.patch(f'/api/schedules/{schedule.id}/', {'status': 'completed'})
        # Should be 404 (not in queryset) or 400 (validation rejected)
        self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST])

    def test_patient_cannot_modify_scheduled_booking(self):
        future_date = (timezone.now() + timezone.timedelta(days=11)).date()
        if future_date.weekday() == 6:
            future_date += timezone.timedelta(days=1)

        schedule = Schedule.objects.create(
            patient=self.patient,
            name='John Doe',
            email='patient@example.com',
            therapy=self.therapy,
            therapist=self.therapist,
            date=future_date,
            start_time='09:00:00',
            end_time='10:00:00',
            status='scheduled'
        )
        self.client.force_authenticate(user=self.patient)
        response = self.client.patch(f'/api/schedules/{schedule.id}/', {'start_time': '11:00:00'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already scheduled', str(response.data).lower())

    def test_patient_cannot_modify_another_patient_booking(self):
        other_patient = User.objects.create_user(
            email='patient2@example.com',
            password='Password123',
            phone='9876543288',
            role='patient',
            age=28,
            gender='Female',
            first_name='Jane',
            last_name='Smith'
        )
        future_date = (timezone.now() + timezone.timedelta(days=12)).date()
        if future_date.weekday() == 6:
            future_date += timezone.timedelta(days=1)

        schedule = Schedule.objects.create(
            patient=self.patient,
            name='John Doe',
            email='patient@example.com',
            therapy=self.therapy,
            therapist=self.therapist,
            date=future_date,
            start_time='09:00:00',
            end_time='10:00:00',
            status='applied'
        )
        self.client.force_authenticate(user=other_patient)
        response = self.client.patch(f'/api/schedules/{schedule.id}/', {'start_time': '11:00:00'})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_notification_generated_on_booking_creation_and_scheduling(self):
        from accounts.models import Notification
        Notification.objects.all().delete()

        self.client.force_authenticate(user=self.patient)
        future_date = (timezone.now() + timezone.timedelta(days=15)).date()
        if future_date.weekday() == 6:
            future_date += timezone.timedelta(days=1)

        data = {
            'therapy': self.therapy.id,
            'therapist': self.therapist.id,
            'date': future_date.isoformat(),
            'start_time': '11:00:00'
        }
        response = self.client.post('/api/schedules/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        schedule_id = response.data['id']

        # Verify therapist received notification
        therapist_notifs = Notification.objects.filter(user=self.therapist)
        self.assertTrue(therapist_notifs.exists())
        self.assertIn('Shirodhara', therapist_notifs.first().message)
        self.assertIn('John Doe', therapist_notifs.first().message)

        # Therapist confirms (schedules) the appointment
        self.client.force_authenticate(user=self.therapist)
        patch_res = self.client.patch(f'/api/schedules/{schedule_id}/', {'status': 'scheduled'})
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)

        # Verify patient received confirmation notification
        patient_notifs = Notification.objects.filter(user=self.patient)
        self.assertTrue(patient_notifs.exists())
        self.assertIn('Appointment Confirmed', patient_notifs.first().message)
        self.assertIn('Shirodhara', patient_notifs.first().message)

    def test_therapist_can_delete_own_appointment(self):
        from accounts.models import Notification
        future_date = (timezone.now() + timezone.timedelta(days=16)).date()
        if future_date.weekday() == 6:
            future_date += timezone.timedelta(days=1)

        schedule = Schedule.objects.create(
            patient=self.patient,
            name='John Doe',
            email='patient@example.com',
            therapy=self.therapy,
            therapist=self.therapist,
            date=future_date,
            start_time='09:00:00',
            end_time='10:00:00',
            status='applied'
        )
        self.client.force_authenticate(user=self.therapist)
        del_res = self.client.delete(f'/api/schedules/{schedule.id}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Schedule.objects.filter(id=schedule.id).exists())

        # Patient receives notification that appointment was removed
        notif = Notification.objects.filter(user=self.patient).first()
        self.assertIsNotNone(notif)
        self.assertIn('Removed', notif.message)


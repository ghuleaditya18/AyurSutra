from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from feedback.models import Feedback


class FeedbackAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='Password123',
            phone='9876543211',
            role='admin'
        )

    def test_anonymous_feedback_submission(self):
        data = {
            'full_name': 'Patient Test',
            'rating': 5,
            'symptoms': 'Pain',
            'improvements': 'Relief'
        }
        response = self.client.post('/api/feedback/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Feedback.objects.count(), 1)
        self.assertFalse(Feedback.objects.first().reviewed)

    def test_admin_mark_feedback_reviewed(self):
        item = Feedback.objects.create(full_name='Patient Test', rating=4)
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/feedback/{item.id}/', {'reviewed': True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertTrue(item.reviewed)


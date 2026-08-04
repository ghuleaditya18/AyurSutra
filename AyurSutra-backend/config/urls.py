from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import RegisterView, UserViewSet, MessageViewSet, NotificationViewSet, StaffCreateView
from bookings.views import TherapyViewSet, ScheduleViewSet
from feedback.views import FeedbackViewSet

router = DefaultRouter()
router.register('users', UserViewSet)
router.register('messages', MessageViewSet, basename='message')
router.register('notifications', NotificationViewSet, basename='notification')
router.register('therapies', TherapyViewSet)
router.register('schedules', ScheduleViewSet, basename='schedule')
router.register('feedback', FeedbackViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/staff/create/',StaffCreateView.as_view(), name='staff-create'),
    path('api/', include(router.urls)),
]
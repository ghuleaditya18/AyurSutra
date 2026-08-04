from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import TherapyViewSet, ScheduleViewSet

router = DefaultRouter()
router.register('therapies', TherapyViewSet)
router.register('schedules', ScheduleViewSet, basename='schedule')

urlpatterns = [
    path('', include(router.urls)),
]
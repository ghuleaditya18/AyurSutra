from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import FeedbackViewSet

router = DefaultRouter()
router.register('feedback', FeedbackViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
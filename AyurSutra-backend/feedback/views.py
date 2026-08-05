from rest_framework import viewsets, permissions
from rest_framework.permissions import AllowAny
from .models import Feedback
from .serializers import FeedbackSerializer
from accounts.permissions import IsAdminRole


class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all()
    serializer_class = FeedbackSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAdminRole()]
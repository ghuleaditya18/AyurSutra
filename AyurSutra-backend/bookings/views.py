from rest_framework import viewsets, permissions
from .models import Therapy, Schedule
from .serializers import TherapySerializer, ScheduleSerializer
from accounts.permissions import IsAdminOrReadOnly

class TherapyViewSet(viewsets.ModelViewSet):
    queryset = Therapy.objects.filter(is_active=True)
    serializer_class = TherapySerializer
    permission_classes = [permissions.IsAuthenticated]


class ScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'patient':
            return Schedule.objects.filter(patient=user)
        if user.role == 'therapist':
            return Schedule.objects.filter(therapist=user)
        return Schedule.objects.all()  

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'patient':
            serializer.save(patient = user, name = f"{user.first_name} {user.last_name}".strip() or user.email, email=user.email)
        else: 
            serializer.save()
            
class TherapyViewSet(viewsets.ModelViewSet):
    queryset = Therapy.objects.filter(is_active=True)
    serializer_class = TherapySerializer
    permission_classes = [IsAdminOrReadOnly]
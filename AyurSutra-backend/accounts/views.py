from rest_framework import viewsets, generics, permissions
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User, Message, Notification
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    MessageSerializer,
    NotificationSerializer,
    StaffCreateSerializer,
    CustomTokenObtainPairSerializer,
)
from .permissions import IsAdminRole
from bookings.models import Schedule
from feedback.models import Feedback


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        role = self.request.query_params.get('role')
        if role == 'therapist':
            return User.objects.filter(role='therapist')

        if self.request.user.role == 'admin':
            queryset = User.objects.all()
            if role:
                queryset = queryset.filter(role=role)
            return queryset
        return User.objects.filter(id=self.request.user.id)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.id == request.user.id:
            return Response({'error': 'You cannot delete your own admin account.'}, status=400)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get', 'patch', 'put'], permission_classes=[permissions.IsAuthenticated])
    def profile(self, request):
        user = request.user
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        serializer = self.get_serializer(user, data=request.data, partial=(request.method == 'PATCH'))
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(to=self.request.user)

    def perform_create(self, serializer):
        serializer.save(from_user=self.request.user)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StaffCreateView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = StaffCreateSerializer
    permission_classes = [IsAdminRole]


class AdminStatsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        total_users = User.objects.count()
        total_therapists = User.objects.filter(role='therapist').count()
        total_bookings = Schedule.objects.count()
        pending_feedback = Feedback.objects.filter(reviewed=False).count()
        return Response({
            'total_users': total_users,
            'total_therapists': total_therapists,
            'total_bookings': total_bookings,
            'pending_feedback': pending_feedback,
        })

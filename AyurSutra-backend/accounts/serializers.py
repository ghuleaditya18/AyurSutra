from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, PatientProfile, TherapistProfile, Message, Notification


class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ['patient_id', 'age', 'gender', 'address', 'created_at', 'updated_at']
        read_only_fields = ['patient_id', 'created_at', 'updated_at']


class TherapistProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TherapistProfile
        fields = ['specialization', 'qualification', 'is_available', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    age = serializers.IntegerField(required=False, allow_null=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    patient_id = serializers.CharField(required=False, allow_null=True, read_only=True)
    specialization = serializers.CharField(required=False, allow_blank=True)
    qualification = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'phone', 'role',
            'age', 'gender', 'address', 'specialization', 'qualification', 'patient_id',
            'date_joined'
        ]
        read_only_fields = ['patient_id', 'role', 'date_joined']

    def get_name(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name if full_name else obj.email

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Pull from normalized profiles with fallback to user model for backwards compatibility
        if instance.role == 'patient':
            profile = getattr(instance, 'patient_profile', None)
            if profile:
                data['patient_id'] = profile.patient_id
                data['age'] = profile.age
                data['gender'] = profile.gender
                data['address'] = profile.address
            else:
                data['patient_id'] = instance.patient_id
                data['age'] = instance.age
                data['gender'] = instance.gender
                data['address'] = instance.address
            data['specialization'] = ''
            data['qualification'] = ''
        elif instance.role == 'therapist':
            profile = getattr(instance, 'therapist_profile', None)
            if profile:
                data['specialization'] = profile.specialization
                data['qualification'] = profile.qualification
            else:
                data['specialization'] = instance.specialization
                data['qualification'] = ''
            data['patient_id'] = None
            data['age'] = None
            data['gender'] = ''
            data['address'] = ''
        else:
            # Admin
            data['patient_id'] = None
            data['age'] = None
            data['gender'] = ''
            data['address'] = ''
            data['specialization'] = ''
            data['qualification'] = ''
        return data

    def update(self, instance, validated_data):
        name = self.initial_data.get('name')
        if name is not None:
            parts = name.strip().split(' ', 1)
            instance.first_name = parts[0]
            instance.last_name = parts[1] if len(parts) > 1 else ''

        request = self.context.get('request')
        if request and getattr(request.user, 'role', None) == 'admin':
            new_role = self.initial_data.get('role')
            if new_role in ('patient', 'therapist', 'admin'):
                instance.role = new_role

        # Handle Patient Profile updates
        if instance.role == 'patient':
            profile, _ = PatientProfile.objects.get_or_create(
                user=instance,
                defaults={
                    'age': validated_data.get('age', instance.age or 25),
                    'gender': validated_data.get('gender', instance.gender or 'Other'),
                    'address': validated_data.get('address', instance.address or ''),
                    'patient_id': instance.patient_id,
                }
            )
            if 'age' in validated_data:
                profile.age = validated_data['age']
            elif 'age' in self.initial_data:
                profile.age = self.initial_data['age']

            if 'gender' in validated_data:
                profile.gender = validated_data['gender']
            elif 'gender' in self.initial_data:
                profile.gender = self.initial_data['gender']

            if 'address' in validated_data:
                profile.address = validated_data['address']
            elif 'address' in self.initial_data:
                profile.address = self.initial_data['address']
            profile.save()

        # Handle Therapist Profile updates
        elif instance.role == 'therapist':
            profile, _ = TherapistProfile.objects.get_or_create(
                user=instance,
                defaults={
                    'specialization': validated_data.get('specialization', instance.specialization or ''),
                    'qualification': validated_data.get('qualification', ''),
                }
            )
            if 'specialization' in validated_data:
                profile.specialization = validated_data['specialization']
            elif 'specialization' in self.initial_data:
                profile.specialization = self.initial_data['specialization']

            if 'qualification' in validated_data:
                profile.qualification = validated_data['qualification']
            elif 'qualification' in self.initial_data:
                profile.qualification = self.initial_data['qualification']
            profile.save()

        return super().update(instance, validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    age = serializers.IntegerField(required=True, min_value=1, max_value=120)
    gender = serializers.ChoiceField(choices=['Male', 'Female', 'Other'], required=True)
    address = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'password', 'age', 'gender', 'address']

    def create(self, validated_data):
        name = validated_data.pop('name', '').strip()
        password = validated_data.pop('password')
        age = validated_data.pop('age')
        gender = validated_data.pop('gender')
        address = validated_data.pop('address', '')

        if name:
            parts = name.split(' ', 1)
            validated_data['first_name'] = parts[0]
            validated_data['last_name'] = parts[1] if len(parts) > 1 else ''

        validated_data['role'] = 'patient'
        # Set legacy fields for backwards compatibility during migration window
        validated_data['age'] = age
        validated_data['gender'] = gender
        validated_data['address'] = address

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        # Create normalized PatientProfile
        PatientProfile.objects.create(
            user=user,
            patient_id=user.patient_id,
            age=age,
            gender=gender,
            address=address,
        )
        return user


class StaffCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    specialization = serializers.CharField(required=False, allow_blank=True)
    qualification = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'password', 'role', 'specialization', 'qualification']

    def validate_role(self, value):
        if value not in ('therapist', 'admin'):
            raise serializers.ValidationError("Role must be therapist or admin.")
        return value

    def create(self, validated_data):
        name = validated_data.pop('name', '').strip()
        password = validated_data.pop('password')
        specialization = validated_data.pop('specialization', '').strip()
        qualification = validated_data.pop('qualification', '').strip()

        if name:
            parts = name.split(' ', 1)
            validated_data['first_name'] = parts[0]
            validated_data['last_name'] = parts[1] if len(parts) > 1 else ''

        if validated_data.get('role') == 'therapist':
            validated_data['specialization'] = specialization

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        if user.role == 'therapist':
            TherapistProfile.objects.create(
                user=user,
                specialization=specialization,
                qualification=qualification,
                is_available=True,
            )
        return user


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['from_user', 'date']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['user', 'date']

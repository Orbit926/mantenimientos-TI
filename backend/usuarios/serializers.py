from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

Tecnico = get_user_model()


class TecnicoPublicSerializer(serializers.ModelSerializer):
    """Para dropdowns y referencias (no incluye password)."""

    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = Tecnico
        fields = ['id', 'username', 'full_name', 'first_name', 'last_name', 'puesto', 'activo', 'is_staff']


class TecnicoSerializer(serializers.ModelSerializer):
    """CRUD para admin. Password opcional en update."""

    full_name = serializers.CharField(source='get_full_name', read_only=True)
    password = serializers.CharField(
        write_only=True, required=False, allow_blank=False, min_length=6,
        style={'input_type': 'password'},
    )

    class Meta:
        model = Tecnico
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'puesto', 'activo', 'is_staff', 'is_active',
            'password', 'full_name', 'date_joined',
        ]
        read_only_fields = ['date_joined']

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria al crear un técnico.'})
        user = Tecnico.objects.create_user(password=password, **validated_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class MeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = Tecnico
        fields = ['id', 'username', 'email', 'full_name', 'first_name', 'last_name', 'puesto', 'is_staff', 'is_superuser']


class TecnicoTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Incluye el usuario completo en la respuesta de login."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['is_staff'] = user.is_staff
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = MeSerializer(self.user).data
        return data

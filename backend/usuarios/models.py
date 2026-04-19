from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from .managers import TecnicoManager


class Tecnico(AbstractBaseUser, PermissionsMixin):
    """
    Custom User Model: cada técnico es un usuario del sistema.

    Campos extra: puesto, activo (equivalente lógico a 'empleado en activo').
    Usamos `is_active` (heredado) como flag de autenticación habilitada.
    """

    username_validator = RegexValidator(
        regex=r'^[\w.@+-]+$',
        message='El username solo puede contener letras, números y los caracteres @/./+/-/_',
    )

    username = models.CharField(
        max_length=150,
        unique=True,
        validators=[username_validator],
        help_text='Identificador único de login.',
    )
    email = models.EmailField(blank=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    puesto = models.CharField(max_length=150, blank=True)

    activo = models.BooleanField(
        default=True,
        help_text='Indica si el técnico está en activo operativamente.',
    )

    is_staff = models.BooleanField(
        default=False,
        help_text='Permite acceso al Django Admin y gestión de técnicos.',
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Designa si el usuario puede iniciar sesión.',
    )
    date_joined = models.DateTimeField(default=timezone.now)

    objects = TecnicoManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name = 'Técnico'
        verbose_name_plural = 'Técnicos'
        ordering = ['first_name', 'last_name']

    def __str__(self):
        full = self.get_full_name()
        return full or self.username

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name

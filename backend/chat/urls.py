from django.urls import path
from .views import ChatView, ImageChatView

urlpatterns = [
    path('chat/', ChatView.as_view()),
    path('chat/imagen/', ImageChatView.as_view()),
]

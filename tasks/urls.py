from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, TaskListCreateView, TaskDetailView

urlpatterns = [
    # Auth endpoints
    path('auth/register/', RegisterView.as_view()),
    path('auth/login/',    TokenObtainPairView.as_view()),   # returns access + refresh tokens
    path('auth/refresh/',  TokenRefreshView.as_view()),      # get new access token

    # Task CRUD
    path('tasks/',         TaskListCreateView.as_view()),
    path('tasks/<int:pk>/', TaskDetailView.as_view()),
]
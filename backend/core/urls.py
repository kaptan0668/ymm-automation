from rest_framework.routers import DefaultRouter
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    CustomerViewSet,
    DocumentViewSet,
    ReportViewSet,
    FileViewSet,
    ContractJobViewSet,
    ContractViewSet,
    SettingsViewSet,
    CounterAdminViewSet,
    YearLockViewSet,
    backup,
)

router = DefaultRouter()
router.register(r"customers", CustomerViewSet)
router.register(r"documents", DocumentViewSet)
router.register(r"reports", ReportViewSet)
router.register(r"files", FileViewSet)
router.register(r"contract-jobs", ContractJobViewSet)
router.register(r"contracts", ContractViewSet)
router.register(r"settings", SettingsViewSet, basename="settings")
router.register(r"admin-counters", CounterAdminViewSet, basename="admin-counters")
router.register(r"year-locks", YearLockViewSet, basename="year-locks")

urlpatterns = [
    path("", include(router.urls)),
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]


@api_view(["GET"])
def me(request):
    user = request.user
    if not user or not user.is_authenticated:
        return Response({"authenticated": False})
    return Response(
        {
            "authenticated": True,
            "username": user.username,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get("old_password")
    new_password = request.data.get("new_password")
    if not old_password or not new_password:
        return Response({"detail": "Eski ve yeni sifre zorunludur."}, status=400)
    if not user.check_password(old_password):
        return Response({"detail": "Eski sifre hatali."}, status=400)
    user.set_password(new_password)
    user.save()
    return Response({"status": "ok"})


urlpatterns += [
    path("auth/me/", me, name="auth_me"),
    path("auth/change-password/", change_password, name="auth_change_password"),
    path("admin/backup/", backup, name="admin_backup"),
]

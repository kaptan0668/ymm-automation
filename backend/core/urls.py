from rest_framework.routers import DefaultRouter
from django.urls import path, include
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import CustomerViewSet, DocumentViewSet, ReportViewSet, FileViewSet, ContractJobViewSet

router = DefaultRouter()
router.register(r"customers", CustomerViewSet)
router.register(r"documents", DocumentViewSet)
router.register(r"reports", ReportViewSet)
router.register(r"files", FileViewSet)
router.register(r"contract-jobs", ContractJobViewSet)

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
        }
    )


urlpatterns += [
    path("auth/me/", me, name="auth_me"),
]

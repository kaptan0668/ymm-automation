from rest_framework.routers import DefaultRouter
from django.urls import path, include
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

import os
import uuid
import boto3
from botocore.client import Config
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import (
    Customer,
    Document,
    Report,
    File,
    ContractJob,
    AuditLog,
    next_document_number,
    next_report_number,
)
from .serializers import (
    CustomerSerializer,
    DocumentSerializer,
    ReportSerializer,
    FileSerializer,
    ContractJobSerializer,
)
from .tasks import process_contract_job


def _actor(request):
    user = getattr(request, "user", None)
    if user and user.is_authenticated:
        return user
    return None


def _s3_client():
    endpoint = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
    access_key = os.environ.get("MINIO_ACCESS_KEY", "minio")
    secret_key = os.environ.get("MINIO_SECRET_KEY", "minio123")
    secure = os.environ.get("MINIO_SECURE", "false").lower() == "true"
    scheme = "https" if secure else "http"
    return boto3.client(
        "s3",
        endpoint_url=f"{scheme}://{endpoint}",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="us-east-1",
    )


def _ensure_bucket(client, bucket):
    try:
        client.head_bucket(Bucket=bucket)
    except Exception:
        client.create_bucket(Bucket=bucket)


class AuditViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        include_archived = self.request.query_params.get("include_archived") == "1"
        if not include_archived and hasattr(qs.model, "is_archived"):
            return qs.filter(is_archived=False)
        return qs

    def perform_create(self, serializer):
        actor = _actor(self.request)
        instance = serializer.save(created_by=actor, updated_by=actor)
        AuditLog.objects.create(
            model=instance.__class__.__name__,
            object_id=str(instance.pk),
            action="create",
            actor=actor,
        )

    def perform_update(self, serializer):
        actor = _actor(self.request)
        instance = serializer.save(updated_by=actor)
        AuditLog.objects.create(
            model=instance.__class__.__name__,
            object_id=str(instance.pk),
            action="update",
            actor=actor,
        )

    def perform_destroy(self, instance):
        actor = _actor(self.request)
        if hasattr(instance, "is_archived"):
            instance.is_archived = True
            if hasattr(instance, "updated_by"):
                instance.updated_by = actor
            instance.save()
            AuditLog.objects.create(
                model=instance.__class__.__name__,
                object_id=str(instance.pk),
                action="archive",
                actor=actor,
            )
        else:
            instance.delete()

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({"status": "archived"})


class CustomerViewSet(AuditViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer


class DocumentViewSet(AuditViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        doc_type = data.get("doc_type")
        year = int(data.get("year"))
        doc_no, serial = next_document_number(doc_type, year)
        data["doc_no"] = doc_no
        data["serial"] = serial
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ReportViewSet(AuditViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        report_type = data.get("report_type")
        year = int(data.get("year"))
        report_no, type_cum, year_serial = next_report_number(report_type, year)
        data["report_no"] = report_no
        data["type_cumulative"] = type_cum
        data["year_serial_all"] = year_serial
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FileViewSet(AuditViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer

    @action(detail=False, methods=["post"])
    def upload(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"error": "file is required"}, status=400)

        client = _s3_client()
        bucket = os.environ.get("MINIO_BUCKET", "ymm-files")
        _ensure_bucket(client, bucket)

        key = f"{uuid.uuid4()}_{upload.name}"
        client.upload_fileobj(
            upload,
            bucket,
            key,
            ExtraArgs={"ContentType": upload.content_type or "application/octet-stream"},
        )

        endpoint = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
        secure = os.environ.get("MINIO_SECURE", "false").lower() == "true"
        scheme = "https" if secure else "http"
        url = f"{scheme}://{endpoint}/{bucket}/{key}"

        file_obj = File.objects.create(
            filename=upload.name,
            content_type=upload.content_type or "application/octet-stream",
            size=upload.size,
            url=url,
            created_by=_actor(request),
            updated_by=_actor(request),
        )
        AuditLog.objects.create(
            model="File",
            object_id=str(file_obj.pk),
            action="create",
            actor=_actor(request),
        )
        return Response(FileSerializer(file_obj).data, status=201)


class ContractJobViewSet(AuditViewSet):
    queryset = ContractJob.objects.all()
    serializer_class = ContractJobSerializer

    def perform_create(self, serializer):
        super().perform_create(serializer)
        job = serializer.instance
        process_contract_job.delay(job.id)

    @action(detail=True, methods=["get"])
    def status(self, request, pk=None):
        job = self.get_object()
        return Response({"status": job.status})

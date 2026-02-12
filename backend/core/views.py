import os
import uuid
import boto3
from botocore.client import Config
from io import BytesIO
from PyPDF2 import PdfReader
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.exceptions import PermissionDenied
from django.core.management import call_command
from django.http import FileResponse
from django.utils import timezone
from .models import (
    Customer,
    Document,
    Report,
    File,
    Contract,
    ContractJob,
    AuditLog,
    AppSetting,
    DocumentCounter,
    ReportCounterGlobal,
    ReportCounterYearAll,
    YearLock,
    year_is_locked,
    next_document_number,
    next_report_number,
)
from .serializers import (
    CustomerSerializer,
    DocumentSerializer,
    ReportSerializer,
    FileSerializer,
    ContractJobSerializer,
    ContractSerializer,
    AppSettingSerializer,
    YearLockSerializer,
)
from .tasks import process_contract_job
from .contract_parser import parse_contract_text


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


def _sync_contract_status(contract_id: int | None):
    if not contract_id:
        return
    contract = Contract.objects.filter(id=contract_id).first()
    if not contract:
        return
    linked_reports = Report.objects.filter(contract_id=contract_id, is_archived=False)
    # İş kuralı: Sözleşmeye ilk rapor bağlandığında sözleşme tamamlanır.
    # Bağlı rapor kalmazsa sözleşme tekrar açık olur.
    new_status = "DONE" if linked_reports.exists() else "OPEN"
    if contract.status != new_status:
        contract.status = new_status
        contract.save(update_fields=["status", "updated_at"])


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
        if actor and not actor.is_staff:
            raise PermissionDenied("Silme sadece admin için izinlidir.")
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

    def get_queryset(self):
        qs = super().get_queryset()
        customer = self.request.query_params.get("customer")
        contract = self.request.query_params.get("contract")
        if customer:
            qs = qs.filter(customer_id=customer)
        if contract:
            qs = qs.filter(contract_id=contract)
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        year = int(data.get("year"))
        if year_is_locked(year):
            return Response({"error": f"{year} yılı kilitli. Evrak eklenemez."}, status=400)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        instance_year = serializer.instance.year
        if year_is_locked(instance_year):
            raise PermissionDenied(f"{instance_year} yılı kilitli. Evrak güncellenemez.")
        super().perform_update(serializer)

    def perform_destroy(self, instance):
        actor = _actor(self.request)
        if not actor or not actor.is_superuser:
            raise PermissionDenied("Evrak silme sadece admin için izinlidir.")
        if year_is_locked(instance.year):
            raise PermissionDenied(f"{instance.year} yılı kilitli. Evrak silinemez.")

        max_serial = (
            Document.objects.filter(
                doc_type=instance.doc_type,
                year=instance.year,
                is_archived=False,
            )
            .order_by("-serial")
            .values_list("serial", flat=True)
            .first()
        )
        if max_serial != instance.serial:
            raise PermissionDenied("Sadece en son numaralı evrak silinebilir.")

        deleted_serial = instance.serial
        doc_type = instance.doc_type
        year = instance.year
        pk = instance.pk
        instance.delete()
        AuditLog.objects.create(
            model="Document",
            object_id=str(pk),
            action="archive",
            actor=actor,
        )

        prev_serial = (
            Document.objects.filter(doc_type=doc_type, year=year, is_archived=False)
            .order_by("-serial")
            .values_list("serial", flat=True)
            .first()
            or 0
        )
        counter, _ = DocumentCounter.objects.get_or_create(doc_type=doc_type, year=year)
        if counter.last_serial >= deleted_serial:
            counter.last_serial = prev_serial
            counter.save()


class ReportViewSet(AuditViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        customer = self.request.query_params.get("customer")
        contract = self.request.query_params.get("contract")
        if customer:
            qs = qs.filter(customer_id=customer)
        if contract:
            qs = qs.filter(contract_id=contract)
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        year = int(data.get("year"))
        if year_is_locked(year):
            return Response({"error": f"{year} yılı kilitli. Rapor eklenemez."}, status=400)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        _sync_contract_status(serializer.instance.contract_id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        instance_year = serializer.instance.year
        if year_is_locked(instance_year):
            raise PermissionDenied(f"{instance_year} yılı kilitli. Rapor güncellenemez.")
        old_contract_id = serializer.instance.contract_id
        super().perform_update(serializer)
        new_contract_id = serializer.instance.contract_id
        _sync_contract_status(old_contract_id)
        _sync_contract_status(new_contract_id)

    def perform_destroy(self, instance):
        actor = _actor(self.request)
        if not actor or not actor.is_superuser:
            raise PermissionDenied("Rapor silme sadece admin için izinlidir.")
        if year_is_locked(instance.year):
            raise PermissionDenied(f"{instance.year} yılı kilitli. Rapor silinemez.")

        max_year_serial = (
            Report.objects.filter(year=instance.year, is_archived=False)
            .order_by("-year_serial_all")
            .values_list("year_serial_all", flat=True)
            .first()
        )
        max_global_serial = (
            Report.objects.filter(is_archived=False)
            .order_by("-type_cumulative")
            .values_list("type_cumulative", flat=True)
            .first()
        )
        if max_year_serial != instance.year_serial_all or max_global_serial != instance.type_cumulative:
            raise PermissionDenied("Sadece en son numaralı rapor silinebilir.")

        contract_id = instance.contract_id
        deleted_type_cum = instance.type_cumulative
        deleted_year_serial = instance.year_serial_all
        year = instance.year
        pk = instance.pk
        instance.delete()
        AuditLog.objects.create(
            model="Report",
            object_id=str(pk),
            action="archive",
            actor=actor,
        )

        prev_year_serial = (
            Report.objects.filter(year=year, is_archived=False)
            .order_by("-year_serial_all")
            .values_list("year_serial_all", flat=True)
            .first()
            or 0
        )
        year_counter, _ = ReportCounterYearAll.objects.get_or_create(year=year)
        if year_counter.last_serial >= deleted_year_serial:
            year_counter.last_serial = prev_year_serial
            year_counter.save()

        prev_global = (
            Report.objects.filter(is_archived=False)
            .order_by("-type_cumulative")
            .values_list("type_cumulative", flat=True)
            .first()
            or 0
        )
        global_counter, _ = ReportCounterGlobal.objects.get_or_create(id=1)
        if global_counter.last_serial >= deleted_type_cum:
            global_counter.last_serial = prev_global
            global_counter.save()
        _sync_contract_status(contract_id)


class FileViewSet(AuditViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        document = self.request.query_params.get("document")
        report = self.request.query_params.get("report")
        customer = self.request.query_params.get("customer")
        scope = self.request.query_params.get("scope")
        if document:
            qs = qs.filter(document_id=document)
        if report:
            qs = qs.filter(report_id=report)
        if customer:
            qs = qs.filter(customer_id=customer)
        if scope == "other":
            qs = qs.filter(document__isnull=True, report__isnull=True)
        return qs

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

        public_endpoint = os.environ.get("MINIO_PUBLIC_ENDPOINT")
        endpoint = public_endpoint or os.environ.get("MINIO_ENDPOINT", "localhost:9000")
        secure = os.environ.get("MINIO_SECURE", "false").lower() == "true"
        scheme = "https" if secure else "http"
        url = f"{scheme}://{endpoint}/{bucket}/{key}"

        document_id = request.data.get("document")
        report_id = request.data.get("report")
        customer_id = request.data.get("customer")

        if not customer_id and document_id:
            try:
                customer_id = Document.objects.get(id=document_id).customer_id
            except Document.DoesNotExist:
                customer_id = None
        if not customer_id and report_id:
            try:
                customer_id = Report.objects.get(id=report_id).customer_id
            except Report.DoesNotExist:
                customer_id = None

        display_name = (request.data.get("filename") or "").strip() or upload.name
        file_obj = File.objects.create(
            filename=display_name,
            content_type=upload.content_type or "application/octet-stream",
            size=upload.size,
            url=url,
            document_id=document_id or None,
            report_id=report_id or None,
            customer_id=customer_id or None,
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


class ContractViewSet(AuditViewSet):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        customer = self.request.query_params.get("customer")
        status_filter = self.request.query_params.get("status")
        if customer:
            qs = qs.filter(customer_id=customer)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=False, methods=["post"])
    def upload(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"error": "file is required"}, status=400)

        raw = upload.read()
        text = ""
        try:
            reader = PdfReader(BytesIO(raw))
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
        except Exception:
            text = ""

        parsed = parse_contract_text(text or "")

        for key in [
            "tax_no",
            "tax_office",
            "customer_name",
            "address",
            "phone",
            "email",
            "contact_person",
            "contract_no",
            "contract_date",
            "contract_type",
            "period_start_month",
            "period_start_year",
            "period_end_month",
            "period_end_year",
        ]:
            if request.data.get(key):
                parsed[key] = request.data.get(key)

        contract_no = (parsed.get("contract_no") or "").strip()
        contract_type = (parsed.get("contract_type") or "").strip()
        if not contract_no:
            return Response({"error": "Sözleşme numarası zorunludur."}, status=400)
        if not contract_type:
            return Response({"error": "Sözleşme türü zorunludur."}, status=400)

        customer_id = request.data.get("customer")
        tax_no = parsed.get("tax_no") or request.data.get("tax_no")
        tckn = request.data.get("tckn")
        if not tckn and tax_no and str(tax_no).isdigit() and len(str(tax_no)) == 11:
            tckn = str(tax_no)

        customer = None
        if customer_id:
            customer = Customer.objects.filter(id=customer_id).first()
        elif tax_no:
            customer = Customer.objects.filter(tax_no=tax_no).first()
            if not customer and tckn:
                customer = Customer.objects.filter(tckn=tckn).first()
        elif tckn:
            customer = Customer.objects.filter(tckn=tckn).first()

        if not customer:
            return Response({"error": "Müşteri bulunamadı. Lütfen müşteri seçin."}, status=400)

        client = _s3_client()
        bucket = os.environ.get("MINIO_BUCKET", "ymm-files")
        _ensure_bucket(client, bucket)

        key = f"{uuid.uuid4()}_{upload.name}"
        client.upload_fileobj(
            BytesIO(raw),
            bucket,
            key,
            ExtraArgs={"ContentType": upload.content_type or "application/octet-stream"},
        )

        public_endpoint = os.environ.get("MINIO_PUBLIC_ENDPOINT")
        endpoint = public_endpoint or os.environ.get("MINIO_ENDPOINT", "localhost:9000")
        secure = os.environ.get("MINIO_SECURE", "false").lower() == "true"
        scheme = "https" if secure else "http"
        url = f"{scheme}://{endpoint}/{bucket}/{key}"

        contract = Contract.objects.create(
            customer=customer,
            contract_no=contract_no,
            contract_date=parsed.get("contract_date"),
            contract_type=contract_type,
            period_start_month=parsed.get("period_start_month"),
            period_start_year=parsed.get("period_start_year"),
            period_end_month=parsed.get("period_end_month"),
            period_end_year=parsed.get("period_end_year"),
            filename=upload.name,
            content_type=upload.content_type or "application/octet-stream",
            size=upload.size,
            file_url=url,
            created_by=_actor(request),
            updated_by=_actor(request),
        )

        AuditLog.objects.create(
            model="Contract",
            object_id=str(contract.pk),
            action="create",
            actor=_actor(request),
        )

        return Response(ContractSerializer(contract).data, status=201)


def _get_settings():
    obj = AppSetting.objects.first()
    if not obj:
        obj = AppSetting.objects.create()
    return obj


class SettingsViewSet(viewsets.ViewSet):
    def list(self, request):
        obj = _get_settings()
        return Response(AppSettingSerializer(obj).data)

    def create(self, request):
        user = _actor(request)
        if not user or not user.is_staff:
            raise PermissionDenied("Sadece admin ayarları güncelleyebilir.")
        obj = _get_settings()
        data = request.data.copy()
        if data.get("working_year") and not data.get("reference_year"):
            data["reference_year"] = data.get("working_year")
        serializer = AppSettingSerializer(obj, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CounterAdminViewSet(viewsets.ViewSet):
    def create(self, request):
        user = _actor(request)
        if not user or not user.is_staff:
            raise PermissionDenied("Sadece admin sayaçları güncelleyebilir.")
        kind = request.data.get("kind")
        if kind == "report_global":
            year = int(request.data.get("year") or 0)
            if year and year_is_locked(year):
                return Response({"error": f"{year} yılı kilitli. Sayaç değiştirilemez."}, status=400)
            if year and year > 2026:
                return Response({"error": "2027 ve sonrası için numaratör değiştirilemez."}, status=400)
            if year == 2026 and Report.objects.filter(year=2026).exists():
                return Response({"error": "2026 için kayıt başladıktan sonra kümülatif değiştirilemez."}, status=400)
            value = int(request.data.get("last_serial", 0))
            obj, _ = ReportCounterGlobal.objects.get_or_create(id=1)
            obj.last_serial = value
            obj.save()
            return Response({"status": "ok"})
        if kind == "report_year":
            year = int(request.data.get("year"))
            if year_is_locked(year):
                return Response({"error": f"{year} yılı kilitli. Sayaç değiştirilemez."}, status=400)
            if year > 2025:
                return Response({"error": "2026 ve sonrası için numaratör değiştirilemez."}, status=400)
            value = int(request.data.get("last_serial", 0))
            obj, _ = ReportCounterYearAll.objects.get_or_create(year=year)
            obj.last_serial = value
            obj.save()
            return Response({"status": "ok"})
        if kind == "document":
            year = int(request.data.get("year"))
            if year_is_locked(year):
                return Response({"error": f"{year} yılı kilitli. Sayaç değiştirilemez."}, status=400)
            if year > 2025:
                return Response({"error": "2026 ve sonrası için numaratör değiştirilemez."}, status=400)
            doc_type = request.data.get("doc_type")
            value = int(request.data.get("last_serial", 0))
            obj, _ = DocumentCounter.objects.get_or_create(year=year, doc_type=doc_type)
            obj.last_serial = value
            obj.save()
            return Response({"status": "ok"})
        return Response({"error": "Geçersiz istek."}, status=400)


class YearLockViewSet(viewsets.ViewSet):
    def list(self, request):
        rows = YearLock.objects.all().order_by("-year")
        return Response(YearLockSerializer(rows, many=True).data)

    def create(self, request):
        user = _actor(request)
        if not user or not user.is_superuser:
            raise PermissionDenied("Yıl kilidi sadece admin tarafından değiştirilebilir.")
        year = int(request.data.get("year"))
        raw_lock = request.data.get("is_locked")
        is_locked = str(raw_lock).lower() in ("1", "true", "yes", "on")
        obj, _ = YearLock.objects.get_or_create(year=year)
        obj.is_locked = is_locked
        if is_locked:
            obj.locked_at = timezone.now()
            obj.locked_by = user
        else:
            obj.locked_at = None
            obj.locked_by = None
        obj.save()
        return Response(YearLockSerializer(obj).data)


@api_view(["GET"])
def backup(request):
    user = _actor(request)
    if not user or not user.is_staff:
        raise PermissionDenied("Sadece admin yedek alabilir.")
    os.makedirs("/app/backups", exist_ok=True)
    ts = timezone.now().strftime("%Y%m%d_%H%M%S")
    filename = f"/app/backups/backup_{ts}.json"
    with open(filename, "w", encoding="utf-8") as f:
        call_command(
            "dumpdata",
            "core",
            exclude=["core.file"],
            stdout=f,
        )
    return FileResponse(open(filename, "rb"), as_attachment=True, filename=f"backup_{ts}.json")



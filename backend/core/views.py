import os
import re
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
from django.core.mail import EmailMessage
from django.core.mail import get_connection
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import FileResponse
from django.utils import timezone
from .models import (
    Customer,
    Document,
    Report,
    File,
    Note,
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
    NoteSerializer,
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


def _extract_key(url: str, bucket: str) -> str | None:
    if not url:
        return None
    parts = url.split("/", 3)
    if len(parts) < 4:
        return None
    path = parts[3]
    prefix = f"{bucket}/"
    if path.startswith(prefix):
        return path[len(prefix):]
    return None


def _parse_emails(value):
    if value is None:
        return []
    stack = value if isinstance(value, list) else [value]
    raw_items = []
    for item in stack:
        raw_items.extend(re.split(r"[,\n;]+", str(item)))
    cleaned = []
    seen = set()
    for raw in raw_items:
        email = (raw or "").strip()
        if not email:
            continue
        try:
            validate_email(email)
        except ValidationError:
            continue
        key = email.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(email)
    return cleaned


def _send_note_email(
    *,
    request,
    entity_label: str,
    entity_code: str,
    note_subject: str | None,
    note_text: str,
    to_emails,
    files_qs,
    contact_name: str | None,
):
    if not note_text.strip():
        raise ValidationError("Gönderilecek not boş olamaz.")
    recipients = _parse_emails(to_emails)
    if not recipients:
        raise ValidationError("Geçerli bir alıcı e-posta bulunamadı.")

    timestamp = timezone.localtime().strftime("%d.%m.%Y %H:%M")
    recipient_name = (contact_name or "").strip() or "İlgili Kişi"
    clean_subject = (note_subject or "").strip() or f"Bu {entity_label.lower()} hakkında"

    subject = f"[YMM Otomasyon] {entity_code} - {clean_subject}"
    body = (
        f"Sayın {recipient_name},\n\n"
        f"İlgili kayıt: {entity_label} {entity_code}\n"
        f"Konu: {clean_subject}\n\n"
        f"{note_text.strip()}\n\n"
        f"İyi çalışmalar dileriz.\n\n"
        f"Tarih: {timestamp}"
    )
    smtp = _smtp_runtime_config()
    message = EmailMessage(
        subject=subject,
        body=body,
        from_email=smtp["from_email"],
        to=recipients,
        connection=smtp["connection"],
    )

    bucket = os.environ.get("MINIO_BUCKET", "ymm-files")
    s3 = _s3_client()
    attached_count = 0
    for f in files_qs:
        key = _extract_key(f.url, bucket)
        if not key:
            continue
        try:
            data = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
        except Exception:
            continue
        message.attach(f.filename, data, f.content_type or "application/octet-stream")
        attached_count += 1

    message.send(fail_silently=False)
    return {"sent_to": recipients, "attachment_count": attached_count}


def _resolve_note_target(note: Note, payload: dict):
    entity_label = "Müşteri"
    entity_code = ""
    to_emails = [payload.get("extra_emails")]
    contact_name = payload.get("note_contact_name") or ""
    contact_email = payload.get("note_contact_email")

    if note.document_id:
        entity_label = "Evrak"
        entity_code = note.document.doc_no
        to_emails.extend(
            [
                contact_email,
                note.document.note_contact_email,
                note.document.delivery_email,
                getattr(note.document.customer, "contact_email", None),
                getattr(note.document.customer, "email", None),
            ]
        )
        contact_name = (
            contact_name
            or note.document.note_contact_name
            or getattr(note.document.customer, "contact_person", "")
        )
    elif note.report_id:
        entity_label = "Rapor"
        entity_code = note.report.report_no
        to_emails.extend(
            [
                contact_email,
                note.report.note_contact_email,
                note.report.delivery_email,
                getattr(note.report.customer, "contact_email", None),
                getattr(note.report.customer, "email", None),
            ]
        )
        contact_name = (
            contact_name
            or note.report.note_contact_name
            or getattr(note.report.customer, "contact_person", "")
        )
    elif note.contract_id:
        entity_label = "Sözleşme"
        entity_code = note.contract.contract_no or f"Sözleşme #{note.contract_id}"
        to_emails.extend(
            [
                contact_email,
                note.contract.note_contact_email,
                getattr(note.contract.customer, "contact_email", None),
                getattr(note.contract.customer, "email", None),
            ]
        )
        contact_name = (
            contact_name
            or note.contract.note_contact_name
            or getattr(note.contract.customer, "contact_person", "")
        )
    elif note.customer_id:
        entity_label = "Müşteri"
        entity_code = note.customer.name
        to_emails.extend(
            [
                contact_email,
                note.customer.contact_email,
                note.customer.email,
            ]
        )
        contact_name = contact_name or note.customer.contact_person or ""

    return entity_label, entity_code, to_emails, contact_name


def _smtp_runtime_config():
    cfg = _get_settings()
    has_db_smtp = bool(cfg.smtp_host and cfg.smtp_user and cfg.smtp_from_email)
    if has_db_smtp:
        connection = get_connection(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host=cfg.smtp_host,
            port=cfg.smtp_port or 587,
            username=cfg.smtp_user,
            password=cfg.smtp_password or "",
            use_tls=bool(cfg.smtp_use_tls),
            use_ssl=bool(cfg.smtp_use_ssl),
        )
        return {
            "connection": connection,
            "from_email": cfg.smtp_from_email,
        }
    return {
        "connection": get_connection(),
        "from_email": os.environ.get("DEFAULT_FROM_EMAIL", "ymm-otomasyon@localhost"),
    }


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

    @action(detail=True, methods=["post"])
    def send_note_mail(self, request, pk=None):
        customer = self.get_object()
        extra_emails = request.data.get("extra_emails")
        note_contact_name = (request.data.get("note_contact_name") or "").strip()
        note_contact_email = (request.data.get("note_contact_email") or "").strip()
        files_qs = File.objects.filter(customer_id=customer.id, note_scope=True, document__isnull=True, report__isnull=True, contract__isnull=True)

        try:
            result = _send_note_email(
                request=request,
                entity_label="Müşteri",
                entity_code=customer.name,
                note_subject=None,
                note_text=(customer.card_note or ""),
                to_emails=[note_contact_email or None, customer.contact_email, customer.email, extra_emails],
                files_qs=files_qs,
                contact_name=note_contact_name or customer.contact_person,
            )
        except Exception as exc:
            return Response({"error": f"Mail gönderilemedi: {str(exc)}"}, status=400)

        return Response({"status": "ok", **result})


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

    @action(detail=True, methods=["post"])
    def send_note_mail(self, request, pk=None):
        doc = self.get_object()
        extra_emails = request.data.get("extra_emails")
        note_contact_name = request.data.get("note_contact_name")
        note_contact_email = request.data.get("note_contact_email")
        update_fields = []
        if note_contact_name is not None:
            doc.note_contact_name = (note_contact_name or "").strip() or None
            update_fields.append("note_contact_name")
        if note_contact_email is not None:
            doc.note_contact_email = (note_contact_email or "").strip() or None
            update_fields.append("note_contact_email")
        if update_fields:
            update_fields.append("updated_at")
            doc.save(update_fields=update_fields)

        files_qs = File.objects.filter(document_id=doc.id, note_scope=True)
        contact_name = doc.note_contact_name or getattr(doc.customer, "contact_person", "")

        try:
            result = _send_note_email(
                request=request,
                entity_label="Evrak",
                entity_code=doc.doc_no,
                note_subject=None,
                note_text=(doc.card_note or ""),
                to_emails=[doc.note_contact_email, doc.delivery_email, getattr(doc.customer, "contact_email", None), getattr(doc.customer, "email", None), extra_emails],
                files_qs=files_qs,
                contact_name=contact_name,
            )
        except Exception as exc:
            return Response({"error": f"Mail gönderilemedi: {str(exc)}"}, status=400)

        return Response({"status": "ok", **result})


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

    @action(detail=True, methods=["post"])
    def send_note_mail(self, request, pk=None):
        rep = self.get_object()
        extra_emails = request.data.get("extra_emails")
        note_contact_name = request.data.get("note_contact_name")
        note_contact_email = request.data.get("note_contact_email")
        update_fields = []
        if note_contact_name is not None:
            rep.note_contact_name = (note_contact_name or "").strip() or None
            update_fields.append("note_contact_name")
        if note_contact_email is not None:
            rep.note_contact_email = (note_contact_email or "").strip() or None
            update_fields.append("note_contact_email")
        if update_fields:
            update_fields.append("updated_at")
            rep.save(update_fields=update_fields)

        files_qs = File.objects.filter(report_id=rep.id, note_scope=True)
        contact_name = rep.note_contact_name or getattr(rep.customer, "contact_person", "")

        try:
            result = _send_note_email(
                request=request,
                entity_label="Rapor",
                entity_code=rep.report_no,
                note_subject=None,
                note_text=(rep.card_note or ""),
                to_emails=[rep.note_contact_email, rep.delivery_email, getattr(rep.customer, "contact_email", None), getattr(rep.customer, "email", None), extra_emails],
                files_qs=files_qs,
                contact_name=contact_name,
            )
        except Exception as exc:
            return Response({"error": f"Mail gönderilemedi: {str(exc)}"}, status=400)

        return Response({"status": "ok", **result})


class FileViewSet(AuditViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        document = self.request.query_params.get("document")
        report = self.request.query_params.get("report")
        contract = self.request.query_params.get("contract")
        customer = self.request.query_params.get("customer")
        scope = self.request.query_params.get("scope")
        note_scope = self.request.query_params.get("note_scope")
        note = self.request.query_params.get("note")
        if document:
            qs = qs.filter(document_id=document)
        if report:
            qs = qs.filter(report_id=report)
        if contract:
            qs = qs.filter(contract_id=contract)
        if customer:
            qs = qs.filter(customer_id=customer)
        if note:
            qs = qs.filter(note_id=note)
        if scope == "other":
            qs = qs.filter(document__isnull=True, report__isnull=True, contract__isnull=True, note_scope=False)
        if note_scope is not None:
            is_note_scope = str(note_scope).lower() in ("1", "true", "yes", "on")
            qs = qs.filter(note_scope=is_note_scope)
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
        contract_id = request.data.get("contract")
        customer_id = request.data.get("customer")
        note_id = request.data.get("note")
        raw_note_scope = request.data.get("note_scope")
        is_note_scope = str(raw_note_scope).lower() in ("1", "true", "yes", "on")

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
        if not customer_id and contract_id:
            try:
                customer_id = Contract.objects.get(id=contract_id).customer_id
            except Contract.DoesNotExist:
                customer_id = None

        display_name = (request.data.get("filename") or "").strip() or upload.name
        file_obj = File.objects.create(
            filename=display_name,
            content_type=upload.content_type or "application/octet-stream",
            size=upload.size,
            url=url,
            note_scope=is_note_scope,
            document_id=document_id or None,
            report_id=report_id or None,
            contract_id=contract_id or None,
            customer_id=customer_id or None,
            note_id=note_id or None,
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


class NoteViewSet(AuditViewSet):
    queryset = Note.objects.all()
    serializer_class = NoteSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        customer = self.request.query_params.get("customer")
        document = self.request.query_params.get("document")
        report = self.request.query_params.get("report")
        contract = self.request.query_params.get("contract")
        if customer:
            qs = qs.filter(customer_id=customer)
        if document:
            qs = qs.filter(document_id=document)
        if report:
            qs = qs.filter(report_id=report)
        if contract:
            qs = qs.filter(contract_id=contract)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        note = serializer.instance
        response_data = serializer.data

        if note.document_id:
            Document.objects.filter(id=note.document_id).update(card_note=note.text)
        elif note.report_id:
            Report.objects.filter(id=note.report_id).update(card_note=note.text)
        elif note.contract_id:
            Contract.objects.filter(id=note.contract_id).update(card_note=note.text)
        elif note.customer_id:
            Customer.objects.filter(id=note.customer_id).update(card_note=note.text)

        return Response(response_data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def send_mail(self, request, pk=None):
        note = self.get_object()
        try:
            entity_label, entity_code, to_emails, contact_name = _resolve_note_target(note, request.data)
            files_qs = File.objects.filter(note_id=note.id, note_scope=True)
            result = _send_note_email(
                request=request,
                entity_label=entity_label,
                entity_code=entity_code,
                note_subject=request.data.get("subject") or note.subject,
                note_text=note.text,
                to_emails=to_emails,
                files_qs=files_qs,
                contact_name=contact_name,
            )
            note.mail_sent_at = timezone.now()
            note.save(update_fields=["mail_sent_at", "updated_at"])
        except Exception as exc:
            return Response({"error": f"Mail gönderilemedi: {str(exc)}"}, status=400)
        return Response({"status": "ok", **result})


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

    @action(detail=True, methods=["post"])
    def send_note_mail(self, request, pk=None):
        contract = self.get_object()
        extra_emails = request.data.get("extra_emails")
        note_contact_name = request.data.get("note_contact_name")
        note_contact_email = request.data.get("note_contact_email")
        update_fields = []
        if note_contact_name is not None:
            contract.note_contact_name = (note_contact_name or "").strip() or None
            update_fields.append("note_contact_name")
        if note_contact_email is not None:
            contract.note_contact_email = (note_contact_email or "").strip() or None
            update_fields.append("note_contact_email")
        if update_fields:
            update_fields.append("updated_at")
            contract.save(update_fields=update_fields)

        files_qs = File.objects.filter(contract_id=contract.id, note_scope=True)
        contact_name = contract.note_contact_name or getattr(contract.customer, "contact_person", "")

        try:
            result = _send_note_email(
                request=request,
                entity_label="Sözleşme",
                entity_code=contract.contract_no or f"Sözleşme #{contract.id}",
                note_subject=None,
                note_text=(contract.card_note or ""),
                to_emails=[contract.note_contact_email, getattr(contract.customer, "contact_email", None), getattr(contract.customer, "email", None), extra_emails],
                files_qs=files_qs,
                contact_name=contact_name,
            )
        except Exception as exc:
            return Response({"error": f"Mail gönderilemedi: {str(exc)}"}, status=400)

        return Response({"status": "ok", **result})

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

    @action(detail=False, methods=["post"])
    def test_mail(self, request):
        user = _actor(request)
        if not user or not user.is_staff:
            raise PermissionDenied("Sadece admin test mail gönderebilir.")
        to_email = (request.data.get("to_email") or "").strip() or getattr(user, "email", "")
        if not to_email:
            return Response({"error": "Test alıcı e-posta zorunludur."}, status=400)
        recipients = _parse_emails(to_email)
        if not recipients:
            return Response({"error": "Geçerli bir e-posta girin."}, status=400)
        try:
            smtp = _smtp_runtime_config()
            msg = EmailMessage(
                subject="[YMM Otomasyon] SMTP Test",
                body="Bu bir test e-postasıdır. SMTP ayarları başarıyla çalışıyor.",
                from_email=smtp["from_email"],
                to=recipients,
                connection=smtp["connection"],
            )
            msg.send(fail_silently=False)
        except Exception as exc:
            return Response({"error": f"Test mail gönderilemedi: {str(exc)}"}, status=400)
        return Response({"status": "ok", "sent_to": recipients})


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










import os
from urllib.parse import urlparse

import boto3
from botocore.client import Config
from rest_framework import serializers
from django.utils import timezone
from .models import (
    Customer,
    Document,
    Report,
    File,
    ContractJob,
    Contract,
    AppSetting,
    DocumentCounter,
    ReportCounterGlobal,
    ReportCounterYearAll,
)



def _s3_client(endpoint_override: str | None = None):
    endpoint = endpoint_override or os.environ.get("MINIO_ENDPOINT", "localhost:9000")
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


def _extract_key(url: str, bucket: str) -> str | None:
    if not url:
        return None
    try:
        path = urlparse(url).path.lstrip("/")
    except Exception:
        return None
    prefix = f"{bucket}/"
    if path.startswith(prefix):
        return path[len(prefix) :]
    return None


def _presign(url: str) -> str | None:
    bucket = os.environ.get("MINIO_BUCKET", "ymm-files")
    key = _extract_key(url, bucket)
    if not key:
        return None
    expires = int(os.environ.get("MINIO_PRESIGN_EXPIRES", "3600"))
    public_endpoint = os.environ.get("MINIO_PUBLIC_ENDPOINT")
    client = _s3_client(endpoint_override=public_endpoint)
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires,
    )

class CustomerSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        identity_type = attrs.get("identity_type", getattr(instance, "identity_type", "VKN"))
        tax_no = attrs.get("tax_no", getattr(instance, "tax_no", None))
        tckn = attrs.get("tckn", getattr(instance, "tckn", None))

        tax_no = (tax_no or "").strip() or None
        tckn = (tckn or "").strip() or None

        if tax_no and (not tax_no.isdigit() or len(tax_no) != 10):
            raise serializers.ValidationError({"tax_no": "Vergi No 10 haneli ve sadece rakam olmalıdır."})
        if tckn and (not tckn.isdigit() or len(tckn) != 11):
            raise serializers.ValidationError({"tckn": "TCKN 11 haneli ve sadece rakam olmalıdır."})

        if identity_type == "VKN":
            if not tax_no:
                raise serializers.ValidationError({"tax_no": "Vergi No zorunludur."})
            tckn = None
        elif identity_type == "TCKN":
            if not tckn:
                raise serializers.ValidationError({"tckn": "TCKN zorunludur."})
            tax_no = None
        else:
            raise serializers.ValidationError({"identity_type": "Geçersiz kimlik türü."})

        qs = Customer.objects.all()
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if tax_no and qs.filter(tax_no=tax_no).exists():
            raise serializers.ValidationError({"tax_no": "Bu Vergi No ile kayıtlı müşteri zaten var."})
        if tckn and qs.filter(tckn=tckn).exists():
            raise serializers.ValidationError({"tckn": "Bu TCKN ile kayıtlı müşteri zaten var."})

        attrs["tax_no"] = tax_no
        attrs["tckn"] = tckn
        return attrs

    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ("created_by", "updated_by", "created_at", "updated_at", "is_archived")


class FileSerializer(serializers.ModelSerializer):
    signed_url = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = "__all__"
        read_only_fields = ("url", "created_by", "updated_by", "created_at", "updated_at", "is_archived")

    def get_signed_url(self, obj):
        return _presign(obj.url) or obj.url


class DocumentSerializer(serializers.ModelSerializer):
    files = FileSerializer(many=True, read_only=True)
    manual_serial = serializers.IntegerField(write_only=True, required=False)
    manual_doc_no = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Document
        fields = "__all__"
        read_only_fields = (
            "doc_no",
            "serial",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "is_archived",
        )

    def validate_received_date(self, value):
        if value is None:
            raise serializers.ValidationError("Tarih zorunludur.")
        user = getattr(self.context.get("request"), "user", None)
        if user and user.is_staff:
            return value
        today = timezone.localdate()
        if value < today:
            raise serializers.ValidationError("Geçmiş tarihli evrak girilemez.")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        if instance:
            locked_fields = ["customer", "doc_type", "year", "serial", "doc_no", "received_date"]
            for field in locked_fields:
                if field in attrs and attrs[field] != getattr(instance, field):
                    raise serializers.ValidationError(f"{field} değiştirilemez.")
        return attrs

    def create(self, validated_data):
        manual_serial = validated_data.pop("manual_serial", None)
        manual_doc_no = validated_data.pop("manual_doc_no", None)
        year = validated_data.get("year")
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if manual_serial or manual_doc_no:
            if not (user and user.is_staff):
                raise serializers.ValidationError("Manuel numara sadece admin içindir.")
            if year and year >= 2026:
                raise serializers.ValidationError("2026 ve sonrası için manuel numara verilemez.")
            if not manual_serial or not manual_doc_no:
                raise serializers.ValidationError("Manuel seri ve evrak numarası zorunludur.")
            validated_data["serial"] = manual_serial
            validated_data["doc_no"] = manual_doc_no

        instance = super().create(validated_data)

        if manual_serial and year:
            counter, _ = DocumentCounter.objects.get_or_create(
                doc_type=instance.doc_type,
                year=year,
            )
            if manual_serial > counter.last_serial:
                counter.last_serial = manual_serial
                counter.save()

        return instance


class ReportSerializer(serializers.ModelSerializer):
    files = FileSerializer(many=True, read_only=True)
    manual_report_no = serializers.CharField(write_only=True, required=False)
    manual_type_cumulative = serializers.IntegerField(write_only=True, required=False)
    manual_year_serial_all = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Report
        fields = "__all__"
        read_only_fields = (
            "report_no",
            "type_cumulative",
            "year_serial_all",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
            "is_archived",
        )

    def validate_received_date(self, value):
        if value is None:
            raise serializers.ValidationError("Tarih zorunludur.")
        user = getattr(self.context.get("request"), "user", None)
        if user and user.is_staff:
            return value
        today = timezone.localdate()
        if value < today:
            raise serializers.ValidationError("Geçmiş tarihli rapor girilemez.")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        start_month = attrs.get("period_start_month", getattr(instance, "period_start_month", None))
        start_year = attrs.get("period_start_year", getattr(instance, "period_start_year", None))
        end_month = attrs.get("period_end_month", getattr(instance, "period_end_month", None))
        end_year = attrs.get("period_end_year", getattr(instance, "period_end_year", None))

        if not all([start_month, start_year, end_month, end_year]):
            raise serializers.ValidationError("Dönem başlangıç ve bitiş bilgileri zorunludur.")

        if not (1 <= int(start_month) <= 12 and 1 <= int(end_month) <= 12):
            raise serializers.ValidationError("Ay bilgisi 1-12 aralığında olmalıdır.")

        if (end_year, end_month) < (start_year, start_month):
            raise serializers.ValidationError("Dönem bitişi başlangıçtan önce olamaz.")

        if instance:
            locked_fields = [
                "customer",
                "report_type",
                "year",
                "type_cumulative",
                "year_serial_all",
                "report_no",
                "received_date",
                "period_start_month",
                "period_start_year",
                "period_end_month",
                "period_end_year",
            ]
            for field in locked_fields:
                if field in attrs and attrs[field] != getattr(instance, field):
                    raise serializers.ValidationError(f"{field} değiştirilemez.")

        return attrs

    def create(self, validated_data):
        manual_report_no = validated_data.pop("manual_report_no", None)
        manual_type_cumulative = validated_data.pop("manual_type_cumulative", None)
        manual_year_serial_all = validated_data.pop("manual_year_serial_all", None)
        year = validated_data.get("year")
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if manual_report_no or manual_type_cumulative or manual_year_serial_all:
            if not (user and user.is_staff):
                raise serializers.ValidationError("Manuel numara sadece admin içindir.")
            if year and year >= 2026:
                raise serializers.ValidationError("2026 ve sonrası için manuel numara verilemez.")
            if not (manual_report_no and manual_type_cumulative and manual_year_serial_all):
                raise serializers.ValidationError("Manuel rapor no ve sayaçlar zorunludur.")
            validated_data["report_no"] = manual_report_no
            validated_data["type_cumulative"] = manual_type_cumulative
            validated_data["year_serial_all"] = manual_year_serial_all

        instance = super().create(validated_data)

        if manual_type_cumulative:
            global_counter, _ = ReportCounterGlobal.objects.get_or_create(id=1)
            if manual_type_cumulative > global_counter.last_serial:
                global_counter.last_serial = manual_type_cumulative
                global_counter.save()

        if manual_year_serial_all and year:
            year_counter, _ = ReportCounterYearAll.objects.get_or_create(year=year)
            if manual_year_serial_all > year_counter.last_serial:
                year_counter.last_serial = manual_year_serial_all
                year_counter.save()

        return instance


class ContractJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractJob
        fields = "__all__"
        read_only_fields = ("status", "created_by", "updated_by", "created_at", "updated_at", "is_archived")


class ContractSerializer(serializers.ModelSerializer):
    signed_url = serializers.SerializerMethodField()

    class Meta:
        model = Contract
        fields = "__all__"
        read_only_fields = ("created_by", "updated_by", "created_at", "updated_at", "is_archived")

    def get_signed_url(self, obj):
        return _presign(obj.file_url) or obj.file_url


class AppSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSetting
        fields = "__all__"







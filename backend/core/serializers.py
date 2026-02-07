from rest_framework import serializers
from .models import Customer, Document, Report, File, ContractJob

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ("created_by", "updated_by", "created_at", "updated_at", "is_archived")

class DocumentSerializer(serializers.ModelSerializer):
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
        from django.utils import timezone

        if value is None:
            raise serializers.ValidationError("Tarih zorunludur.")
        today = timezone.localdate()
        if value < today:
            raise serializers.ValidationError("Geçmiş tarihli evrak girilemez.")
        return value

class ReportSerializer(serializers.ModelSerializer):
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
        from django.utils import timezone

        if value is None:
            raise serializers.ValidationError("Tarih zorunludur.")
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

        return attrs

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = "__all__"
        read_only_fields = ("url", "created_by", "updated_by", "created_at", "updated_at", "is_archived")

class ContractJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractJob
        fields = "__all__"
        read_only_fields = ("status", "created_by", "updated_by", "created_at", "updated_at", "is_archived")

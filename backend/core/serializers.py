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
            raise serializers.ValidationError("GeÃ§miÅŸ tarihli evrak girilemez.")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        if instance:
            locked_fields = ["customer", "doc_type", "year", "serial", "doc_no", "received_date"]
            for field in locked_fields:
                if field in attrs and attrs[field] != getattr(instance, field):
                    raise serializers.ValidationError(f"{field} deÄŸiÅŸtirilemez.")
        return attrs

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
            raise serializers.ValidationError("GeÃ§miÅŸ tarihli rapor girilemez.")
        return value

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        start_month = attrs.get("period_start_month", getattr(instance, "period_start_month", None))
        start_year = attrs.get("period_start_year", getattr(instance, "period_start_year", None))
        end_month = attrs.get("period_end_month", getattr(instance, "period_end_month", None))
        end_year = attrs.get("period_end_year", getattr(instance, "period_end_year", None))

        if not all([start_month, start_year, end_month, end_year]):
            raise serializers.ValidationError("DÃ¶nem baÅŸlangÄ±Ã§ ve bitiÅŸ bilgileri zorunludur.")

        if not (1 <= int(start_month) <= 12 and 1 <= int(end_month) <= 12):
            raise serializers.ValidationError("Ay bilgisi 1-12 aralÄ±ÄŸÄ±nda olmalÄ±dÄ±r.")

        if (end_year, end_month) < (start_year, start_month):
            raise serializers.ValidationError("DÃ¶nem bitiÅŸi baÅŸlangÄ±Ã§tan Ã¶nce olamaz.")

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
                    raise serializers.ValidationError(f"{field} deÄŸiÅŸtirilemez.")

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

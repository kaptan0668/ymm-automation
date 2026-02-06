from django.contrib import admin
from .models import (
    Customer,
    Document,
    Report,
    File,
    AuditLog,
    ContractJob,
    DocumentCounter,
    ReportCounterYearAll,
    ReportCounterTypeCum,
)


class AuditAdmin(admin.ModelAdmin):
    readonly_fields = ("created_by", "updated_by", "created_at", "updated_at", "is_archived")

    def save_model(self, request, obj, form, change):
        if not obj.pk and hasattr(obj, "created_by"):
            obj.created_by = request.user
        if hasattr(obj, "updated_by"):
            obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Customer)
class CustomerAdmin(AuditAdmin):
    list_display = ("name", "tax_no", "is_archived", "created_at")
    search_fields = ("name", "tax_no")


@admin.register(Document)
class DocumentAdmin(AuditAdmin):
    list_display = ("doc_no", "doc_type", "year", "customer", "is_archived")
    search_fields = ("doc_no", "customer__name")


@admin.register(Report)
class ReportAdmin(AuditAdmin):
    list_display = ("report_no", "report_type", "year", "customer", "is_archived")
    search_fields = ("report_no", "customer__name")


@admin.register(File)
class FileAdmin(AuditAdmin):
    list_display = ("filename", "size", "created_at", "is_archived")
    search_fields = ("filename",)


@admin.register(ContractJob)
class ContractJobAdmin(AuditAdmin):
    list_display = ("id", "status", "created_at")


admin.site.register(AuditLog)
admin.site.register(DocumentCounter)
admin.site.register(ReportCounterYearAll)
admin.site.register(ReportCounterTypeCum)

admin.site.site_header = "YMM Otomasyon"
admin.site.site_title = "YMM Otomasyon"
admin.site.index_title = "YMM Otomasyon Yönetimi"

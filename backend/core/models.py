from django.db import models, transaction
from django.contrib.auth import get_user_model

User = get_user_model()

DOCUMENT_TYPES = [
    ("GLE", "GLE"),
    ("GDE", "GDE"),
    ("KIT", "KIT"),
    ("DGR", "DGR"),
]

REPORT_TYPES = [
    ("TT", "TT"),
    ("KDV", "KDV"),
    ("OAR", "OAR"),
    ("DGR", "DGR"),
]

class AuditBase(models.Model):
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    updated_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_archived = models.BooleanField(default=False)

    class Meta:
        abstract = True

class Customer(AuditBase):
    name = models.CharField(max_length=255)
    tax_no = models.CharField(max_length=32, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Müşteri"
        verbose_name_plural = "Müşteriler"

class DocumentCounter(models.Model):
    doc_type = models.CharField(max_length=3, choices=DOCUMENT_TYPES)
    year = models.IntegerField()
    last_serial = models.IntegerField(default=0)

    class Meta:
        unique_together = ("doc_type", "year")
        verbose_name = "Evrak Sayacı"
        verbose_name_plural = "Evrak Sayaçları"

class ReportCounterYearAll(models.Model):
    year = models.IntegerField(unique=True)
    last_serial = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Yıl Bazlı Rapor Sayacı"
        verbose_name_plural = "Yıl Bazlı Rapor Sayaçları"

class ReportCounterTypeCum(models.Model):
    report_type = models.CharField(max_length=3, choices=REPORT_TYPES)
    last_serial = models.IntegerField(default=0)

    class Meta:
        unique_together = ("report_type",)
        verbose_name = "Rapor Türü Kümülatif Sayacı"
        verbose_name_plural = "Rapor Türü Kümülatif Sayaçları"

class Document(AuditBase):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    doc_type = models.CharField(max_length=3, choices=DOCUMENT_TYPES)
    year = models.IntegerField()
    serial = models.IntegerField()
    doc_no = models.CharField(max_length=32, unique=True)

    class Meta:
        verbose_name = "Evrak"
        verbose_name_plural = "Evraklar"

class Report(AuditBase):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    report_type = models.CharField(max_length=3, choices=REPORT_TYPES)
    year = models.IntegerField()
    type_cumulative = models.IntegerField()
    year_serial_all = models.IntegerField()
    report_no = models.CharField(max_length=64, unique=True)

    class Meta:
        verbose_name = "Rapor"
        verbose_name_plural = "Raporlar"

class File(AuditBase):
    filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=128)
    size = models.IntegerField()
    url = models.URLField()

    class Meta:
        verbose_name = "Dosya"
        verbose_name_plural = "Dosyalar"

class AuditLog(models.Model):
    model = models.CharField(max_length=128)
    object_id = models.CharField(max_length=64)
    action = models.CharField(max_length=32)
    timestamp = models.DateTimeField(auto_now_add=True)
    actor = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        verbose_name = "Denetim Kaydı"
        verbose_name_plural = "Denetim Kayıtları"

class ContractJob(AuditBase):
    status = models.CharField(max_length=32, default="pending")
    payload = models.JSONField(default=dict)

    class Meta:
        verbose_name = "Sözleşme İşi"
        verbose_name_plural = "Sözleşme İşleri"


def next_document_number(doc_type: str, year: int) -> tuple[str, int]:
    with transaction.atomic():
        counter, _ = DocumentCounter.objects.select_for_update().get_or_create(
            doc_type=doc_type, year=year
        )
        counter.last_serial += 1
        counter.save()
        serial = counter.last_serial
        return f"{doc_type}-{year}-{serial:03d}", serial


def next_report_number(report_type: str, year: int) -> tuple[str, int, int]:
    with transaction.atomic():
        type_counter, _ = ReportCounterTypeCum.objects.select_for_update().get_or_create(
            report_type=report_type
        )
        year_counter, _ = ReportCounterYearAll.objects.select_for_update().get_or_create(
            year=year
        )
        type_counter.last_serial += 1
        year_counter.last_serial += 1
        type_counter.save()
        year_counter.save()

        type_cum = type_counter.last_serial
        year_serial = year_counter.last_serial
        report_no = f"YMM-06105087-{type_cum}/{year}-{year_serial:03d}"
        return report_no, type_cum, year_serial

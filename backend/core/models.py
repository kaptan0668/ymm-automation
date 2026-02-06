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
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="Oluşturan kullanıcı",
    )
    updated_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="Güncelleyen kullanıcı",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Güncellenme zamanı")
    is_archived = models.BooleanField(default=False, verbose_name="Arşivlendi mi")

    class Meta:
        abstract = True

class Customer(AuditBase):
    name = models.CharField(max_length=255, verbose_name="Müşteri adı")
    tax_no = models.CharField(max_length=32, unique=True, verbose_name="Vergi numarası")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Müşteri"
        verbose_name_plural = "Müşteriler"

class DocumentCounter(models.Model):
    doc_type = models.CharField(max_length=3, choices=DOCUMENT_TYPES, verbose_name="Evrak türü")
    year = models.IntegerField(verbose_name="Yıl")
    last_serial = models.IntegerField(default=0, verbose_name="Son seri")

    class Meta:
        unique_together = ("doc_type", "year")
        verbose_name = "Evrak Sayacı"
        verbose_name_plural = "Evrak Sayaçları"

class ReportCounterYearAll(models.Model):
    year = models.IntegerField(unique=True, verbose_name="Yıl")
    last_serial = models.IntegerField(default=0, verbose_name="Son seri")

    class Meta:
        verbose_name = "Yıl Bazlı Rapor Sayacı"
        verbose_name_plural = "Yıl Bazlı Rapor Sayaçları"

class ReportCounterTypeCum(models.Model):
    report_type = models.CharField(max_length=3, choices=REPORT_TYPES, verbose_name="Rapor türü")
    last_serial = models.IntegerField(default=0, verbose_name="Son seri")

    class Meta:
        unique_together = ("report_type",)
        verbose_name = "Rapor Türü Kümülatif Sayacı"
        verbose_name_plural = "Rapor Türü Kümülatif Sayaçları"

class Document(AuditBase):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, verbose_name="Müşteri")
    doc_type = models.CharField(max_length=3, choices=DOCUMENT_TYPES, verbose_name="Evrak türü")
    year = models.IntegerField(verbose_name="Yıl")
    serial = models.IntegerField(verbose_name="Seri")
    doc_no = models.CharField(max_length=32, unique=True, verbose_name="Evrak numarası")

    class Meta:
        verbose_name = "Evrak"
        verbose_name_plural = "Evraklar"

class Report(AuditBase):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, verbose_name="Müşteri")
    report_type = models.CharField(max_length=3, choices=REPORT_TYPES, verbose_name="Rapor türü")
    year = models.IntegerField(verbose_name="Yıl")
    type_cumulative = models.IntegerField(verbose_name="Tür bazlı kümülatif sayaç")
    year_serial_all = models.IntegerField(verbose_name="Yıl içi toplam sayaç")
    report_no = models.CharField(max_length=64, unique=True, verbose_name="Rapor numarası")

    class Meta:
        verbose_name = "Rapor"
        verbose_name_plural = "Raporlar"

class File(AuditBase):
    filename = models.CharField(max_length=255, verbose_name="Dosya adı")
    content_type = models.CharField(max_length=128, verbose_name="İçerik türü")
    size = models.IntegerField(verbose_name="Boyut (byte)")
    url = models.URLField(verbose_name="URL")

    class Meta:
        verbose_name = "Dosya"
        verbose_name_plural = "Dosyalar"

class AuditLog(models.Model):
    model = models.CharField(max_length=128, verbose_name="Model")
    object_id = models.CharField(max_length=64, verbose_name="Kayıt ID")
    action = models.CharField(max_length=32, verbose_name="İşlem")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Zaman")
    actor = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="Kullanıcı",
    )

    class Meta:
        verbose_name = "Denetim Kaydı"
        verbose_name_plural = "Denetim Kayıtları"

class ContractJob(AuditBase):
    status = models.CharField(max_length=32, default="pending", verbose_name="Durum")
    payload = models.JSONField(default=dict, verbose_name="İçerik")

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

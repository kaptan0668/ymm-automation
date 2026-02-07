from django.db import models, transaction
import os
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

YMM_LICENSE_NO = os.environ.get("YMM_LICENSE_NO", "06105087")

DELIVERY_METHODS = [
    ("KARGO", "Kargo"),
    ("EPOSTA", "E-posta"),
    ("ELDEN", "Elden"),
    ("EBYS", "EBYS"),
    ("DIGER", "DiÃ„Å¸er"),
]

class AuditBase(models.Model):
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="OluÃ…Å¸turan kullanÃ„Â±cÃ„Â±",
    )
    updated_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="GÃƒÂ¼ncelleyen kullanÃ„Â±cÃ„Â±",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="OluÃ…Å¸turulma zamanÃ„Â±")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="GÃƒÂ¼ncellenme zamanÃ„Â±")
    is_archived = models.BooleanField(default=False, verbose_name="ArÃ…Å¸ivlendi mi")

    class Meta:
        abstract = True

class Customer(AuditBase):
    name = models.CharField(max_length=255, verbose_name="MÃƒÂ¼Ã…Å¸teri adÃ„Â±")
    tax_no = models.CharField(max_length=32, unique=True, verbose_name="Vergi numarasÃ„Â±")
    tax_office = models.CharField(max_length=255, null=True, blank=True, verbose_name="Vergi dairesi")
    address = models.TextField(null=True, blank=True, verbose_name="Adres")
    phone = models.CharField(max_length=64, null=True, blank=True, verbose_name="Telefon")
    email = models.CharField(max_length=255, null=True, blank=True, verbose_name="E-posta")
    contact_person = models.CharField(max_length=255, null=True, blank=True, verbose_name="Yetkili kiÃ…Å¸i")

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "MÃƒÂ¼Ã…Å¸teri"
        verbose_name_plural = "MÃƒÂ¼Ã…Å¸teriler"

class DocumentCounter(models.Model):
    doc_type = models.CharField(max_length=3, choices=DOCUMENT_TYPES, verbose_name="Evrak tÃƒÂ¼rÃƒÂ¼")
    year = models.IntegerField(verbose_name="YÃ„Â±l")
    last_serial = models.IntegerField(default=0, verbose_name="Son seri")

    class Meta:
        unique_together = ("doc_type", "year")
        verbose_name = "Evrak SayacÃ„Â±"
        verbose_name_plural = "Evrak SayaÃƒÂ§larÃ„Â±"

class ReportCounterYearAll(models.Model):
    year = models.IntegerField(unique=True, verbose_name="YÃ„Â±l")
    last_serial = models.IntegerField(default=0, verbose_name="Son seri")

    class Meta:
        verbose_name = "YÃ„Â±l BazlÃ„Â± Rapor SayacÃ„Â±"
        verbose_name_plural = "YÃ„Â±l BazlÃ„Â± Rapor SayaÃƒÂ§larÃ„Â±"

class ReportCounterGlobal(models.Model):
    last_serial = models.IntegerField(default=0, verbose_name="Son seri")

    class Meta:
        verbose_name = "Rapor Genel KÃƒÂ¼mÃƒÂ¼latif SayacÃ„Â±"
        verbose_name_plural = "Rapor Genel KÃƒÂ¼mÃƒÂ¼latif SayaÃƒÂ§larÃ„Â±"

class ReportCounterTypeCum(models.Model):
    report_type = models.CharField(max_length=3, choices=REPORT_TYPES, verbose_name="Rapor tÃƒÂ¼rÃƒÂ¼")
    last_serial = models.IntegerField(default=0, verbose_name="Son seri")

    class Meta:
        unique_together = ("report_type",)
        verbose_name = "Rapor TÃƒÂ¼rÃƒÂ¼ KÃƒÂ¼mÃƒÂ¼latif SayacÃ„Â±"
        verbose_name_plural = "Rapor TÃƒÂ¼rÃƒÂ¼ KÃƒÂ¼mÃƒÂ¼latif SayaÃƒÂ§larÃ„Â±"

class Document(AuditBase):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, verbose_name="MÃƒÂ¼Ã…Å¸teri")
    doc_type = models.CharField(max_length=3, choices=DOCUMENT_TYPES, verbose_name="Evrak tÃƒÂ¼rÃƒÂ¼")
    year = models.IntegerField(verbose_name="YÃ„Â±l")
    serial = models.IntegerField(verbose_name="Seri")
    doc_no = models.CharField(max_length=64, unique=True, verbose_name="Evrak numarasÃ„Â±")
    received_date = models.DateField(null=True, blank=True, verbose_name="Tarih")
    reference_no = models.CharField(max_length=64, null=True, blank=True, verbose_name="Harici sayÃ„Â±")
    sender = models.CharField(max_length=255, null=True, blank=True, verbose_name="GÃƒÂ¶nderen")
    recipient = models.CharField(max_length=255, null=True, blank=True, verbose_name="AlÃ„Â±cÃ„Â±")
    subject = models.CharField(max_length=255, null=True, blank=True, verbose_name="Konu")
    description = models.TextField(null=True, blank=True, verbose_name="AÃƒÂ§Ã„Â±klama")
    delivery_method = models.CharField(
        max_length=16,
        choices=DELIVERY_METHODS,
        null=True,
        blank=True,
        verbose_name="Teslim yÃƒÂ¶ntemi",
    )
    delivery_kargo_name = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Kargo adÃ„Â±"
    )
    delivery_kargo_tracking = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Kargo takip no"
    )
    delivery_elden_name = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Elden teslim alan"
    )
    delivery_elden_date = models.DateField(
        null=True, blank=True, verbose_name="Elden teslim tarihi"
    )
    delivery_email = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="E-posta adresi"
    )
    delivery_ebys_id = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="EBYS ID"
    )
    delivery_ebys_date = models.DateField(
        null=True, blank=True, verbose_name="EBYS tarihi"
    )
    delivery_other_desc = models.TextField(
        null=True, blank=True, verbose_name="DiÃ„Å¸er teslim aÃƒÂ§Ã„Â±klamasÃ„Â±"
    )

    class Meta:
        verbose_name = "Evrak"
        verbose_name_plural = "Evraklar"

    def save(self, *args, **kwargs):
        if (not self.doc_no or not self.serial) and self.doc_type and self.year:
            doc_no, serial = next_document_number(self.doc_type, self.year)
            self.doc_no = doc_no
            self.serial = serial
        super().save(*args, **kwargs)

class Report(AuditBase):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, verbose_name="MÃƒÂ¼Ã…Å¸teri")
    report_type = models.CharField(max_length=3, choices=REPORT_TYPES, verbose_name="Rapor tÃƒÂ¼rÃƒÂ¼")
    year = models.IntegerField(verbose_name="YÃ„Â±l")
    type_cumulative = models.IntegerField(verbose_name="TÃƒÂ¼r bazlÃ„Â± kÃƒÂ¼mÃƒÂ¼latif sayaÃƒÂ§")
    year_serial_all = models.IntegerField(verbose_name="YÃ„Â±l iÃƒÂ§i toplam sayaÃƒÂ§")
    report_no = models.CharField(max_length=64, unique=True, verbose_name="Rapor numarasÃ„Â±")
    received_date = models.DateField(null=True, blank=True, verbose_name="Tarih")
    period_start_month = models.IntegerField(null=True, blank=True, verbose_name="DÃƒÂ¶nem baÃ…Å¸langÃ„Â±ÃƒÂ§ ay")
    period_start_year = models.IntegerField(null=True, blank=True, verbose_name="DÃƒÂ¶nem baÃ…Å¸langÃ„Â±ÃƒÂ§ yÃ„Â±l")
    period_end_month = models.IntegerField(null=True, blank=True, verbose_name="DÃƒÂ¶nem bitiÃ…Å¸ ay")
    period_end_year = models.IntegerField(null=True, blank=True, verbose_name="DÃƒÂ¶nem bitiÃ…Å¸ yÃ„Â±l")
    recipient = models.CharField(max_length=255, null=True, blank=True, verbose_name="AlÃ„Â±cÃ„Â±")
    subject = models.CharField(max_length=255, null=True, blank=True, verbose_name="Konu")
    description = models.TextField(null=True, blank=True, verbose_name="AÃƒÂ§Ã„Â±klama")
    delivery_method = models.CharField(
        max_length=16,
        choices=DELIVERY_METHODS,
        null=True,
        blank=True,
        verbose_name="Teslim yÃƒÂ¶ntemi",
    )
    delivery_kargo_name = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Kargo adÃ„Â±"
    )
    delivery_kargo_tracking = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Kargo takip no"
    )
    delivery_elden_name = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Elden teslim alan"
    )
    delivery_elden_date = models.DateField(
        null=True, blank=True, verbose_name="Elden teslim tarihi"
    )
    delivery_email = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="E-posta adresi"
    )
    delivery_ebys_id = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="EBYS ID"
    )
    delivery_ebys_date = models.DateField(
        null=True, blank=True, verbose_name="EBYS tarihi"
    )
    delivery_other_desc = models.TextField(
        null=True, blank=True, verbose_name="DiÃ„Å¸er teslim aÃƒÂ§Ã„Â±klamasÃ„Â±"
    )

    class Meta:
        verbose_name = "Rapor"
        verbose_name_plural = "Raporlar"

    def save(self, *args, **kwargs):
        if (
            (not self.report_no or not self.type_cumulative or not self.year_serial_all)
            and self.report_type
            and self.year
        ):
            report_no, type_cum, year_serial = next_report_number(self.report_type, self.year)
            self.report_no = report_no
            self.type_cumulative = type_cum
            self.year_serial_all = year_serial
        super().save(*args, **kwargs)

class File(AuditBase):
    filename = models.CharField(max_length=255, verbose_name="Dosya adÃ„Â±")
    content_type = models.CharField(max_length=128, verbose_name="Ã„Â°ÃƒÂ§erik tÃƒÂ¼rÃƒÂ¼")
    size = models.IntegerField(verbose_name="Boyut (byte)")
    url = models.URLField(verbose_name="URL")
    document = models.ForeignKey(
        "Document",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name="Evrak",
    )
    report = models.ForeignKey(
        "Report",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name="Rapor",
    )
    customer = models.ForeignKey(
        "Customer",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name="MÃƒÂ¼Ã…Å¸teri",
    )

    class Meta:
        verbose_name = "Dosya"
        verbose_name_plural = "Dosyalar"

class AuditLog(models.Model):
    model = models.CharField(max_length=128, verbose_name="Model")
    object_id = models.CharField(max_length=64, verbose_name="KayÃ„Â±t ID")
    action = models.CharField(max_length=32, verbose_name="Ã„Â°Ã…Å¸lem")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Zaman")
    actor = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="KullanÃ„Â±cÃ„Â±",
    )

    class Meta:
        verbose_name = "Denetim KaydÃ„Â±"
        verbose_name_plural = "Denetim KayÃ„Â±tlarÃ„Â±"

class ContractJob(AuditBase):
    status = models.CharField(max_length=32, default="pending", verbose_name="Durum")
    payload = models.JSONField(default=dict, verbose_name="Ã„Â°ÃƒÂ§erik")

    class Meta:
        verbose_name = "SÃƒÂ¶zleÃ…Å¸me Ã„Â°Ã…Å¸i"
        verbose_name_plural = "SÃƒÂ¶zleÃ…Å¸me Ã„Â°Ã…Å¸leri"


class Contract(AuditBase):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, verbose_name="MÃƒÂ¼Ã…Å¸teri")
    contract_no = models.CharField(max_length=64, null=True, blank=True, verbose_name="SÃƒÂ¶zleÃ…Å¸me no")
    contract_date = models.DateField(null=True, blank=True, verbose_name="SÃƒÂ¶zleÃ…Å¸me tarihi")
    contract_type = models.CharField(max_length=64, null=True, blank=True, verbose_name="SÃƒÂ¶zleÃ…Å¸me tÃƒÂ¼rÃƒÂ¼")
    period_start_month = models.IntegerField(null=True, blank=True, verbose_name="DÃƒÂ¶nem baÃ…Å¸langÃ„Â±ÃƒÂ§ ay")
    period_start_year = models.IntegerField(null=True, blank=True, verbose_name="DÃƒÂ¶nem baÃ…Å¸langÃ„Â±ÃƒÂ§ yÃ„Â±l")
    period_end_month = models.IntegerField(null=True, blank=True, verbose_name="DÃƒÂ¶nem bitiÃ…Å¸ ay")
    period_end_year = models.IntegerField(null=True, blank=True, verbose_name="DÃƒÂ¶nem bitiÃ…Å¸ yÃ„Â±l")
    filename = models.CharField(max_length=255, null=True, blank=True, verbose_name="Dosya adÃ„Â±")
    content_type = models.CharField(max_length=128, null=True, blank=True, verbose_name="Ã„Â°ÃƒÂ§erik tÃƒÂ¼rÃƒÂ¼")
    size = models.IntegerField(null=True, blank=True, verbose_name="Boyut (byte)")
    file_url = models.URLField(null=True, blank=True, verbose_name="Dosya URL")

    class Meta:
        verbose_name = "SÃƒÂ¶zleÃ…Å¸me"
        verbose_name_plural = "SÃƒÂ¶zleÃ…Å¸meler"


def next_document_number(doc_type: str, year: int) -> tuple[str, int]:
    with transaction.atomic():
        counter, _ = DocumentCounter.objects.select_for_update().get_or_create(
            doc_type=doc_type, year=year
        )
        counter.last_serial += 1
        counter.save()
        serial = counter.last_serial
        return f"YMM-{YMM_LICENSE_NO}-{doc_type}-{year}-{serial:03d}", serial


def next_report_number(report_type: str, year: int) -> tuple[str, int, int]:
    with transaction.atomic():
        global_counter, _ = ReportCounterGlobal.objects.select_for_update().get_or_create(id=1)
        year_counter, _ = ReportCounterYearAll.objects.select_for_update().get_or_create(
            year=year
        )
        global_counter.last_serial += 1
        year_counter.last_serial += 1
        global_counter.save()
        year_counter.save()

        type_cum = global_counter.last_serial
        year_serial = year_counter.last_serial
        report_no = f"YMM-{YMM_LICENSE_NO}-{type_cum}/{year}-{year_serial:03d}"
        return report_no, type_cum, year_serial

from django.db import models, transaction
import os
from datetime import date
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
    ("DIGER", "Diğer"),
]

STATUS_CHOICES = [
    ("OPEN", "Açık"),
    ("DONE", "Tamamlandı"),
]


def default_year():
    return date.today().year

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

IDENTITY_TYPES = [
    ("VKN", "Vergi No"),
    ("TCKN", "TCKN"),
]


class Customer(AuditBase):
    name = models.CharField(max_length=255, verbose_name="Müşteri adı")
    identity_type = models.CharField(
        max_length=8,
        choices=IDENTITY_TYPES,
        default="VKN",
        verbose_name="Kimlik türü",
    )
    tax_no = models.CharField(
        max_length=32,
        unique=True,
        null=True,
        blank=True,
        verbose_name="Vergi numarası",
    )
    tckn = models.CharField(
        max_length=11,
        unique=True,
        null=True,
        blank=True,
        verbose_name="TCKN",
    )
    tax_office = models.CharField(max_length=255, null=True, blank=True, verbose_name="Vergi dairesi")
    address = models.TextField(null=True, blank=True, verbose_name="Adres")
    phone = models.CharField(max_length=64, null=True, blank=True, verbose_name="Telefon")
    email = models.CharField(max_length=255, null=True, blank=True, verbose_name="E-posta")
    contact_person = models.CharField(max_length=255, null=True, blank=True, verbose_name="Yetkili kişi")
    contact_phone = models.CharField(max_length=64, null=True, blank=True, verbose_name="Yetkili telefon")
    contact_email = models.CharField(max_length=255, null=True, blank=True, verbose_name="Yetkili e-posta")
    card_note = models.TextField(null=True, blank=True, verbose_name="Kart notu")

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
        unique_together = (("doc_type", "year"),)
        verbose_name = "Evrak Sayacı"
        verbose_name_plural = "Evrak Sayaçları"

class ReportCounterYearAll(models.Model):
    year = models.IntegerField(unique=True, verbose_name="Yıl")
    last_serial = models.IntegerField(default=0, verbose_name="Son seri")

    class Meta:
        verbose_name = "Yıl Bazlı Rapor Sayacı"
        verbose_name_plural = "Yıl Bazlı Rapor Sayaçları"

class ReportCounterGlobal(models.Model):
    last_serial = models.IntegerField(default=0, verbose_name="Son seri")

    class Meta:
        verbose_name = "Rapor Genel Kümülatif Sayacı"
        verbose_name_plural = "Rapor Genel Kümülatif Sayaçları"

class ReportCounterTypeCum(models.Model):
    report_type = models.CharField(max_length=3, choices=REPORT_TYPES, verbose_name="Rapor türü")
    last_serial = models.IntegerField(default=0, verbose_name="Son seri")

    class Meta:
        unique_together = (("report_type",),)
        verbose_name = "Rapor Türü Kümülatif Sayacı"
        verbose_name_plural = "Rapor Türü Kümülatif Sayaçları"


class AppSetting(models.Model):
    working_year = models.IntegerField(default=default_year, verbose_name="Çalışma yılı")
    reference_year = models.IntegerField(default=default_year, verbose_name="Referans yılı")
    mail_brand_name = models.CharField(
        max_length=255,
        default="YMM Kadir Hafızoğlu",
        verbose_name="Mail marka adı",
    )
    smtp_host = models.CharField(max_length=255, null=True, blank=True, verbose_name="SMTP host")
    smtp_port = models.IntegerField(default=587, verbose_name="SMTP port")
    smtp_user = models.CharField(max_length=255, null=True, blank=True, verbose_name="SMTP kullanıcı")
    smtp_password = models.CharField(max_length=255, null=True, blank=True, verbose_name="SMTP parola")
    smtp_use_tls = models.BooleanField(default=True, verbose_name="SMTP TLS")
    smtp_use_ssl = models.BooleanField(default=False, verbose_name="SMTP SSL")
    smtp_from_email = models.CharField(max_length=255, null=True, blank=True, verbose_name="Gönderen e-posta")

    class Meta:
        verbose_name = "Uygulama Ayarı"
        verbose_name_plural = "Uygulama Ayarları"


class YearLock(models.Model):
    year = models.IntegerField(unique=True, verbose_name="Yıl")
    is_locked = models.BooleanField(default=False, verbose_name="Kilitli mi")
    locked_at = models.DateTimeField(null=True, blank=True, verbose_name="Kilit zamanı")
    locked_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="Kilitleyen kullanıcı",
    )

    class Meta:
        verbose_name = "Yıl Kilidi"
        verbose_name_plural = "Yıl Kilitleri"

class Document(AuditBase):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, verbose_name="Müşteri")
    contract = models.ForeignKey(
        "Contract",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="documents",
        verbose_name="Sözleşme",
    )
    doc_type = models.CharField(max_length=3, choices=DOCUMENT_TYPES, verbose_name="Evrak türü")
    year = models.IntegerField(verbose_name="Yıl")
    serial = models.IntegerField(verbose_name="Seri")
    doc_no = models.CharField(max_length=64, unique=True, verbose_name="Evrak numarası")
    status = models.CharField(
        max_length=8,
        choices=STATUS_CHOICES,
        default="OPEN",
        verbose_name="Durum",
    )
    received_date = models.DateField(null=True, blank=True, verbose_name="Tarih")
    reference_no = models.CharField(max_length=64, null=True, blank=True, verbose_name="Harici sayı")
    sender = models.CharField(max_length=255, null=True, blank=True, verbose_name="Gönderen")
    recipient = models.CharField(max_length=255, null=True, blank=True, verbose_name="Alıcı")
    subject = models.CharField(max_length=255, null=True, blank=True, verbose_name="Konu")
    description = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    card_note = models.TextField(null=True, blank=True, verbose_name="Kart notu")
    note_contact_name = models.CharField(max_length=255, null=True, blank=True, verbose_name="Not ilgili kişi")
    note_contact_email = models.CharField(max_length=255, null=True, blank=True, verbose_name="Not ilgili e-posta")
    delivery_method = models.CharField(
        max_length=16,
        choices=DELIVERY_METHODS,
        null=True,
        blank=True,
        verbose_name="Teslim yöntemi",
    )
    delivery_kargo_name = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Kargo adı"
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
        null=True, blank=True, verbose_name="Diğer teslim açıklaması"
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
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, verbose_name="Müşteri")
    contract = models.ForeignKey(
        "Contract",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reports",
        verbose_name="Sözleşme",
    )
    report_type = models.CharField(max_length=3, choices=REPORT_TYPES, verbose_name="Rapor türü")
    year = models.IntegerField(verbose_name="Yıl")
    type_cumulative = models.IntegerField(verbose_name="Tür bazlı kümülatif sayaç")
    year_serial_all = models.IntegerField(verbose_name="Yıl içi toplam sayaç")
    report_no = models.CharField(max_length=64, unique=True, verbose_name="Rapor numarası")
    status = models.CharField(
        max_length=8,
        choices=STATUS_CHOICES,
        default="OPEN",
        verbose_name="Durum",
    )
    received_date = models.DateField(null=True, blank=True, verbose_name="Tarih")
    period_start_month = models.IntegerField(null=True, blank=True, verbose_name="Dönem başlangıç ay")
    period_start_year = models.IntegerField(null=True, blank=True, verbose_name="Dönem başlangıç yıl")
    period_end_month = models.IntegerField(null=True, blank=True, verbose_name="Dönem bitiş ay")
    period_end_year = models.IntegerField(null=True, blank=True, verbose_name="Dönem bitiş yıl")
    recipient = models.CharField(max_length=255, null=True, blank=True, verbose_name="Alıcı")
    subject = models.CharField(max_length=255, null=True, blank=True, verbose_name="Konu")
    description = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    card_note = models.TextField(null=True, blank=True, verbose_name="Kart notu")
    note_contact_name = models.CharField(max_length=255, null=True, blank=True, verbose_name="Not ilgili kişi")
    note_contact_email = models.CharField(max_length=255, null=True, blank=True, verbose_name="Not ilgili e-posta")
    delivery_method = models.CharField(
        max_length=16,
        choices=DELIVERY_METHODS,
        null=True,
        blank=True,
        verbose_name="Teslim yöntemi",
    )
    delivery_kargo_name = models.CharField(
        max_length=255, null=True, blank=True, verbose_name="Kargo adı"
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
        null=True, blank=True, verbose_name="Diğer teslim açıklaması"
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
    filename = models.CharField(max_length=255, verbose_name="Dosya adı")
    content_type = models.CharField(max_length=128, verbose_name="İçerik türü")
    size = models.IntegerField(verbose_name="Boyut (byte)")
    url = models.URLField(verbose_name="URL")
    note_scope = models.BooleanField(default=False, verbose_name="Not dosyası mı")
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
    contract = models.ForeignKey(
        "Contract",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name="Sözleşme",
    )
    customer = models.ForeignKey(
        "Customer",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name="Müşteri",
    )
    note = models.ForeignKey(
        "Note",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="note_files",
        verbose_name="Not",
    )

    class Meta:
        verbose_name = "Dosya"
        verbose_name_plural = "Dosyalar"


class Note(AuditBase):
    subject = models.CharField(max_length=255, null=True, blank=True, verbose_name="Not konusu")
    text = models.TextField(verbose_name="Not metni")
    mail_sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Mail gönderim zamanı")
    mail_sent_to = models.JSONField(default=list, blank=True, verbose_name="Mail alıcıları")
    customer = models.ForeignKey(
        "Customer",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notes",
        verbose_name="Müşteri",
    )
    document = models.ForeignKey(
        "Document",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notes",
        verbose_name="Evrak",
    )
    report = models.ForeignKey(
        "Report",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notes",
        verbose_name="Rapor",
    )
    contract = models.ForeignKey(
        "Contract",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notes",
        verbose_name="Sözleşme",
    )

    class Meta:
        verbose_name = "Not"
        verbose_name_plural = "Notlar"
        ordering = ("-created_at",)

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


class Contract(AuditBase):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, verbose_name="Müşteri")
    status = models.CharField(
        max_length=8,
        choices=STATUS_CHOICES,
        default="OPEN",
        verbose_name="Durum",
    )
    contract_no = models.CharField(max_length=64, null=True, blank=True, verbose_name="Sözleşme no")
    contract_date = models.DateField(null=True, blank=True, verbose_name="Sözleşme tarihi")
    contract_type = models.CharField(max_length=64, null=True, blank=True, verbose_name="Sözleşme türü")
    period_start_month = models.IntegerField(null=True, blank=True, verbose_name="Dönem başlangıç ay")
    period_start_year = models.IntegerField(null=True, blank=True, verbose_name="Dönem başlangıç yıl")
    period_end_month = models.IntegerField(null=True, blank=True, verbose_name="Dönem bitiş ay")
    period_end_year = models.IntegerField(null=True, blank=True, verbose_name="Dönem bitiş yıl")
    filename = models.CharField(max_length=255, null=True, blank=True, verbose_name="Dosya adı")
    content_type = models.CharField(max_length=128, null=True, blank=True, verbose_name="İçerik türü")
    size = models.IntegerField(null=True, blank=True, verbose_name="Boyut (byte)")
    file_url = models.URLField(null=True, blank=True, verbose_name="Dosya URL")
    card_note = models.TextField(null=True, blank=True, verbose_name="Kart notu")
    note_contact_name = models.CharField(max_length=255, null=True, blank=True, verbose_name="Not ilgili kişi")
    note_contact_email = models.CharField(max_length=255, null=True, blank=True, verbose_name="Not ilgili e-posta")

    class Meta:
        verbose_name = "Sözleşme"
        verbose_name_plural = "Sözleşmeler"


class ChatThread(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True, verbose_name="Konu")
    is_group = models.BooleanField(default=False, verbose_name="Grup mu")
    is_global = models.BooleanField(default=False, verbose_name="Genel sohbet mi")
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="Oluşturan kullanıcı",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Güncellenme zamanı")

    class Meta:
        verbose_name = "Sohbet Konusu"
        verbose_name_plural = "Sohbet Konuları"
        ordering = ("-updated_at",)


class ChatParticipant(models.Model):
    thread = models.ForeignKey(
        "ChatThread",
        on_delete=models.CASCADE,
        related_name="participants",
        verbose_name="Sohbet",
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="chat_participations",
        verbose_name="Kullanıcı",
    )
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name="Katılma zamanı")
    last_read_at = models.DateTimeField(null=True, blank=True, verbose_name="Son okuma zamanı")

    class Meta:
        verbose_name = "Sohbet Katılımcısı"
        verbose_name_plural = "Sohbet Katılımcıları"
        unique_together = (("thread", "user"),)


class ChatMessage(models.Model):
    thread = models.ForeignKey(
        "ChatThread",
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="Sohbet",
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="chat_messages",
        verbose_name="Gönderen",
    )
    body = models.TextField(null=True, blank=True, verbose_name="Mesaj")
    is_deleted = models.BooleanField(default=False, verbose_name="Silindi mi")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")

    class Meta:
        verbose_name = "Sohbet Mesajı"
        verbose_name_plural = "Sohbet Mesajları"
        ordering = ("created_at",)


class ChatMessageFile(models.Model):
    message = models.ForeignKey(
        "ChatMessage",
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name="Mesaj",
    )
    filename = models.CharField(max_length=255, verbose_name="Dosya adı")
    content_type = models.CharField(max_length=128, verbose_name="İçerik türü")
    size = models.IntegerField(verbose_name="Boyut (byte)")
    url = models.URLField(verbose_name="URL")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")

    class Meta:
        verbose_name = "Mesaj Dosyası"
        verbose_name_plural = "Mesaj Dosyaları"


def year_is_locked(year: int) -> bool:
    lock = YearLock.objects.filter(year=year).only("is_locked").first()
    return bool(lock and lock.is_locked)


def next_document_number(doc_type: str, year: int) -> tuple[str, int]:
    with transaction.atomic():
        counter, _ = DocumentCounter.objects.select_for_update().get_or_create(
            doc_type=doc_type, year=year
        )
        max_existing_serial = (
            Document.objects.filter(doc_type=doc_type, year=year)
            .order_by("-serial")
            .values_list("serial", flat=True)
            .first()
            or 0
        )
        counter.last_serial = max(counter.last_serial, max_existing_serial) + 1
        counter.save()
        serial = counter.last_serial
        return f"YMM-{YMM_LICENSE_NO}/{doc_type}/{year}-{serial:03d}", serial


def next_report_number(report_type: str, year: int) -> tuple[str, int, int]:
    with transaction.atomic():
        global_counter, _ = ReportCounterGlobal.objects.select_for_update().get_or_create(id=1)
        year_counter, _ = ReportCounterYearAll.objects.select_for_update().get_or_create(
            year=year
        )
        max_existing_global = (
            Report.objects.order_by("-type_cumulative")
            .values_list("type_cumulative", flat=True)
            .first()
            or 0
        )
        max_existing_year = (
            Report.objects.filter(year=year)
            .order_by("-year_serial_all")
            .values_list("year_serial_all", flat=True)
            .first()
            or 0
        )
        global_counter.last_serial = max(global_counter.last_serial, max_existing_global) + 1
        year_counter.last_serial = max(year_counter.last_serial, max_existing_year) + 1
        global_counter.save()
        year_counter.save()

        type_cum = global_counter.last_serial
        year_serial = year_counter.last_serial
        report_no = f"YMM-{YMM_LICENSE_NO}-{type_cum}/{year}-{year_serial:03d}"
        return report_no, type_cum, year_serial



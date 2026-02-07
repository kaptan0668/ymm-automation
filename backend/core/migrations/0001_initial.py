from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("model", models.CharField(max_length=128, verbose_name="Model")),
                ("object_id", models.CharField(max_length=64, verbose_name="Kayıt ID")),
                ("action", models.CharField(max_length=32, verbose_name="İşlem")),
                ("timestamp", models.DateTimeField(auto_now_add=True, verbose_name="Zaman")),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Kullanıcı",
                    ),
                ),
            ],
            options={
                "verbose_name": "Denetim Kaydı",
                "verbose_name_plural": "Denetim Kayıtları",
            },
        ),
        migrations.CreateModel(
            name="ContractJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Güncellenme zamanı")),
                ("is_archived", models.BooleanField(default=False, verbose_name="Arşivlendi mi")),
                ("status", models.CharField(default="pending", max_length=32, verbose_name="Durum")),
                ("payload", models.JSONField(default=dict, verbose_name="İçerik")),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Oluşturan kullanıcı",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Güncelleyen kullanıcı",
                    ),
                ),
            ],
            options={
                "verbose_name": "Sözleşme İşi",
                "verbose_name_plural": "Sözleşme İşleri",
            },
        ),
        migrations.CreateModel(
            name="Customer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Güncellenme zamanı")),
                ("is_archived", models.BooleanField(default=False, verbose_name="Arşivlendi mi")),
                ("name", models.CharField(max_length=255, verbose_name="Müşteri adı")),
                ("tax_no", models.CharField(max_length=32, unique=True, verbose_name="Vergi numarası")),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Oluşturan kullanıcı",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Güncelleyen kullanıcı",
                    ),
                ),
            ],
            options={
                "verbose_name": "Müşteri",
                "verbose_name_plural": "Müşteriler",
            },
        ),
        migrations.CreateModel(
            name="DocumentCounter",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("doc_type", models.CharField(choices=[("GLE", "GLE"), ("GDE", "GDE"), ("KIT", "KIT"), ("DGR", "DGR")], max_length=3, verbose_name="Evrak türü")),
                ("year", models.IntegerField(verbose_name="Yıl")),
                ("last_serial", models.IntegerField(default=0, verbose_name="Son seri")),
            ],
            options={
                "verbose_name": "Evrak Sayacı",
                "verbose_name_plural": "Evrak Sayaçları",
                "unique_together": {("doc_type", "year")},
            },
        ),
        migrations.CreateModel(
            name="ReportCounterTypeCum",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("report_type", models.CharField(choices=[("TT", "TT"), ("KDV", "KDV"), ("OAR", "OAR"), ("DGR", "DGR")], max_length=3, verbose_name="Rapor türü")),
                ("last_serial", models.IntegerField(default=0, verbose_name="Son seri")),
            ],
            options={
                "verbose_name": "Rapor Türü Kümülatif Sayacı",
                "verbose_name_plural": "Rapor Türü Kümülatif Sayaçları",
                "unique_together": {("report_type",)},
            },
        ),
        migrations.CreateModel(
            name="ReportCounterYearAll",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.IntegerField(unique=True, verbose_name="Yıl")),
                ("last_serial", models.IntegerField(default=0, verbose_name="Son seri")),
            ],
            options={
                "verbose_name": "Yıl Bazlı Rapor Sayacı",
                "verbose_name_plural": "Yıl Bazlı Rapor Sayaçları",
            },
        ),
        migrations.CreateModel(
            name="Document",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Güncellenme zamanı")),
                ("is_archived", models.BooleanField(default=False, verbose_name="Arşivlendi mi")),
                ("doc_type", models.CharField(choices=[("GLE", "GLE"), ("GDE", "GDE"), ("KIT", "KIT"), ("DGR", "DGR")], max_length=3, verbose_name="Evrak türü")),
                ("year", models.IntegerField(verbose_name="Yıl")),
                ("serial", models.IntegerField(verbose_name="Seri")),
                ("doc_no", models.CharField(max_length=32, unique=True, verbose_name="Evrak numarası")),
                ("received_date", models.DateField(blank=True, null=True, verbose_name="Tarih")),
                ("reference_no", models.CharField(blank=True, max_length=64, null=True, verbose_name="Harici sayı")),
                ("sender", models.CharField(blank=True, max_length=255, null=True, verbose_name="Gönderen")),
                ("recipient", models.CharField(blank=True, max_length=255, null=True, verbose_name="Alıcı")),
                ("subject", models.CharField(blank=True, max_length=255, null=True, verbose_name="Konu")),
                ("description", models.TextField(blank=True, null=True, verbose_name="Açıklama")),
                ("delivery_method", models.CharField(blank=True, choices=[("KARGO", "Kargo"), ("EPOSTA", "E-posta"), ("ELDEN", "Elden"), ("EBYS", "EBYS"), ("DIGER", "Diğer")], max_length=16, null=True, verbose_name="Teslim yöntemi")),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Oluşturan kullanıcı",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Güncelleyen kullanıcı",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="core.customer",
                        verbose_name="Müşteri",
                    ),
                ),
            ],
            options={
                "verbose_name": "Evrak",
                "verbose_name_plural": "Evraklar",
            },
        ),
        migrations.CreateModel(
            name="Report",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Güncellenme zamanı")),
                ("is_archived", models.BooleanField(default=False, verbose_name="Arşivlendi mi")),
                ("report_type", models.CharField(choices=[("TT", "TT"), ("KDV", "KDV"), ("OAR", "OAR"), ("DGR", "DGR")], max_length=3, verbose_name="Rapor türü")),
                ("year", models.IntegerField(verbose_name="Yıl")),
                ("type_cumulative", models.IntegerField(verbose_name="Tür bazlı kümülatif sayaç")),
                ("year_serial_all", models.IntegerField(verbose_name="Yıl içi toplam sayaç")),
                ("report_no", models.CharField(max_length=64, unique=True, verbose_name="Rapor numarası")),
                ("received_date", models.DateField(blank=True, null=True, verbose_name="Tarih")),
                ("reference_no", models.CharField(blank=True, max_length=64, null=True, verbose_name="Harici sayı")),
                ("sender", models.CharField(blank=True, max_length=255, null=True, verbose_name="Gönderen")),
                ("recipient", models.CharField(blank=True, max_length=255, null=True, verbose_name="Alıcı")),
                ("subject", models.CharField(blank=True, max_length=255, null=True, verbose_name="Konu")),
                ("description", models.TextField(blank=True, null=True, verbose_name="Açıklama")),
                ("delivery_method", models.CharField(blank=True, choices=[("KARGO", "Kargo"), ("EPOSTA", "E-posta"), ("ELDEN", "Elden"), ("EBYS", "EBYS"), ("DIGER", "Diğer")], max_length=16, null=True, verbose_name="Teslim yöntemi")),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Oluşturan kullanıcı",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Güncelleyen kullanıcı",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="core.customer",
                        verbose_name="Müşteri",
                    ),
                ),
            ],
            options={
                "verbose_name": "Rapor",
                "verbose_name_plural": "Raporlar",
            },
        ),
        migrations.CreateModel(
            name="File",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Güncellenme zamanı")),
                ("is_archived", models.BooleanField(default=False, verbose_name="Arşivlendi mi")),
                ("filename", models.CharField(max_length=255, verbose_name="Dosya adı")),
                ("content_type", models.CharField(max_length=128, verbose_name="İçerik türü")),
                ("size", models.IntegerField(verbose_name="Boyut (byte)")),
                ("url", models.URLField(verbose_name="URL")),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Oluşturan kullanıcı",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Güncelleyen kullanıcı",
                    ),
                ),
                (
                    "document",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="files",
                        to="core.document",
                        verbose_name="Evrak",
                    ),
                ),
                (
                    "report",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="files",
                        to="core.report",
                        verbose_name="Rapor",
                    ),
                ),
            ],
            options={
                "verbose_name": "Dosya",
                "verbose_name_plural": "Dosyalar",
            },
        ),
    ]

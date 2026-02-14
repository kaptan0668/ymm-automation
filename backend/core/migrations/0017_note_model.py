from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0016_appsetting_smtp_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Note",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Güncellenme zamanı")),
                ("is_archived", models.BooleanField(default=False, verbose_name="Arşivlendi mi")),
                ("text", models.TextField(verbose_name="Not metni")),
                (
                    "contract",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.CASCADE,
                        related_name="notes",
                        to="core.contract",
                        verbose_name="Sözleşme",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Oluşturan kullanıcı",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.CASCADE,
                        related_name="notes",
                        to="core.customer",
                        verbose_name="Müşteri",
                    ),
                ),
                (
                    "document",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.CASCADE,
                        related_name="notes",
                        to="core.document",
                        verbose_name="Evrak",
                    ),
                ),
                (
                    "report",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.CASCADE,
                        related_name="notes",
                        to="core.report",
                        verbose_name="Rapor",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Güncelleyen kullanıcı",
                    ),
                ),
            ],
            options={
                "verbose_name": "Not",
                "verbose_name_plural": "Notlar",
                "ordering": ("-created_at",),
            },
        ),
    ]

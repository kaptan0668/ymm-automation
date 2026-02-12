from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0011_contract_links_and_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="YearLock",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.IntegerField(unique=True, verbose_name="Yıl")),
                ("is_locked", models.BooleanField(default=False, verbose_name="Kilitli mi")),
                ("locked_at", models.DateTimeField(blank=True, null=True, verbose_name="Kilit zamanı")),
                (
                    "locked_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="auth.user",
                        verbose_name="Kilitleyen kullanıcı",
                    ),
                ),
            ],
            options={
                "verbose_name": "Yıl Kilidi",
                "verbose_name_plural": "Yıl Kilitleri",
            },
        ),
    ]


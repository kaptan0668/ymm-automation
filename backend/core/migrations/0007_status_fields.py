from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0006_app_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="status",
            field=models.CharField(
                choices=[("OPEN", "Açık"), ("DONE", "Tamamlandı")],
                default="OPEN",
                max_length=8,
                verbose_name="Durum",
            ),
        ),
        migrations.AddField(
            model_name="report",
            name="status",
            field=models.CharField(
                choices=[("OPEN", "Açık"), ("DONE", "Tamamlandı")],
                default="OPEN",
                max_length=8,
                verbose_name="Durum",
            ),
        ),
    ]


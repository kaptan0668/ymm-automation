from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_report_counter_global"),
    ]

    operations = [
        migrations.AddField(
            model_name="file",
            name="customer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="files",
                to="core.customer",
                verbose_name="Müşteri",
            ),
        ),
    ]

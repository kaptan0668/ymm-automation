from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_state_sync_contract_report"),
    ]

    operations = [
        migrations.AddField(
            model_name="contract",
            name="status",
            field=models.CharField(
                choices=[("OPEN", "Açık"), ("DONE", "Tamamlandı")],
                default="OPEN",
                max_length=8,
                verbose_name="Durum",
            ),
        ),
        migrations.AddField(
            model_name="document",
            name="contract",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="documents",
                to="core.contract",
                verbose_name="Sözleşme",
            ),
        ),
        migrations.AddField(
            model_name="report",
            name="contract",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reports",
                to="core.contract",
                verbose_name="Sözleşme",
            ),
        ),
    ]


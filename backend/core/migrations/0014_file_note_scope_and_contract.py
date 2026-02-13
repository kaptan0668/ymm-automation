from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0013_card_notes"),
    ]

    operations = [
        migrations.AddField(
            model_name="file",
            name="note_scope",
            field=models.BooleanField(default=False, verbose_name="Not dosyası mı"),
        ),
        migrations.AddField(
            model_name="file",
            name="contract",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="files",
                to="core.contract",
                verbose_name="Sözleşme",
            ),
        ),
    ]

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0017_note_model"),
    ]

    operations = [
        migrations.AddField(
            model_name="note",
            name="mail_sent_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Mail gönderim zamanı"),
        ),
        migrations.AddField(
            model_name="note",
            name="subject",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Not konusu"),
        ),
        migrations.AddField(
            model_name="file",
            name="note",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="note_files",
                to="core.note",
                verbose_name="Not",
            ),
        ),
    ]

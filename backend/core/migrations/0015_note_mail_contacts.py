from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0014_file_note_scope_and_contract"),
    ]

    operations = [
        migrations.AddField(
            model_name="contract",
            name="note_contact_email",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Not ilgili e-posta"),
        ),
        migrations.AddField(
            model_name="contract",
            name="note_contact_name",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Not ilgili kişi"),
        ),
        migrations.AddField(
            model_name="document",
            name="note_contact_email",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Not ilgili e-posta"),
        ),
        migrations.AddField(
            model_name="document",
            name="note_contact_name",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Not ilgili kişi"),
        ),
        migrations.AddField(
            model_name="report",
            name="note_contact_email",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Not ilgili e-posta"),
        ),
        migrations.AddField(
            model_name="report",
            name="note_contact_name",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Not ilgili kişi"),
        ),
    ]

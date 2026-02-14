from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0018_note_subject_and_file_note_link"),
    ]

    operations = [
        migrations.AddField(
            model_name="appsetting",
            name="mail_brand_name",
            field=models.CharField(default="YMM Kadir Hafızoğlu", max_length=255, verbose_name="Mail marka adı"),
        ),
    ]

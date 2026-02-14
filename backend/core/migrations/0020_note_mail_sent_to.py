from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0019_appsetting_mail_brand_name"),
    ]

    operations = [
        migrations.AddField(
            model_name="note",
            name="mail_sent_to",
            field=models.JSONField(blank=True, default=list, verbose_name="Mail alıcıları"),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0015_note_mail_contacts"),
    ]

    operations = [
        migrations.AddField(
            model_name="appsetting",
            name="smtp_from_email",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Gönderen e-posta"),
        ),
        migrations.AddField(
            model_name="appsetting",
            name="smtp_host",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="SMTP host"),
        ),
        migrations.AddField(
            model_name="appsetting",
            name="smtp_password",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="SMTP parola"),
        ),
        migrations.AddField(
            model_name="appsetting",
            name="smtp_port",
            field=models.IntegerField(default=587, verbose_name="SMTP port"),
        ),
        migrations.AddField(
            model_name="appsetting",
            name="smtp_use_ssl",
            field=models.BooleanField(default=False, verbose_name="SMTP SSL"),
        ),
        migrations.AddField(
            model_name="appsetting",
            name="smtp_use_tls",
            field=models.BooleanField(default=True, verbose_name="SMTP TLS"),
        ),
        migrations.AddField(
            model_name="appsetting",
            name="smtp_user",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="SMTP kullanıcı"),
        ),
    ]

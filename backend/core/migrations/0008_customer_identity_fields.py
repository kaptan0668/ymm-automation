from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_status_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="contact_email",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Yetkili e-posta"),
        ),
        migrations.AddField(
            model_name="customer",
            name="contact_phone",
            field=models.CharField(blank=True, max_length=64, null=True, verbose_name="Yetkili telefon"),
        ),
        migrations.AddField(
            model_name="customer",
            name="identity_type",
            field=models.CharField(
                choices=[("VKN", "Vergi No"), ("TCKN", "TCKN")],
                default="VKN",
                max_length=8,
                verbose_name="Kimlik türü",
            ),
        ),
        migrations.AddField(
            model_name="customer",
            name="tckn",
            field=models.CharField(blank=True, max_length=11, null=True, unique=True, verbose_name="TCKN"),
        ),
        migrations.AlterField(
            model_name="customer",
            name="tax_no",
            field=models.CharField(blank=True, max_length=10, null=True, unique=True, verbose_name="Vergi numarası"),
        ),
    ]

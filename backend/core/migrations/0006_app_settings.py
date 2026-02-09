from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_contracts_and_customer_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="AppSetting",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("working_year", models.IntegerField(default=2026, verbose_name="Çalışma yılı")),
                ("reference_year", models.IntegerField(default=2026, verbose_name="Referans yılı")),
            ],
            options={
                "verbose_name": "Uygulama Ayarı",
                "verbose_name_plural": "Uygulama Ayarları",
            },
        ),
    ]

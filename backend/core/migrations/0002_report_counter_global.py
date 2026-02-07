from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ReportCounterGlobal",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("last_serial", models.IntegerField(default=0, verbose_name="Son seri")),
            ],
            options={
                "verbose_name": "Rapor Genel Kümülatif Sayacı",
                "verbose_name_plural": "Rapor Genel Kümülatif Sayaçları",
            },
        ),
        migrations.AlterField(
            model_name="document",
            name="doc_no",
            field=models.CharField(max_length=64, unique=True, verbose_name="Evrak numarası"),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0012_yearlock"),
    ]

    operations = [
        migrations.AddField(
            model_name="contract",
            name="card_note",
            field=models.TextField(blank=True, null=True, verbose_name="Kart notu"),
        ),
        migrations.AddField(
            model_name="customer",
            name="card_note",
            field=models.TextField(blank=True, null=True, verbose_name="Kart notu"),
        ),
        migrations.AddField(
            model_name="document",
            name="card_note",
            field=models.TextField(blank=True, null=True, verbose_name="Kart notu"),
        ),
        migrations.AddField(
            model_name="report",
            name="card_note",
            field=models.TextField(blank=True, null=True, verbose_name="Kart notu"),
        ),
    ]

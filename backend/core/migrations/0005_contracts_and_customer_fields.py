from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_delivery_and_period_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="tax_office",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Vergi dairesi"),
        ),
        migrations.AddField(
            model_name="customer",
            name="address",
            field=models.TextField(blank=True, null=True, verbose_name="Adres"),
        ),
        migrations.AddField(
            model_name="customer",
            name="phone",
            field=models.CharField(blank=True, max_length=64, null=True, verbose_name="Telefon"),
        ),
        migrations.AddField(
            model_name="customer",
            name="email",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="E-posta"),
        ),
        migrations.AddField(
            model_name="customer",
            name="contact_person",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Yetkili kiÅŸi"),
        ),
        migrations.CreateModel(
            name="Contract",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="OluÅŸturulma zamanÄ±")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="GÃ¼ncellenme zamanÄ±")),
                ("is_archived", models.BooleanField(default=False, verbose_name="ArÅŸivlendi mi")),
                ("contract_no", models.CharField(blank=True, max_length=64, null=True, verbose_name="SÃ¶zleÅŸme no")),
                ("contract_date", models.DateField(blank=True, null=True, verbose_name="SÃ¶zleÅŸme tarihi")),
                ("contract_type", models.CharField(blank=True, max_length=64, null=True, verbose_name="SÃ¶zleÅŸme tÃ¼rÃ¼")),
                ("period_start_month", models.IntegerField(blank=True, null=True, verbose_name="DÃ¶nem baÅŸlangÄ±Ã§ ay")),
                ("period_start_year", models.IntegerField(blank=True, null=True, verbose_name="DÃ¶nem baÅŸlangÄ±Ã§ yÄ±l")),
                ("period_end_month", models.IntegerField(blank=True, null=True, verbose_name="DÃ¶nem bitiÅŸ ay")),
                ("period_end_year", models.IntegerField(blank=True, null=True, verbose_name="DÃ¶nem bitiÅŸ yÄ±l")),
                ("filename", models.CharField(blank=True, max_length=255, null=True, verbose_name="Dosya adÄ±")),
                ("content_type", models.CharField(blank=True, max_length=128, null=True, verbose_name="Ä°Ã§erik tÃ¼rÃ¼")),
                ("size", models.IntegerField(blank=True, null=True, verbose_name="Boyut (byte)")),
                ("file_url", models.URLField(blank=True, null=True, verbose_name="Dosya URL")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="auth.user", verbose_name="OluÅŸturan kullanÄ±cÄ±")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="auth.user", verbose_name="GÃ¼ncelleyen kullanÄ±cÄ±")),
                ("customer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="core.customer", verbose_name="MÃ¼ÅŸteri")),
            ],
            options={
                "verbose_name": "SÃ¶zleÅŸme",
                "verbose_name_plural": "SÃ¶zleÅŸmeler",
            },
        ),
    ]


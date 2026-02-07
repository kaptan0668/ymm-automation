from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_file_customer"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="delivery_kargo_name",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Kargo adÄ±"),
        ),
        migrations.AddField(
            model_name="document",
            name="delivery_kargo_tracking",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Kargo takip no"),
        ),
        migrations.AddField(
            model_name="document",
            name="delivery_elden_name",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Elden teslim alan"),
        ),
        migrations.AddField(
            model_name="document",
            name="delivery_elden_date",
            field=models.DateField(blank=True, null=True, verbose_name="Elden teslim tarihi"),
        ),
        migrations.AddField(
            model_name="document",
            name="delivery_email",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="E-posta adresi"),
        ),
        migrations.AddField(
            model_name="document",
            name="delivery_ebys_id",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="EBYS ID"),
        ),
        migrations.AddField(
            model_name="document",
            name="delivery_ebys_date",
            field=models.DateField(blank=True, null=True, verbose_name="EBYS tarihi"),
        ),
        migrations.AddField(
            model_name="document",
            name="delivery_other_desc",
            field=models.TextField(blank=True, null=True, verbose_name="DiÄŸer teslim aÃ§Ä±klamasÄ±"),
        ),
        migrations.AddField(
            model_name="report",
            name="period_start_month",
            field=models.IntegerField(blank=True, null=True, verbose_name="DÃ¶nem baÅŸlangÄ±Ã§ ay"),
        ),
        migrations.AddField(
            model_name="report",
            name="period_start_year",
            field=models.IntegerField(blank=True, null=True, verbose_name="DÃ¶nem baÅŸlangÄ±Ã§ yÄ±l"),
        ),
        migrations.AddField(
            model_name="report",
            name="period_end_month",
            field=models.IntegerField(blank=True, null=True, verbose_name="DÃ¶nem bitiÅŸ ay"),
        ),
        migrations.AddField(
            model_name="report",
            name="period_end_year",
            field=models.IntegerField(blank=True, null=True, verbose_name="DÃ¶nem bitiÅŸ yÄ±l"),
        ),
        migrations.AddField(
            model_name="report",
            name="delivery_kargo_name",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Kargo adÄ±"),
        ),
        migrations.AddField(
            model_name="report",
            name="delivery_kargo_tracking",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Kargo takip no"),
        ),
        migrations.AddField(
            model_name="report",
            name="delivery_elden_name",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Elden teslim alan"),
        ),
        migrations.AddField(
            model_name="report",
            name="delivery_elden_date",
            field=models.DateField(blank=True, null=True, verbose_name="Elden teslim tarihi"),
        ),
        migrations.AddField(
            model_name="report",
            name="delivery_email",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="E-posta adresi"),
        ),
        migrations.AddField(
            model_name="report",
            name="delivery_ebys_id",
            field=models.CharField(blank=True, max_length=255, null=True, verbose_name="EBYS ID"),
        ),
        migrations.AddField(
            model_name="report",
            name="delivery_ebys_date",
            field=models.DateField(blank=True, null=True, verbose_name="EBYS tarihi"),
        ),
        migrations.AddField(
            model_name="report",
            name="delivery_other_desc",
            field=models.TextField(blank=True, null=True, verbose_name="DiÄŸer teslim aÃ§Ä±klamasÄ±"),
        ),
    ]


from django.db import migrations, models
import django.db.models.deletion
import core.models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_normalize_unique_together"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterModelOptions(
                    name="contract",
                    options={"verbose_name": "Sözleşme", "verbose_name_plural": "Sözleşmeler"},
                ),
                migrations.RemoveField(
                    model_name="report",
                    name="reference_no",
                ),
                migrations.RemoveField(
                    model_name="report",
                    name="sender",
                ),
                migrations.AlterField(
                    model_name="appsetting",
                    name="reference_year",
                    field=models.IntegerField(default=core.models.default_year, verbose_name="Referans yılı"),
                ),
                migrations.AlterField(
                    model_name="appsetting",
                    name="working_year",
                    field=models.IntegerField(default=core.models.default_year, verbose_name="Çalışma yılı"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="content_type",
                    field=models.CharField(blank=True, max_length=128, null=True, verbose_name="İçerik türü"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="contract_date",
                    field=models.DateField(blank=True, null=True, verbose_name="Sözleşme tarihi"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="contract_no",
                    field=models.CharField(blank=True, max_length=64, null=True, verbose_name="Sözleşme no"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="contract_type",
                    field=models.CharField(blank=True, max_length=64, null=True, verbose_name="Sözleşme türü"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="created_at",
                    field=models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="created_by",
                    field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="auth.user", verbose_name="Oluşturan kullanıcı"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="customer",
                    field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="core.customer", verbose_name="Müşteri"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="filename",
                    field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Dosya adı"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="is_archived",
                    field=models.BooleanField(default=False, verbose_name="Arşivlendi mi"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="period_end_month",
                    field=models.IntegerField(blank=True, null=True, verbose_name="Dönem bitiş ay"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="period_end_year",
                    field=models.IntegerField(blank=True, null=True, verbose_name="Dönem bitiş yıl"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="period_start_month",
                    field=models.IntegerField(blank=True, null=True, verbose_name="Dönem başlangıç ay"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="period_start_year",
                    field=models.IntegerField(blank=True, null=True, verbose_name="Dönem başlangıç yıl"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="updated_at",
                    field=models.DateTimeField(auto_now=True, verbose_name="Güncellenme zamanı"),
                ),
                migrations.AlterField(
                    model_name="contract",
                    name="updated_by",
                    field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="+", to="auth.user", verbose_name="Güncelleyen kullanıcı"),
                ),
                migrations.AlterField(
                    model_name="customer",
                    name="contact_person",
                    field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Yetkili kişi"),
                ),
                migrations.AlterField(
                    model_name="document",
                    name="delivery_kargo_name",
                    field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Kargo adı"),
                ),
                migrations.AlterField(
                    model_name="document",
                    name="delivery_other_desc",
                    field=models.TextField(blank=True, null=True, verbose_name="Diğer teslim açıklaması"),
                ),
                migrations.AlterField(
                    model_name="report",
                    name="delivery_kargo_name",
                    field=models.CharField(blank=True, max_length=255, null=True, verbose_name="Kargo adı"),
                ),
                migrations.AlterField(
                    model_name="report",
                    name="delivery_other_desc",
                    field=models.TextField(blank=True, null=True, verbose_name="Diğer teslim açıklaması"),
                ),
                migrations.AlterField(
                    model_name="report",
                    name="period_end_month",
                    field=models.IntegerField(blank=True, null=True, verbose_name="Dönem bitiş ay"),
                ),
                migrations.AlterField(
                    model_name="report",
                    name="period_end_year",
                    field=models.IntegerField(blank=True, null=True, verbose_name="Dönem bitiş yıl"),
                ),
                migrations.AlterField(
                    model_name="report",
                    name="period_start_month",
                    field=models.IntegerField(blank=True, null=True, verbose_name="Dönem başlangıç ay"),
                ),
                migrations.AlterField(
                    model_name="report",
                    name="period_start_year",
                    field=models.IntegerField(blank=True, null=True, verbose_name="Dönem başlangıç yıl"),
                ),
            ],
        ),
    ]

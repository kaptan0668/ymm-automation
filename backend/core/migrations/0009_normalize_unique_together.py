from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_customer_identity_fields"),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name="documentcounter",
            unique_together={("doc_type", "year")},
        ),
        migrations.AlterUniqueTogether(
            name="reportcountertypecum",
            unique_together={("report_type",)},
        ),
    ]

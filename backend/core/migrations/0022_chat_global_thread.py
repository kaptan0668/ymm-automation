from django.conf import settings
from django.db import migrations, models


def ensure_global_thread(apps, schema_editor):
    ChatThread = apps.get_model("core", "ChatThread")
    ChatParticipant = apps.get_model("core", "ChatParticipant")
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))

    thread, _ = ChatThread.objects.get_or_create(
        is_global=True,
        defaults={
            "name": "Genel Sohbet",
            "is_group": True,
        },
    )
    users = User.objects.filter(is_active=True).values_list("id", flat=True)
    existing = set(
        ChatParticipant.objects.filter(thread=thread).values_list("user_id", flat=True)
    )
    to_create = [
        ChatParticipant(thread=thread, user_id=user_id)
        for user_id in users
        if user_id not in existing
    ]
    if to_create:
        ChatParticipant.objects.bulk_create(to_create)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0021_chat_models"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatthread",
            name="is_global",
            field=models.BooleanField(default=False, verbose_name="Genel sohbet mi"),
        ),
        migrations.RunPython(ensure_global_thread, migrations.RunPython.noop),
    ]

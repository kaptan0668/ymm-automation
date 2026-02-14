from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0020_note_mail_sent_to"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ChatThread",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(blank=True, max_length=255, null=True, verbose_name="Konu")),
                ("is_group", models.BooleanField(default=False, verbose_name="Grup mu")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Güncellenme zamanı")),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Oluşturan kullanıcı",
                    ),
                ),
            ],
            options={
                "verbose_name": "Sohbet Konusu",
                "verbose_name_plural": "Sohbet Konuları",
                "ordering": ("-updated_at",),
            },
        ),
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField(blank=True, null=True, verbose_name="Mesaj")),
                ("is_deleted", models.BooleanField(default=False, verbose_name="Silindi mi")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")),
                (
                    "sender",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chat_messages",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Gönderen",
                    ),
                ),
                (
                    "thread",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="core.chatthread",
                        verbose_name="Sohbet",
                    ),
                ),
            ],
            options={
                "verbose_name": "Sohbet Mesajı",
                "verbose_name_plural": "Sohbet Mesajları",
                "ordering": ("created_at",),
            },
        ),
        migrations.CreateModel(
            name="ChatMessageFile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("filename", models.CharField(max_length=255, verbose_name="Dosya adı")),
                ("content_type", models.CharField(max_length=128, verbose_name="İçerik türü")),
                ("size", models.IntegerField(verbose_name="Boyut (byte)")),
                ("url", models.URLField(verbose_name="URL")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Oluşturulma zamanı")),
                (
                    "message",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="files",
                        to="core.chatmessage",
                        verbose_name="Mesaj",
                    ),
                ),
            ],
            options={
                "verbose_name": "Mesaj Dosyası",
                "verbose_name_plural": "Mesaj Dosyaları",
            },
        ),
        migrations.CreateModel(
            name="ChatParticipant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("joined_at", models.DateTimeField(auto_now_add=True, verbose_name="Katılma zamanı")),
                ("last_read_at", models.DateTimeField(blank=True, null=True, verbose_name="Son okuma zamanı")),
                (
                    "thread",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="participants",
                        to="core.chatthread",
                        verbose_name="Sohbet",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="chat_participations",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Kullanıcı",
                    ),
                ),
            ],
            options={
                "verbose_name": "Sohbet Katılımcısı",
                "verbose_name_plural": "Sohbet Katılımcıları",
                "unique_together": {("thread", "user")},
            },
        ),
    ]

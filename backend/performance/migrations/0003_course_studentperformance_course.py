from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("performance", "0002_studentperformance_prediction_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Course",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("code", models.CharField(max_length=30, unique=True)),
                ("semester", models.CharField(max_length=50)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "teacher",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="courses_taught",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "students",
                    models.ManyToManyField(blank=True, related_name="courses_enrolled", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={"ordering": ["semester", "name"]},
        ),
        migrations.AddField(
            model_name="studentperformance",
            name="course",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="performance_records",
                to="performance.course",
            ),
        ),
    ]

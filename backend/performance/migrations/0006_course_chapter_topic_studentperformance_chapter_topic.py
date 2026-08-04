from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("performance", "0005_remove_prediction_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="course",
            name="chapter",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="course",
            name="topic",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="studentperformance",
            name="chapter",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="studentperformance",
            name="topic",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
    ]

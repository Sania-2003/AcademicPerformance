from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("performance", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentperformance",
            name="assignment_marks",
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name="studentperformance",
            name="attendance",
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name="studentperformance",
            name="mid_marks",
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name="studentperformance",
            name="predicted_final_marks",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="studentperformance",
            name="predicted_gpa",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="studentperformance",
            name="quiz_marks",
            field=models.FloatField(default=0),
        ),
        migrations.AlterField(
            model_name="studentperformance",
            name="marks",
            field=models.FloatField(blank=True, null=True),
        ),
    ]

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("performance", "0004_attendancerecord"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="studentperformance",
            name="predicted_final_marks",
        ),
        migrations.RemoveField(
            model_name="studentperformance",
            name="predicted_gpa",
        ),
    ]

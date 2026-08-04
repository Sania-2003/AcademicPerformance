from django.db import migrations, models


def set_admin_role_for_superusers(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(is_superuser=True).update(role="admin", is_staff=True)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[("admin", "Admin"), ("teacher", "Teacher"), ("student", "Student")],
                default="student",
                max_length=20,
            ),
        ),
        migrations.RunPython(set_admin_role_for_superusers, migrations.RunPython.noop),
    ]

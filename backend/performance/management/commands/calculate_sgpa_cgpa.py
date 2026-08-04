from django.core.management.base import BaseCommand
from performance.views import _update_student_sgpa_cgpa
from users.models import User


class Command(BaseCommand):
    help = "Calculate and update SGPA and CGPA for all students."

    def handle(self, *args, **options):
        students = User.objects.filter(role=User.Roles.STUDENT)
        
        for student in students:
            _update_student_sgpa_cgpa(student)
            self.stdout.write(
                self.style.SUCCESS(f"✓ Calculated SGPA/CGPA for {student.username}")
            )

        self.stdout.write(self.style.SUCCESS(f"\nSGPA/CGPA calculated for {students.count()} students"))

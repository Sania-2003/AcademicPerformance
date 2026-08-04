from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from performance.models import StudentPerformance, Course
import random

User = get_user_model()

SUBJECTS = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English', 
    'History', 'Calculus', 'Statistics', 'Algorithms', 'Data Structures', 
    'Database Systems', 'Operating Systems', 'Software Engineering', 'Machine Learning', 'Economics'
]

SEMESTERS = ['Fall 2023', 'Spring 2024', 'Fall 2024']

def create_user(username, password):
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'role': 'student', 'is_staff': False}
    )
    if created:
        user.set_password(password)
        user.save()
    return user

class Command(BaseCommand):
    help = 'Add 25 demo students (student12 to student36) with realistic performance data'

    def handle(self, *args, **options):
        for i in range(12, 37):  # 12 to 36 inclusive = 25 students
            username = f'student{i}'
            user = create_user(username, 'student123')
            self.stdout.write(self.style.SUCCESS(f'Created/Updated user {username}'))

            # Add 8 performance records: mix of semesters, some poor performances
            for _ in range(8):
                subject = random.choice(SUBJECTS)
                semester = random.choice(SEMESTERS)
                credit_hours = random.choice([1, 3, 4])
                
                # Realistic marks: low chapter/topic for some
                quiz = round(random.uniform(8, 20), 1)
                assignment = round(random.uniform(10, 20), 1)
                mid = round(random.uniform(10, 20), 1)
                final = round(random.uniform(20, 40), 1)
                attendance = round(random.uniform(70, 98), 1)
                
                # Occasionally low component marks to test model
                if random.random() < 0.3:
                    quiz *= random.uniform(0.4, 0.6)
                    mid *= random.uniform(0.4, 0.6)
                
                marks = round(0.2*quiz + 0.2*assignment + 0.2*mid + 0.4*final, 1)
                
                # Grade points approx
                grade_points = 0
                if marks >= 85: grade_points = 4.0
                elif marks >= 80: grade_points = 3.66
                # ... simplify
                sgpa = round(grade_points + random.uniform(-0.2, 0.3), 2)  # approx
                cgpa = round(sgpa + random.uniform(-0.3, 0.3), 2)
                
                StudentPerformance.objects.create(
                    student=user,
                    subject=subject,
                    semester=semester,
                    quiz_marks=quiz,
                    assignment_marks=assignment,
                    mid_marks=mid,
                    attendance=attendance,
                    marks=marks,
                    sgpa=sgpa,
                    cgpa=cgpa,
                    credit_hours=credit_hours,
                )
            
            self.stdout.write(self.style.SUCCESS(f'Added demo data for {username}'))

        self.stdout.write(self.style.SUCCESS('Added 25 demo students with performance data successfully!'))


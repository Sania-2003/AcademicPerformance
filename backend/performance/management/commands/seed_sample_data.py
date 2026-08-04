from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from performance.models import StudentPerformance, Course, AttendanceRecord
from performance.prediction import _grade_points_from_marks
from statistics import mean
from datetime import date, timedelta
import random

User = get_user_model()


class Command(BaseCommand):
    help = "Seed the database with sample data: admin, teacher1, student1, courses, performances, and attendance."

    def handle(self, *args, **options):
        self._create_users()
        self._create_courses()
        self._create_performance_records()
        self._create_attendance_records()
        self._update_sgpa_cgpa()
        self.stdout.write(self.style.SUCCESS("Sample data seeded successfully!"))

    def _create_users(self):
        # Admin
        admin, created = User.objects.get_or_create(username="admin", defaults={
            "role": User.Roles.ADMIN,
            "is_staff": True,
            "is_superuser": True,
            "first_name": "Admin",
            "last_name": "User",
            "email": "admin@example.com",
        })
        if created:
            admin.set_password("adminadmin123")
            admin.save()
            self.stdout.write(self.style.SUCCESS("Created admin user (admin / adminadmin123)"))
        else:
            self.stdout.write("Admin user already exists")

        # Teacher
        teacher, created = User.objects.get_or_create(username="teacher1", defaults={
            "role": User.Roles.TEACHER,
            "is_staff": True,
            "first_name": "John",
            "last_name": "Doe",
            "email": "teacher1@example.com",
        })
        if created:
            teacher.set_password("teacher123")
            teacher.save()
            self.stdout.write(self.style.SUCCESS("Created teacher user (teacher1 / teacher123)"))
        else:
            self.stdout.write("Teacher user already exists")
            teacher.set_password("teacher123")
            teacher.save()

        # Student
        student, created = User.objects.get_or_create(username="student1", defaults={
            "role": User.Roles.STUDENT,
            "first_name": "Alice",
            "last_name": "Smith",
            "email": "student1@example.com",
        })
        if created:
            student.set_password("student123")
            student.save()
            self.stdout.write(self.style.SUCCESS("Created student user (student1 / student123)"))
        else:
            self.stdout.write("Student user already exists")
            student.set_password("student123")
            student.save()

        # Store for later use
        self.admin = User.objects.get(username="admin")
        self.teacher = User.objects.get(username="teacher1")
        self.student = User.objects.get(username="student1")

    def _create_courses(self):
        courses_data = [
            # Semester 1 courses
            {"name": "Mathematics I", "code": "MATH101", "semester": "1", "chapter": "Calculus", "topic": "Limits & Derivatives"},
            {"name": "Physics I", "code": "PHY101", "semester": "1", "chapter": "Mechanics", "topic": "Newton's Laws"},
            {"name": "Computer Programming", "code": "CS101", "semester": "1", "chapter": "Python Basics", "topic": "Variables & Loops"},
            {"name": "English Communication", "code": "ENG101", "semester": "1", "chapter": "Grammar", "topic": "Tenses"},
            # Semester 2 courses
            {"name": "Mathematics II", "code": "MATH201", "semester": "2", "chapter": "Linear Algebra", "topic": "Matrices"},
            {"name": "Physics II", "code": "PHY201", "semester": "2", "chapter": "Electromagnetism", "topic": "Ohm's Law"},
            {"name": "Data Structures", "code": "CS201", "semester": "2", "chapter": "Arrays & Lists", "topic": "Sorting Algorithms"},
            {"name": "Technical Writing", "code": "ENG201", "semester": "2", "chapter": "Report Writing", "topic": "Research Papers"},
        ]

        created_count = 0
        for course_data in courses_data:
            course, created = Course.objects.get_or_create(
                code=course_data["code"],
                defaults={
                    "name": course_data["name"],
                    "semester": course_data["semester"],
                    "chapter": course_data["chapter"],
                    "topic": course_data["topic"],
                    "teacher": self.teacher,
                }
            )
            if created:
                course.students.add(self.student)
                created_count += 1
                self.stdout.write(f"  Created course: {course.code} - {course.name}")
            else:
                # Ensure student is enrolled
                course.students.add(self.student)

        self.stdout.write(self.style.SUCCESS(f"Created {created_count} courses"))

    def _create_performance_records(self):
        courses = Course.objects.filter(students=self.student).order_by("semester", "code")
        
        # Performance patterns per semester (quiz, assignment, mid - each out of 20)
        patterns = {
            # Semester 1: Good performance
            1: {
                "MATH101": {"quiz": 16, "assignment": 17, "mid": 15, "final": 72, "attendance": 90},
                "PHY101": {"quiz": 15, "assignment": 16, "mid": 14, "final": 68, "attendance": 85},
                "CS101": {"quiz": 18, "assignment": 19, "mid": 17, "final": 78, "attendance": 95},
                "ENG101": {"quiz": 14, "assignment": 15, "mid": 13, "final": 65, "attendance": 80},
            },
            # Semester 2: Improved performance
            2: {
                "MATH201": {"quiz": 17, "assignment": 18, "mid": 16, "final": 75, "attendance": 92},
                "PHY201": {"quiz": 16, "assignment": 17, "mid": 15, "final": 70, "attendance": 88},
                "CS201": {"quiz": 19, "assignment": 20, "mid": 18, "final": 82, "attendance": 96},
                "ENG201": {"quiz": 15, "assignment": 16, "mid": 14, "final": 67, "attendance": 82},
            },
        }

        for course in courses:
            sem = int(course.semester)
            sem_patterns = patterns.get(sem, {})
            pattern = sem_patterns.get(course.code, {"quiz": 14, "assignment": 15, "mid": 14, "final": 65, "attendance": 85})

            # Add some randomness
            quiz = pattern["quiz"] + random.uniform(-1, 1)
            assignment = pattern["assignment"] + random.uniform(-1, 1)
            mid = pattern["mid"] + random.uniform(-1, 1)
            final = pattern["final"] + random.uniform(-2, 2)
            attendance = pattern["attendance"] + random.uniform(-2, 2)

            # Clamp values
            quiz = max(0, min(20, round(quiz, 1)))
            assignment = max(0, min(20, round(assignment, 1)))
            mid = max(0, min(20, round(mid, 1)))
            final = max(0, min(100, round(final, 1)))
            attendance = max(60, min(100, round(attendance, 1)))

            # Calculate total marks (score out of 60 for quiz+assignment+mid, plus final)
            total_obtained = quiz + assignment + mid  # out of 60
            marks_weighted = round((total_obtained / 60.0) * 0.6 * 100 + final * 0.4, 1)

            StudentPerformance.objects.update_or_create(
                student=self.student,
                course=course,
                chapter="",
                topic="",
                defaults={
                    "subject": course.name,
                    "semester": str(sem),
                    "quiz_marks": quiz,
                    "assignment_marks": assignment,
                    "mid_marks": mid,
                    "marks": marks_weighted,
                    "attendance": attendance,
                    "credit_hours": 3,
                }
            )

            # Also create chapter/topic records
            if course.chapter and course.topic:
                # Chapter marks out of 10
                chapter_marks = round(final / 10, 1)  # scale down
                StudentPerformance.objects.update_or_create(
                    student=self.student,
                    course=course,
                    chapter=course.chapter,
                    topic=course.topic,
                    defaults={
                        "subject": course.name,
                        "semester": str(sem),
                        "marks": chapter_marks,
                        "attendance": attendance,
                        "credit_hours": 3,
                    }
                )

            self.stdout.write(f"  Added performance for {course.code}: quiz={quiz}, assign={assignment}, mid={mid}, final={marks_weighted}")

    def _create_attendance_records(self):
        courses = Course.objects.filter(students=self.student)
        
        for course in courses:
            # Create 20 attendance records per course (some present, some absent)
            start_date = date(2024, 1, 15)
            for i in range(20):
                record_date = start_date + timedelta(days=i * 7)  # weekly classes
                if record_date > date.today():
                    continue
                
                # 85% attendance rate
                is_present = random.random() < 0.85
                
                AttendanceRecord.objects.update_or_create(
                    student=self.student,
                    course=course,
                    date=record_date,
                    defaults={
                        "is_present": is_present,
                        "marked_by": self.teacher,
                    }
                )

            self.stdout.write(f"  Added attendance records for {course.code}")

    def _update_sgpa_cgpa(self):
        """Calculate and update SGPA and CGPA for the student."""
        performances = StudentPerformance.objects.filter(
            student=self.student,
            chapter="",
            topic=""
        ).order_by("semester")
        
        semesters_data = {}
        for record in performances:
            sem = record.semester
            if sem not in semesters_data:
                semesters_data[sem] = {"total_marks": [], "records": []}
            
            if record.marks is not None:
                semesters_data[sem]["total_marks"].append(float(record.marks))
            semesters_data[sem]["records"].append(record)
        
        sgpa_values = []
        for sem in sorted(semesters_data.keys(), key=lambda x: int(x)):
            sem_data = semesters_data[sem]
            marks = sem_data["total_marks"]
            
            if marks:
                grade_points = [_grade_points_from_marks(m) for m in marks]
                sgpa = mean(grade_points)
                sgpa_values.append(sgpa)
                
                cgpa = mean(sgpa_values)
                
                # Update all records for this semester
                for record in sem_data["records"]:
                    record.sgpa = round(sgpa, 4)
                    record.cgpa = round(cgpa, 4)
                    record.save()
                
                self.stdout.write(f"  Semester {sem}: SGPA={round(sgpa, 2)}, CGPA={round(cgpa, 2)}")


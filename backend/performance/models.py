from django.conf import settings
from django.db import models


class Course(models.Model):
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=30, unique=True)
    semester = models.CharField(max_length=50)
    chapter = models.CharField(max_length=120, blank=True, default="")
    topic = models.CharField(max_length=120, blank=True, default="")
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="courses_taught",
    )
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="courses_enrolled",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["semester", "name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class StudentPerformance(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="performances"
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        related_name="performance_records",
        blank=True,
        null=True,
    )
    subject = models.CharField(max_length=120)
    semester = models.CharField(max_length=50)
    chapter = models.CharField(max_length=120, blank=True, default="")
    topic = models.CharField(max_length=120, blank=True, default="")
    quiz_marks = models.FloatField(default=0)
    assignment_marks = models.FloatField(default=0)
    mid_marks = models.FloatField(default=0)
    attendance = models.FloatField(default=0)
    marks = models.FloatField(blank=True, null=True)
    sgpa = models.FloatField(default=0, null=True, blank=True)  # Semester GPA
    cgpa = models.FloatField(default=0, null=True, blank=True)  # Cumulative GPA
    credit_hours = models.IntegerField(default=3, null=True, blank=True)  # Credit hours for the course
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.student.username} - {self.subject} ({self.semester}): {self.marks}"


class AttendanceRecord(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField()
    is_present = models.BooleanField(default=True)
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="marked_attendance_records",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        unique_together = ("student", "course", "date")

    def __str__(self):
        status = "Present" if self.is_present else "Absent"
        return f"{self.student.username} - {self.course.code} - {self.date}: {status}"

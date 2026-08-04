from collections import defaultdict
from django.contrib.auth.decorators import login_required
from django.db.models import Avg, Count
from django.http import HttpResponse
from rest_framework import generics, permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView
from statistics import mean

from performance import prediction
from performance.prediction import _grade_points_from_marks
from performance.models import AttendanceRecord, Course, StudentPerformance
from performance.serializers import (
    AttendanceRecordSerializer,
    AdminUserSerializer,
    CourseSerializer,
    PerformanceManagementSerializer,
    StudentPerformanceSerializer,
)


def _get_subject_total(record):
    if record.marks is not None:
        return float(record.marks)

    quiz_marks = getattr(record, "quiz_marks", None)
    assignment_marks = getattr(record, "assignment_marks", None)
    mid_marks = getattr(record, "mid_marks", None)

    if quiz_marks is None or assignment_marks is None or mid_marks is None:
        return None

    total_score = quiz_marks + assignment_marks + mid_marks
    return round((total_score / 60.0) * 100.0, 2)


def _build_semester_gpa_summary(student):
    subject_records = StudentPerformance.objects.filter(student=student, chapter="", topic="")
    semester_scores = defaultdict(list)

    for record in subject_records:
        total = _get_subject_total(record)
        if total is not None:
            semester_scores[record.semester].append(total)

    semester_stats = []
    cumulative_sgpas = []

    for semester in sorted(semester_scores):
        scores = semester_scores[semester]
        if not scores:
            continue

        sgpa = mean([_grade_points_from_marks(score) for score in scores])
        cumulative_sgpas.append(sgpa)
        cgpa = mean(cumulative_sgpas)

        semester_stats.append(
            {
                "semester": semester,
                "sgpa": round(sgpa, 4),
                "cgpa": round(cgpa, 4),
            }
        )

    return semester_stats

from .permissions import IsAdmin, IsStudent, IsTeacher
from .models import User
from .serializers import LoginSerializer, UserProfileSerializer


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": UserProfileSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    def post(self, request):
        # Delete token for simple token-based logout.
        token = Token.objects.filter(user=request.user).first()
        if token:
            token.delete()
        return Response({"detail": "Logged out successfully."}, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user


class AdminDashboardView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        performances = StudentPerformance.objects.select_related("student", "course").filter(course__isnull=False)
        summary = performances.aggregate(
            total_records=Count("id"),
            average_attendance=Avg("attendance"),
            average_quiz_marks=Avg("quiz_marks"),
            average_assignment_marks=Avg("assignment_marks"),
            average_mid_marks=Avg("mid_marks"),
            average_final_marks=Avg("marks"),
        )
        summary["total_students"] = User.objects.filter(role=User.Roles.STUDENT).count()
        summary["total_teachers"] = User.objects.filter(role=User.Roles.TEACHER).count()
        summary["total_admins"] = User.objects.filter(role=User.Roles.ADMIN).count()
        summary["total_courses"] = Course.objects.count()

        semester_breakdown = list(
            performances.values("semester")
            .annotate(
                records=Count("id"),
                students=Count("student", distinct=True),
                average_attendance=Avg("attendance"),
                average_quiz_marks=Avg("quiz_marks"),
                average_assignment_marks=Avg("assignment_marks"),
                average_mid_marks=Avg("mid_marks"),
                average_final_marks=Avg("marks"),
            )
            .order_by("semester")
        )

        subject_breakdown = list(
            performances.values("subject")
            .annotate(
                records=Count("id"),
                students=Count("student", distinct=True),
                average_attendance=Avg("attendance"),
                average_quiz_marks=Avg("quiz_marks"),
                average_assignment_marks=Avg("assignment_marks"),
                average_mid_marks=Avg("mid_marks"),
                average_final_marks=Avg("marks"),
            )
            .order_by("subject")
        )

        topic_breakdown = list(
            performances.values("subject", "chapter", "topic")
            .annotate(
                records=Count("id"),
                students=Count("student", distinct=True),
                average_attendance=Avg("attendance"),
                average_quiz_marks=Avg("quiz_marks"),
                average_assignment_marks=Avg("assignment_marks"),
                average_mid_marks=Avg("mid_marks"),
                average_final_marks=Avg("marks"),
            )
            .order_by("subject", "chapter", "topic")
        )

        recent_records = StudentPerformanceSerializer(performances[:50], many=True).data

        return Response(
            {
                "message": f"Welcome to admin dashboard, {request.user.username}.",
                "summary": summary,
                "semester_breakdown": semester_breakdown,
                "subject_breakdown": subject_breakdown,
                "topic_breakdown": topic_breakdown,
                "topic_note": "" if topic_breakdown else "Topic-wise analytics are not available yet in this ERP module.",
                "recent_records": recent_records,
                "users": AdminUserSerializer(
                    User.objects.order_by("username"),
                    many=True,
                ).data,
                "courses": CourseSerializer(Course.objects.prefetch_related("students").select_related("teacher"), many=True).data,
                "performance_records": PerformanceManagementSerializer(
                    StudentPerformance.objects.select_related("student", "course").filter(course__isnull=False)[:100],
                    many=True,
                ).data,
                "attendance_records": AttendanceRecordSerializer(
                    AttendanceRecord.objects.select_related("student", "course", "marked_by")[:200],
                    many=True,
                ).data,
            }
        )


class AdminUserListCreateView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        users = User.objects.order_by("username")
        return Response(AdminUserSerializer(users, many=True).data)

    def post(self, request):
        serializer = AdminUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserDetailView(APIView):
    permission_classes = [IsAdmin]

    def get_object(self, pk):
        return get_object_or_404(User, pk=pk)

    def patch(self, request, pk):
        user = self.get_object(pk)
        serializer = AdminUserSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(AdminUserSerializer(updated).data)

    def delete(self, request, pk):
        user = self.get_object(pk)
        if user.pk == request.user.pk:
            return Response({"detail": "You cannot delete your own account."}, status=status.HTTP_400_BAD_REQUEST)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCourseListCreateView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        courses = Course.objects.prefetch_related("students").select_related("teacher").all()
        return Response(CourseSerializer(courses, many=True).data)

    def post(self, request):
        serializer = CourseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        course = serializer.save()
        return Response(CourseSerializer(course).data, status=status.HTTP_201_CREATED)


class AdminCourseDetailView(APIView):
    permission_classes = [IsAdmin]

    def get_object(self, pk):
        return get_object_or_404(Course.objects.prefetch_related("students").select_related("teacher"), pk=pk)

    def patch(self, request, pk):
        course = self.get_object(pk)
        serializer = CourseSerializer(course, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        StudentPerformance.objects.filter(course=updated).update(
            subject=updated.name,
            semester=updated.semester,
            chapter=updated.chapter,
            topic=updated.topic,
        )
        return Response(CourseSerializer(updated).data)

    def delete(self, request, pk):
        course = self.get_object(pk)
        course.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeacherDashboardView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request):
        courses = Course.objects.filter(teacher=request.user).prefetch_related("students")
        records = StudentPerformance.objects.filter(course__teacher=request.user).select_related("student", "course")
        return Response(
            {
                "message": f"Welcome to teacher dashboard, {request.user.username}.",
                "assigned_courses": CourseSerializer(courses, many=True).data,
                "performance_records": PerformanceManagementSerializer(records, many=True).data,
                "attendance_records": AttendanceRecordSerializer(
                    AttendanceRecord.objects.filter(course__teacher=request.user).select_related("student", "course", "marked_by")[:100],
                    many=True,
                ).data,
                "summary": {
                    "total_courses": courses.count(),
                    "total_students": courses.filter(students__isnull=False).values("students").distinct().count(),
                    "total_records": records.count(),
                },
            }
        )


class StudentDashboardView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        courses = Course.objects.filter(students=request.user).select_related("teacher").prefetch_related("students")
        performances = StudentPerformance.objects.filter(student=request.user, course__isnull=False).select_related("course")
        attendance_records = AttendanceRecord.objects.filter(student=request.user).select_related("course", "marked_by")
        semester_stats = _build_semester_gpa_summary(request.user)
        current_sgpa = semester_stats[-1]["sgpa"] if semester_stats else None
        current_cgpa = semester_stats[-1]["cgpa"] if semester_stats else None
        return Response(
            {
                "message": f"Welcome to student dashboard, {request.user.username}.",
                "enrolled_courses": CourseSerializer(courses, many=True).data,
                "performance_records": StudentPerformanceSerializer(performances, many=True).data,
                "attendance_records": AttendanceRecordSerializer(attendance_records, many=True).data,
                "semester_stats": semester_stats,
                "current_sgpa": current_sgpa,
                "cgpa": current_cgpa,
            }
        )


@login_required
def teacher_dashboard_page(request):
    if request.user.role != "teacher":
        return HttpResponse("Forbidden", status=403)
    return HttpResponse("Teacher Dashboard Page")


@login_required
def student_dashboard_page(request):
    if request.user.role != "student":
        return HttpResponse("Forbidden", status=403)
    return HttpResponse("Student Dashboard Page")

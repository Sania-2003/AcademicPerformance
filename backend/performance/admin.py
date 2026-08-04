from django.contrib import admin

from .models import AttendanceRecord, Course, StudentPerformance


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "semester", "chapter", "topic", "teacher", "created_at")
    list_filter = ("semester",)
    search_fields = ("code", "name", "chapter", "topic", "teacher__username")


@admin.register(StudentPerformance)
class StudentPerformanceAdmin(admin.ModelAdmin):
    list_display = ("student", "course", "subject", "semester", "chapter", "topic", "marks", "created_at")
    list_filter = ("semester", "subject", "chapter", "topic", "course")
    search_fields = ("student__username", "subject", "semester", "chapter", "topic", "course__name", "course__code")


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ("student", "course", "date", "is_present", "marked_by")
    list_filter = ("course", "date", "is_present")
    search_fields = ("student__username", "course__name", "course__code")

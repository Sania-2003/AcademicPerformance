from django.urls import path

from .views import (
    AdminAttendanceUpsertView,
    AdminChapterTopicMarksView,
    AdminPerformanceDetailView,
    AdminPerformanceListCreateView,
    AdminPerformanceUpsertView,
    StudentPerformancePredictionView,
    TeacherAttendanceUpsertView,
    TeacherChapterTopicMarksView,
    TeacherPerformanceUpsertView,
)

urlpatterns = [
    path("admin/performance-records/", AdminPerformanceListCreateView.as_view(), name="api-admin-performance-list"),
    path("admin/performance-records/<int:pk>/", AdminPerformanceDetailView.as_view(), name="api-admin-performance-detail"),
    path("admin/performance-records/upsert/", AdminPerformanceUpsertView.as_view(), name="api-admin-performance-upsert"),
    path("admin/chapter-topic-marks/", AdminChapterTopicMarksView.as_view(), name="api-admin-chapter-topic-marks"),
    path("admin/attendance-records/upsert/", AdminAttendanceUpsertView.as_view(), name="api-admin-attendance-upsert"),
    path("admin/chapter-topic-marks/<int:pk>/", AdminChapterTopicMarksView.as_view(), name="api-admin-chapter-topic-marks-detail"),
    path("teacher/performance-records/", TeacherPerformanceUpsertView.as_view(), name="api-teacher-performance-upsert"),
    path("teacher/chapter-topic-marks/", TeacherChapterTopicMarksView.as_view(), name="api-teacher-chapter-topic-marks"),
    path("teacher/chapter-topic-marks/<int:pk>/", TeacherChapterTopicMarksView.as_view(), name="api-teacher-chapter-topic-marks-detail"),
    path("teacher/attendance-records/", TeacherAttendanceUpsertView.as_view(), name="api-teacher-attendance-upsert"),
    path("performance/prediction/semester/", StudentPerformancePredictionView.as_view(), name="api-performance-prediction"),
]

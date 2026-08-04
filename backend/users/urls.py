from django.urls import path

from .views import (
    AdminCourseDetailView,
    AdminCourseListCreateView,
    AdminDashboardView,
    AdminUserDetailView,
    AdminUserListCreateView,
    LoginView,
    LogoutView,
    ProfileView,
    StudentDashboardView,
    TeacherDashboardView,
    student_dashboard_page,
    teacher_dashboard_page,
)

urlpatterns = [
    path("login/", LoginView.as_view(), name="api-login"),
    path("logout/", LogoutView.as_view(), name="api-logout"),
    path("profile/", ProfileView.as_view(), name="api-profile"),
    path("dashboard/admin/", AdminDashboardView.as_view(), name="api-admin-dashboard"),
    path("admin/users/", AdminUserListCreateView.as_view(), name="api-admin-users"),
    path("admin/users/<int:pk>/", AdminUserDetailView.as_view(), name="api-admin-user-detail"),
    path("admin/courses/", AdminCourseListCreateView.as_view(), name="api-admin-courses"),
    path("admin/courses/<int:pk>/", AdminCourseDetailView.as_view(), name="api-admin-course-detail"),
    path("dashboard/teacher/", TeacherDashboardView.as_view(), name="api-teacher-dashboard"),
    path("dashboard/student/", StudentDashboardView.as_view(), name="api-student-dashboard"),
    path("teacher-dashboard/", teacher_dashboard_page, name="teacher-dashboard-page"),
    path("student-dashboard/", student_dashboard_page, name="student-dashboard-page"),
]

from rest_framework import serializers

from users.models import User

from .models import AttendanceRecord, Course, StudentPerformance


class StudentPerformanceSerializer(serializers.ModelSerializer):
    student = serializers.CharField(source="student.username", read_only=True)
    course = serializers.SerializerMethodField()

    class Meta:
        model = StudentPerformance
        fields = (
            "id",
            "student",
            "course",
            "subject",
            "semester",
            "chapter",
            "topic",
            "quiz_marks",
            "assignment_marks",
            "mid_marks",
            "attendance",
            "marks",
            "sgpa",
            "cgpa",
            "credit_hours",
            "created_at",
        )
        read_only_fields = ("id", "student", "marks", "sgpa", "cgpa", "created_at")

    def get_course(self, obj):
        if not obj.course_id:
            return None
        return {
            "id": obj.course_id,
            "name": obj.course.name,
            "code": obj.course.code,
        }

    def validate_semester(self, value):
        try:
            semester = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Semester must be a whole number.")

        if semester < 1:
            raise serializers.ValidationError("Semester must be at least 1.")
        return str(semester)

    def validate_quiz_marks(self, value):
        if not 0 <= value <= 20:
            raise serializers.ValidationError("Quiz marks must be between 0 and 20.")
        return value

    def validate_assignment_marks(self, value):
        if not 0 <= value <= 20:
            raise serializers.ValidationError("Assignment marks must be between 0 and 20.")
        return value

    def validate_mid_marks(self, value):
        if not 0 <= value <= 20:
            raise serializers.ValidationError("Mid marks must be between 0 and 20.")
        return value

    def validate_attendance(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("Attendance must be between 0 and 100.")
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "role",
            "is_active",
            "is_staff",
            "is_superuser",
        )
        read_only_fields = ("id", "is_staff", "is_superuser")

    def validate_role(self, value):
        if value not in {User.Roles.ADMIN, User.Roles.TEACHER, User.Roles.STUDENT}:
            raise serializers.ValidationError("Role must be admin, teacher, or student.")
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Password is required when creating a user."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        role = validated_data.get("role", User.Roles.STUDENT)
        validated_data["is_staff"] = role in {User.Roles.ADMIN, User.Roles.TEACHER}
        validated_data["is_superuser"] = role == User.Roles.ADMIN
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        role = validated_data.get("role", instance.role)
        validated_data["is_staff"] = role in {User.Roles.ADMIN, User.Roles.TEACHER}
        validated_data["is_superuser"] = role == User.Roles.ADMIN
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class CourseSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.username", read_only=True)
    student_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Roles.STUDENT),
        source="students",
        many=True,
        required=False,
    )
    student_names = serializers.SerializerMethodField()
    student_details = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            "id",
            "name",
            "code",
            "semester",
            "teacher",
            "teacher_name",
            "student_ids",
            "student_names",
            "student_details",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "teacher_name", "student_names", "student_details")

    def validate_teacher(self, value):
        if value.role != User.Roles.TEACHER:
            raise serializers.ValidationError("Assigned teacher must have the teacher role.")
        return value

    def get_student_names(self, obj):
        return list(obj.students.values_list("username", flat=True))

    def get_student_details(self, obj):
        return list(obj.students.values("id", "username", "first_name", "last_name"))


class PerformanceManagementSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.username", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model = StudentPerformance
        fields = (
            "id",
            "student",
            "student_name",
            "course",
            "course_name",
            "subject",
            "semester",
            "chapter",
            "topic",
            "quiz_marks",
            "assignment_marks",
            "mid_marks",
            "attendance",
            "marks",
            "sgpa",
            "cgpa",
            "credit_hours",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "student_name", "course_name", "sgpa", "cgpa")
        extra_kwargs = {
            "subject": {"required": False},
            "semester": {"required": False},
            "chapter": {"required": False},
            "topic": {"required": False},
            "attendance": {"required": False},
        }

    def validate_student(self, value):
        if value.role != User.Roles.STUDENT:
            raise serializers.ValidationError("Performance records can only be created for student accounts.")
        return value

    def validate(self, attrs):
        course = attrs.get("course") or getattr(self.instance, "course", None)
        student = attrs.get("student") or getattr(self.instance, "student", None)

        if course:
            attrs["subject"] = course.name
            attrs["semester"] = course.semester
            # For overall performance records, chapter and topic are always empty
            attrs["chapter"] = ""
            attrs["topic"] = ""
            if student and not course.students.filter(pk=student.pk).exists():
                raise serializers.ValidationError({"student": "Selected student is not assigned to this course."})

        # Validate that quiz_marks, assignment_marks, mid_marks are only for overall subject records
        chapter = attrs.get("chapter", getattr(self.instance, "chapter", ""))
        topic = attrs.get("topic", getattr(self.instance, "topic", ""))

        is_overall_record = not chapter and not topic

        if not is_overall_record:
            # For chapter/topic records, quiz_marks etc. should not be provided
            if any(attrs.get(field) is not None for field in ["quiz_marks", "assignment_marks", "mid_marks"]):
                raise serializers.ValidationError(
                    "Quiz, assignment, and mid marks can only be entered for overall subject records (not for specific chapters/topics)."
                )
        else:
            # For overall records, quiz_marks etc. are required
            required_fields = ["quiz_marks", "assignment_marks", "mid_marks"]
            for field in required_fields:
                if attrs.get(field) is None and (self.instance is None or getattr(self.instance, field, None) is None):
                    raise serializers.ValidationError({field: f"{field} is required for overall subject records."})

        return attrs


class PredictionRequestSerializer(serializers.Serializer):
    student_id = serializers.IntegerField(required=False, allow_null=True)
    semester = serializers.IntegerField(min_value=1)

    def validate_student_id(self, value):
        if value is None:
            return value
        if value < 1:
            raise serializers.ValidationError("student_id must be a positive integer.")
        return value


class ChapterTopicMarksSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.username", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)

    class Meta:
        model = StudentPerformance
        fields = (
            "id",
            "student",
            "student_name",
            "course",
            "course_name",
            "subject",
            "semester",
            "chapter",
            "topic",
            "marks",
            "sgpa",
            "cgpa",
            "credit_hours",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "student_name", "course_name", "sgpa", "cgpa")
        extra_kwargs = {
            "subject": {"required": False},
            "semester": {"required": False},
        }

    def validate_student(self, value):
        if value and value.role != User.Roles.STUDENT:
            raise serializers.ValidationError("Chapter/topic marks can only be entered for student accounts.")
        return value

    def validate(self, attrs):
        course = attrs.get("course") or getattr(self.instance, "course", None)
        student = attrs.get("student") or getattr(self.instance, "student", None)

        if course:
            attrs["subject"] = course.name
            attrs["semester"] = course.semester
            if student and not course.students.filter(pk=student.pk).exists():
                raise serializers.ValidationError({"student": "Selected student is not assigned to this course."})

        # For chapter/topic records, chapter and topic are required and cannot be empty
        chapter = attrs.get("chapter", getattr(self.instance, "chapter", ""))
        topic = attrs.get("topic", getattr(self.instance, "topic", ""))

        if not chapter and not topic:
            raise serializers.ValidationError("Either chapter or topic must be provided for chapter/topic marks.")

        return attrs


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.username", read_only=True)
    course_name = serializers.CharField(source="course.name", read_only=True)
    marked_by_name = serializers.CharField(source="marked_by.username", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = (
            "id",
            "student",
            "student_name",
            "course",
            "course_name",
            "date",
            "is_present",
            "marked_by",
            "marked_by_name",
            "created_at",
        )
        read_only_fields = ("id", "marked_by", "marked_by_name", "created_at", "student_name", "course_name")

    def validate(self, attrs):
        course = attrs.get("course") or getattr(self.instance, "course", None)
        student = attrs.get("student") or getattr(self.instance, "student", None)
        if course and student and not course.students.filter(pk=student.pk).exists():
            raise serializers.ValidationError({"student": "Selected student is not assigned to this course."})
        return attrs

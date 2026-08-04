from statistics import mean

from rest_framework import status
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from users.permissions import IsAdmin, IsTeacher
from users.models import User
from . import prediction
from .prediction import _grade_points_from_marks
from .models import AttendanceRecord, StudentPerformance
from .serializers import (
    AttendanceRecordSerializer,
    ChapterTopicMarksSerializer,
    PerformanceManagementSerializer,
    PredictionRequestSerializer,
)


def _recalculate_attendance_percentage(student, course):
    total_days = AttendanceRecord.objects.filter(student=student, course=course).count()
    present_days = AttendanceRecord.objects.filter(student=student, course=course, is_present=True).count()
    if total_days == 0:
        return 0.0
    return round((present_days / total_days) * 100, 2)


def _calculate_sgpa_and_cgpa(student):
    """
    Calculate SGPA (Semester GPA) and CGPA (Cumulative GPA) for a student.
    
    Each semester has 16 credit hours total:
    - Practical courses: 1 credit hour each
    - Theoretical courses: 3 credit hours each
    
    SGPA = Sum of (Grade Point × Credit Hours) / Total Credit Hours per semester
    CGPA = Average of all SGPAs across semesters
    """
    semesters_data = {}
    
    # Get all performance records for the student, grouped by semester
    all_records = StudentPerformance.objects.filter(
        student=student, 
        chapter="",  # Only overall subject records
        topic=""
    ).select_related('course')
    
    for record in all_records:
        semester = record.semester
        if semester not in semesters_data:
            semesters_data[semester] = {
                'subjects': [],
                'total_credit_hours': 0,
                'sgpa': 0.0
            }
        
        # Calculate total marks for the subject
        if record.marks is not None:
            total_marks = float(record.marks)
        else:
            total_marks = 0.0
        
        # Determine credit hours (1 for practical, 3 for theoretical)
        credit_hours = record.credit_hours if record.credit_hours else 3
        if record.subject and ("practical" in record.subject.lower() or "lab" in record.subject.lower()):
            credit_hours = 1
        
        # Calculate grade points
        grade_points = _grade_points_from_marks(total_marks)
        
        semesters_data[semester]['subjects'].append({
            'grade_points': grade_points,
            'credit_hours': credit_hours,
            'total_marks': total_marks
        })
    
    # Calculate SGPA for each semester
    sgpa_values = []
    for semester in sorted(semesters_data.keys()):
        subjects = semesters_data[semester]['subjects']
        if subjects:
            total_credit_hours = sum(s['credit_hours'] for s in subjects)
            weighted_grade_points = sum(s['grade_points'] * s['credit_hours'] for s in subjects)
            sgpa = weighted_grade_points / total_credit_hours if total_credit_hours > 0 else 0.0
            sgpa_values.append(sgpa)
            semesters_data[semester]['sgpa'] = sgpa
            semesters_data[semester]['total_credit_hours'] = total_credit_hours
    
    # Calculate CGPA as average of all SGPAs
    cgpa = mean(sgpa_values) if sgpa_values else 0.0
    
    return semesters_data, sgpa_values, cgpa


def _update_student_sgpa_cgpa(student, semester=None):
    """
    Update SGPA and CGPA for all performance records of a student.
    If semester is provided, update only for that semester.
    """
    semesters_data, sgpa_values, cgpa = _calculate_sgpa_and_cgpa(student)
    
    # Update all records with calculated SGPA and CGPA
    if semester:
        # Update only for specific semester
        semester_str = str(semester)
        records = StudentPerformance.objects.filter(
            student=student,
            semester=semester_str,
            chapter="",
            topic=""
        )
        if semester_str in semesters_data:
            sgpa = semesters_data[semester_str]['sgpa']
            for record in records:
                record.sgpa = sgpa
                record.cgpa = cgpa
                record.save()
    else:
        # Update all semesters
        for semester_key in semesters_data:
            semester_sgpa = semesters_data[semester_key]['sgpa']
            records = StudentPerformance.objects.filter(
                student=student,
                semester=semester_key,
                chapter="",
                topic=""
            )
            for record in records:
                record.sgpa = semester_sgpa
                record.cgpa = cgpa
                record.save()


class AdminPerformanceListCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        records = StudentPerformance.objects.select_related("student", "course").filter(course__isnull=False)
        return Response(PerformanceManagementSerializer(records, many=True).data)

    def post(self, request):
        serializer = PerformanceManagementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        performance = serializer.save()
        return Response(PerformanceManagementSerializer(performance).data, status=status.HTTP_201_CREATED)


class AdminPerformanceDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_object(self, pk):
        return get_object_or_404(StudentPerformance.objects.select_related("student", "course"), pk=pk)

    def patch(self, request, pk):
        performance = self.get_object(pk)
        serializer = PerformanceManagementSerializer(performance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save()
        return Response(PerformanceManagementSerializer(updated).data)

    def delete(self, request, pk):
        performance = self.get_object(pk)
        performance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminPerformanceUpsertView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = PerformanceManagementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = serializer.validated_data["course"]
        student = serializer.validated_data["student"]
        defaults = {
            "subject": course.name,
            "semester": course.semester,
            "chapter": "",  # Overall records have empty chapter/topic
            "topic": "",
            "quiz_marks": serializer.validated_data["quiz_marks"],
            "assignment_marks": serializer.validated_data["assignment_marks"],
            "mid_marks": serializer.validated_data["mid_marks"],
"marks": serializer.validated_data.get("marks"),
        }
        performance, _ = StudentPerformance.objects.update_or_create(
            student=student,
            course=course,
            chapter="",  # Overall record - use empty chapter
            topic="",   # Overall record - use empty topic
            defaults=defaults,
        )

        performance.attendance = _recalculate_attendance_percentage(student, course)
        performance.subject = course.name
        performance.semester = course.semester
        performance.chapter = ""  # Ensure it's always empty for overall records
        performance.topic = ""
        performance.save()
        
        # Update SGPA and CGPA for the student
        _update_student_sgpa_cgpa(student, course.semester)

        return Response(PerformanceManagementSerializer(performance).data, status=status.HTTP_200_OK)


class AdminAttendanceUpsertView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = AttendanceRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = serializer.validated_data["course"]
        student = serializer.validated_data["student"]
        attendance_record, _ = AttendanceRecord.objects.update_or_create(
            student=student,
            course=course,
            date=serializer.validated_data["date"],
            defaults={
                "is_present": serializer.validated_data["is_present"],
                "marked_by": request.user,
            },
        )

        performance, _ = StudentPerformance.objects.get_or_create(
            student=student,
            course=course,
            chapter="",
            topic="",
            defaults={
                "subject": course.name,
                "semester": course.semester,
                "quiz_marks": 0,
                "assignment_marks": 0,
                "mid_marks": 0,
                "marks": None,
            },
        )
        performance.subject = course.name
        performance.semester = course.semester
        performance.chapter = ""
        performance.topic = ""
        performance.attendance = _recalculate_attendance_percentage(student, course)
        performance.save()
        
        # Update SGPA and CGPA for the student
        _update_student_sgpa_cgpa(student, course.semester)

        return Response(
            {
                "attendance_record": AttendanceRecordSerializer(attendance_record).data,
                "performance_record": PerformanceManagementSerializer(performance).data,
            },
            status=status.HTTP_200_OK,
        )


class TeacherPerformanceUpsertView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        serializer = PerformanceManagementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = serializer.validated_data["course"]
        if course.teacher_id != request.user.id:
            return Response({"detail": "You can only manage records for your assigned courses."}, status=status.HTTP_403_FORBIDDEN)

        student = serializer.validated_data["student"]
        defaults = {
            "subject": course.name,
            "semester": course.semester,
            "chapter": "",  # Overall records have empty chapter/topic
            "topic": "",
            "quiz_marks": serializer.validated_data["quiz_marks"],
            "assignment_marks": serializer.validated_data["assignment_marks"],
            "mid_marks": serializer.validated_data["mid_marks"],
"marks": serializer.validated_data.get("marks"),
        }
        performance, _ = StudentPerformance.objects.update_or_create(
            student=student,
            course=course,
            chapter="",  # Overall record - use empty chapter
            topic="",   # Overall record - use empty topic
            defaults=defaults,
        )

        performance.attendance = _recalculate_attendance_percentage(student, course)
        performance.subject = course.name
        performance.semester = course.semester
        performance.chapter = ""  # Ensure it's always empty for overall records
        performance.topic = ""
        performance.save()
        
        # Update SGPA and CGPA for the student
        _update_student_sgpa_cgpa(student, course.semester)

        return Response(PerformanceManagementSerializer(performance).data, status=status.HTTP_200_OK)


class TeacherAttendanceUpsertView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        serializer = AttendanceRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = serializer.validated_data["course"]
        if course.teacher_id != request.user.id:
            return Response({"detail": "You can only mark attendance for your assigned courses."}, status=status.HTTP_403_FORBIDDEN)

        student = serializer.validated_data["student"]
        attendance_record, _ = AttendanceRecord.objects.update_or_create(
            student=student,
            course=course,
            date=serializer.validated_data["date"],
            defaults={
                "is_present": serializer.validated_data["is_present"],
                "marked_by": request.user,
            },
        )

        performance, _ = StudentPerformance.objects.get_or_create(
            student=student,
            course=course,
            chapter="",
            topic="",
            defaults={
                "subject": course.name,
                "semester": course.semester,
                "quiz_marks": 0,
                "assignment_marks": 0,
                "mid_marks": 0,
                "marks": None,
            },
        )
        performance.subject = course.name
        performance.semester = course.semester
        performance.chapter = ""
        performance.topic = ""
        performance.attendance = _recalculate_attendance_percentage(student, course)
        performance.save()
        
        # Update SGPA and CGPA for the student
        _update_student_sgpa_cgpa(student, course.semester)

        return Response(
            {
                "attendance_record": AttendanceRecordSerializer(attendance_record).data,
                "performance_record": PerformanceManagementSerializer(performance).data,
            },
            status=status.HTTP_200_OK,
        )


class StudentPerformancePredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PredictionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        student_id = serializer.validated_data.get("student_id")
        semester = serializer.validated_data["semester"]

        if request.user.role == User.Roles.STUDENT:
            student_id = request.user.id
        elif student_id is None:
            return Response({"student_id": ["student_id is required for non-student users."]}, status=status.HTTP_400_BAD_REQUEST)

        student = get_object_or_404(User, pk=student_id, role=User.Roles.STUDENT)

        if request.user.role == User.Roles.STUDENT and student.id != request.user.id:
            return Response({"detail": "Students may only request predictions for their own account."}, status=status.HTTP_403_FORBIDDEN)

        # Check if marks have been entered for the requested semester
        semester_records = StudentPerformance.objects.filter(
            student=student,
            semester=str(semester),
            chapter="",
            topic=""
        )
        
        # Determine if we have marks for the requested semester
        has_marks_entered = any(record.marks is not None for record in semester_records)

        # Use the requested semester's data as the feature source for the prediction
        aggregate_data = self._aggregate_semester(student, semester)
        if aggregate_data is None:
            return Response(
                {"detail": f"No performance records found for this student and semester {semester}."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # The model predicts the NEXT semester's performance based on the current semester's features
        prediction_semester = semester + 1

        try:
            feature_vector = prediction.build_feature_vector(aggregate_data)
            predicted_tier, confidence = prediction.predict_next_semester_performance(feature_vector)
        except FileNotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Analyze weak areas
        weak_areas = self._analyze_weak_areas(student, prediction_semester)

        return Response(
            {
                "student_id": student.id,
                "requested_semester": semester,
                "prediction_semester": prediction_semester,
                "marks_entered_for_requested_semester": has_marks_entered,
                "predicted_next_semester_tier": predicted_tier,
                "predicted_confidence": round(confidence, 4),
                "current_sgpa": round(aggregate_data["sgpa"], 4),
                "cgpa": round(aggregate_data["cgpa"], 4),
                "weak_subjects": weak_areas["weak_subjects"],
                "weak_chapters_and_topics": weak_areas["weak_chapters_and_topics"],
                "practical_performance": weak_areas["practical_performance"],
                "recommendations": weak_areas["recommendations"],
            }
        )

    def _aggregate_semester(self, student, semester):
        """
        Aggregate semester data from StudentPerformance records.
        Prefer overall subject records (chapter="" and topic=""), but fall back to
        chapter/topic records if no overall records exist for the semester.
        """
        semester_str = str(semester)
        semester_records = StudentPerformance.objects.filter(student=student, semester=semester_str)
        if not semester_records.exists():
            return None

        def _estimate_record_total(record):
            if record.marks is not None:
                # For chapter/topic records, marks are out of 10, scale to 100
                if record.chapter or record.topic:
                    return float(record.marks) * 10.0
                return float(record.marks)
            if record.quiz_marks is not None and record.assignment_marks is not None and record.mid_marks is not None:
                total = float(record.quiz_marks or 0.0) + float(record.assignment_marks or 0.0) + float(record.mid_marks or 0.0)
                return round((total / 60.0) * 100.0, 2)
            return 0.0

        overall_records = semester_records.filter(chapter="", topic="")
        if overall_records.exists():
            subject_marks = [_estimate_record_total(record) for record in overall_records]
            attendance_values = [float(record.attendance or 0.0) for record in overall_records]
        else:
            subject_groups = {}
            chapter_marks = []
            topic_marks = []
            attendance_values = []
            for record in semester_records:
                if record.subject not in subject_groups:
                    subject_groups[record.subject] = []
                subject_groups[record.subject].append(_estimate_record_total(record))
                if record.chapter:
                    # Database stores chapter marks out of 10, scale to match training data range (0-100)
                    chapter_marks.append(float(record.marks or 0.0) * 10.0)
                if record.topic:
                    # Database stores topic marks out of 10, scale to match training data range (0-100)
                    topic_marks.append(float(record.marks or 0.0) * 10.0)
                if record.attendance is not None:
                    attendance_values.append(float(record.attendance))

            subject_marks = [mean(values) for values in subject_groups.values() if values]
            if not subject_marks:
                return None

        if not subject_marks:
            return None

        def _semester_sort_value(value):
            try:
                return int(value)
            except (TypeError, ValueError):
                return value

        def _is_previous_semester(value):
            try:
                return int(value) < int(semester)
            except (TypeError, ValueError):
                return str(value) < semester_str

        def _aggregate_previous(records_qs):
            previous = {}
            for record in records_qs:
                sem = record.semester
                if not _is_previous_semester(sem):
                    continue
                if sem not in previous:
                    previous[sem] = {}
                subject_scores = previous[sem].setdefault(record.subject, [])
                subject_scores.append(_estimate_record_total(record))

            result = []
            for sem_key in sorted(previous.keys(), key=_semester_sort_value):
                scores = [mean(scores) for scores in previous[sem_key].values() if scores]
                if scores:
                    result.append(mean(scores))
            return result

        all_previous_records = StudentPerformance.objects.filter(student=student)
        previous_averages = _aggregate_previous(all_previous_records)
        previous_semester_sgpas = [_grade_points_from_marks(avg) for avg in previous_averages]
        previous_failed_subjects = sum(
            1 for record in all_previous_records if _is_previous_semester(record.semester) and _estimate_record_total(record) == 0.0
        ) if previous_averages else 0

        grade_points = [_grade_points_from_marks(value) for value in subject_marks]
        current_sgpa = mean(grade_points) if grade_points else 0.0
        current_failed_subjects = sum(1 for value in grade_points if value == 0)
        previous_sgpa = previous_semester_sgpas[-1] if previous_semester_sgpas else 0.0
        sgpa_trend = current_sgpa - previous_sgpa
        failed_subjects_delta = current_failed_subjects - (previous_failed_subjects if previous_semester_sgpas else 0)
        cgpa = mean(previous_semester_sgpas + [current_sgpa]) if previous_semester_sgpas else current_sgpa

        chapter_marks_avg = 0.0
        topic_marks_avg = 0.0
        # NOTE: Disabling chapter/topic marks aggregation due to data source mismatch
        # Training data used marks out of 100 from synthetic data
        # Current DB has marks out of 10, causing feature distribution mismatch
        # TODO: Either normalize marks to training scale or retrain model on DB data
        # if not overall_records.exists():
        #     chapter_marks = [float(r.marks or 0.0) * 10.0 for r in semester_records if r.chapter]
        #     topic_marks = [float(r.marks or 0.0) * 10.0 for r in semester_records if r.topic]
        #     chapter_marks_avg = mean(chapter_marks) if chapter_marks else 0.0
        #     topic_marks_avg = mean(topic_marks) if topic_marks else 0.0

        practical_marks_avg = 0.0
        # NOTE: Disabling practical marks for same reason as above
        # practical_marks = [
        #     _estimate_record_total(record)
        #     for record in semester_records
        #     if record.subject and ("practical" in record.subject.lower() or "lab" in record.subject.lower())
        # ]
        # practical_marks_avg = mean(practical_marks) if practical_marks else 0.0

        return {
            "semester_index": int(semester),
            "subject_count": len(subject_marks),
            "avg_total_marks": mean(subject_marks),
            "max_total_marks": max(subject_marks) if subject_marks else 0.0,
            "min_total_marks": min(subject_marks) if subject_marks else 0.0,
            "avg_attendance_percent": mean(attendance_values) if attendance_values else 0.0,
            "avg_grade_points": mean(grade_points) if grade_points else 0.0,
            "sgpa": current_sgpa,
            "total_credit_hours": len(subject_marks) * 3,
            "cgpa": cgpa,
            "previous_sgpa": previous_sgpa,
            "sgpa_trend": sgpa_trend,
            "failed_subjects": current_failed_subjects,
            "failed_subjects_delta": failed_subjects_delta,
            "high_grade_subjects": sum(1 for value in grade_points if value >= 3.33),
            "chapter_marks_avg": chapter_marks_avg,
            "topic_marks_avg": topic_marks_avg,
            "practical_marks_avg": practical_marks_avg,
        }

    def _analyze_weak_areas(self, student, semester):
        """
        Analyze student's weak subjects, chapters, topics, and practical performance.
        """
        records = StudentPerformance.objects.filter(student=student, semester=str(semester))

        subject_analysis = {}
        for record in records:
            subject = record.subject or ""
            if subject not in subject_analysis:
                subject_analysis[subject] = {
                    "marks": [],
                    "chapters": {},
                    "practical_count": 0,
                }

            if record.marks is not None:
                subject_analysis[subject]["marks"].append(float(record.marks))

            if record.chapter:
                chapter_data = subject_analysis[subject]["chapters"].setdefault(record.chapter, {"marks": [], "topics": {}})
                if record.marks is not None:
                    chapter_data["marks"].append(float(record.marks))

                if record.topic:
                    topic_marks = chapter_data["topics"].setdefault(record.topic, [])
                    if record.marks is not None:
                        topic_marks.append(float(record.marks))

            if record.subject and ("practical" in record.subject.lower() or "lab" in record.subject.lower()):
                subject_analysis[subject]["practical_count"] += 1

        weak_subjects = []
        all_marks = []
        for subject, data in subject_analysis.items():
            if data["marks"]:
                avg_marks = sum(data["marks"]) / len(data["marks"])
                all_marks.extend(data["marks"])
                weak_subjects.append({
                    "subject": subject,
                    "average_marks": round(avg_marks, 2),
                    "total_records": len(data["marks"]),
                })

        overall_avg = sum(all_marks) / len(all_marks) if all_marks else 0.0
        weak_subjects.sort(key=lambda x: x["average_marks"])
        weak_subjects = weak_subjects[:3]

        weak_chapters_and_topics = []
        for subject_data in weak_subjects:
            subject = subject_data["subject"]
            data = subject_analysis[subject]
            subject_weak_areas = {
                "subject": subject,
                "average_marks": subject_data["average_marks"],
                "chapters": [],
            }

            for chapter, chapter_data in data["chapters"].items():
                if chapter_data["marks"]:
                    chapter_avg = sum(chapter_data["marks"]) / len(chapter_data["marks"])
                    weak_topics = []
                    for topic, topic_marks in chapter_data["topics"].items():
                        if topic_marks:
                            topic_avg = sum(topic_marks) / len(topic_marks)
                            if topic_avg < overall_avg * 0.85:
                                weak_topics.append({
                                    "topic": topic,
                                    "average_marks": round(topic_avg, 2),
                                })
                    weak_topics.sort(key=lambda x: x["average_marks"])
                    subject_weak_areas["chapters"].append({
                        "chapter": chapter,
                        "average_marks": round(chapter_avg, 2),
                        "weak_topics": weak_topics[:2],
                    })

            if subject_weak_areas["chapters"]:
                subject_weak_areas["chapters"].sort(key=lambda x: x["average_marks"])
                weak_chapters_and_topics.append(subject_weak_areas)

        practical_performance = {
            "has_practical_courses": False,
            "practical_courses": [],
            "average_practical_marks": 0.0,
        }

        practical_marks = []
        for subject, data in subject_analysis.items():
            if data["practical_count"] > 0:
                practical_performance["has_practical_courses"] = True
                subject_practical_marks = [m for m in data["marks"] if m is not None]
                if subject_practical_marks:
                    avg = sum(subject_practical_marks) / len(subject_practical_marks)
                    practical_marks.extend(subject_practical_marks)
                    practical_performance["practical_courses"].append({
                        "subject": subject,
                        "average_marks": round(avg, 2),
                    })

        if practical_marks:
            practical_performance["average_practical_marks"] = round(sum(practical_marks) / len(practical_marks), 2)

        recommendations = []
        if weak_subjects:
            recommendations.append(
                f"Focus on {weak_subjects[0]['subject']} which has the lowest average marks of {weak_subjects[0]['average_marks']}."
            )
        if weak_chapters_and_topics:
            first_weak = weak_chapters_and_topics[0]
            if first_weak["chapters"]:
                recommendations.append(
                    f"In {first_weak['subject']}, prioritize {first_weak['chapters'][0]['chapter']} "
                    f"(avg: {first_weak['chapters'][0]['average_marks']})."
                )
        if practical_performance["has_practical_courses"] and practical_performance["average_practical_marks"] < overall_avg:
            recommendations.append(
                f"Practical courses need improvement (avg: {practical_performance['average_practical_marks']}). "
                "Increase hands-on practice time."
            )
        if overall_avg < 50:
            recommendations.append(
                "Overall performance is below average. Consider seeking tutoring or peer study groups."
            )
        elif overall_avg >= 75:
            recommendations.append(
                "Great overall performance! Maintain consistency and help peers in weak areas."
            )

        return {
            "weak_subjects": weak_subjects,
            "weak_chapters_and_topics": weak_chapters_and_topics,
            "practical_performance": practical_performance,
            "recommendations": recommendations,
        }


class AdminChapterTopicMarksView(APIView):
    """API for managing chapter and topic level marks separately from subject marks."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        # Get chapter/topic marks (records with chapter or topic but no quiz/assignment/mid)
        records = StudentPerformance.objects.select_related("student", "course").filter(
            course__isnull=False
        ).exclude(
            chapter=""
        ).order_by("course", "student", "chapter", "topic")
        return Response(ChapterTopicMarksSerializer(records, many=True).data)

    def post(self, request):
        serializer = ChapterTopicMarksSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = serializer.validated_data["course"]
        student = serializer.validated_data["student"]
        chapter = serializer.validated_data.get("chapter", "")
        topic = serializer.validated_data.get("topic", "")

        # Check if this is an update or create
        existing = StudentPerformance.objects.filter(
            student=student,
            course=course,
            chapter=chapter,
            topic=topic,
        ).first()

        if existing:
            # Update existing record
            existing.marks = serializer.validated_data.get("marks")
            existing.save()
            return Response(ChapterTopicMarksSerializer(existing).data, status=status.HTTP_200_OK)
        else:
            # Create new record
            performance = serializer.save()
            return Response(ChapterTopicMarksSerializer(performance).data, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        performance = get_object_or_404(StudentPerformance, pk=pk)
        performance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeacherChapterTopicMarksView(APIView):
    """API for teachers to manage chapter and topic level marks."""
    permission_classes = [IsAuthenticated, IsTeacher]

    def post(self, request):
        serializer = ChapterTopicMarksSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        course = serializer.validated_data["course"]
        if course.teacher_id != request.user.id:
            return Response({"detail": "You can only manage records for your assigned courses."}, status=status.HTTP_403_FORBIDDEN)

        student = serializer.validated_data["student"]
        chapter = serializer.validated_data.get("chapter", "")
        topic = serializer.validated_data.get("topic", "")

        existing = StudentPerformance.objects.filter(
            student=student,
            course=course,
            chapter=chapter,
            topic=topic,
        ).first()

        if existing:
            existing.marks = serializer.validated_data.get("marks")
            existing.save()
            return Response(ChapterTopicMarksSerializer(existing).data, status=status.HTTP_200_OK)
        else:
            performance = serializer.save()
            return Response(ChapterTopicMarksSerializer(performance).data, status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        performance = get_object_or_404(StudentPerformance, pk=pk)
        if performance.course.teacher_id != request.user.id:
            return Response({"detail": "You can only delete chapter/topic marks for your assigned courses."}, status=status.HTTP_403_FORBIDDEN)
        performance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

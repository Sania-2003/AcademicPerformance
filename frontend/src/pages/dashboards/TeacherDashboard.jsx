import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { fetchTeacherDashboard, saveTeacherAttendanceRecord, saveTeacherPerformanceRecord, saveTeacherChapterTopicMark, deleteTeacherChapterTopicMark } from "../../api/user";

function parseApiError(error, fallback) {
  const data = error?.response?.data;
  if (!data) {
    return fallback;
  }
  if (typeof data === "string") {
    return data;
  }
  return Object.values(data).flat().join(" ") || fallback;
}

function formatValue(value, digits = 2) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }
  return Number(value).toFixed(digits);
}

function todayISODate() {
  return new Date().toISOString().split("T")[0];
}

export default function TeacherDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(todayISODate());
  const [attendanceDrafts, setAttendanceDrafts] = useState({});
  const [marksDrafts, setMarksDrafts] = useState({});
  const [chapterTopicMarks, setChapterTopicMarks] = useState([]);
  const [newChapterTopicMark, setNewChapterTopicMark] = useState({
    student: "",
    chapter: "",
    topic: "",
    marks: "",
  });
  const [savingMarksStudentId, setSavingMarksStudentId] = useState(null);
  const [savingAttendanceStudentId, setSavingAttendanceStudentId] = useState(null);
  const [savingChapterTopicMark, setSavingChapterTopicMark] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      const data = await fetchTeacherDashboard();
      setDashboard(data);
      setError("");
    } catch (err) {
      setDashboard(null);
      setError("Unable to load teacher dashboard.");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const assignedCourses = dashboard?.assigned_courses || [];
  const performanceRecords = dashboard?.performance_records || [];
  const attendanceRecords = dashboard?.attendance_records || [];
  const subjectRecords = performanceRecords.filter(
    (record) => !record.chapter && !record.topic
  );
  const summary = dashboard?.summary || {};

  useEffect(() => {
    if (!assignedCourses.length) {
      setSelectedCourseId("");
      return;
    }

    const selectedExists = assignedCourses.some((course) => String(course.id) === String(selectedCourseId));
    if (!selectedCourseId || !selectedExists) {
      setSelectedCourseId(String(assignedCourses[0].id));
    }
  }, [assignedCourses, selectedCourseId]);

  const selectedCourse = useMemo(
    () => assignedCourses.find((course) => String(course.id) === String(selectedCourseId)),
    [assignedCourses, selectedCourseId]
  );

  const courseStudents = selectedCourse?.student_details || [];

  useEffect(() => {
    if (!selectedCourseId) {
      setMarksDrafts({});
      return;
    }

    const nextDrafts = {};
    courseStudents.forEach((student) => {
      const existing = performanceRecords.find(
        (record) => String(record.course) === String(selectedCourseId) && 
                   Number(record.student) === Number(student.id) &&
                   (!record.chapter || record.chapter === "") &&
                   (!record.topic || record.topic === "")
      );
      nextDrafts[student.id] = {
        quiz_marks: existing?.quiz_marks ?? "",
        assignment_marks: existing?.assignment_marks ?? "",
        mid_marks: existing?.mid_marks ?? "",
        marks: existing?.marks ?? "",
      };
    });

    setMarksDrafts(nextDrafts);
  }, [selectedCourseId, courseStudents, performanceRecords]);

  useEffect(() => {
    if (!selectedCourseId) {
      setChapterTopicMarks([]);
      setNewChapterTopicMark({ student: "", chapter: "", topic: "", marks: "" });
      return;
    }

    // Filter chapter/topic marks for the selected course
    const courseChapterTopicMarks = performanceRecords.filter(
      (record) => String(record.course) === String(selectedCourseId) &&
                 (record.chapter || record.topic)
    );
    setChapterTopicMarks(courseChapterTopicMarks);
  }, [selectedCourseId, performanceRecords]);

  useEffect(() => {
    if (!selectedCourseId) {
      setAttendanceDrafts({});
      return;
    }

    const nextDrafts = {};
    courseStudents.forEach((student) => {
      const existing = attendanceRecords.find(
        (record) =>
          String(record.course) === String(selectedCourseId) &&
          Number(record.student) === Number(student.id) &&
          record.date === attendanceDate
      );
      nextDrafts[student.id] = existing ? Boolean(existing.is_present) : true;
    });

    setAttendanceDrafts(nextDrafts);
  }, [selectedCourseId, attendanceDate, courseStudents, attendanceRecords]);

  const onMarksFieldChange = (studentId, field, value) => {
    setMarksDrafts((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  };

  const onAttendanceStatusChange = (studentId, isPresent) => {
    setAttendanceDrafts((prev) => ({ ...prev, [studentId]: isPresent }));
  };

  const saveMarksForStudent = async (studentId) => {
    const marks = marksDrafts[studentId] || {};

    if (
      marks.quiz_marks === "" ||
      marks.assignment_marks === "" ||
      marks.mid_marks === "" ||
      !selectedCourseId
    ) {
      setError("Quiz, assignment, and mid marks are required.");
      setMessage("");
      return;
    }

    setSavingMarksStudentId(studentId);
    setError("");
    setMessage("");

    try {
      await saveTeacherPerformanceRecord({
        course: Number(selectedCourseId),
        student: Number(studentId),
        quiz_marks: Number(marks.quiz_marks),
        assignment_marks: Number(marks.assignment_marks),
        mid_marks: Number(marks.mid_marks),
        marks: marks.marks === "" ? null : Number(marks.marks),
      });
      setMessage("Marks saved successfully.");
      await loadData();
    } catch (err) {
      setError(parseApiError(err, "Unable to save marks."));
    } finally {
      setSavingMarksStudentId(null);
    }
  };

  const saveAttendanceForStudent = async (studentId) => {
    if (!selectedCourseId || !attendanceDate) {
      setError("Course and date are required.");
      setMessage("");
      return;
    }

    setSavingAttendanceStudentId(studentId);
    setError("");
    setMessage("");

    try {
      await saveTeacherAttendanceRecord({
        course: Number(selectedCourseId),
        student: Number(studentId),
        date: attendanceDate,
        is_present: Boolean(attendanceDrafts[studentId]),
      });
      setMessage("Attendance saved successfully.");
      await loadData();
    } catch (err) {
      setError(parseApiError(err, "Unable to save attendance."));
    } finally {
      setSavingAttendanceStudentId(null);
    }
  };

  const removeChapterTopicMark = async (recordId) => {
    setError("");
    setMessage("");
    try {
      await deleteTeacherChapterTopicMark(recordId);
      setMessage("Chapter/topic mark deleted successfully.");
      await loadData();
    } catch (err) {
      setError(parseApiError(err, "Unable to delete chapter/topic mark."));
    }
  };

  return (
    <DashboardLayout title="Teacher Dashboard" subtitle="Course-first workflow for faster attendance and marks entry">
      {message ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

<section className="grid gap-4 md:grid-cols-3">
        <div className="stat-card-cyan reveal-up">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Assigned Courses</h2>
          <p className="mt-2 text-3xl font-bold">{summary.total_courses ?? 0}</p>
          <p className="mt-1 text-xs text-white/70">Courses you teach</p>
        </div>
        <div className="stat-card-violet reveal-up">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Assigned Students</h2>
          <p className="mt-2 text-3xl font-bold">{summary.total_students ?? 0}</p>
          <p className="mt-1 text-xs text-white/70">Students across courses</p>
        </div>
        <div className="stat-card-emerald reveal-up">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Saved Records</h2>
          <p className="mt-2 text-3xl font-bold">{summary.total_records ?? 0}</p>
          <p className="mt-1 text-xs text-white/70">Total performance entries</p>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Choose Course Once</h2>
        <p className="mt-1 text-sm text-slate-600">Select a course, then mark attendance and marks for students directly from row actions.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {assignedCourses.map((course) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourseId(String(course.id))}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                String(course.id) === String(selectedCourseId)
                  ? "border-cyan-500 bg-cyan-50 text-cyan-800"
                  : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
              }`}
            >
              <div>{course.code} - {course.name}</div>
              <div className="mt-1 text-xs font-normal text-slate-500">
                Semester {course.semester}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 md:w-80">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance Date</label>
          <input
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Attendance Entry</h2>
        <p className="mt-1 text-sm text-slate-600">Record attendance separately from academic scores.</p>

        <div className="mt-4 flex flex-wrap gap-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:w-80">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Attendance Date</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(event) => setAttendanceDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex-1">
            {selectedCourse ? (
              <>
                <div className="font-semibold text-slate-900">{selectedCourse.code} - {selectedCourse.name}</div>
                <div className="mt-1 text-sm text-slate-600">Semester {selectedCourse.semester}</div>
              </>
            ) : (
              <div className="text-sm text-slate-600">No course selected.</div>
            )}
          </div>
        </div>

        {courseStudents.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Attendance</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {courseStudents.map((student) => {
                  const isPresent = attendanceDrafts[student.id] !== false;
                  return (
                    <tr key={student.id} className="border-b border-slate-100 text-slate-700">
                      <td className="px-3 py-2 font-medium">{student.username}</td>
                      <td className="px-3 py-2">
                        <select
                          value={isPresent ? "present" : "absent"}
                          onChange={(event) => onAttendanceStatusChange(student.id, event.target.value === "present")}
                          className="rounded-lg border border-slate-300 px-2 py-1"
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => saveAttendanceForStudent(student.id)}
                          disabled={savingAttendanceStudentId === student.id}
                          className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 disabled:opacity-60"
                        >
                          {savingAttendanceStudentId === student.id ? "Saving..." : "Save Attendance"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No students are assigned to the selected course.
          </p>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Subject Marks Entry</h2>
        <p className="mt-1 text-sm text-slate-600">Save subject-level marks separately from attendance.</p>

        {courseStudents.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Quiz</th>
                  <th className="px-3 py-2 font-medium">Assignment</th>
                  <th className="px-3 py-2 font-medium">Mid</th>
                  <th className="px-3 py-2 font-medium">Final</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {courseStudents.map((student) => {
                  const marks = marksDrafts[student.id] || {};
                  return (
                    <tr key={student.id} className="border-b border-slate-100 text-slate-700">
                      <td className="px-3 py-2 font-medium">{student.username}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={marks.quiz_marks ?? ""}
                          onChange={(event) => onMarksFieldChange(student.id, "quiz_marks", event.target.value)}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={marks.assignment_marks ?? ""}
                          onChange={(event) => onMarksFieldChange(student.id, "assignment_marks", event.target.value)}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={marks.mid_marks ?? ""}
                          onChange={(event) => onMarksFieldChange(student.id, "mid_marks", event.target.value)}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={marks.marks ?? ""}
                          onChange={(event) => onMarksFieldChange(student.id, "marks", event.target.value)}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => saveMarksForStudent(student.id)}
                          disabled={savingMarksStudentId === student.id}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                        >
                          {savingMarksStudentId === student.id ? "Saving..." : "Save Marks"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No students are assigned to the selected course.
          </p>
        )}
      </section>

      {/* Chapter/Topic Marks Section */}
      <section className="mt-4">
        <h2 className="text-lg font-semibold text-slate-900">Chapter & Topic Marks</h2>
        <p className="mt-1 text-sm text-slate-600">Enter marks for specific chapters and topics. These are separate from overall subject marks.</p>
        
        {selectedCourse ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Chapter</th>
                  <th className="px-3 py-2 font-medium">Topic</th>
                  <th className="px-3 py-2 font-medium">Marks</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {chapterTopicMarks.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-2 font-medium">{record.student_name}</td>
                    <td className="px-3 py-2">{record.chapter || "-"}</td>
                    <td className="px-3 py-2">{record.topic || "-"}</td>
                    <td className="px-3 py-2">{formatValue(record.marks)}</td>
                    <td className="px-3 py-2">
                      <button 
                        type="button" 
                        onClick={() => removeChapterTopicMark(record.id)}
                        className="rounded bg-rose-50 px-2 py-1 text-rose-700 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Add new chapter/topic mark row */}
                <tr className="border-b border-slate-100 text-slate-700">
                  <td className="px-3 py-2">
                    <select 
                      value={newChapterTopicMark.student}
                      onChange={(e) => setNewChapterTopicMark(prev => ({ ...prev, student: e.target.value }))}
                      className="rounded-lg border border-slate-300 px-2 py-1"
                    >
                      <option value="">Select Student</option>
                      {courseStudents.map((student) => (
                        <option key={student.id} value={student.id}>{student.username}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={newChapterTopicMark.chapter}
                      onChange={(e) => setNewChapterTopicMark(prev => ({ ...prev, chapter: e.target.value }))}
                      placeholder="Chapter"
                      className="w-32 rounded-lg border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={newChapterTopicMark.topic}
                      onChange={(e) => setNewChapterTopicMark(prev => ({ ...prev, topic: e.target.value }))}
                      placeholder="Topic"
                      className="w-36 rounded-lg border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newChapterTopicMark.marks}
                      onChange={(e) => setNewChapterTopicMark(prev => ({ ...prev, marks: e.target.value }))}
                      placeholder="Marks"
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button 
                      type="button" 
                      onClick={async () => {
                        const { student, chapter, topic, marks } = newChapterTopicMark;
                        if (!student || (!chapter && !topic) || marks === "") {
                          setError("Student, chapter/topic, and marks are required.");
                          setMessage("");
                          return;
                        }
                        setSavingChapterTopicMark(true);
                        setError("");
                        setMessage("");
                        try {
                          await saveTeacherChapterTopicMark({
                            course: Number(selectedCourseId),
                            student: Number(student),
                            chapter: chapter.trim(),
                            topic: topic.trim(),
                            marks: Number(marks),
                          });
                          setMessage("Chapter/topic mark added successfully.");
                          setNewChapterTopicMark((prev) => ({ ...prev, chapter: "", topic: "", marks: "" }));
                          await loadData();
                        } catch (err) {
                          setError(parseApiError(err, "Unable to add chapter/topic mark."));
                        } finally {
                          setSavingChapterTopicMark(false);
                        }
                      }}
                      disabled={savingChapterTopicMark}
                      className="rounded bg-green-50 px-2 py-1 text-green-700 disabled:opacity-50"
                    >
                      {savingChapterTopicMark ? "Adding..." : "Add"}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            Select a course to manage chapter and topic marks.
          </p>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Subject Marks Records</h2>
        <p className="mt-1 text-sm text-slate-600">Overall subject marks are shown separately from chapter and topic details.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Course</th>
                <th className="px-3 py-2 font-medium">Quiz</th>
                <th className="px-3 py-2 font-medium">Assignment</th>
                <th className="px-3 py-2 font-medium">Mid</th>
                <th className="px-3 py-2 font-medium">Final</th>
              </tr>
            </thead>
            <tbody>
              {subjectRecords.length ? subjectRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 text-slate-700">
                  <td className="px-3 py-2">{record.student_name}</td>
                  <td className="px-3 py-2">{record.course_name || record.subject}</td>
                  <td className="px-3 py-2">{formatValue(record.quiz_marks)}</td>
                  <td className="px-3 py-2">{formatValue(record.assignment_marks)}</td>
                  <td className="px-3 py-2">{formatValue(record.mid_marks)}</td>
                  <td className="px-3 py-2">{formatValue(record.marks)}</td>
                </tr>
              )) : (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>No subject records available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Daily Attendance History</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Student</th>
                <th className="px-3 py-2 font-medium">Course</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 text-slate-700">
                  <td className="px-3 py-2">{record.date}</td>
                  <td className="px-3 py-2">{record.student_name}</td>
                  <td className="px-3 py-2">{record.course_name}</td>
                  <td className="px-3 py-2">{record.is_present ? "Present" : "Absent"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}

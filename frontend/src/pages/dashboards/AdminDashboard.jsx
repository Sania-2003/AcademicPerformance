import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import {
  createAdminCourse,
  createAdminUser,
  deleteAdminCourse,
  deleteAdminPerformanceRecord,
  deleteAdminUser,
  fetchAdminDashboard,
  saveAdminAttendanceRecord,
  saveAdminChapterTopicMark,
  deleteAdminChapterTopicMark,
  saveAdminPerformanceRecord,
  updateAdminCourse,
  updateAdminUser,
} from "../../api/user";

const initialUserForm = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  role: "student",
  is_active: true,
};

const initialCourseForm = {
  name: "",
  code: "",
  semester: "",
  teacher: "",
  student_ids: [],
};

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

function BreakdownBarChart({ data, valueKey, labelKey, color }) {
  const width = 300;
  const height = 150;
  const padding = { top: 20, right: 8, bottom: 24, left: 28 };

  if (!data || !data.length) {
    return null;
  }

  const values = data.map((d) => Number(d[valueKey]) || 0);
  const maxVal = Math.max(1, ...values);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const gap = 4;
  const barWidth = Math.min(40, (innerWidth - gap * (data.length - 1)) / data.length);
  const baselineY = padding.top + innerHeight;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Breakdown bar chart">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const x = padding.left + i * (barWidth + gap);
        const y = padding.top + innerHeight - (val / maxVal) * innerHeight;
        const h = baselineY - y;
        return (
          <g key={`${labelKey}-${i}`}>
            <rect x={x} y={y} width={barWidth} height={h} rx="4" fill={color} />
            <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0f172a">
              {val.toFixed(1)}
            </text>
            <text x={x + barWidth / 2} y={baselineY + 14} textAnchor="middle" fontSize="8" fill="#64748b">
              {d[labelKey]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [userForm, setUserForm] = useState(initialUserForm);
  const [editingUserId, setEditingUserId] = useState(null);
  const [courseForm, setCourseForm] = useState(initialCourseForm);
  const [editingCourseId, setEditingCourseId] = useState(null);

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(todayISODate());
  const [attendanceDrafts, setAttendanceDrafts] = useState({});
  const [marksDrafts, setMarksDrafts] = useState({});
  const [chapterTopicMarks, setChapterTopicMarks] = useState([]);
  const [chapterTopicDrafts, setChapterTopicDrafts] = useState({});
  const [newChapterTopicMark, setNewChapterTopicMark] = useState({
    student: "",
    chapter: "",
    topic: "",
    marks: "",
  });
  const [savingMarksStudentId, setSavingMarksStudentId] = useState(null);
  const [savingAttendanceStudentId, setSavingAttendanceStudentId] = useState(null);
  const [savingChapterTopicMark, setSavingChapterTopicMark] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    try {
      const data = await fetchAdminDashboard();
      setDashboard(data);
      setError("");
    } catch (err) {
      setDashboard(null);
      setError("Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const users = dashboard?.users || [];
  const courses = dashboard?.courses || [];
  const performanceRecords = dashboard?.performance_records || [];
  const attendanceRecords = dashboard?.attendance_records || [];
  const subjectRecords = performanceRecords.filter(
    (record) => !record.chapter && !record.topic
  );
const summary = dashboard?.summary || {};
  const topicBreakdown = dashboard?.topic_breakdown || [];
  const topicNote = dashboard?.topic_note || "";
  const semesterBreakdown = dashboard?.semester_breakdown || [];
  const subjectBreakdown = dashboard?.subject_breakdown || [];

  const teachers = useMemo(() => users.filter((user) => user.role === "teacher"), [users]);
  const students = useMemo(() => users.filter((user) => user.role === "student"), [users]);

  useEffect(() => {
    if (!courses.length) {
      setSelectedCourseId("");
      return;
    }

    const selectedExists = courses.some((course) => String(course.id) === String(selectedCourseId));
    if (!selectedCourseId || !selectedExists) {
      setSelectedCourseId(String(courses[0].id));
    }
  }, [courses, selectedCourseId]);

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.id) === String(selectedCourseId)),
    [courses, selectedCourseId]
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
      setChapterTopicDrafts({});
      return;
    }

    // Filter chapter/topic marks for the selected course
    const courseChapterTopicMarks = performanceRecords.filter(
      (record) => String(record.course) === String(selectedCourseId) &&
                 (record.chapter || record.topic)
    );
    setChapterTopicMarks(courseChapterTopicMarks);

    // Initialize drafts for adding new chapter/topic marks
    setChapterTopicDrafts({});
  }, [selectedCourseId, performanceRecords]);

  const onUserChange = (event) => {
    const { name, value, type, checked } = event.target;
    setUserForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const onCourseChange = (event) => {
    const { name, value, options, multiple } = event.target;
    if (multiple) {
      const studentIds = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => Number(option.value));
      setCourseForm((prev) => ({ ...prev, [name]: studentIds }));
      return;
    }
    setCourseForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetUserForm = () => {
    setUserForm(initialUserForm);
    setEditingUserId(null);
  };

  const resetCourseForm = () => {
    setCourseForm(initialCourseForm);
    setEditingCourseId(null);
  };

  const submitUser = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        username: userForm.username.trim(),
        first_name: userForm.first_name.trim(),
        last_name: userForm.last_name.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
        is_active: userForm.is_active,
      };

      if (userForm.password.trim()) {
        payload.password = userForm.password.trim();
      }

      if (editingUserId) {
        await updateAdminUser(editingUserId, payload);
        setMessage("User updated successfully.");
      } else {
        await createAdminUser(payload);
        setMessage("User created successfully.");
      }

      resetUserForm();
      await loadDashboard();
    } catch (err) {
      setError(parseApiError(err, "Unable to save user."));
    }
  };

  const submitCourse = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      const payload = {
        name: courseForm.name.trim(),
        code: courseForm.code.trim(),
        semester: courseForm.semester.trim(),
        teacher: Number(courseForm.teacher),
        student_ids: courseForm.student_ids,
      };

      if (editingCourseId) {
        await updateAdminCourse(editingCourseId, payload);
        setMessage("Course updated successfully.");
      } else {
        await createAdminCourse(payload);
        setMessage("Course created successfully.");
      }

      resetCourseForm();
      await loadDashboard();
    } catch (err) {
      setError(parseApiError(err, "Unable to save course."));
    }
  };

  const startEditUser = (user) => {
    setEditingUserId(user.id);
    setUserForm({
      username: user.username,
      password: "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      role: user.role,
      is_active: user.is_active,
    });
  };

  const startEditCourse = (course) => {
    setEditingCourseId(course.id);
    setCourseForm({
      name: course.name,
      code: course.code,
      semester: course.semester,
      teacher: String(course.teacher),
      student_ids: course.student_ids || [],
    });
  };

  const removeUser = async (userId) => {
    setMessage("");
    setError("");
    try {
      await deleteAdminUser(userId);
      if (editingUserId === userId) {
        resetUserForm();
      }
      setMessage("User deleted successfully.");
      await loadDashboard();
    } catch (err) {
      setError(parseApiError(err, "Unable to delete user."));
    }
  };

  const removeCourse = async (courseId) => {
    setMessage("");
    setError("");
    try {
      await deleteAdminCourse(courseId);
      if (editingCourseId === courseId) {
        resetCourseForm();
      }
      setMessage("Course deleted successfully.");
      await loadDashboard();
    } catch (err) {
      setError(parseApiError(err, "Unable to delete course."));
    }
  };

  const removeRecord = async (recordId) => {
    setMessage("");
    setError("");
    try {
      await deleteAdminPerformanceRecord(recordId);
      setMessage("Performance record deleted successfully.");
      await loadDashboard();
    } catch (err) {
      setError(parseApiError(err, "Unable to delete performance record."));
    }
  };

  const removeChapterTopicMark = async (recordId) => {
    setMessage("");
    setError("");
    try {
      await deleteAdminChapterTopicMark(recordId);
      setMessage("Chapter/topic mark deleted successfully.");
      await loadDashboard();
    } catch (err) {
      setError(parseApiError(err, "Unable to delete chapter/topic mark."));
    }
  };

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
      await saveAdminPerformanceRecord({
        course: Number(selectedCourseId),
        student: Number(studentId),
        quiz_marks: Number(marks.quiz_marks),
        assignment_marks: Number(marks.assignment_marks),
        mid_marks: Number(marks.mid_marks),
        marks: marks.marks === "" ? null : Number(marks.marks),
      });
      setMessage("Marks saved successfully.");
      await loadDashboard();
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
      await saveAdminAttendanceRecord({
        course: Number(selectedCourseId),
        student: Number(studentId),
        date: attendanceDate,
        is_present: Boolean(attendanceDrafts[studentId]),
      });
      setMessage("Attendance saved successfully.");
      await loadDashboard();
    } catch (err) {
      setError(parseApiError(err, "Unable to save attendance."));
    } finally {
      setSavingAttendanceStudentId(null);
    }
  };

  const onNewChapterTopicMarkChange = (field, value) => {
    setNewChapterTopicMark((prev) => ({ ...prev, [field]: value }));
  };

  const addChapterTopicMark = async () => {
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
      await saveAdminChapterTopicMark({
        course: Number(selectedCourseId),
        student: Number(student),
        chapter: chapter.trim(),
        topic: topic.trim(),
        marks: Number(marks),
      });
      setMessage("Chapter/topic mark added successfully.");
      setNewChapterTopicMark((prev) => ({ ...prev, chapter: "", topic: "", marks: "" }));
      await loadDashboard();
    } catch (err) {
      setError(parseApiError(err, "Unable to add chapter/topic mark."));
    } finally {
      setSavingChapterTopicMark(false);
    }
  };

  return (
    <DashboardLayout title="Admin Dashboard" subtitle="Manage users, courses, and class records with a faster workflow">
      {message ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="stat-card-violet">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Admins</h2>
          <p className="mt-2 text-3xl font-bold">{summary.total_admins ?? 0}</p>
        </div>
        <div className="stat-card-cyan">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Teachers</h2>
          <p className="mt-2 text-3xl font-bold">{summary.total_teachers ?? 0}</p>
        </div>
        <div className="stat-card-blue">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Students</h2>
          <p className="mt-2 text-3xl font-bold">{summary.total_students ?? 0}</p>
        </div>
        <div className="stat-card-amber">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Courses</h2>
          <p className="mt-2 text-3xl font-bold">{summary.total_courses ?? 0}</p>
        </div>
        <div className="stat-card-emerald">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Performance Records</h2>
          <p className="mt-2 text-3xl font-bold">{summary.total_records ?? 0}</p>
        </div>
      </section>

      {/* ===== Analytics Charts ===== */}
      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Records Per Semester</h2>
          <p className="mt-1 text-sm text-slate-600">Distribution of performance records across semesters.</p>
          {semesterBreakdown.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <BreakdownBarChart data={semesterBreakdown} valueKey="records" labelKey="semester" color="#0891b2" />
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Semester</th>
                      <th className="px-3 py-2 font-medium">Records</th>
                      <th className="px-3 py-2 font-medium">Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semesterBreakdown.map((item) => (
                      <tr key={item.semester} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-2">Semester {item.semester}</td>
                        <td className="px-3 py-2 font-semibold text-cyan-700">{item.records}</td>
                        <td className="px-3 py-2">{item.students}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No semester data available.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Top Subjects By Records</h2>
          <p className="mt-1 text-sm text-slate-600">Most-recorded subjects by number of performance entries.</p>
          {subjectBreakdown.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <BreakdownBarChart
                data={subjectBreakdown.slice(0, 8)}
                valueKey="records"
                labelKey="subject"
                color="#7c3aed"
              />
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Subject</th>
                      <th className="px-3 py-2 font-medium">Records</th>
                      <th className="px-3 py-2 font-medium">Avg Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectBreakdown.slice(0, 8).map((item) => (
                      <tr key={item.subject} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-2">{item.subject}</td>
                        <td className="px-3 py-2 font-semibold text-violet-700">{item.records}</td>
                        <td className="px-3 py-2">{formatValue(item.average_final_marks)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              No subject data available.
            </p>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-2">
        <form onSubmit={submitUser} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
              <p className="mt-1 text-sm text-slate-600">Add or edit admin, teacher, and student accounts.</p>
            </div>
            {editingUserId ? (
              <button type="button" onClick={resetUserForm} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Cancel Edit
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input name="username" value={userForm.username} onChange={onUserChange} required placeholder="Username" className="rounded-lg border border-slate-300 px-3 py-2" />
            <input name="password" value={userForm.password} onChange={onUserChange} type="password" placeholder={editingUserId ? "New password (optional)" : "Password"} className="rounded-lg border border-slate-300 px-3 py-2" />
            <input name="first_name" value={userForm.first_name} onChange={onUserChange} placeholder="First name" className="rounded-lg border border-slate-300 px-3 py-2" />
            <input name="last_name" value={userForm.last_name} onChange={onUserChange} placeholder="Last name" className="rounded-lg border border-slate-300 px-3 py-2" />
            <input name="email" value={userForm.email} onChange={onUserChange} type="email" placeholder="Email" className="rounded-lg border border-slate-300 px-3 py-2" />
            <select name="role" value={userForm.role} onChange={onUserChange} className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="admin">Admin</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="is_active" checked={userForm.is_active} onChange={onUserChange} type="checkbox" />
              Active account
            </label>
          </div>
          <button className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            {editingUserId ? "Update User" : "Add User"}
          </button>
        </form>

        <form onSubmit={submitCourse} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Course Management</h2>
              <p className="mt-1 text-sm text-slate-600">Create courses and assign teacher/students.</p>
            </div>
            {editingCourseId ? (
              <button type="button" onClick={resetCourseForm} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
                Cancel Edit
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4">
            <input name="name" value={courseForm.name} onChange={onCourseChange} required placeholder="Course name" className="rounded-lg border border-slate-300 px-3 py-2" />
            <div className="grid gap-4 md:grid-cols-2">
              <input name="code" value={courseForm.code} onChange={onCourseChange} required placeholder="Course code" className="rounded-lg border border-slate-300 px-3 py-2" />
              <input name="semester" value={courseForm.semester} onChange={onCourseChange} required placeholder="Semester" className="rounded-lg border border-slate-300 px-3 py-2" />
            </div>
            <select name="teacher" value={courseForm.teacher} onChange={onCourseChange} required className="rounded-lg border border-slate-300 px-3 py-2">
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.username}
                </option>
              ))}
            </select>
            <select name="student_ids" value={courseForm.student_ids.map(String)} onChange={onCourseChange} multiple className="min-h-40 rounded-lg border border-slate-300 px-3 py-2">
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.username}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Hold Ctrl or Command to select multiple students.</p>
          </div>
          <button className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            {editingCourseId ? "Update Course" : "Add Course"}
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Course Selection</h2>
        <p className="mt-1 text-sm text-slate-600">Select a course to manage attendance and marks.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {courses.map((course) => (
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
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

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
        <p className="mt-1 text-sm text-slate-600">Save subject marks separately from attendance.</p>

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
                      onChange={(e) => onNewChapterTopicMarkChange("student", e.target.value)}
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
                      onChange={(e) => onNewChapterTopicMarkChange("chapter", e.target.value)}
                      placeholder="Chapter"
                      className="w-32 rounded-lg border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={newChapterTopicMark.topic}
                      onChange={(e) => onNewChapterTopicMarkChange("topic", e.target.value)}
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
                      onChange={(e) => onNewChapterTopicMarkChange("marks", e.target.value)}
                      placeholder="Marks"
                      className="w-20 rounded-lg border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button 
                      type="button" 
                      onClick={addChapterTopicMark}
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

      <section className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-900">Users</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Username</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-2">{user.username}</td>
                    <td className="px-3 py-2">{user.role}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEditUser(user)} className="rounded bg-cyan-50 px-2 py-1 text-cyan-700">
                          Edit
                        </button>
                        <button type="button" onClick={() => removeUser(user.id)} className="rounded bg-rose-50 px-2 py-1 text-rose-700">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-900">Courses</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Chapter</th>
                  <th className="px-3 py-2 font-medium">Topic</th>
                  <th className="px-3 py-2 font-medium">Teacher</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-2">{course.code}</td>
                    <td className="px-3 py-2">{course.chapter || "N/A"}</td>
                    <td className="px-3 py-2">{course.topic || "N/A"}</td>
                    <td className="px-3 py-2">{course.teacher_name}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEditCourse(course)} className="rounded bg-cyan-50 px-2 py-1 text-cyan-700">
                          Edit
                        </button>
                        <button type="button" onClick={() => removeCourse(course.id)} className="rounded bg-rose-50 px-2 py-1 text-rose-700">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h2 className="text-lg font-semibold text-slate-900">Performance Records</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Course</th>
                  <th className="px-3 py-2 font-medium">Chapter</th>
                  <th className="px-3 py-2 font-medium">Topic</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {performanceRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-2">{record.student_name}</td>
                    <td className="px-3 py-2">{record.course_name || record.subject}</td>
                    <td className="px-3 py-2">{record.chapter || "N/A"}</td>
                    <td className="px-3 py-2">{record.topic || "N/A"}</td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeRecord(record.id)} className="rounded bg-rose-50 px-2 py-1 text-rose-700">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Topic Breakdown</h2>
            <p className="mt-1 text-sm text-slate-600">Subject, chapter, and topic level performance overview.</p>
          </div>
          {topicNote ? <p className="text-sm text-slate-500">{topicNote}</p> : null}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Chapter</th>
                <th className="px-3 py-2 font-medium">Topic</th>
                <th className="px-3 py-2 font-medium">Records</th>
                <th className="px-3 py-2 font-medium">Students</th>
                <th className="px-3 py-2 font-medium">Avg Final</th>
              </tr>
            </thead>
            <tbody>
              {topicBreakdown.length ? (
                topicBreakdown.map((item, index) => (
                  <tr key={`${item.subject}-${item.chapter}-${item.topic}-${index}`} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-2">{item.subject}</td>
                    <td className="px-3 py-2">{item.chapter || "N/A"}</td>
                    <td className="px-3 py-2">{item.topic || "N/A"}</td>
                    <td className="px-3 py-2">{item.records}</td>
                    <td className="px-3 py-2">{item.students}</td>
                    <td className="px-3 py-2">{formatValue(item.average_final_marks)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>No topic analytics available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Subject Marks Records</h2>
        <p className="mt-1 text-sm text-slate-600">Overall subject marks are shown separately from chapter/topic entries.</p>
        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Loading...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Course</th>
                  <th className="px-3 py-2 font-medium">Semester</th>
                  <th className="px-3 py-2 font-medium">Attendance</th>
                  <th className="px-3 py-2 font-medium">Quiz</th>
                  <th className="px-3 py-2 font-medium">Assignment</th>
                  <th className="px-3 py-2 font-medium">Mid</th>
                  <th className="px-3 py-2 font-medium">Final</th>
                </tr>
              </thead>
              <tbody>
                {subjectRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-2">{record.student_name}</td>
                    <td className="px-3 py-2">{record.course_name || record.subject}</td>
                    <td className="px-3 py-2">{record.semester}</td>
                    <td className="px-3 py-2">{formatValue(record.attendance, 1)}%</td>
                    <td className="px-3 py-2">{formatValue(record.quiz_marks)}</td>
                    <td className="px-3 py-2">{formatValue(record.assignment_marks)}</td>
                    <td className="px-3 py-2">{formatValue(record.mid_marks)}</td>
                    <td className="px-3 py-2">{formatValue(record.marks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Attendance History</h2>
        <p className="mt-1 text-sm text-slate-600">Attendance entries are shown separately from academic performance.</p>
        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Loading...</p>
        ) : (
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
                {attendanceRecords.length ? attendanceRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-2">{record.date}</td>
                    <td className="px-3 py-2">{record.student_name}</td>
                    <td className="px-3 py-2">{record.course_name}</td>
                    <td className="px-3 py-2">{record.is_present ? "Present" : "Absent"}</td>
                  </tr>
                )) : (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={4}>No attendance records available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

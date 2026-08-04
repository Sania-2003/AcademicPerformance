import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { fetchStudentDashboard, fetchStudentPrediction } from "../../api/user";

function formatValue(value, digits = 2) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "N/A";
  }
  return num.toFixed(digits);
}

function clampPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.min(100, Math.max(0, num));
}

function subjectVariant(score) {
  if (!Number.isFinite(score)) {
    return {
      bar: "bg-slate-300",
      text: "text-slate-600",
      card: "rounded-xl border border-slate-200 bg-slate-50 p-4",
      badge: "bg-slate-100 text-slate-600",
      label: "N/A",
    };
  }
  if (score >= 75) {
    return {
      bar: "bg-gradient-to-r from-emerald-400 to-emerald-600",
      text: "text-emerald-700",
      card: "subject-card-good",
      badge: "bg-emerald-100 text-emerald-700",
      label: "Good",
    };
  }
  if (score >= 50) {
    return {
      bar: "bg-gradient-to-r from-amber-400 to-amber-500",
      text: "text-amber-700",
      card: "subject-card-warn",
      badge: "bg-amber-100 text-amber-700",
      label: "Average",
    };
  }
  return {
    bar: "bg-gradient-to-r from-rose-400 to-rose-600",
    text: "text-rose-700",
    card: "subject-card-poor",
    badge: "bg-rose-100 text-rose-700",
    label: "At Risk",
  };
}

function SemesterBarChart({ data }) {
  const width = 440;
  const height = 210;
  const padding = { top: 26, right: 16, bottom: 32, left: 40 };

  if (!data || !data.length) {
    return null;
  }

  const values = data.map((d) => Number(d.sgpa) || 0);
  const maxVal = Math.max(10, ...values);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const gap = 10;
  const barWidth = Math.min(52, (innerWidth - gap * (data.length - 1)) / data.length);
  const baselineY = padding.top + innerHeight;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    t,
    y: padding.top + innerHeight - t * innerHeight,
  }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Semester SGPA bar chart"
    >
      <defs>
        <linearGradient id="sgpaBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      {gridLines.map(({ t, y }) => (
        <g key={t}>
          <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
          <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
            {(maxVal * t).toFixed(1)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const val = Number(d.sgpa) || 0;
        const x = padding.left + i * (barWidth + gap);
        const y = padding.top + innerHeight - (val / maxVal) * innerHeight;
        const h = baselineY - y;
        return (
          <g key={`sem-${d.semester}-${i}`}>
            <rect x={x} y={y} width={barWidth} height={h} rx="6" fill="url(#sgpaBarGrad)" />
            <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">
              {val.toFixed(2)}
            </text>
            <text x={x + barWidth / 2} y={baselineY + 16} textAnchor="middle" fontSize="9" fill="#64748b">
              Semester {d.semester}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function StudentDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [predictionError, setPredictionError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchStudentDashboard();
        setDashboard(data);
        setError("");

        // Load prediction after dashboard data
        const parseSemester = (value) => {
          const num = Number(String(value).trim());
          return Number.isFinite(num) ? num : null;
        };

        const getCurrentSemester = (items, field) => {
          const semesters = [
            ...new Set(
              items
                .map((item) => parseSemester(item[field]))
                .filter((value) => value !== null)
            ),
          ];
          return semesters.length ? Math.max(...semesters) : null;
        };

        const semesterFromPerformance = data?.performance_records?.length
          ? getCurrentSemester(data.performance_records, "semester")
          : null;
        const semesterFromCourses = data?.enrolled_courses?.length
          ? getCurrentSemester(data.enrolled_courses, "semester")
          : null;

        const currentSemester = semesterFromPerformance ?? semesterFromCourses;
        if (currentSemester !== null) {
          try {
            const predData = await fetchStudentPrediction(null, currentSemester);
            setPrediction(predData);
          } catch (predErr) {
            setPredictionError("Prediction not available yet.");
          }
        }
      } catch (err) {
        setDashboard(null);
        setError("Unable to load student dashboard.");
      }
    }

    loadData();
  }, []);

  const enrolledCourses = dashboard?.enrolled_courses || [];
  const performanceRecords = dashboard?.performance_records || [];
  const attendanceRecords = dashboard?.attendance_records || [];
  const semesterStats = dashboard?.semester_stats || [];
  const currentSgpa = dashboard?.current_sgpa;
  const cgpa = dashboard?.cgpa;

  const subjectRecords = performanceRecords.filter(
    (record) => !record.chapter && !record.topic
  );
  const chapterTopicRecords = performanceRecords.filter(
    (record) => record.chapter || record.topic
  );

  const subjectCards = useMemo(
    () =>
      subjectRecords.map((record) => {
        let score = null;
        if (record.marks !== null && record.marks !== undefined && record.marks !== "") {
          score = Number(record.marks);
        } else {
          const quiz = Number(record.quiz_marks) || 0;
          const assignment = Number(record.assignment_marks) || 0;
          const mid = Number(record.mid_marks) || 0;
          score = ((quiz + assignment + mid) / 60.0) * 100;
        }
        return { ...record, score: Number.isFinite(score) ? score : null };
      }),
    [subjectRecords]
  );

  const attendanceByCourse = useMemo(() => {
    const byCourse = new Map();

    attendanceRecords.forEach((record) => {
      const courseId = record.course;
      const current =
        byCourse.get(courseId) || {
          id: courseId,
          name: record.course_name || "Unknown",
          total: 0,
          present: 0,
        };
      current.total += 1;
      if (record.is_present) {
        current.present += 1;
      }
      byCourse.set(courseId, current);
    });

    return [...byCourse.values()]
      .map((course) => ({
        ...course,
        percentage: course.total ? Math.round((course.present / course.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [attendanceRecords]);

  const sgpaPercent = clampPercent((Number(currentSgpa) / 10) * 100);
  const cgpaPercent = clampPercent((Number(cgpa) / 10) * 100);

  const attendanceVariant = (percent) => {
    if (percent >= 75) return "stat-card-emerald";
    if (percent >= 50) return "stat-card-amber";
    return "stat-card-rose";
  };

  return (
    <DashboardLayout
      title="Student Dashboard"
      subtitle="View your enrolled courses, attendance, and marks by subject"
    >
      {error ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 reveal-up">
          {error}
        </p>
      ) : null}

      {/* ===== Quick Stats ===== */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card-blue reveal-up">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Enrolled Courses</h2>
          <p className="mt-2 text-3xl font-bold">{enrolledCourses.length}</p>
          <p className="mt-1 text-xs text-white/70">Active courses this term</p>
        </div>
        <div className="stat-card-violet reveal-up">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Performance Records</h2>
          <p className="mt-2 text-3xl font-bold">{performanceRecords.length}</p>
          <p className="mt-1 text-xs text-white/70">Marks across subjects & chapters</p>
        </div>
        <div className="stat-card-emerald reveal-up">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Attendance Entries</h2>
          <p className="mt-2 text-3xl font-bold">{attendanceRecords.length}</p>
          <p className="mt-1 text-xs text-white/70">Total class sessions recorded</p>
        </div>
        <div className="stat-card-amber reveal-up">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/80">Semesters</h2>
          <p className="mt-2 text-3xl font-bold">{semesterStats.length}</p>
          <p className="mt-1 text-xs text-white/70">GPA data available</p>
        </div>
      </section>

      {/* ===== AI Prediction ===== */}
      {(prediction || predictionError) && (
        <section className="panel-card mt-4 p-5 reveal-up">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="section-title">Next Semester Performance Prediction</h2>
              <p className="section-subtitle">AI-powered forecast based on your current academic profile.</p>
            </div>
            {prediction && (
              <span className="hidden shrink-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-3 py-1 text-xs font-bold text-white md:inline-block">
                Next: Semester {prediction.prediction_semester}
              </span>
            )}
          </div>
          {predictionError ? (
            <p className="mt-2 text-sm text-slate-600">{predictionError}</p>
          ) : prediction ? (
            <>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="stat-card-cyan">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                    Predicted Performance
                  </p>
                  <p className="mt-1 text-2xl font-bold">{prediction.predicted_next_semester_tier}</p>
                </div>
                <div className="stat-card-violet">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Confidence</p>
                  <p className="mt-1 text-2xl font-bold">
                    {formatValue(prediction.predicted_confidence * 100, 0)}%
                  </p>
                </div>
                <div className="stat-card-emerald">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Current SGPA</p>
                  <p className="mt-1 text-2xl font-bold">{formatValue(prediction.current_sgpa)}</p>
                </div>
                <div className="stat-card-amber">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/80">CGPA</p>
                  <p className="mt-1 text-2xl font-bold">{formatValue(prediction.cgpa)}</p>
                </div>
              </div>

              {prediction.weak_subjects && prediction.weak_subjects.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-slate-700">Areas Needing Improvement</h3>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    {prediction.weak_subjects.map((subject, idx) => (
                      <div key={idx} className="rounded-xl border-l-4 border-rose-500 bg-rose-50 p-3">
                        <p className="font-medium text-slate-800">{subject.subject}</p>
                        <p className="text-sm text-slate-600">Avg: {subject.average_marks}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {prediction.recommendations && prediction.recommendations.length > 0 && (
                <div className="mt-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                  <h3 className="text-sm font-semibold text-slate-700">Recommendations</h3>
                  <ul className="mt-2 space-y-1.5">
                    {prediction.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[10px] font-bold text-cyan-700">
                          ✓
                        </span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </section>
      )}

      {/* ===== Academic Standing (SGPA / CGPA) ===== */}
      <section className="panel-card mt-4 p-5 reveal-up">
        <h2 className="section-title">Academic Standing</h2>
        <p className="section-subtitle">Your latest SGPA and CGPA on a 10-point scale.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-100 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                Current Semester SGPA
              </p>
              <span className="text-3xl font-extrabold text-violet-900">{formatValue(currentSgpa)}</span>
            </div>
            <div className="mt-4 progress-bar bg-violet-200">
              <div
                className="progress-fill bg-gradient-to-r from-violet-500 to-purple-600"
                style={{ width: `${sgpaPercent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>0</span>
              <span>10</span>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-100 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                Cumulative CGPA
              </p>
              <span className="text-3xl font-extrabold text-amber-900">{formatValue(cgpa)}</span>
            </div>
            <div className="mt-4 progress-bar bg-amber-200">
              <div
                className="progress-fill bg-gradient-to-r from-amber-400 to-orange-500"
                style={{ width: `${cgpaPercent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>0</span>
              <span>10</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Semester GPA Trend ===== */}
      <section className="panel-card mt-4 p-5 reveal-up">
        <h2 className="section-title">Semester GPA Trend</h2>
        <p className="section-subtitle">Your SGPA progression across semesters.</p>
        {semesterStats.length ? (
          <div className="mt-4 grid gap-6 lg:grid-cols-5">
            <div className="overflow-x-auto lg:col-span-3">
              <SemesterBarChart data={semesterStats} />
            </div>
            <div className="overflow-x-auto lg:col-span-2">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Semester</th>
                    <th className="px-3 py-2 font-medium">SGPA</th>
                    <th className="px-3 py-2 font-medium">Cumulative CGPA</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterStats.map((stat) => (
                    <tr key={stat.semester} className="border-b border-slate-100 text-slate-700">
                      <td className="px-3 py-2">Semester {stat.semester}</td>
                      <td className="px-3 py-2 font-semibold text-violet-700">{formatValue(stat.sgpa)}</td>
                      <td className="px-3 py-2 font-semibold text-amber-700">{formatValue(stat.cgpa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No subject-grade semester GPA available yet.
          </p>
        )}
      </section>

      {/* ===== Attendance Overview ===== */}
      <section className="panel-card mt-4 p-5 reveal-up">
        <h2 className="section-title">Attendance Overview</h2>
        <p className="section-subtitle">Attendance percentage per course, color-coded by performance.</p>
        {attendanceByCourse.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {attendanceByCourse.map((course) => (
              <div key={course.id} className={`rounded-2xl p-5 text-white shadow-lg ${attendanceVariant(course.percentage)}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-xs font-semibold uppercase tracking-wide text-white/80">
                    {course.name}
                  </p>
                  <span className="shrink-0 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase">
                    {course.total} sessions
                  </span>
                </div>
                <p className="mt-3 text-3xl font-extrabold">{course.percentage}%</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-700"
                    style={{ width: `${course.percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/80">
                  {course.present} present · {course.total - course.present} absent
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No attendance records available.
          </p>
        )}
      </section>

      {/* ===== Subject-wise Marks ===== */}
      <section className="panel-card mt-4 p-5 reveal-up">
        <h2 className="section-title">Subject-Wise Marks</h2>
        <p className="section-subtitle">Overall subject scores color-coded by performance band.</p>
        {subjectCards.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subjectCards.map((record) => {
              const variant = subjectVariant(record.score);
              return (
                <div key={record.id} className={`${variant.card} transition hover:shadow-md`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">{record.subject}</h3>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {record.course?.code || "N/A"} · Semester {record.semester}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${variant.badge}`}>
                      {variant.label}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <p className={`text-2xl font-extrabold ${variant.text}`}>
                      {record.score !== null ? `${record.score.toFixed(1)}%` : "N/A"}
                    </p>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${variant.bar}`}
                      style={{ width: `${clampPercent(record.score ?? 0)}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-200/70 pt-3 text-center text-xs text-slate-600">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-slate-400">Quiz</span>
                      <span className="font-semibold text-slate-800">{formatValue(record.quiz_marks)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-slate-400">Assign</span>
                      <span className="font-semibold text-slate-800">{formatValue(record.assignment_marks)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-slate-400">Mid</span>
                      <span className="font-semibold text-slate-800">{formatValue(record.mid_marks)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-slate-400">Final</span>
                      <span className="font-semibold text-slate-800">{formatValue(record.marks)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No subject marks available.
          </p>
        )}
      </section>

      {/* ===== Enrolled Courses ===== */}
      <section className="panel-card mt-4 p-5 reveal-up">
        <h2 className="section-title">My Enrolled Courses</h2>
        <p className="section-subtitle">Each course now includes its chapter and topic so subject coverage is clearer.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Course</th>
                <th className="px-3 py-2 font-medium">Semester</th>
                <th className="px-3 py-2 font-medium">Teacher</th>
              </tr>
            </thead>
            <tbody>
              {enrolledCourses.length ? (
                enrolledCourses.map((course) => (
                  <tr key={course.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-2 font-semibold text-cyan-700">{course.code}</td>
                    <td className="px-3 py-2">{course.name}</td>
                    <td className="px-3 py-2">Semester {course.semester}</td>
                    <td className="px-3 py-2">{course.teacher_name}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={4}>
                    No enrolled courses available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== Chapter & Topic Marks ===== */}
      <section className="panel-card mt-4 p-5 reveal-up">
        <h2 className="section-title">Chapter & Topic Marks</h2>
        <p className="section-subtitle">Subject coverage at the chapter and topic level.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Course</th>
                <th className="px-3 py-2 font-medium">Semester</th>
                <th className="px-3 py-2 font-medium">Chapter</th>
                <th className="px-3 py-2 font-medium">Topic</th>
                <th className="px-3 py-2 font-medium">Marks</th>
              </tr>
            </thead>
            <tbody>
              {chapterTopicRecords.length ? (
                chapterTopicRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-2">{record.subject}</td>
                    <td className="px-3 py-2">{record.course?.name || "N/A"}</td>
                    <td className="px-3 py-2">Semester {record.semester}</td>
                    <td className="px-3 py-2">{record.chapter || "N/A"}</td>
                    <td className="px-3 py-2">{record.topic || "N/A"}</td>
                    <td className="px-3 py-2 font-semibold text-indigo-700">{formatValue(record.marks)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>
                    No chapter/topic marks available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== Daily Attendance History ===== */}
      <section className="panel-card mt-4 p-5 reveal-up">
        <h2 className="section-title">Daily Attendance History</h2>
        <p className="section-subtitle">A chronological log of your attendance sessions.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Course</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.length ? (
                attendanceRecords.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-2">{record.date}</td>
                    <td className="px-3 py-2">{record.course_name}</td>
                    <td className="px-3 py-2">
{record.is_present ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Present
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          Absent
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={3}>
                    No attendance records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}

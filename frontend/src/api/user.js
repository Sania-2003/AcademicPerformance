import api from "./client";

export async function fetchProfile() {
  const response = await api.get("/profile/");
  return response.data;
}

export async function updateProfile(payload) {
  const response = await api.patch("/profile/", payload);
  return response.data;
}

export async function fetchTeacherDashboard() {
  const response = await api.get("/dashboard/teacher/");
  return response.data;
}

export async function fetchStudentDashboard() {
  const response = await api.get("/dashboard/student/");
  return response.data;
}

export async function fetchAdminDashboard() {
  const response = await api.get("/dashboard/admin/");
  return response.data;
}

export async function fetchAdminUsers() {
  const response = await api.get("/admin/users/");
  return response.data;
}

export async function createAdminUser(payload) {
  const response = await api.post("/admin/users/", payload);
  return response.data;
}

export async function updateAdminUser(id, payload) {
  const response = await api.patch(`/admin/users/${id}/`, payload);
  return response.data;
}

export async function deleteAdminUser(id) {
  await api.delete(`/admin/users/${id}/`);
}

export async function fetchAdminCourses() {
  const response = await api.get("/admin/courses/");
  return response.data;
}

export async function createAdminCourse(payload) {
  const response = await api.post("/admin/courses/", payload);
  return response.data;
}

export async function updateAdminCourse(id, payload) {
  const response = await api.patch(`/admin/courses/${id}/`, payload);
  return response.data;
}

export async function deleteAdminCourse(id) {
  await api.delete(`/admin/courses/${id}/`);
}

export async function createAdminPerformanceRecord(payload) {
  const response = await api.post("/admin/performance-records/", payload);
  return response.data;
}

export async function updateAdminPerformanceRecord(id, payload) {
  const response = await api.patch(`/admin/performance-records/${id}/`, payload);
  return response.data;
}

export async function deleteAdminPerformanceRecord(id) {
  await api.delete(`/admin/performance-records/${id}/`);
}

export async function saveAdminPerformanceRecord(payload) {
  const response = await api.post("/admin/performance-records/upsert/", payload);
  return response.data;
}

export async function fetchAdminChapterTopicMarks() {
  const response = await api.get("/admin/chapter-topic-marks/");
  return response.data;
}

export async function saveAdminChapterTopicMark(payload) {
  const response = await api.post("/admin/chapter-topic-marks/", payload);
  return response.data;
}

export async function deleteAdminChapterTopicMark(id) {
  await api.delete(`/admin/chapter-topic-marks/${id}/`);
}

export async function saveAdminAttendanceRecord(payload) {
  const response = await api.post("/admin/attendance-records/upsert/", payload);
  return response.data;
}

export async function saveTeacherPerformanceRecord(payload) {
  const response = await api.post("/teacher/performance-records/", payload);
  return response.data;
}

export async function fetchTeacherChapterTopicMarks() {
  const response = await api.get("/teacher/chapter-topic-marks/");
  return response.data;
}

export async function saveTeacherChapterTopicMark(payload) {
  const response = await api.post("/teacher/chapter-topic-marks/", payload);
  return response.data;
}

export async function deleteTeacherChapterTopicMark(id) {
  await api.delete(`/teacher/chapter-topic-marks/${id}/`);
}

export async function saveTeacherAttendanceRecord(payload) {
  const response = await api.post("/teacher/attendance-records/", payload);
  return response.data;
}

export async function fetchStudentPrediction(studentId, semester) {
  const payload = { semester };
  if (studentId != null) {
    payload.student_id = studentId;
  }
  const response = await api.post("/performance/prediction/semester/", payload);
  return response.data;
}

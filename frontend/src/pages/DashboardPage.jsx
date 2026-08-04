import AdminDashboard from "./dashboards/AdminDashboard";
import StudentDashboard from "./dashboards/StudentDashboard";
import TeacherDashboard from "./dashboards/TeacherDashboard";

function parseStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    console.error("Failed to parse stored user data:", error);
    localStorage.removeItem("user");
    return {};
  }
}

export default function DashboardPage() {
  const user = parseStoredUser();

  if (user.role === "admin" || user.is_superuser) {
    return <AdminDashboard />;
  }

  if (user.role === "teacher") {
    return <TeacherDashboard />;
  }

  return <StudentDashboard />;
}

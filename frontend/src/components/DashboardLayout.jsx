import { Link, useNavigate } from "react-router-dom";
import { logout } from "../api/auth";

function parseStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (error) {
    console.error("Failed to parse stored user data:", error);
    localStorage.removeItem("user");
    return {};
  }
}

export default function DashboardLayout({ title, subtitle, children }) {
  const navigate = useNavigate();
  const currentUser = parseStoredUser();

  const onLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  const roleLabel = currentUser.role || (currentUser.is_superuser ? "admin" : "N/A");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,#dbeafe_0,transparent_35%),radial-gradient(circle_at_100%_0%,#ccfbf1_0,transparent_40%),linear-gradient(180deg,#f8fafc,#f1f5f9)]">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-transparent bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 bg-clip-text">
              Academic ERP
            </p>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-600">{subtitle}</p>
          </div>
          <nav className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <Link className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100" to="/dashboard">
              Dashboard
            </Link>
            <Link className="rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100" to="/profile">
              Profile
            </Link>
            <button
              onClick={onLogout}
              className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-700 px-3 py-2 text-sm font-medium text-white transition hover:from-slate-700 hover:to-slate-500"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        <div className="panel-card-soft mb-6 flex items-center justify-between p-4 reveal-up">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-lg font-bold text-white shadow-md">
              {(currentUser.username || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-slate-500">Signed in as</p>
              <p className="text-base font-semibold text-slate-900">{currentUser.username || "Unknown user"}</p>
            </div>
          </div>
          <span className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
            {roleLabel}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}

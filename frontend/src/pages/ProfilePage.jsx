import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { fetchProfile, updateProfile } from "../api/user";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "",
    is_superuser: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const data = await fetchProfile();
        setProfile(data);
        localStorage.setItem("user", JSON.stringify(data));
      } catch (err) {
        setError("Unable to fetch profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const updated = await updateProfile({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
      });
      setProfile(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError("Profile update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Profile" subtitle="View and edit your account details">
      <form onSubmit={onSave} className="panel-card-soft max-w-3xl p-6 reveal-up">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="section-title">User Information</h2>
            <p className="section-subtitle">Keep your profile details up to date.</p>
          </div>
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
            {profile.is_superuser ? "admin" : profile.role || "user"}
          </span>
        </div>
        {message ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
            <input
              disabled
              value={profile.username}
              className="field-input bg-slate-100 text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <input
              disabled
              value={profile.is_superuser ? "admin" : profile.role}
              className="field-input bg-slate-100 text-slate-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">First Name</label>
            <input
              value={profile.first_name}
              onChange={(e) => setProfile((prev) => ({ ...prev, first_name: e.target.value }))}
              className="field-input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Last Name</label>
            <input
              value={profile.last_name}
              onChange={(e) => setProfile((prev) => ({ ...prev, last_name: e.target.value }))}
              className="field-input"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
              className="field-input"
            />
          </div>
        </div>
        <button
          disabled={loading}
          className="btn-primary mt-6"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { useSelector } from "react-redux";
import { selectToken } from "../../redux/features/authSlice.js";
import { useGetMaterialStatsQuery } from "../../redux/api/materialsApi.js";
import { LoadingSpinner, ErrorComp, Badge } from "../../components/ui/index.jsx";
import toast from "react-hot-toast";

function useAdminData(endpoint) {
  const token = useSelector(selectToken);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  

  const fetch_ = async (params = "") => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/${endpoint}${params}`,
        { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setData(json.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return { data, loading, error, refetch: fetch_ };
}

const fetchMaterials = async (filter = matFilter, page = 1) => {
  setMaterialsLoading(true);
  try {
    const params = new URLSearchParams({ page, limit: 20 });
    if (filter.dept)   params.set("dept",   filter.dept);
    if (filter.level)  params.set("level",  filter.level);
    if (filter.term)   params.set("term",   filter.term);
    if (filter.search) params.set("search", filter.search);

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/materials?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
    );
    const json = await res.json();
    if (res.ok) {
      setMaterials(json.data);
      setMatTotal(json.total);
      setMatPage(page);
    }
  } finally {
    setMaterialsLoading(false);
  }
};

const handleDeleteMaterial = async (id, title) => {
  if (!window.confirm(`Permanently delete "${title}"?\nThis removes it from storage too.`)) return;
  const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/materials/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });
  if (res.ok) {
    toast.success("File permanently deleted.");
    setMaterials((m) => m.filter((f) => f._id !== id));
    setMatTotal((t) => t - 1);
  } else {
    const json = await res.json();
    toast.error(json.message || "Delete failed.");
  }
};

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value ?? "–"}</p>
          <p className="mt-0.5 text-sm text-gray-500">{label}</p>
          {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

// ── CR mini-card ──────────────────────────────────────────────────────────────
function CRCard({ cr }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
        {cr.name?.[0]?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{cr.name}</p>
        <p className="text-xs text-gray-500">{cr.dept} L{cr.level}T{cr.term} · {cr.uploadCount} uploads</p>
      </div>
    </div>
  );
}

// ── User row ──────────────────────────────────────────────────────────────────
function UserRow({ user, onRoleChange, onDeactivate }) {
  const ROLE_OPTIONS = ["Student", "CR", "Teacher", "Admin"];
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50">
      <td className="py-3 pl-4 pr-3 text-sm">
        <p className="font-medium text-gray-900">{user.name}</p>
        <p className="text-gray-500">{user.studentId}</p>
      </td>
      <td className="px-3 py-3 text-sm text-gray-500">{user.dept} L{user.level}T{user.term}</td>
      <td className="px-3 py-3">
        <select
          value={user.role}
          onChange={(e) => onRoleChange(user._id, e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none"
        >
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="px-3 py-3">
        <span className={`badge text-xs ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {user.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="py-3 pl-3 pr-4">
        <button
          onClick={() => onDeactivate(user._id)}
          className="text-xs text-red-500 hover:text-red-700 hover:underline"
        >
          Deactivate
        </button>
      </td>
    </tr>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const token = useSelector(selectToken);
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [matFilter, setMatFilter] = useState({ dept: "", level: "", term: "", search: "" });
  const [matPage, setMatPage] = useState(1);
  const [matTotal, setMatTotal] = useState(0);


  const fetchMaterials = async (filter = matFilter, page = 1) => {
    setMaterialsLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filter.dept)   params.set("dept",   filter.dept);
      if (filter.level)  params.set("level",  filter.level);
      if (filter.term)   params.set("term",   filter.term);
      if (filter.search) params.set("search", filter.search);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/materials?${params}`,
        { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
      );
      const json = await res.json();
      if (res.ok) {
        setMaterials(json.data);
        setMatTotal(json.total);
        setMatPage(page);
      }
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleDeleteMaterial = async (id, title) => {
    if (!window.confirm(`Permanently delete "${title}"?\nThis removes it from storage too.`)) return;
    const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/materials/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (res.ok) {
      toast.success("File permanently deleted.");
      setMaterials((m) => m.filter((f) => f._id !== id));
      setMatTotal((t) => t - 1);
    } else {
      const json = await res.json();
      toast.error(json.message || "Delete failed.");
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }, credentials: "include"
      });
      const json = await res.json();
      if (res.ok) setStats(json.data);
    } finally { setStatsLoading(false); }
  };

  const fetchUsers = async (role = "") => {
    setUsersLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/users${role ? `?role=${role}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
      );
      const json = await res.json();
      if (res.ok) setUsers(json.data);
    } finally { setUsersLoading(false); }
  };

  const handleTabChange = (t) => {
  setTab(t);
  if (t === "dashboard" && !stats) fetchStats();
  if (t === "users"     && users.length === 0) fetchUsers();
  if (t === "materials" && materials.length === 0) fetchMaterials(); // ← add
};

  const handleRoleChange = async (userId, role) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      credentials: "include",
      body: JSON.stringify({ role }),
    });
    const json = await res.json();
    if (res.ok) {
      toast.success(`Role updated to ${role}.`);
      setUsers((u) => u.map((user) => user._id === userId ? { ...user, role } : user));
    } else {
      toast.error(json.message || "Failed to update role.");
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm("Deactivate this user?")) return;
    const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/users/${userId}/deactivate`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (res.ok) {
      toast.success("User deactivated.");
      setUsers((u) => u.map((user) => user._id === userId ? { ...user, isActive: false } : user));
    }
  };

  // Load dashboard on first render
  useState(() => { fetchStats(); }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Tabs */}
      {["dashboard", "users", "materials"].map((t) => (
  <button
    key={t}
    onClick={() => handleTabChange(t)}
    className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
      tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
    }`}
  >
    {t}
  </button>
))}

      {/* Dashboard tab */}
      {tab === "dashboard" && (
        statsLoading ? <LoadingSpinner /> : !stats ? (
          <button onClick={fetchStats} className="btn-primary">Load Stats</button>
        ) : (
          <div className="space-y-6">
            {/* User stats */}
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Users</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Students"    value={stats.users.totalStudents} icon="🎓" />
                <StatCard label="CRs"         value={stats.users.totalCRs}      icon="📋" />
                <StatCard label="Teachers"    value={stats.users.totalTeachers} icon="👨‍🏫" />
                <StatCard label="Online now"  value={stats.users.activeUsers}   icon="🟢" />
              </div>
            </div>

            {/* Material stats */}
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Materials</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Files"    value={stats.materials.totalFiles}              icon="📁" />
                <StatCard label="Storage Used"   value={`${stats.materials.totalStorageMB} MB`} icon="☁️" />
                {stats.materials.byCategory.slice(0, 2).map((c) => (
                  <StatCard key={c._id} label={c._id} value={c.count} icon="📄" />
                ))}
              </div>
            </div>

            {/* CR block */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Top CRs</h2>
                <button onClick={() => handleTabChange("users")} className="text-xs text-blue-600 hover:underline">
                  View all →
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stats.crBlock.preview.map((cr) => (
                  <CRCard key={cr._id} cr={cr} />
                ))}
              </div>
            </div>

            {/* Recent uploads */}
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Uploads</h2>
              <div className="card divide-y divide-gray-50">
                {stats.materials.recentFiles.map((f) => (
                  <div key={f._id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl">📄</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{f.title}</p>
                      <p className="text-xs text-gray-500">{f.dept} · {f.category} · by {f.uploadedBy?.name}</p>
                    </div>
                    <a href={f.supabaseUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline">View</a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}

      {/* Users tab */}
      {tab === "users" && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); fetchUsers(e.target.value); }}
              className="input w-36 text-sm"
            >
              <option value="">All roles</option>
              {["Student", "CR", "Teacher", "Admin"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">{users.length} users</span>
          </div>

          {usersLoading ? <LoadingSpinner /> : (
            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {["Name / ID", "Section", "Role", "Status", ""].map((h) => (
                      <th key={h} className="py-3 px-3 text-xs font-semibold text-gray-500 first:pl-4 last:pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <UserRow key={user._id} user={user}
                      onRoleChange={handleRoleChange}
                      onDeactivate={handleDeactivate}
                    />
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-500">No users found.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Materials tab */}
{tab === "materials" && (
  <div>
    {/* Filters */}
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <input
        placeholder="Search title, course, file..."
        value={matFilter.search}
        onChange={(e) => setMatFilter((f) => ({ ...f, search: e.target.value }))}
        onKeyDown={(e) => e.key === "Enter" && fetchMaterials({ ...matFilter })}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 w-48"
      />
      <select
        value={matFilter.dept}
        onChange={(e) => {
          const f = { ...matFilter, dept: e.target.value };
          setMatFilter(f);
          fetchMaterials(f);
        }}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none"
      >
        <option value="">All Depts</option>
        {["CSE","EEE","ME","CE","TE","BBA","ENG"].map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
      <select
        value={matFilter.level}
        onChange={(e) => {
          const f = { ...matFilter, level: e.target.value };
          setMatFilter(f);
          fetchMaterials(f);
        }}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none"
      >
        <option value="">All Levels</option>
        {[1,2,3,4].map((l) => <option key={l} value={l}>L{l}</option>)}
      </select>
      <select
        value={matFilter.term}
        onChange={(e) => {
          const f = { ...matFilter, term: e.target.value };
          setMatFilter(f);
          fetchMaterials(f);
        }}
        className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:outline-none"
      >
        <option value="">All Terms</option>
        {[1,2].map((t) => <option key={t} value={t}>T{t}</option>)}
      </select>
      <button
        onClick={() => fetchMaterials(matFilter)}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
      >
        Search
      </button>
      <span className="ml-auto text-sm text-gray-500">{matTotal} files</span>
    </div>

    {/* Table */}
    {materialsLoading ? <LoadingSpinner /> : (
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {["File", "Course", "Section", "Uploaded by", "Size", ""].map((h) => (
                <th key={h} className="py-3 px-3 text-xs font-semibold text-gray-500 first:pl-4 last:pr-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m._id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 pl-4 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                      {m.fileName?.split(".").pop()?.toUpperCase()}
                    </span>
                    <div>
                      <p className="max-w-[180px] truncate text-sm font-medium text-gray-900">
                        {m.title}
                      </p>
                      <p className="text-xs text-gray-400">{m.category}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-gray-600">{m.courseCode}</td>
                <td className="px-3 py-3 text-xs text-gray-500">
                  {m.dept} L{m.level}T{m.term}
                </td>
                <td className="px-3 py-3 text-xs text-gray-500">
                  <p>{m.uploadedBy?.name}</p>
                  <p className="text-gray-400">{m.uploadedBy?.role}</p>
                </td>
                <td className="px-3 py-3 text-xs text-gray-400">
                  {m.fileSize ? `${(m.fileSize / 1024).toFixed(0)} KB` : "—"}
                </td>
                <td className="py-3 pl-3 pr-4">
                  <div className="flex items-center gap-2">
                    <a
                      href={m.supabaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDeleteMaterial(m._id, m.title)}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {materials.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                  No files found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {matTotal > 20 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <span className="text-xs text-gray-500">
              Page {matPage} of {Math.ceil(matTotal / 20)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={matPage === 1}
                onClick={() => fetchMaterials(matFilter, matPage - 1)}
                className="rounded-lg border border-gray-200 px-3 py-1 text-xs disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled={matPage >= Math.ceil(matTotal / 20)}
                onClick={() => fetchMaterials(matFilter, matPage + 1)}
                className="rounded-lg border border-gray-200 px-3 py-1 text-xs disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}
    </div>
  );
}

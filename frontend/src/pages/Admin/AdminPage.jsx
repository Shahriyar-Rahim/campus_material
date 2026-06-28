import { useState } from "react";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { useSelector } from "react-redux";
import { selectToken, selectUserRole } from "../../redux/features/authSlice.js";
import { useGetMaterialStatsQuery } from "../../redux/api/materialsApi.js";
import {
  LoadingSpinner,
  ErrorComp,
  Badge,
} from "../../components/ui/index.jsx";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

function useAdminData(endpoint) {
  const token = useSelector(selectToken);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch_ = async (params = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/${endpoint}${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setData(json.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetch_ };
}

const fetchMaterials = async (filter = matFilter, page = 1) => {
  setMaterialsLoading(true);
  try {
    const params = new URLSearchParams({ page, limit: 20 });
    if (filter.dept) params.set("dept", filter.dept);
    if (filter.level) params.set("level", filter.level);
    if (filter.term) params.set("term", filter.term);
    if (filter.search) params.set("search", filter.search);

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/materials?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, credentials: "include" },
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
  if (
    !window.confirm(
      `Permanently delete "${title}"?\nThis removes it from storage too.`,
    )
  )
    return;
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/admin/materials/${id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    },
  );
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
        <p className="text-xs text-gray-500">
          {cr.dept} L{cr.level}T{cr.term} · {cr.uploadCount} uploads
        </p>
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
      <td className="px-3 py-3 text-sm text-gray-500">
        {user.dept} L{user.level}T{user.term}
      </td>
      <td className="px-3 py-3">
        <select
          value={user.role}
          onChange={(e) => onRoleChange(user._id, e.target.value)}
          className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <span
          className={`badge text-xs ${user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
        >
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

function SessionCard({ sess, token, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchContent = async () => {
    if (content) {
      setExpanded((e) => !e);
      return;
    } // already fetched
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/sessions/${sess._id}/content`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setContent(json.data);
      setExpanded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "card overflow-hidden transition-all",
        sess.isActive ? "border-green-200" : "border-gray-200 opacity-70",
      )}
    >
      {/* Session header row */}
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={fetchContent}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className="text-xl">{expanded ? "📂" : "📁"}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{sess.name}</p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  sess.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500",
                )}
              >
                {sess.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {sess.type} {sess.year}
              {content &&
                ` · ${content.summary.totalFolders} folders · ${content.summary.totalMaterials} files · ${content.summary.depts.join(", ")}`}
            </p>
          </div>
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          ) : (
            <span className="text-gray-400 text-sm">
              {expanded ? "▲" : "▼"}
            </span>
          )}
        </button>

        <button
          onClick={() => onToggle(sess._id, sess.isActive)}
          className={cn(
            "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            sess.isActive
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-green-200 text-green-600 hover:bg-green-50",
          )}
        >
          {sess.isActive ? "Deactivate" : "Activate"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Expanded content — grouped by dept → level/term → folders */}
      {expanded && content && (
        <div className="border-t border-gray-100 p-4">
          {/* Summary strip */}
          <div className="mb-4 flex flex-wrap gap-3">
            {[
              { label: "Folders", value: content.summary.totalFolders },
              { label: "Files", value: content.summary.totalMaterials },
              {
                label: "Storage",
                value: `${(content.summary.totalSizeKB / 1024).toFixed(1)} MB`,
              },
              { label: "Depts", value: content.summary.depts.length },
              { label: "Sections", value: content.summary.sections.length },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg bg-gray-50 px-4 py-2 text-center"
              >
                <p className="text-lg font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Grouped by dept */}
          {Object.keys(content.grouped).length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No folders exist for this session yet.
            </p>
          ) : (
            Object.entries(content.grouped).map(([dept, sections]) => (
              <div key={dept} className="mb-5">
                {/* Dept heading */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-lg bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white">
                    {dept}
                  </span>
                  <div className="flex-1 border-t border-gray-100" />
                </div>

                {/* Sections */}
                {Object.entries(sections).map(([sectionKey, section]) => (
                  <div key={sectionKey} className="mb-3 ml-3">
                    <p className="mb-1.5 text-xs font-semibold text-gray-500">
                      Level {section.level} — Term {section.term}
                    </p>

                    {/* Folder chips */}
                    <div className="flex flex-wrap gap-2">
                      {section.folders.map((folder) => (
                        <div
                          key={folder._id}
                          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
                        >
                          <span className="text-sm">📁</span>
                          <div>
                            <p className="text-xs font-medium text-gray-900">
                              {folder.courseCode}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {folder.courseName}
                              {folder.materialCount > 0 &&
                                ` · ${folder.materialCount} files`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const token = useSelector(selectToken);
  const userRole = useSelector(selectUserRole);
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [matFilter, setMatFilter] = useState({
    dept: "",
    level: "",
    term: "",
    search: "",
  });
  const [matPage, setMatPage] = useState(1);
  const [matTotal, setMatTotal] = useState(0);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsTotal, setRequestsTotal] = useState(0);
  const [reqStatusFilter, setReqStatusFilter] = useState("");
  const [replyModal, setReplyModal] = useState(null); // request being replied to
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [sessionsList, setSessionsList] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [newSession, setNewSession] = useState({
    name: "",
    type: "Summer",
    year: new Date().getFullYear(),
  });
  const [sessionError, setSessionError] = useState("");
  const [routineFilter, setRoutineFilter] = useState({
    dept: "",
    level: "",
    term: "",
    session: "",
  });
  const [routineData, setRoutineData] = useState(null);
  const [routineLoading, setRoutineLoading] = useState(false);
  const [routineEntries, setRoutineEntries] = useState([]);

  const fetchMaterials = async (filter = matFilter, page = 1) => {
    setMaterialsLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filter.dept) params.set("dept", filter.dept);
      if (filter.level) params.set("level", filter.level);
      if (filter.term) params.set("term", filter.term);
      if (filter.search) params.set("search", filter.search);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/materials?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        },
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
    if (
      !window.confirm(
        `Permanently delete "${title}"?\nThis removes it from storage too.`,
      )
    )
      return;
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/materials/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      },
    );
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
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/dashboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        },
      );
      const json = await res.json();
      if (res.ok) setStats(json.data);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUsers = async (role = "") => {
    setUsersLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/users${role ? `?role=${role}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        },
      );
      const json = await res.json();
      if (res.ok) setUsers(json.data);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === "sessions" && sessionsList.length === 0) fetchSessionsList();
    if (t === "dashboard" && !stats) fetchStats();
    if (t === "users" && users.length === 0) fetchUsers();
    if (t === "materials" && materials.length === 0) fetchMaterials();
    if (t === "requests" && requests.length === 0) fetchRequests();
  };

  const handleRoleChange = async (userId, role) => {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/users/${userId}/role`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ role }),
      },
    );
    const json = await res.json();
    if (res.ok) {
      toast.success(`Role updated to ${role}.`);
      setUsers((u) =>
        u.map((user) => (user._id === userId ? { ...user, role } : user)),
      );
    } else {
      toast.error(json.message || "Failed to update role.");
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm("Deactivate this user?")) return;
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/users/${userId}/deactivate`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      },
    );
    if (res.ok) {
      toast.success("User deactivated.");
      setUsers((u) =>
        u.map((user) =>
          user._id === userId ? { ...user, isActive: false } : user,
        ),
      );
    }
  };

  // Load dashboard on first render
  useState(() => {
    fetchStats();
  }, []);

  const fetchRequests = async (status = "") => {
    setRequestsLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (status) params.set("status", status);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/requests?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        },
      );
      const json = await res.json();
      if (res.ok) {
        setRequests(json.data);
        setRequestsTotal(json.total);
      }
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/requests/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      },
    );
    if (res.ok) {
      toast.success(`Status updated to ${status}`);
      setRequests((r) =>
        r.map((req) => (req._id === id ? { ...req, status } : req)),
      );
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setReplyLoading(true);
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/requests/${replyModal._id}/reply`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ reply: replyText }),
      },
    );
    const json = await res.json();
    if (res.ok) {
      toast.success("Reply sent to student.");
      setRequests((r) =>
        r.map((req) => (req._id === replyModal._id ? json.data : req)),
      );
      setReplyModal(null);
      setReplyText("");
    } else {
      toast.error(json.message || "Failed.");
    }
    setReplyLoading(false);
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm("Delete this request?")) return;
    const res = await fetch(`${import.meta.env.VITE_API_URL}/requests/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (res.ok) {
      toast.success("Request deleted.");
      setRequests((r) => r.filter((req) => req._id !== id));
    }
  };

  const fetchSessionsList = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok) setSessionsList(json.data);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchRoutineAdmin = async () => {
  if (!routineFilter.dept || !routineFilter.level || !routineFilter.term) return;
  setRoutineLoading(true);
  try {
    const params = new URLSearchParams({
      dept:  routineFilter.dept,
      level: routineFilter.level,
      term:  routineFilter.term,
    });
    if (routineFilter.session) params.set("session", routineFilter.session);
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/routine?${params}`,
      { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
    );
    const json = await res.json();
    if (res.ok) { setRoutineData(json.data); setRoutineEntries(json.data?.schedule || []); }
    else toast.error(json.message || "Failed to load routine.");
  } finally {
    setRoutineLoading(false);
  }
};

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSessionError("");
    const res = await fetch(`${import.meta.env.VITE_API_URL}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({
        ...newSession,
        year: Number(newSession.year),
      }),
    });
    const json = await res.json();
    if (res.ok) {
      toast.success("Session created.");
      setSessionsList((s) => [json.data, ...s]);
      setNewSession({
        name: "",
        type: "Summer",
        year: new Date().getFullYear(),
      });
    } else {
      setSessionError(json.message || "Failed.");
    }
  };

  const handleToggleSession = async (id, isActive) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/sessions/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setSessionsList((s) =>
        s.map((sess) =>
          sess._id === id ? { ...sess, isActive: !isActive } : sess,
        ),
      );
      toast.success(`Session ${!isActive ? "activated" : "deactivated"}.`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Tabs */}
      {[
        "sessions",
        "dashboard",
        "users",
        "materials",
        "requests",
        "routine",
      ].map((t) => (
        <button
          key={t}
          onClick={() => handleTabChange(t)}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
            tab === t
              ? "bg-white shadow text-gray-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t}
        </button>
      ))}

      {/* Session */}
      {tab === "sessions" && (
        <div className="mt-6 space-y-6">
          {/* Create session form */}
          <div className="card p-5">
            <h3 className="mb-4 font-semibold text-gray-900">
              Create New Session
            </h3>
            {sessionError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {sessionError}
              </div>
            )}
            <form
              onSubmit={handleCreateSession}
              className="flex flex-wrap items-end gap-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Name *
                </label>
                <input
                  value={newSession.name}
                  onChange={(e) =>
                    setNewSession((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="e.g. Winter 2026"
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none w-44"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Type
                </label>
                <select
                  value={newSession.type}
                  onChange={(e) =>
                    setNewSession((s) => ({ ...s, type: e.target.value }))
                  }
                  className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none"
                >
                  {["Summer", "Winter", "Fall", "Spring"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Year
                </label>
                <input
                  type="number"
                  value={newSession.year}
                  onChange={(e) =>
                    setNewSession((s) => ({ ...s, year: e.target.value }))
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none w-24"
                  min="2020"
                  max="2040"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create
              </button>
            </form>
          </div>

          {/* Sessions list + content viewer */}
          <div>
            <h3 className="mb-3 font-semibold text-gray-900">All Sessions</h3>
            {sessionsLoading ? (
              <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
            ) : sessionsList.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                No sessions yet. Create one above.
              </div>
            ) : (
              <div className="space-y-3">
                {sessionsList.map((sess) => (
                  <SessionCard
                    key={sess._id}
                    sess={sess}
                    token={token}
                    onToggle={handleToggleSession}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Dashboard tab */}
      {tab === "dashboard" &&
        (statsLoading ? (
          <LoadingSpinner />
        ) : !stats ? (
          <button onClick={fetchStats} className="btn-primary">
            Load Stats
          </button>
        ) : (
          <div className="space-y-6">
            {/* User stats */}
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Users
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Students"
                  value={stats.users.totalStudents}
                  icon="🎓"
                />
                <StatCard label="CRs" value={stats.users.totalCRs} icon="📋" />
                <StatCard
                  label="Teachers"
                  value={stats.users.totalTeachers}
                  icon="👨‍🏫"
                />
                <StatCard
                  label="Online now"
                  value={stats.users.activeUsers}
                  icon="🟢"
                />
              </div>
            </div>

            {/* Material stats */}
            <div>
              <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Materials
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total Files"
                  value={stats.materials.totalFiles}
                  icon="📁"
                />
                <StatCard
                  label="Storage Used"
                  value={`${stats.materials.totalStorageMB} MB`}
                  icon="☁️"
                />
                {stats.materials.byCategory.slice(0, 2).map((c) => (
                  <StatCard
                    key={c._id}
                    label={c._id}
                    value={c.count}
                    icon="📄"
                  />
                ))}
              </div>
            </div>

            {/* CR block */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  Top CRs
                </h2>
                <button
                  onClick={() => handleTabChange("users")}
                  className="text-xs text-blue-600 hover:underline"
                >
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
              <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Recent Uploads
              </h2>
              <div className="card divide-y divide-gray-50">
                {stats.materials.recentFiles.map((f) => (
                  <div
                    key={f._id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <span className="text-xl">📄</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {f.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {f.dept} · {f.category} · by {f.uploadedBy?.name}
                      </p>
                    </div>
                    <a
                      href={f.supabaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

      {/* Users tab */}
      {tab === "users" && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                fetchUsers(e.target.value);
              }}
              className="input w-36 text-sm"
            >
              <option value="">All roles</option>
              {["Student", "CR", "Teacher", "Admin"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500">{users.length} users</span>
          </div>

          {usersLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {["Name / ID", "Section", "Role", "Status", ""].map((h) => (
                      <th
                        key={h}
                        className="py-3 px-3 text-xs font-semibold text-gray-500 first:pl-4 last:pr-4"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <UserRow
                      key={user._id}
                      user={user}
                      onRoleChange={handleRoleChange}
                      onDeactivate={handleDeactivate}
                    />
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-500">
                  No users found.
                </div>
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
              onChange={(e) =>
                setMatFilter((f) => ({ ...f, search: e.target.value }))
              }
              onKeyDown={(e) =>
                e.key === "Enter" && fetchMaterials({ ...matFilter })
              }
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
              {["CSE", "EEE", "ME", "CE", "TE", "BBA", "ENG"].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
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
              {[1, 2, 3, 4].map((l) => (
                <option key={l} value={l}>
                  L{l}
                </option>
              ))}
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
              {[1, 2].map((t) => (
                <option key={t} value={t}>
                  T{t}
                </option>
              ))}
            </select>
            <button
              onClick={() => fetchMaterials(matFilter)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Search
            </button>
            <span className="ml-auto text-sm text-gray-500">
              {matTotal} files
            </span>
          </div>

          {/* Table */}
          {materialsLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    {[
                      "File",
                      "Course",
                      "Section",
                      "Uploaded by",
                      "Size",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="py-3 px-3 text-xs font-semibold text-gray-500 first:pl-4 last:pr-4"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => (
                    <tr
                      key={m._id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="py-3 pl-4 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                            {m.fileName?.split(".").pop()?.toUpperCase()}
                          </span>
                          <div>
                            <p className="max-w-[180px] truncate text-sm font-medium text-gray-900">
                              {m.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {m.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {m.courseCode}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {m.dept} L{m.level}T{m.term}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        <p>{m.uploadedBy?.name}</p>
                        <p className="text-gray-400">{m.uploadedBy?.role}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400">
                        {m.fileSize
                          ? `${(m.fileSize / 1024).toFixed(0)} KB`
                          : "—"}
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
                      <td
                        colSpan={6}
                        className="py-10 text-center text-sm text-gray-400"
                      >
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
      {/* Request Tabn */}
      {tab === "requests" && (
        <div>
          {/* Filter bar */}
          <div className="mb-4 flex items-center gap-3">
            {["", "Pending", "InProgress", "Fulfilled", "Declined"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setReqStatusFilter(s);
                  fetchRequests(s);
                }}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  reqStatusFilter === s
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300",
                )}
              >
                {s || "All"}
              </button>
            ))}
            <span className="ml-auto text-sm text-gray-500">
              {requestsTotal} requests
            </span>
          </div>

          {requestsLoading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-3">
              {requests.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-400">
                  No requests found.
                </div>
              )}
              {requests.map((req) => (
                <div key={req._id} className="card p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      {req.requestedBy?.name?.[0]?.toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Header */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {req.requestedBy?.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {req.requestedBy?.studentId}
                        </span>
                        <span className="text-xs text-gray-400">
                          {req.dept} L{req.level}T{req.term}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium ml-auto",
                            req.status === "Pending"
                              ? "bg-gray-100 text-gray-600"
                              : req.status === "InProgress"
                                ? "bg-blue-100 text-blue-700"
                                : req.status === "Fulfilled"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700",
                          )}
                        >
                          {req.status}
                        </span>
                      </div>

                      {/* Course + category */}
                      <div className="mt-1 flex items-center gap-2">
                        {req.courseCode && (
                          <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                            {req.courseCode}
                          </span>
                        )}
                        {req.courseName && (
                          <span className="text-xs text-gray-500">
                            {req.courseName}
                          </span>
                        )}
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {req.category}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="mt-2 text-sm text-gray-700">
                        {req.description}
                      </p>

                      {/* Existing reply */}
                      {req.reply && (
                        <div className="mt-2 rounded-lg border-l-4 border-blue-400 bg-blue-50 px-3 py-2">
                          <p className="text-xs font-medium text-blue-700">
                            Reply by {req.repliedBy?.name} ·{" "}
                            {new Date(req.repliedAt).toLocaleDateString(
                              "en-GB",
                            )}
                          </p>
                          <p className="mt-0.5 text-sm text-blue-800">
                            {req.reply}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={req.status}
                          onChange={(e) =>
                            handleStatusChange(req._id, e.target.value)
                          }
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none"
                        >
                          {[
                            "Pending",
                            "InProgress",
                            "Fulfilled",
                            "Declined",
                          ].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => {
                            setReplyModal(req);
                            setReplyText(req.reply || "");
                          }}
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          {req.reply ? "✏️ Edit Reply" : "💬 Reply"}
                        </button>

                        {["Admin", "SuperAdmin"].includes(userRole) && (
                          <button
                            onClick={() => handleDeleteRequest(req._id)}
                            className="rounded-lg px-3 py-1 text-xs text-red-500 hover:bg-red-50"
                          >
                            🗑 Delete
                          </button>
                        )}

                        <span className="ml-auto text-xs text-gray-400">
                          {new Date(req.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply modal */}
          {replyModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setReplyModal(null)}
            >
              <div
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      Reply to Request
                    </h2>
                    <p className="text-xs text-gray-500">
                      {replyModal.requestedBy?.name} ·{" "}
                      {replyModal.courseCode || "General"} ·{" "}
                      {replyModal.category}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyModal(null)}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
                  >
                    ✕
                  </button>
                </div>

                <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  <p className="text-xs font-medium text-gray-400 mb-1">
                    Original request:
                  </p>
                  {replyModal.description}
                </div>

                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply... (this will be emailed to the student)"
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none resize-none"
                  autoFocus
                />
                <p className="mt-1 text-right text-xs text-gray-400">
                  {replyText.length}/1000
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || replyLoading}
                    className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {replyLoading ? "Sending…" : "Send Reply"}
                  </button>
                  <button
                    onClick={() => setReplyModal(null)}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Routine Tab */}
{tab === "routine" && (
  <div className="mt-6 space-y-5">
    <h2 className="font-semibold text-gray-900">Routine Management</h2>
    <p className="text-sm text-gray-500">
      View and manage class routines for any section. Use the
      <a href="/routine" className="mx-1 text-blue-600 underline">Routine page</a>
      to create and edit entries.
    </p>

    {/* Filter */}
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
      {[
        { label: "Dept",  name: "dept",  options: ["CSE","EEE","ME","CE","TE","BBA","ENG"] },
        { label: "Level", name: "level", options: [1,2,3,4] },
        { label: "Term",  name: "term",  options: [1,2] },
      ].map(({ label, name, options }) => (
        <div key={name}>
          <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
          <select
            value={routineFilter[name]}
            onChange={(e) => setRoutineFilter((f) => ({ ...f, [name]: e.target.value }))}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none"
          >
            <option value="">—</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {name === "level" ? `L${o}` : name === "term" ? `T${o}` : o}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">Session</label>
        <input
          value={routineFilter.session}
          onChange={(e) => setRoutineFilter((f) => ({ ...f, session: e.target.value }))}
          placeholder="e.g. Winter 2026"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none w-36"
        />
      </div>
      <button
        onClick={fetchRoutineAdmin}
        disabled={!routineFilter.dept || !routineFilter.level || !routineFilter.term}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Load Routine
      </button>
    </div>

    {/* Result */}
    {routineLoading ? (
      <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
    ) : !routineData ? (
      <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
        Select dept, level, term and click Load Routine.
      </div>
    ) : (
      <div className="space-y-4">
        {/* Status strip */}
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            routineData.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          )}>
            {routineData.isActive ? "Active" : "Inactive"}
          </span>
          <span className="text-xs text-gray-500">
            Session: {routineData.session}
          </span>
          {routineData.batch && (
            <span className="text-xs text-gray-500">Batch: {routineData.batch}</span>
          )}
          <span className="text-xs text-gray-500">
            {routineData.schedule?.length || 0} classes/week
          </span>
          {routineData.isActive && (
            <button
              onClick={async () => {
                const res = await fetch(
                  `${import.meta.env.VITE_API_URL}/routine/${routineData._id}/deactivate`,
                  { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
                );
                if (res.ok) {
                  setRoutineData((r) => ({ ...r, isActive: false }));
                  toast.success("Routine deactivated.");
                }
              }}
              className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              Deactivate
            </button>
          )}
        </div>

        {/* Schedule table */}
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {["Day", "Time", "Course", "Teacher", "Room", "Type"].map((h) => (
                  <th key={h} className="px-3 py-3 text-xs font-semibold text-gray-500 first:pl-4 last:pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routineData.schedule?.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                    No classes in this routine yet.
                  </td>
                </tr>
              )}
              {[...( routineData.schedule || [])].sort((a,b) => {
                const dayOrder = ["Saturday","Sunday","Monday","Tuesday","Wednesday","Thursday"];
                return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day) || a.startTime.localeCompare(b.startTime);
              }).map((entry) => (
                <tr key={entry._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 pl-4 pr-3">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {entry.day}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">
                    {entry.startTime} – {entry.endTime}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-gray-900">{entry.courseCode}</p>
                    {entry.courseName && <p className="text-xs text-gray-400">{entry.courseName}</p>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{entry.teacherName || "—"}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{entry.room || "—"}</td>
                  <td className="px-3 py-3">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      entry.type === "Lab"      ? "bg-green-100 text-green-700"  :
                      entry.type === "Tutorial" ? "bg-purple-100 text-purple-700":
                      "bg-blue-100 text-blue-700"
                    )}>
                      {entry.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
)}
    </div>
  );
}

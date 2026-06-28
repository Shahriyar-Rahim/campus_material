import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router";
import { selectCurrentUser, selectToken } from "../../redux/features/authSlice";
import {
  useGetFoldersQuery,
  useGetFolderChildrenQuery,
  useCreateFolderMutation,
  useCreateSubFolderMutation,
  useDeleteFolderMutation,
  useUpdateFolderMutation,
} from "../../redux/api/foldersApi";
import { useGetSessionsQuery } from "../../redux/api/sessionsApi";
import FolderView from "../../components/FolderView.jsx";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const DEPTS = ["CSE", "EEE", "ME", "CE", "TE", "BBA", "ENG"];
const LEVELS = [1, 2, 3, 4];
const TERMS = [1, 2];

const CATEGORY_CONFIG = [
  {
    category: "Notice",
    icon: "📢",
    color: "bg-red-50    border-red-200    text-red-700",
    desc: "Announcements",
  },
  {
    category: "Mid",
    icon: "📝",
    color: "bg-blue-50   border-blue-200   text-blue-700",
    desc: "Midterm papers",
  },
  {
    category: "Final",
    icon: "📋",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    desc: "Final papers",
  },
  {
    category: "RIB",
    icon: "📌",
    color: "bg-amber-50  border-amber-200  text-amber-700",
    desc: "Results & bulletins",
  },
  {
    category: "Lab",
    icon: "🧪",
    color: "bg-green-50  border-green-200  text-green-700",
    desc: "Lab reports",
  },
  {
    category: "Slides",
    icon: "🖥️",
    color: "bg-cyan-50   border-cyan-200   text-cyan-700",
    desc: "Lecture slides",
  },
  {
    category: "Assignment",
    icon: "✏️",
    color: "bg-pink-50   border-pink-200   text-pink-700",
    desc: "Assignments",
  },
  {
    category: "Other",
    icon: "📎",
    color: "bg-gray-50   border-gray-200   text-gray-700",
    desc: "Other files",
  },
];

const COURSE_TYPES = ["Theory", "Lab", "Theory+Lab"];
const MANAGER_ROLES = ["CR", "Teacher", "Admin", "SuperAdmin"];
const canManage = (role) => MANAGER_ROLES.includes(role);

const TYPE_BADGE = {
  Theory: "bg-blue-100   text-blue-700",
  Lab: "bg-green-100  text-green-700",
  "Theory+Lab": "bg-purple-100 text-purple-700",
};

// ─────────────────────────────────────────────────────────────────────────────
// ── Sub-components ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── Create Root Folder Modal ──────────────────────────────────────────────────
function CreateFolderModal({
  dept,
  level,
  term,
  userRole,
  onClose,
  onCreated,
  sessions = [],
  currentSession = "",
}) {
  const [createFolder, { isLoading }] = useCreateFolderMutation();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    courseCode: "",
    courseName: "",
    courseDescription: "",
    dept,
    level: String(level),
    term: String(term),
    session: currentSession,
    creditHours: "3",
    courseType: "Theory",
  });

  const sectionLocked = userRole === "CR";
  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const result = await createFolder({
      ...form,
      level: Number(form.level),
      term: Number(form.term),
      creditHours: parseFloat(form.creditHours),
    });
    if (result.error) {
      setError(result.error.data?.message || "Failed to create folder.");
    } else {
      onCreated?.();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Create Subject Folder
            </h2>
            <p className="text-xs text-gray-500">
              {dept} — L{level} T{term}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Course Code *
              </label>
              <input
                name="courseCode"
                value={form.courseCode}
                onChange={handleChange}
                placeholder="e.g. CSE-1101"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:border-blue-400 focus:outline-none"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Credits
              </label>
              <input
                name="creditHours"
                type="number"
                step="0.25"
                min="0"
                max="6"
                value={form.creditHours}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Course Name *
            </label>
            <input
              name="courseName"
              value={form.courseName}
              onChange={handleChange}
              placeholder="e.g. Computer Fundamentals"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Description (optional)
            </label>
            <input
              name="courseDescription"
              value={form.courseDescription}
              onChange={handleChange}
              placeholder="Brief description"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          {/* Session selector */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Session *
            </label>
            {sessions.length > 0 ? (
              <select
                name="session"
                value={form.session}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:border-blue-400"
                required
              >
                <option value="">Select a session</option>
                {sessions.map((s) => (
                  <option key={s._id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="session"
                value={form.session}
                onChange={handleChange}
                placeholder="e.g. Winter 2026"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                required
              />
            )}
            {sessions.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                ⚠ No sessions found. Create a session in Admin → Sessions first,
                or type one manually.
              </p>
            )}
          </div>

          {/* dept level term */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                name: "dept",
                label: "Dept *",
                options: DEPTS.map((d) => ({ value: d, label: d })),
              },
              {
                name: "level",
                label: "Level *",
                options: LEVELS.map((l) => ({ value: l, label: `L${l}` })),
              },
              {
                name: "term",
                label: "Term *",
                options: TERMS.map((t) => ({ value: t, label: `T${t}` })),
              },
            ].map(({ name, label, options }) => (
              <div key={name}>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {label}
                </label>
                <select
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  disabled={sectionLocked}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-gray-600">
              Course Type
            </label>
            <div className="flex gap-2">
              {COURSE_TYPES.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, courseType: ct }))}
                  className={cn(
                    "flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors",
                    form.courseType === ct
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
                  )}
                >
                  {ct}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Creating…" : "Create Folder"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Subfolder Modal ────────────────────────────────────────────────────
function CreateSubFolderModal({ parentFolder, onClose, onCreated }) {
  const [createSubFolder, { isLoading }] = useCreateSubFolderMutation();
  const [form, setForm] = useState({ folderName: "", description: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const result = await createSubFolder({
      parentId: parentFolder._id,
      ...form,
    });
    if (result.error) {
      setError(result.error.data?.message || "Failed to create subfolder.");
    } else {
      onCreated?.(result.data.data);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">New Subfolder</h2>
            <p className="text-xs text-gray-500">
              Inside {parentFolder.courseName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Folder name e.g. Year 2023, Spring Semester"
            value={form.folderName}
            onChange={(e) =>
              setForm((f) => ({ ...f, folderName: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            required
            autoFocus
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Bulk Upload Modal ─────────────────────────────────────────────────────────
function BulkUploadModal({
  folder,
  category,
  dept,
  level,
  term,
  onClose,
  onDone,
}) {
  const token = useSelector(selectToken);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [isDrag, setIsDrag] = useState(false);
  const [progress, setProgress] = useState(0);

  const addFiles = (newFiles) =>
    setFiles((f) => {
      const existing = new Set(f.map((x) => x.name + x.size));
      return [
        ...f,
        ...Array.from(newFiles).filter((x) => !existing.has(x.name + x.size)),
      ];
    });

  const removeFile = (i) => setFiles((f) => f.filter((_, idx) => idx !== i));

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDrag(false);
    addFiles(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("dept", dept);
    formData.append("level", String(level));
    formData.append("term", String(term));
    formData.append("courseCode", folder.courseCode);
    formData.append("category", category);
    if (folder._id) formData.append("folderId", folder._id);

    try {
      // Use XMLHttpRequest for progress tracking
      const response = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `${import.meta.env.VITE_API_URL}/materials/bulk-upload`,
        );
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.withCredentials = true;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgress(Math.round((e.loaded / e.total) * 100));
        };

        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error("Invalid response"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });

      setResults(response);
      if (response.uploaded > 0) {
        toast.success(`${response.uploaded} file(s) uploaded!`);
        onDone?.();
      }
    } catch (err) {
      setResults({ success: false, message: err.message, uploaded: 0 });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  const fmtSize = (bytes) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(0)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Bulk Upload</h2>
            <p className="text-xs text-gray-500">
              {folder.courseCode} → {category}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Results view */}
        {results ? (
          <div className="space-y-3">
            <div
              className={cn(
                "rounded-lg border px-4 py-3 text-sm font-medium",
                results.uploaded > 0
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700",
              )}
            >
              {results.message}
            </div>
            {results.errors?.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="mb-2 text-xs font-semibold text-amber-700">
                  Failed files:
                </p>
                {results.errors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-600">
                    • {e}
                  </p>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDrag(true);
              }}
              onDragLeave={() => setIsDrag(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("bulk-file-input").click()}
              className={cn(
                "mb-4 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                isDrag
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/40",
              )}
            >
              <p className="text-3xl">📎</p>
              <p className="mt-2 text-sm font-medium text-gray-600">
                Drop files here or{" "}
                <span className="text-blue-600 underline">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Up to 10 files · max 20 MB each
              </p>
            </div>
            <input
              id="bulk-file-input"
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.c,.cpp,.py,.zip,.rar,.mp4,.mp3"
              onChange={(e) => addFiles(e.target.files)}
            />

            {/* File list */}
            {files.length > 0 && (
              <div className="mb-4 max-h-44 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-50">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2">
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                      {f.name.split(".").pop()?.toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                      {f.name}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {fmtSize(f.size)}
                    </span>
                    <button
                      onClick={() => removeFile(i)}
                      className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            {files.length > 0 && (
              <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {files.length} file{files.length !== 1 ? "s" : ""} selected
                </span>
                <span>Total: {fmtSize(totalSize)}</span>
              </div>
            )}

            {/* Progress bar */}
            {uploading && (
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>Uploading…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={!files.length || uploading}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Uploading {files.length} file{files.length !== 1 ? "s" : ""}
                    …
                  </span>
                ) : (
                  `Upload ${files.length || ""} file${files.length !== 1 ? "s" : ""}`
                )}
              </button>
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── SubFolder grid (children of a folder) ─────────────────────────────────────
function SubFolderGrid({ parentId, onOpen, userRole, userId }) {
  const { data, isLoading } = useGetFolderChildrenQuery(parentId, {
    skip: !parentId,
  });
  const [deleteFolder] = useDeleteFolderMutation();
  const children = data?.data || [];

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (children.length === 0) return null;

  const userCanDelete = (folder) =>
    canManage(userRole) &&
    (["Admin", "SuperAdmin"].includes(userRole) ||
      folder.createdBy?._id?.toString() === userId);

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Subfolders
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {children.map((folder) => (
          <div
            key={folder._id}
            onClick={() => onOpen(folder)}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
          >
            <span className="text-2xl">📁</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {folder.courseName}
              </p>
              {folder.materialCount > 0 && (
                <p className="text-xs text-gray-400">
                  {folder.materialCount} files
                </p>
              )}
            </div>
            {userCanDelete(folder) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${folder.courseName}"?`)) {
                    deleteFolder({ id: folder._id });
                  }
                }}
                className="shrink-0 rounded p-1 text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100 transition-all"
              >
                🗑
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root Folder card ──────────────────────────────────────────────────────────
function FolderCard({ folder, onOpen, userRole, userId }) {
  const [deleteFolder] = useDeleteFolderMutation();
  const [updateFolder] = useUpdateFolderMutation();

  const userCanDelete =
    canManage(userRole) &&
    (["Admin", "SuperAdmin", "Teacher"].includes(userRole) ||
      folder.createdBy?._id?.toString() === userId);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (
      !window.confirm(
        `Delete "${folder.courseName}"?\nUploaded files won't be deleted.`,
      )
    )
      return;
    await deleteFolder({ id: folder._id });
  };

  const handlePin = async (e) => {
    e.stopPropagation();
    await updateFolder({ id: folder._id, isPinned: !folder.isPinned });
  };

  return (
    <div
      onClick={() => onOpen(folder)}
      className={cn(
        "card group relative cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
        folder.isPinned && "ring-2 ring-amber-300",
      )}
    >
      {folder.isPinned && (
        <span className="absolute right-3 top-3 text-base" title="Pinned">
          📌
        </span>
      )}

      {/* Header row */}
      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
          {folder.courseCode.replace("-", "").slice(0, 3)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-blue-700">
            {folder.courseCode}
          </p>
          <p className="truncate text-sm font-semibold text-gray-900 leading-tight">
            {folder.courseName}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-medium",
            TYPE_BADGE[folder.courseType],
          )}
        >
          {folder.courseType}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
          {folder.creditHours} cr
        </span>
        {folder.materialCount > 0 && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
            {folder.materialCount} files
          </span>
        )}
      </div>

      {/* Category mini strip */}
      <div className="mt-3 grid grid-cols-4 gap-1">
        {CATEGORY_CONFIG.slice(0, 4).map((c) => (
          <div
            key={c.category}
            className={cn(
              "flex flex-col items-center rounded-lg border py-1 text-center",
              c.color,
            )}
          >
            <span className="text-xs">{c.icon}</span>
            <span className="mt-0.5 text-[8px] font-medium leading-none">
              {c.category}
            </span>
          </div>
        ))}
      </div>

      {/* Manager hover actions */}
      {canManage(userRole) && (
        <div
          className="mt-3 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handlePin}
            className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            {folder.isPinned ? "📌 Unpin" : "📌 Pin"}
          </button>
          {userCanDelete && (
            <button
              onClick={handleDelete}
              className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50"
            >
              🗑 Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Filter panel ──────────────────────────────────────────────────────────────
function FilterPanel({ filter, onChange, userDept, sessions, user }) {
  return (
    <>
      {/* Mobile: compact dropdowns */}
      <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 sm:hidden w-full">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Department
            </label>
            <select
              value={filter.dept}
              onChange={(e) => onChange({ ...filter, dept: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none"
            >
              {DEPTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Semester
            </label>
            <select
              value={`${filter.level}-${filter.term}`}
              onChange={(e) => {
                const [l, t] = e.target.value.split("-").map(Number);
                onChange({ ...filter, level: l, term: t });
              }}
              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none"
            >
              {LEVELS.flatMap((l) =>
                TERMS.map((t) => (
                  <option key={`${l}-${t}`} value={`${l}-${t}`}>
                    L{l} — T{t}
                  </option>
                )),
              )}
            </select>
          </div>
        </div>
        {userDept && filter.dept !== userDept && (
          <button
            onClick={() => onChange({ ...filter, dept: userDept })}
            className="w-full rounded-lg border border-dashed border-blue-200 py-1.5 text-center text-xs font-medium text-blue-600 bg-blue-50/50"
          >
            Jump to My Dept ({userDept})
          </button>
        )}
      </div>

      {/* Desktop: sidebar */}
      <aside className="hidden sm:flex w-56 shrink-0 flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4">
        {sessions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Session
            </p>
            <select
              value={filter.session}
              onChange={(e) => onChange({ ...filter, session: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:border-blue-400"
            >
              <option value="">My Session</option>
              {sessions.map((s) => (
                <option key={s._id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            {filter.session && filter.session !== (user?.session || "") && (
              <p className="mt-1 text-xs text-amber-600">
                ⚠ Browsing past session
              </p>
            )}
          </div>
        )}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Department
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DEPTS.map((d) => (
              <button
                key={d}
                onClick={() =>
                  onChange({ dept: d, level: filter.level, term: filter.term })
                }
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                  filter.dept === d
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Level / Term
          </p>
          <div className="flex flex-col gap-1">
            {LEVELS.flatMap((l) =>
              TERMS.map((t) => {
                const isActive = filter.level === l && filter.term === t;
                return (
                  <button
                    key={`${l}-${t}`}
                    onClick={() =>
                      onChange({ dept: filter.dept, level: l, term: t })
                    }
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-blue-600 font-semibold text-white"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <span>
                      Level {l} — Term {t}
                    </span>
                    {isActive && <span className="text-xs opacity-75">●</span>}
                  </button>
                );
              }),
            )}
          </div>
        </div>

        {userDept && (
          <button
            onClick={() =>
              onChange({
                dept: userDept,
                level: filter.level,
                term: filter.term,
              })
            }
            className="rounded-lg border border-dashed border-blue-300 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
          >
            Jump to my dept ({userDept})
          </button>
        )}
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Page ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export default function MaterialsPage() {
  const user = useSelector(selectCurrentUser);
  const [searchParams] = useSearchParams();
  const { data: sessionsData } = useGetSessionsQuery();
  const sessions = sessionsData?.data || [];

  // ── Filter ────────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState({
    dept: searchParams.get("dept") || user?.dept || "CSE",
    level: Number(searchParams.get("level") || user?.level || 1),
    term: Number(searchParams.get("term") || user?.term || 1),
    session: searchParams.get("session") || user?.session || "",
  });

  // ── Navigation stack ──────────────────────────────────────────────────────
  // folderStack[0] = root course folder
  // folderStack[1] = subfolder inside it
  // etc.
  const [folderStack, setFolderStack] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubFolderModal, setShowSubFolderModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const userRole = user?.role;
  const userId = user?._id?.toString();

  // Current folder = top of stack
  const currentFolder = folderStack[folderStack.length - 1] || null;

  // ── Fetch root folders ────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useGetFoldersQuery(
    { ...filter },
    {
      skip: !filter.dept,
    },
  );
  const folders = data?.data || [];

  // ── URL param auto-navigation (from Dashboard) ────────────────────────────
  const initCourseCode = searchParams.get("courseCode");
  const initCategory = searchParams.get("category");

  useEffect(() => {
    if (
      initCourseCode &&
      initCategory &&
      folders.length > 0 &&
      folderStack.length === 0
    ) {
      const match = folders.find((f) => f.courseCode === initCourseCode);
      if (match) {
        setFolderStack([match]);
        setSelectedCategory(initCategory);
      }
    }
  }, [folders]);

  // ── Navigation helpers ────────────────────────────────────────────────────
  const pushFolder = (folder) => {
    setFolderStack((s) => [...s, folder]);
    setSelectedCategory(null);
  };

  const popFolder = () => {
    setFolderStack((s) => s.slice(0, -1));
    setSelectedCategory(null);
  };

  const goToRoot = () => {
    setFolderStack([]);
    setSelectedCategory(null);
  };

  const goToDepth = (index) => {
    setFolderStack((s) => s.slice(0, index + 1));
    setSelectedCategory(null);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setFolderStack([]);
    setSelectedCategory(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const atRoot = folderStack.length === 0;
  const inFolder = folderStack.length > 0 && !selectedCategory;
  const inFileView = folderStack.length > 0 && !!selectedCategory;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Page header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Materials</h1>
          <p className="text-sm text-gray-500">
            {filter.dept} — Level {filter.level} Term {filter.term}
          </p>
        </div>
        {canManage(userRole) && atRoot && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Folder
          </button>
        )}
        {canManage(userRole) && inFolder && (
          <button
            onClick={() => setShowSubFolderModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            📁 New Subfolder
          </button>
        )}
        {canManage(userRole) && inFileView && (
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            📎 Bulk Upload
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {/* ── Left: Filter panel ───────────────────────────────────────────── */}
        <FilterPanel
          filter={filter}
          onChange={handleFilterChange}
          userDept={user?.dept}
          sessions={sessions}
          user={user}
        />

        {/* ── Right: Content ───────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
          {/* Dynamic breadcrumb */}
          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <span
              onClick={goToRoot}
              className={cn(
                atRoot && !selectedCategory
                  ? "font-medium text-gray-900"
                  : "cursor-pointer hover:text-gray-900",
              )}
            >
              {filter.dept} L{filter.level}T{filter.term}
            </span>

            {folderStack.map((folder, i) => (
              <span key={folder._id} className="flex items-center gap-1.5">
                <span className="text-gray-300">/</span>
                <span
                  onClick={() => goToDepth(i)}
                  className={cn(
                    i === folderStack.length - 1 && !selectedCategory
                      ? "font-medium text-gray-900"
                      : "cursor-pointer hover:text-gray-900",
                  )}
                >
                  {folder.courseCode}
                </span>
              </span>
            ))}

            {selectedCategory && (
              <>
                <span className="text-gray-300">/</span>
                <span className="font-medium text-gray-900">
                  {selectedCategory}
                </span>
              </>
            )}
          </nav>

          {/* ── VIEW 1: Root folder grid ─────────────────────────────────── */}
          {atRoot && (
            <>
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-48 animate-pulse rounded-xl bg-gray-100"
                    />
                  ))}
                </div>
              ) : isError ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-red-100 bg-red-50 py-12 text-center">
                  <p className="text-2xl">⚠️</p>
                  <p className="mt-2 text-sm text-red-600">
                    Failed to load folders.
                  </p>
                  <button
                    onClick={refetch}
                    className="mt-3 text-sm text-blue-600 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : folders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
                  <span className="text-5xl">📂</span>
                  <p className="mt-3 font-medium text-gray-700">
                    No subject folders yet
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    for {filter.dept} Level {filter.level} Term {filter.term}
                  </p>
                  {canManage(userRole) ? (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-5 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      + Create First Folder
                    </button>
                  ) : (
                    <p className="mt-3 text-xs text-gray-400">
                      Ask your CR or Teacher to create course folders.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {folders.length} course{folders.length !== 1 ? "s" : ""}
                    </span>
                    {canManage(userRole) && (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        + Add course
                      </button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {folders.map((folder) => (
                      <FolderCard
                        key={folder._id}
                        folder={folder}
                        onOpen={pushFolder}
                        userRole={userRole}
                        userId={userId}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── VIEW 2: Inside a folder — subfolders + category picker ─────── */}
          {inFolder && currentFolder && (
            <div>
              <button
                onClick={popFolder}
                className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
              >
                ← Back
              </button>

              {/* Course info strip */}
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white">
                  {currentFolder.courseCode.replace("-", "").slice(0, 3)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">
                    {currentFolder.courseName}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                    <span>{currentFolder.courseCode}</span>
                    <span>·</span>
                    <span>{currentFolder.creditHours} cr</span>
                    <span>·</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-medium",
                        TYPE_BADGE[currentFolder.courseType],
                      )}
                    >
                      {currentFolder.courseType}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subfolders */}
              <SubFolderGrid
                parentId={currentFolder._id}
                onOpen={pushFolder}
                userRole={userRole}
                userId={userId}
              />

              {/* Category picker */}
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Browse by Category
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORY_CONFIG.map((c) => (
                  <button
                    key={c.category}
                    onClick={() => setSelectedCategory(c.category)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-3 text-left transition-all hover:scale-[1.02] hover:shadow-sm",
                      c.color,
                    )}
                  >
                    <span className="text-xl">{c.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{c.category}</p>
                      <p className="text-[10px] opacity-70">{c.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── VIEW 3: File inbox (FolderView) ──────────────────────────── */}
          {inFileView && currentFolder && (
            <div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
              >
                ← Back to {currentFolder.courseCode}
              </button>
              <FolderView
                courseCode={currentFolder.courseCode}
                courseName={currentFolder.courseName}
                category={selectedCategory}
                dept={filter.dept}
                level={filter.level}
                term={filter.term}
                session={filter.session || user?.session}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {showCreateModal && (
        <CreateFolderModal
          dept={filter.dept}
          level={filter.level}
          term={filter.term}
          userRole={userRole}
          sessions={sessions}
          currentSession={filter.session || user?.session || ""}
          onClose={() => setShowCreateModal(false)}
          onCreated={refetch}
        />
      )}

      {showSubFolderModal && currentFolder && (
        <CreateSubFolderModal
          parentFolder={currentFolder}
          onClose={() => setShowSubFolderModal(false)}
          onCreated={() => setShowSubFolderModal(false)}
        />
      )}

      {showBulkUpload && currentFolder && selectedCategory && (
        <BulkUploadModal
          folder={currentFolder}
          category={selectedCategory}
          dept={filter.dept}
          level={filter.level}
          term={filter.term}
          onClose={() => setShowBulkUpload(false)}
          onDone={() => setShowBulkUpload(false)}
        />
      )}
    </div>
  );
}

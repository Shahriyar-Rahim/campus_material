/**
 * MaterialsPage.jsx — Campus Materials Portal
 *
 * Layout:
 *  ┌────────────────────────────────────────────────────┐
 *  │ LEFT PANEL (filter)   │ RIGHT PANEL (content)      │
 *  │                       │                            │
 *  │  Dept selector        │  [No folder selected]      │
 *  │  L1T1 → L4T2 tabs    │   Subject folder grid       │
 *  │                       │  OR                        │
 *  │                       │   FolderView (files list)  │
 *  └────────────────────────────────────────────────────┘
 *
 * Flow:
 *  1. User picks Dept + Level + Term from filter panel
 *  2. Subject folders for that section load in the grid
 *  3. CR/Teacher/Admin can click "+ New Folder" to create one
 *  4. Clicking a folder card opens the category picker
 *  5. Picking a category opens FolderView (file inbox)
 */

import { useState, useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useSearchParams } from "react-router";
import { selectCurrentUser } from "../../redux/features/authSlice";
import {
  useGetFoldersQuery,
  useCreateFolderMutation,
  useDeleteFolderMutation,
  useUpdateFolderMutation,
} from "../../redux/api/foldersApi";
import FolderView from "../../components/FolderView.jsx";
import { cn } from "../../utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────────
const DEPTS  = ["CSE", "EEE", "ME", "CE", "TE", "BBA", "ENG"];
const LEVELS = [1, 2, 3, 4];
const TERMS  = [1, 2];

const CATEGORY_CONFIG = [
  { category: "Notice",     icon: "📢", color: "bg-red-50    border-red-200    text-red-700",    desc: "Announcements" },
  { category: "Mid",        icon: "📝", color: "bg-blue-50   border-blue-200   text-blue-700",   desc: "Midterm papers" },
  { category: "Final",      icon: "📋", color: "bg-purple-50 border-purple-200 text-purple-700", desc: "Final papers"   },
  { category: "RIB",        icon: "📌", color: "bg-amber-50  border-amber-200  text-amber-700",  desc: "Results & bulletins" },
  { category: "Lab",        icon: "🧪", color: "bg-green-50  border-green-200  text-green-700",  desc: "Lab reports"    },
  { category: "Slides",     icon: "🖥️",  color: "bg-cyan-50   border-cyan-200   text-cyan-700",   desc: "Lecture slides" },
  { category: "Assignment", icon: "✏️",  color: "bg-pink-50   border-pink-200   text-pink-700",   desc: "Assignments"    },
  { category: "Other",      icon: "📎", color: "bg-gray-50   border-gray-200   text-gray-700",   desc: "Other files"    },
];

const COURSE_TYPES = ["Theory", "Lab", "Theory+Lab"];

const MANAGER_ROLES = ["CR", "Teacher", "Admin", "SuperAdmin"];
const canManage = (role) => MANAGER_ROLES.includes(role);

// ── Create Folder Modal ───────────────────────────────────────────────────────
function CreateFolderModal({ dept, level, term, onClose, onCreated, userRole }) {
  const [createFolder, { isLoading }] = useCreateFolderMutation();
  const [form, setForm] = useState({
    courseCode: "",
    courseName: "",
    courseDescription: "",
    dept: dept,
    level: String(level),
    term: String(term),
    creditHours: "3",
    courseType: "Theory",
  });
  const [error, setError] = useState("");

  // CRs are locked to their own section
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
      creditHours: Number(form.creditHours),
    });
    if (result.error) {
      setError(result.error.data?.message || "Failed to create folder.");
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
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
          {/* Course code + name */}
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
              placeholder="Brief description of the course"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          {/* Section selectors — locked for CRs */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Dept *
              </label>
              <select
                name="dept"
                value={form.dept}
                onChange={handleChange}
                disabled={sectionLocked}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
                required
              >
                {DEPTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Level *
              </label>
              <select
                name="level"
                value={form.level}
                onChange={handleChange}
                disabled={sectionLocked}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>L{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Term *
              </label>
              <select
                name="term"
                value={form.term}
                onChange={handleChange}
                disabled={sectionLocked}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>T{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Course type */}
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
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
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

// ── Category picker modal ─────────────────────────────────────────────────────
function CategoryModal({ folder, onClose, onSelect }) {
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
            <h2 className="font-semibold text-gray-900">{folder.courseName}</h2>
            <p className="text-xs text-gray-500">
              {folder.courseCode} · {folder.creditHours} cr · {folder.courseType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-400">Select a category to browse:</p>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORY_CONFIG.map((c) => (
            <button
              key={c.category}
              onClick={() => onSelect(folder, c.category)}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-3 text-left transition-all hover:scale-[1.02] hover:shadow-sm",
                c.color
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
    </div>
  );
}

// ── Subject Folder card ───────────────────────────────────────────────────────
function FolderCard({ folder, onOpen, onDelete, userRole, userId }) {
  const [deleteFolder] = useDeleteFolderMutation();
  const [updateFolder] = useUpdateFolderMutation();

  const userCanDelete =
    canManage(userRole) &&
    (userRole !== "CR" || folder.createdBy?._id?.toString() === userId);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${folder.courseName}"? This won't delete uploaded files.`)) return;
    await deleteFolder({ id: folder._id });
  };

  const handlePin = async (e) => {
    e.stopPropagation();
    await updateFolder({ id: folder._id, isPinned: !folder.isPinned });
  };

  const TYPE_BADGE = {
    Theory:      "bg-blue-100 text-blue-700",
    Lab:         "bg-green-100 text-green-700",
    "Theory+Lab":"bg-purple-100 text-purple-700",
  };

  return (
    <div
      onClick={() => onOpen(folder)}
      className={cn(
        "card group relative cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:shadow-md",
        folder.isPinned && "ring-2 ring-amber-300"
      )}
    >
      {/* Pin ribbon */}
      {folder.isPinned && (
        <span className="absolute right-3 top-3 text-base" title="Pinned">📌</span>
      )}

      {/* Header */}
      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
          {folder.courseCode.split("-")[0]?.[0] || "📁"}
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

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className={cn("rounded-full px-2 py-0.5 font-medium", TYPE_BADGE[folder.courseType])}>
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
              c.color
            )}
          >
            <span className="text-xs">{c.icon}</span>
            <span className="mt-0.5 text-[8px] font-medium leading-none">
              {c.category}
            </span>
          </div>
        ))}
      </div>

      {/* Manager actions */}
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
function FilterPanel({ filter, onChange, userRole, userDept }) {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:w-56">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Department
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DEPTS.map((d) => (
            <button
              key={d}
              onClick={() => onChange({ dept: d, level: filter.level, term: filter.term })}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                filter.dept === d
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
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
          {LEVELS.map((l) =>
            TERMS.map((t) => {
              const isActive = filter.level === l && filter.term === t;
              return (
                <button
                  key={`${l}-${t}`}
                  onClick={() => onChange({ dept: filter.dept, level: l, term: t })}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-blue-600 font-semibold text-white"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <span>Level {l} — Term {t}</span>
                  {isActive && <span className="text-xs opacity-80">●</span>}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Quick jump to my section */}
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
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MaterialsPage() {
  const user = useSelector(selectCurrentUser);
  const [searchParams] = useSearchParams();

  // Filter state — default to user's own section
  const [filter, setFilter] = useState({
    dept:  searchParams.get("dept")  || user?.dept  || "CSE",
    level: Number(searchParams.get("level") || user?.level || 1),
    term:  Number(searchParams.get("term")  || user?.term  || 1),
  });
  const initCourseCode = searchParams.get("courseCode");
  const initCategory   = searchParams.get("category");

  // Drill-down state
  const [selectedFolder,   setSelectedFolder]   = useState(null); // SubjectFolder doc
  const [selectedCategory, setSelectedCategory] = useState(null); // string e.g. "Mid"
  const [showCreateModal,  setShowCreateModal]   = useState(false);
  const [categoryModal,    setCategoryModal]     = useState(null); // folder waiting for category pick
  

  const userRole = user?.role;
  const userId   = user?._id?.toString();

  // Fetch folders for current filter
  const { data, isLoading, isError, refetch } = useGetFoldersQuery(filter, { skip: !filter.dept });
  const folders = data?.data || [];

  // Auto-select folder from URL params (dashboard navigation)
  useEffect(() => {
    if (initCourseCode && initCategory && folders.length > 0) {
      const match = folders.find((f) => f.courseCode === initCourseCode);
      if (match) {
        setSelectedFolder(match);
        setSelectedCategory(initCategory);
      }
    }
  }, [folders, initCourseCode, initCategory]);

  // Change filter → reset drill-down
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSelectedFolder(null);
    setSelectedCategory(null);
  };

  // Open category picker for a folder
  const handleOpenFolder = (folder) => {
    setCategoryModal(folder);
  };

  // Category selected → open FolderView
  const handleCategorySelect = (folder, category) => {
    setSelectedFolder(folder);
    setSelectedCategory(category);
    setCategoryModal(null);
  };

  // Back to folder grid
  const handleBack = () => {
    setSelectedFolder(null);
    setSelectedCategory(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
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
        {canManage(userRole) && !selectedFolder && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Folder
          </button>
        )}
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">

        {/* ── Left: Filter panel ──────────────────────────────────────────── */}
        <FilterPanel
          filter={filter}
          onChange={handleFilterChange}
          userRole={userRole}
          userDept={user?.dept}
        />

        {/* ── Right: Content area ─────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">

          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
            <span
              onClick={handleBack}
              className={cn(
                selectedFolder ? "cursor-pointer hover:text-gray-900" : "text-gray-900 font-medium"
              )}
            >
              {filter.dept} L{filter.level}T{filter.term}
            </span>
            {selectedFolder && (
              <>
                <span>/</span>
                <span
                  onClick={handleBack}
                  className="cursor-pointer hover:text-gray-900"
                >
                  {selectedFolder.courseCode}
                </span>
                <span>/</span>
                <span className="font-medium text-gray-900">{selectedCategory}</span>
              </>
            )}
          </nav>

          {/* ── FolderView (drill-down) ──────────────────────────────────── */}
          {selectedFolder && selectedCategory ? (
            <div>
              <button
                onClick={handleBack}
                className="mb-4 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
              >
                ← Back to {selectedFolder.courseCode}
              </button>
              <FolderView
                courseCode={selectedFolder.courseCode}
                courseName={selectedFolder.courseName}
                category={selectedCategory}
                dept={filter.dept}
                level={filter.level}
                term={filter.term}
              />
            </div>

          ) : (
            /* ── Folder grid ────────────────────────────────────────────── */
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
                  <p className="mt-2 text-sm text-red-600">Failed to load folders.</p>
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
                  {canManage(userRole) && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-5 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      + Create First Folder
                    </button>
                  )}
                  {!canManage(userRole) && (
                    <p className="mt-3 text-xs text-gray-400">
                      Ask your CR or Teacher to create course folders.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {/* Stats bar */}
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

                  {/* Grid */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {folders.map((folder) => (
                      <FolderCard
                        key={folder._id}
                        folder={folder}
                        onOpen={handleOpenFolder}
                        userRole={userRole}
                        userId={userId}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {showCreateModal && (
        <CreateFolderModal
          dept={filter.dept}
          level={filter.level}
          term={filter.term}
          userRole={userRole}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => refetch()}
        />
      )}

      {categoryModal && (
        <CategoryModal
          folder={categoryModal}
          onClose={() => setCategoryModal(null)}
          onSelect={handleCategorySelect}
        />
      )}
    </div>
  );
}

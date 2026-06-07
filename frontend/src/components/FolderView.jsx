import { useState, useRef, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../redux/features/authSlice";
import {
  useGetMaterialsQuery,
  useUploadMaterialMutation,
  usePinMaterialMutation,
  useUnpinMaterialMutation,
  useDeleteMaterialMutation,
  useForwardMaterialMutation,
  parseUploadError,
} from "../redux/api/materialsApi";
import { useSocket } from "../utils/useSocket";
import { cn } from "../utils/cn";

const ROLES = {
  canUpload:  ["CR", "Teacher", "Admin", "SuperAdmin"],
  canPin:     ["CR", "Teacher", "Admin", "SuperAdmin"],
  canDelete:  ["CR", "Teacher", "Admin", "SuperAdmin"],
  canForward: ["Admin", "SuperAdmin"],
};
const can = (role, action) => ROLES[action]?.includes(role) ?? false;

function RateLimitBanner({ resetAt, retryAfterSeconds, message }) {
  const [secondsLeft, setSecondsLeft] = useState(retryAfterSeconds || 60);

  useEffect(() => {
    const target = resetAt
      ? new Date(resetAt).getTime()
      : Date.now() + secondsLeft * 1000;
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, [resetAt]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <span className="text-xl">⏱</span>
      <div className="flex-1">
        <p className="font-medium">{message}</p>
        <p className="mt-0.5 text-amber-600">
          {secondsLeft > 0
            ? `You can upload again in ${mins > 0 ? `${mins}m ` : ""}${secs}s`
            : "You can upload again now — refresh the page."}
        </p>
      </div>
    </div>
  );
}

function ForwardModal({ material, onClose, onForward }) {
  const [targets, setTargets] = useState([{ dept: "", level: "", term: "" }]);

  const addTarget = () =>
    setTargets((t) => [...t, { dept: "", level: "", term: "" }]);

  const updateTarget = (i, field, value) =>
    setTargets((t) =>
      t.map((item, idx) => (idx === i ? { ...item, [field]: value } : item))
    );

  const removeTarget = (i) =>
    setTargets((t) => t.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    const valid = targets.filter((t) => t.dept && t.level && t.term);
    if (!valid.length) return;
    onForward(material._id, valid);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Forward Material</h2>
            <p className="max-w-[280px] truncate text-xs text-gray-500">
              {material.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="max-h-60 space-y-3 overflow-y-auto">
          {targets.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                placeholder="Dept e.g. CSE"
                value={t.dept}
                onChange={(e) =>
                  updateTarget(i, "dept", e.target.value.toUpperCase())
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
              <select
                value={t.level}
                onChange={(e) => updateTarget(i, "level", e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none"
              >
                <option value="">L</option>
                {[1, 2, 3, 4].map((l) => (
                  <option key={l} value={l}>
                    L{l}
                  </option>
                ))}
              </select>
              <select
                value={t.term}
                onChange={(e) => updateTarget(i, "term", e.target.value)}
                className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none"
              >
                <option value="">T</option>
                {[1, 2].map((tm) => (
                  <option key={tm} value={tm}>
                    T{tm}
                  </option>
                ))}
              </select>
              {targets.length > 1 && (
                <button
                  onClick={() => removeTarget(i)}
                  className="text-lg leading-none text-red-400 hover:text-red-600"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addTarget}
          className="mt-2 text-xs text-blue-600 hover:underline"
        >
          + Add another target
        </button>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Forward
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function FileRow({ material, userRole, userId, onPin, onUnpin, onDelete, onForward }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const ext = material.fileName?.split(".").pop()?.toUpperCase() || "FILE";
  const sizeKB = material.fileSize
    ? `${(material.fileSize / 1024).toFixed(0)} KB`
    : "";

  const extColors = {
    PDF:  "bg-red-100 text-red-700",
    DOCX: "bg-blue-100 text-blue-700",
    DOC:  "bg-blue-100 text-blue-700",
    PPTX: "bg-orange-100 text-orange-700",
    PPT:  "bg-orange-100 text-orange-700",
    PNG:  "bg-purple-100 text-purple-700",
    JPG:  "bg-purple-100 text-purple-700",
    JPEG: "bg-purple-100 text-purple-700",
    C:    "bg-gray-800 text-white",
    CPP:  "bg-blue-800 text-white",
    PY:   "bg-yellow-100 text-yellow-700",
    MP4:  "bg-indigo-100 text-indigo-700",
    ZIP:  "bg-amber-100 text-amber-700",
  };

  // Fine-grained permission checks per row
  const userCanPin = can(userRole, "canPin");
  const userCanForward = can(userRole, "canForward");
  // CRs can only delete their own uploads
  const userCanDelete = 
  userRole === "SuperAdmin" || 
  userRole === "Admin" || 
  userRole === "Teacher" || 
  (userRole === "CR" && material.uploadedBy?._id?.toString() === userId);

  const showMoreMenu = userCanPin || userCanDelete || userCanForward;

  return (
    <li
      className={cn(
        "group relative flex items-center gap-3 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50",
        material.isPinned && "bg-amber-50/60 hover:bg-amber-50"
      )}
    >
      {/* Pinned strip */}
      {material.isPinned && (
        <span className="absolute inset-y-0 left-0 w-1 rounded-l bg-amber-400" />
      )}

      {/* File type badge */}
      <span
        className={cn(
          "flex h-8 w-12 shrink-0 items-center justify-center rounded text-xs font-bold",
          extColors[ext] || "bg-gray-100 text-gray-600"
        )}
      >
        {ext}
      </span>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {material.isPinned && (
            <span className="text-xs text-amber-600" title="Pinned">
              📌
            </span>
          )}
          <a
            href={material.supabaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-medium text-gray-900 hover:text-blue-600 hover:underline"
          >
            {material.title}
          </a>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
          <span>by {material.uploadedBy?.name}</span>
          <span>·</span>
          <span>
            {new Date(material.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          {sizeKB && (
            <>
              <span>·</span>
              <span>{sizeKB}</span>
            </>
          )}
          {material.isForwarded && (
            <>
              <span>·</span>
              <span className="text-blue-500">Forwarded</span>
            </>
          )}
        </p>
      </div>

      {/* Download count */}
      <span className="hidden shrink-0 text-xs text-gray-400 sm:block">
        {material.downloadCount > 0 && `↓ ${material.downloadCount}`}
      </span>

      <div className="flex shrink-0 items-center gap-1">

        {/* VIEW — everyone */}
        <a
          href={material.supabaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="View"
          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path
              fillRule="evenodd"
              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
              clipRule="evenodd"
            />
          </svg>
        </a>

        {/* DOWNLOAD — everyone */}
        <a
          href={material.supabaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          title="Download"
          className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </a>

        {/* ⋯ MORE — CR / Teacher / Admin / SuperAdmin only */}
        {showMoreMenu && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              title="More actions"
              className="rounded p-1.5 text-gray-400 opacity-0 hover:bg-gray-200 hover:text-gray-700 group-hover:opacity-100 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {/* Pin / Unpin */}
                {userCanPin &&
                  (material.isPinned ? (
                    <button
                      onClick={() => {
                        onUnpin(material._id);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      📌 Unpin
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        onPin(material._id);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      📌 Pin to top
                    </button>
                  ))}

                {/* Forward — Admin / SuperAdmin */}
                {userCanForward && (
                  <button
                    onClick={() => {
                      onForward(material);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    ↗ Forward
                  </button>
                )}

                {/* Divider before destructive */}
                {userCanDelete && (userCanPin || userCanForward) && (
                  <div className="my-1 border-t border-gray-100" />
                )}

                {/* Delete */}
                {userCanDelete && (
                  <button
                    onClick={() => {
                      onDelete(material._id);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    🗑 Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function PresenceStrip({ courseCode }) {
  const [buddies, setBuddies] = useState([]);
  const { socket, sendNudge } = useSocket();

  useEffect(() => {
    if (!socket || !courseCode) return;
    socket.emit("join_course", { courseCode });
    socket.on("presence_update", ({ courseCode: code, users }) => {
      if (code === courseCode) setBuddies(users);
    });
    return () => {
      socket.emit("leave_course", { courseCode });
      socket.off("presence_update");
    };
  }, [socket, courseCode]);

  if (buddies.length === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
      <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
      <span className="font-medium text-green-700">Studying now:</span>
      <div className="flex items-center gap-1.5">
        {buddies.slice(0, 5).map((b) => (
          <button
            key={b.userId}
            onClick={() => sendNudge(b.userId, courseCode)}
            title={`Nudge ${b.name}`}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800 hover:bg-green-300 transition-colors"
          >
            {b.name[0].toUpperCase()}
          </button>
        ))}
        {buddies.length > 5 && (
          <span className="text-xs text-green-600">
            +{buddies.length - 5} more
          </span>
        )}
      </div>
      <span className="ml-auto text-xs text-green-600">Tap avatar to nudge</span>
    </div>
  );
}

const ROLE_HINTS = {
  Student:    "You can view and download files",
  CR:         "You can upload, pin, and delete your own files",
  Teacher:    "You can upload, pin, and delete files",
  Admin:      "You can upload, pin, delete, and forward files",
  SuperAdmin: "You can upload, pin, delete, and forward files",
};

const ROLE_PILL = {
  Student:    "bg-gray-100 text-gray-600",
  CR:         "bg-blue-100 text-blue-700",
  Teacher:    "bg-purple-100 text-purple-700",
  Admin:      "bg-amber-100 text-amber-700",
  SuperAdmin: "bg-red-100 text-red-700",
};

export default function FolderView({
  courseCode,
  courseName,
  category,
  dept,
  level,
  term,
}) {
  const currentUser  = useSelector(selectCurrentUser);
  const fileInputRef = useRef(null);
  const dropZoneRef  = useRef(null);

  const [isDragOver, setIsDragOver]       = useState(false);
  const [selectedFile, setSelectedFile]   = useState(null);
  const [uploadForm, setUploadForm]       = useState({ title: "", description: "" });
  const [forwardTarget, setForwardTarget] = useState(null);

  const userRole = currentUser?.role;
  const userId   = currentUser?._id?.toString();
  const userCanUpload = can(userRole, "canUpload");

  // RTK Query
  const { data, isLoading, isError, refetch } = useGetMaterialsQuery(
    { dept, level, term, category, courseCode },
    { skip: !dept || !level || !term }
  );

  const [uploadMaterial, uploadResult] = useUploadMaterialMutation();
  const [pinMaterial]                  = usePinMaterialMutation();
  const [unpinMaterial]                = useUnpinMaterialMutation();
  const [deleteMaterial]               = useDeleteMaterialMutation();
  const [forwardMaterial]              = useForwardMaterialMutation();

  const { isRateLimited, rateLimitInfo, errorMessage } = parseUploadError(
    uploadResult.error
  );

  // File selection
  const handleFileSelect = useCallback(
    (file) => {
      if (!file) return;
      setSelectedFile(file);
      if (!uploadForm.title) {
        setUploadForm((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, "") }));
      }
    },
    [uploadForm.title]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadForm({ title: "", description: "" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Upload
  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", uploadForm.title);
    formData.append("description", uploadForm.description);
    formData.append("category", category);
    formData.append("courseCode", courseCode);
    formData.append("courseName", courseName || "");
    formData.append("dept", dept);
    formData.append("level", String(level));
    formData.append("term", String(term));

    const result = await uploadMaterial(formData);
    if (!result.error) clearFile();
  };

  // Delete
  const handleDelete = (id) => {
    if (window.confirm("Delete this file? This cannot be undone.")) {
      deleteMaterial({ id });
    }
  };

  // Forward
  const handleForward = (materialId, targets) => {
    forwardMaterial({ id: materialId, targets });
  };

  const materials = data?.data || [];
  const total     = data?.total || 0;

  return (
    <div className="flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {category} — {courseCode}
          </h2>
          <p className="text-sm text-gray-500">
            {total} file{total !== 1 ? "s" : ""}
          </p>
        </div>
        {userCanUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRateLimited}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isRateLimited
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
            )}
          >
            ↑ Upload File
          </button>
        )}
      </div>

      {/* Role hint pill */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className={cn("rounded-full px-2 py-0.5 font-medium", ROLE_PILL[userRole])}>
          {userRole}
        </span>
        <span>{ROLE_HINTS[userRole]}</span>
      </div>

      {/* Study Buddy strip */}
      <PresenceStrip courseCode={courseCode} />

      {/* Rate limit banner */}
      {isRateLimited && (
        <RateLimitBanner
          resetAt={rateLimitInfo.resetAt}
          retryAfterSeconds={rateLimitInfo.retryAfterSeconds}
          message={rateLimitInfo.message}
        />
      )}

      {/* Upload error */}
      {uploadResult.isError && !isRateLimited && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage || "Upload failed. Please try again."}
        </div>
      )}

      {/* Upload success */}
      {uploadResult.isSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ File uploaded successfully.
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.c,.cpp,.py,.mp3,.mp4,.zip,.rar"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files[0])}
      />

      {/* Drop zone — uploaders only */}
      {userCanUpload && (
        <div
          ref={dropZoneRef}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
          className={cn(
            "rounded-xl border-2 border-dashed transition-colors",
            isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-gray-50",
            selectedFile
              ? "p-4"
              : "cursor-pointer p-6 text-center hover:border-blue-300 hover:bg-blue-50/40"
          )}
        >
          {selectedFile ? (
            <div
              className="flex flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* File name row */}
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                  {selectedFile.name.split(".").pop()?.toUpperCase()}
                </span>
                <span className="flex-1 truncate text-sm text-gray-700">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-gray-400">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </span>
                <button onClick={clearFile} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>

              <input
                type="text"
                placeholder="Title *"
                value={uploadForm.title}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, title: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                autoFocus
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, description: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleUpload}
                  disabled={!uploadForm.title || uploadResult.isLoading || isRateLimited}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                    !uploadForm.title || uploadResult.isLoading
                      ? "cursor-not-allowed bg-gray-200 text-gray-400"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  {uploadResult.isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Uploading…
                    </span>
                  ) : (
                    "Confirm Upload"
                  )}
                </button>
                <button
                  onClick={clearFile}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <span className="text-2xl">📎</span>
              <p className="text-sm font-medium text-gray-600">
                Drag & drop a file here, or{" "}
                <span className="text-blue-600 underline">browse local storage</span>
              </p>
              <p className="text-xs">Documents, Code, Media, Archives · max 20 MB</p>
            </div>
          )}
        </div>
      )}

      {/* File list */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : isError ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">Failed to load materials.</p>
            <button
              onClick={refetch}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : materials.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-2xl">📂</p>
            <p className="mt-2 text-sm font-medium text-gray-500">
              No files in this folder yet.
            </p>
            {userCanUpload && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Upload the first file
              </button>
            )}
          </div>
        ) : (
          <ul>
            {materials.map((material) => (
              <FileRow
                key={material._id}
                material={material}
                userRole={userRole}
                userId={userId}
                onPin={(id) => pinMaterial(id)}
                onUnpin={(id) => unpinMaterial(id)}
                onDelete={handleDelete}
                onForward={(mat) => setForwardTarget(mat)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Forward modal */}
      {forwardTarget && (
        <ForwardModal
          material={forwardTarget}
          onClose={() => setForwardTarget(null)}
          onForward={handleForward}
        />
      )}
    </div>
  );
}
import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { selectCurrentUser } from "../../redux/features/authSlice";
import { useGetDailyPlannerQuery } from "../../redux/api/plannerApi";
import {
  useCreateRequestMutation,
  useGetMyRequestsQuery,
} from "../../redux/api/requestsApi";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { LoadingSpinner } from "../../components/ui/index.jsx";
import { useGetMyCoursesQuery } from "../../redux/api/routineApi.js";

// Folder categories with visual config
const FOLDER_TYPES = [
  {
    category: "Notice",
    icon: "📢",
    color: "bg-red-50    border-red-200    text-red-700",
  },
  {
    category: "Mid + CT",
    icon: "📝",
    color: "bg-blue-50   border-blue-200   text-blue-700",
  },
  {
    category: "Final",
    icon: "📋",
    color: "bg-purple-50 border-purple-200 text-purple-700",
  },
  {
    category: "RIB",
    icon: "📌",
    color: "bg-amber-50  border-amber-200  text-amber-700",
  },
  {
    category: "Lab",
    icon: "🧪",
    color: "bg-green-50  border-green-200  text-green-700",
  },
  {
    category: "Slides",
    icon: "🖥️",
    color: "bg-cyan-50   border-cyan-200   text-cyan-700",
  },
  {
    category: "Assignment",
    icon: "✏️",
    color: "bg-pink-50   border-pink-200   text-pink-700",
  },
  {
    category: "Routine",
    icon: "🗓️",
    color: "bg-orange-50 border-orange-200 text-orange-700",
  },
];

// Mock courses — in production, fetch from /api/routine/my
const MOCK_COURSES = [
  { code: "CSE-301", name: "Data Structures" },
  { code: "CSE-303", name: "Algorithms" },
  { code: "CSE-305", name: "Database Systems" },
  { code: "CSE-307", name: "Computer Networks" },
];

function CourseFolderCard({ course, onSelect }) {
  const TYPE_COLOR = {
    Theory: "bg-blue-50 text-blue-700",
    Lab: "bg-green-50 text-green-700",
    "Theory+Lab": "bg-purple-50 text-purple-700",
  };

  return (
    <div
      onClick={() => onSelect(course)}
      className="card cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-2xl">📁</span>
        <div className="flex items-center gap-1.5">
          {course.type && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLOR[course.type] || "bg-gray-100 text-gray-600"}`}
            >
              {course.type}
            </span>
          )}
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {course.code}
          </span>
        </div>
      </div>
      <h3 className="font-semibold text-gray-900 leading-tight">
        {course.name}
      </h3>
      {course.credits && (
        <p className="mt-0.5 text-xs text-gray-400">
          {course.credits} credit hours
        </p>
      )}
      <div className="mt-3 grid grid-cols-4 gap-1">
        {FOLDER_TYPES.slice(0, 4).map((f) => (
          <div
            key={f.category}
            className={`flex flex-col items-center rounded-lg border p-1.5 text-center ${f.color}`}
          >
            <span className="text-sm">{f.icon}</span>
            <span className="mt-0.5 text-[9px] font-medium leading-none">
              {f.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FolderTypeModal({ course, onClose, onSelectCategory }) {
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
            <h2 className="font-semibold text-gray-900">{course.name}</h2>
            <p className="text-xs text-gray-500">
              {course.code} — Select a folder
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FOLDER_TYPES.map((f) => (
            <button
              key={f.category}
              onClick={() => onSelectCategory(course, f.category)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-colors hover:opacity-80 ${f.color}`}
            >
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm font-medium">{f.category}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const CATEGORIES = [
  "Mid/CT",
  "Final",
  "Slides",
  "Lab",
  "Assignment",
  "RIB",
  "Notice",
  "Other",
];
const STATUS_STYLE = {
  Pending: "bg-gray-100   text-gray-600",
  InProgress: "bg-blue-100  text-blue-700",
  Fulfilled: "bg-green-100 text-green-700",
  Declined: "bg-red-100   text-red-700",
};

function RequestModal({ user, onClose }) {
  const [createRequest, { isLoading }] = useCreateRequestMutation();
  const [form, setForm] = useState({
    courseCode: "",
    courseName: "",
    category: "Other",
    description: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim())
      return setError("Please describe what you need.");
    const result = await createRequest(form);
    if (result.error) {
      setError(result.error.data?.message || "Failed to submit.");
    } else {
      toast.success("Request submitted! Your CR and admin have been notified.");
      onClose();
    }
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
            <h2 className="font-semibold text-gray-900">Request Material</h2>
            <p className="text-xs text-gray-500">
              {user?.dept} L{user?.level} T{user?.term}
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
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Course Code
              </label>
              <input
                value={form.courseCode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    courseCode: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g. CSE-1101"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Course Name (optional)
            </label>
            <input
              value={form.courseName}
              onChange={(e) =>
                setForm((f) => ({ ...f, courseName: e.target.value }))
              }
              placeholder="e.g. Computer Fundamentals"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              What do you need? *
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Describe the material you're looking for..."
              rows={4}
              maxLength={500}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none resize-none"
              required
              autoFocus
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {form.description.length}/500
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Submitting…" : "Submit Request"}
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

export default function DashboardPage() {
  const user = useSelector(selectCurrentUser);
  const navigate = useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const { data: myRequestsData } = useGetMyRequestsQuery();
  const myRequests = myRequestsData?.data || [];
  const pendingRequests = myRequests.filter(
    (r) => r.status !== "Fulfilled" && r.status !== "Declined",
  );

  const { data: plannerData, isLoading: plannerLoading } =
    useGetDailyPlannerQuery(today);

  const { data: courseData, isLoading: coursesLoading } = useGetMyCoursesQuery(
    {
      dept: user?.dept,
      level: user?.level,
      term: user?.term,
    },
    { skip: !user },
  );

  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleSelectCategory = (course, category) => {
    setSelectedCourse(null);
    navigate(
      `/materials?dept=${user.dept}&level=${user.level}&term=${user.term}&courseCode=${course.code}&category=${category}`,
    );
  };

  const summary = plannerData?.data?.summary;
  const courses = courseData?.data || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Academic info banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 17
                ? "afternoon"
                : "evening"}
            , {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {user?.dept} — L{user?.level} T{user?.term} · {user?.batch} Batch ·{" "}
            {user?.session}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`badge ${
              user?.role === "CR"
                ? "bg-blue-100 text-blue-700"
                : user?.role === "Teacher"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            {user?.role}
          </span>
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            📋 Request Material
          </button>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        {[
          {
            label: "Today's tasks",
            value: summary?.totalTasks ?? "–",
            icon: "✅",
          },
          { label: "Completed", value: summary?.doneTasks ?? "–", icon: "🎯" },
          {
            label: "Classes today",
            value: summary?.totalClasses ?? "–",
            icon: "🏫",
          },
          {
            label: "Progress",
            value: summary ? `${summary.progressPercent}%` : "–",
            icon: "📈",
          },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="card flex items-center gap-2 p-2.5 sm:gap-3 sm:p-4"
          >
            {/* Smaller icon footprint on mobile */}
            <span className="text-xl sm:text-2xl shrink-0">{icon}</span>

            <div className="min-w-0">
              {/* Responsive text layout sizing handles scaling smoothly */}
              <p className="text-base font-bold text-gray-900 leading-tight sm:text-xl">
                {plannerLoading ? "…" : value}
              </p>
              <p className="truncate text-[11px] text-gray-500 sm:text-xs">
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Course folders */}
      {/* <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Your Courses</h2>
        <span className="text-xs text-gray-500">{MOCK_COURSES.length} courses</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {MOCK_COURSES.map((course) => (
          <CourseFolderCard
            key={course.code}
            course={course}
            onSelect={setSelectedCourse}
          />
        ))}
      </div> */}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Your Courses</h2>
        <span className="text-xs text-gray-500">
          {coursesLoading ? "Loading..." : `${courses.length} courses`}
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {coursesLoading ? (
          <div className="col-span-full py-10">
            <LoadingSpinner />
          </div>
        ) : courses.length > 0 ? (
          courses.map((course) => (
            <CourseFolderCard
              key={course.code}
              course={course}
              onSelect={setSelectedCourse}
            />
          ))
        ) : (
          <div className="col-span-full rounded-xl border-2 border-dashed p-10 text-center text-gray-400">
            No courses found for {user?.dept} L{user?.level} T{user?.term}.
          </div>
        )}
      </div>

      {/* Folder type picker modal */}
      {selectedCourse && (
        <FolderTypeModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onSelectCategory={handleSelectCategory}
        />
      )}
      {/* My Requests */}
{myRequests.length > 0 && (
  <div className="mt-8">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-semibold text-gray-900">My Requests</h2>
      {pendingRequests.length > 0 && (
        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          {pendingRequests.length} pending
        </span>
      )}
    </div>
    <div className="space-y-2">
      {myRequests.slice(0, 5).map((req) => (
        <div key={req._id} className="card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {req.courseCode && (
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                    {req.courseCode}
                  </span>
                )}
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {req.category}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[req.status]}`}>
                  {req.status}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-gray-700 line-clamp-2">{req.description}</p>
              {req.reply && (
                <div className="mt-2 rounded-lg border-l-4 border-blue-400 bg-blue-50 px-3 py-2">
                  <p className="text-xs font-medium text-blue-700">Reply from {req.repliedBy?.name}:</p>
                  <p className="mt-0.5 text-sm text-blue-800">{req.reply}</p>
                </div>
              )}
            </div>
            <span className="shrink-0 text-xs text-gray-400">
              {new Date(req.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

{showRequestModal && (
  <RequestModal user={user} onClose={() => setShowRequestModal(false)} />
)}
    </div>
  );
}

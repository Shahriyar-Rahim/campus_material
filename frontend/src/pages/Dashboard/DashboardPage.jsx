import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router";
import { selectCurrentUser } from "../../redux/features/authSlice";
import { useGetDailyPlannerQuery } from "../../redux/api/plannerApi";
import { useGetMyCoursesQuery } from "../../redux/api/routineApi.js";
import { useCreateRequestMutation, useGetMyRequestsQuery } from "../../redux/api/requestsApi";
import { format } from "date-fns";
import { LoadingSpinner } from "../../components/ui/index.jsx";
import NextClassCountdown from "../../components/NextClassCountdown.jsx";
import useMyRoutine from "../../hooks/useMyRoutine.js";
import toast from "react-hot-toast";
import { cn } from "../../utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────────
const FOLDER_TYPES = [
  { category: "Notice",     icon: "📢", color: "bg-red-50    border-red-200    text-red-700" },
  { category: "Mid",        icon: "📝", color: "bg-blue-50   border-blue-200   text-blue-700" },
  { category: "Final",      icon: "📋", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { category: "RIB",        icon: "📌", color: "bg-amber-50  border-amber-200  text-amber-700" },
  { category: "Lab",        icon: "🧪", color: "bg-green-50  border-green-200  text-green-700" },
  { category: "Slides",     icon: "🖥️",  color: "bg-cyan-50   border-cyan-200   text-cyan-700" },
  { category: "Assignment", icon: "✏️",  color: "bg-pink-50   border-pink-200   text-pink-700" },
  { category: "Routine",    icon: "🗓️",  color: "bg-orange-50 border-orange-200 text-orange-700" },
];

const CATEGORIES = ["Mid", "Final", "Slides", "Lab", "Assignment", "RIB", "Notice", "Other"];

const STATUS_STYLE = {
  Pending:    "bg-gray-100   text-gray-600",
  InProgress: "bg-blue-100  text-blue-700",
  Fulfilled:  "bg-green-100 text-green-700",
  Declined:   "bg-red-100   text-red-700",
};

const TYPE_COLOR = {
  Theory:       "bg-blue-50   text-blue-700",
  Lab:          "bg-green-50  text-green-700",
  "Theory+Lab": "bg-purple-50 text-purple-700",
};

const BAUST_DAYS = {
  0: null, 1: "Sunday", 2: "Monday", 3: "Tuesday",
  4: "Wednesday", 5: "Thursday", 6: "Saturday",
};

const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

// ── Request Material Modal ────────────────────────────────────────────────────
function RequestModal({ user, onClose }) {
  const [createRequest, { isLoading }] = useCreateRequestMutation();
  const [form, setForm] = useState({
    courseCode: "", courseName: "", category: "Other", description: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return setError("Please describe what you need.");
    const result = await createRequest(form);
    if (result.error) {
      setError(result.error.data?.message || "Failed to submit.");
    } else {
      toast.success("Request submitted! Your CR and admin have been notified.");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Request Material</h2>
            <p className="text-xs text-gray-500">{user?.dept} L{user?.level} T{user?.term}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Course Code</label>
              <input value={form.courseCode}
                onChange={(e) => setForm((f) => ({ ...f, courseCode: e.target.value.toUpperCase() }))}
                placeholder="e.g. CSE-1101"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Category</label>
              <select value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Course Name (optional)</label>
            <input value={form.courseName}
              onChange={(e) => setForm((f) => ({ ...f, courseName: e.target.value }))}
              placeholder="e.g. Computer Fundamentals"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">What do you need? *</label>
            <textarea value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the material you're looking for..."
              rows={3} maxLength={500}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              required autoFocus />
            <p className="mt-1 text-right text-xs text-gray-400">{form.description.length}/500</p>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? "Submitting…" : "Submit Request"}
            </button>
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Course Folder Card ────────────────────────────────────────────────────────
function CourseFolderCard({ course, onSelect, todayClasses }) {
  // Find today's class for this course
  const todayEntry = todayClasses.find((e) => e.courseCode === course.code);

  return (
    <div onClick={() => onSelect(course)}
      className="card group cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xl">📁</span>
        <div className="flex items-center gap-1.5">
          {course.type && (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", TYPE_COLOR[course.type] || "bg-gray-100 text-gray-600")}>
              {course.type}
            </span>
          )}
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {course.code}
          </span>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 leading-tight">{course.name}</h3>

      {course.credits && (
        <p className="mt-0.5 text-xs text-gray-400">{course.credits} credit hours</p>
      )}

      {/* Today's class time chip */}
      {todayEntry ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-blue-50 px-2 py-1.5 text-xs text-blue-700">
          <span>🕐</span>
          <span className="font-medium">Today</span>
          <span className="text-blue-500">{fmtTime(todayEntry.startTime)} – {fmtTime(todayEntry.endTime)}</span>
          {todayEntry.room && <span className="text-blue-400">· {todayEntry.room}</span>}
        </div>
      ) : (
        <div className="mt-2 h-7" /> // spacer
      )}

      {/* Category strip */}
      <div className="mt-2 grid grid-cols-4 gap-1">
        {FOLDER_TYPES.slice(0, 4).map((f) => (
          <div key={f.category}
            className={cn("flex flex-col items-center rounded-lg border p-1.5 text-center", f.color)}>
            <span className="text-xs">{f.icon}</span>
            <span className="mt-0.5 text-[8px] font-medium leading-none">{f.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Folder Type Modal ─────────────────────────────────────────────────────────
function FolderTypeModal({ course, onClose, onSelectCategory }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{course.name}</h2>
            <p className="text-xs text-gray-500">{course.code} — Select a folder</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FOLDER_TYPES.map((f) => (
            <button key={f.category}
              onClick={() => onSelectCategory(course, f.category)}
              className={cn("flex items-center gap-2 rounded-xl border p-3 text-left transition-colors hover:opacity-80", f.color)}>
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm font-medium">{f.category}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user     = useSelector(selectCurrentUser);
  const navigate = useNavigate();
  const today    = format(new Date(), "yyyy-MM-dd");

  // Data hooks
  const { data: plannerData, isLoading: plannerLoading } = useGetDailyPlannerQuery(today);
  const { data: courseData, isLoading: coursesLoading }  = useGetMyCoursesQuery(
    { dept: user?.dept, level: user?.level, term: user?.term },
    { skip: !user }
  );
  const { data: myRequestsData } = useGetMyRequestsQuery();
  const { schedule, todayClasses } = useMyRoutine();

  // Modal state
  const [selectedCourse,    setSelectedCourse]    = useState(null);
  const [showRequestModal,  setShowRequestModal]   = useState(false);

  const summary      = plannerData?.data?.summary;
  const courses      = courseData?.data || [];
  const myRequests   = myRequestsData?.data || [];
  const pendingCount = myRequests.filter((r) => r.status === "Pending" || r.status === "InProgress").length;

  const handleSelectCategory = (course, category) => {
    setSelectedCourse(null);
    navigate(`/materials?dept=${user.dept}&level=${user.level}&term=${user.term}&courseCode=${course.code}&category=${category}`);
  };

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

      {/* Academic info banner */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {greeting}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {user?.dept} — L{user?.level} T{user?.term}
            {user?.batch && ` · ${user.batch} Batch`}
            {user?.session && ` · ${user.session}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("badge", {
            "bg-blue-100 text-blue-700":   user?.role === "CR",
            "bg-purple-100 text-purple-700": user?.role === "Teacher",
            "bg-amber-100 text-amber-700":   user?.role === "Admin",
            "bg-red-100 text-red-700":       user?.role === "SuperAdmin",
            "bg-gray-100 text-gray-700":     user?.role === "Student",
          })}>
            {user?.role}
          </span>
          <button onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 relative">
            📋 Request Material
            {pendingCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Next class countdown */}
      {schedule.length > 0 && (
        <div className="mb-5">
          <NextClassCountdown schedule={schedule} />
        </div>
      )}

      {/* Quick stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Today's tasks",  value: summary?.totalTasks    ?? "–", icon: "✅" },
          { label: "Completed",      value: summary?.doneTasks      ?? "–", icon: "🎯" },
          { label: "Classes today",  value: todayClasses.length     || summary?.totalClasses || "–", icon: "🏫" },
          { label: "Progress",       value: summary ? `${summary.progressPercent}%` : "–", icon: "📈" },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card flex items-center gap-3 p-4">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-xl font-bold text-gray-900">{plannerLoading ? "…" : value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today's timetable strip (if routine exists) */}
      {todayClasses.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Today's Schedule</h2>
            <Link to="/routine" className="text-xs text-blue-600 hover:underline">
              View full routine →
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {todayClasses.map((cls, i) => {
              const now = new Date().getHours() * 60 + new Date().getMinutes();
              const start = parseInt(cls.startTime) * 60 + parseInt(cls.startTime.split(":")[1]);
              const end   = parseInt(cls.endTime)   * 60 + parseInt(cls.endTime.split(":")[1]);
              const isNow = start <= now && end > now;
              const isPast = end <= now;

              return (
                <div key={i} className={cn(
                  "shrink-0 rounded-xl border p-3 min-w-[130px] transition-all",
                  isNow  ? "border-blue-300 bg-blue-50 shadow-md ring-2 ring-blue-200" :
                  isPast ? "border-gray-100 bg-gray-50 opacity-50" :
                  "border-gray-200 bg-white"
                )}>
                  {isNow && (
                    <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-blue-600">
                      ● Now
                    </span>
                  )}
                  <p className="text-xs font-bold text-gray-900">{cls.courseCode}</p>
                  {cls.courseName && (
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5 line-clamp-1">{cls.courseName}</p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-400">
                    {fmtTime(cls.startTime)} – {fmtTime(cls.endTime)}
                  </p>
                  {cls.room && <p className="text-[10px] text-gray-400">Room {cls.room}</p>}
                  <span className={cn(
                    "mt-1.5 block rounded-full px-1.5 py-0.5 text-[9px] font-medium text-center",
                    cls.type === "Lab" ? "bg-green-100 text-green-700" :
                    cls.type === "Tutorial" ? "bg-purple-100 text-purple-700" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    {cls.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Courses section */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Your Courses</h2>
        <span className="text-xs text-gray-500">
          {coursesLoading ? "Loading…" : `${courses.length} courses`}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {coursesLoading ? (
          <div className="col-span-full py-10"><LoadingSpinner /></div>
        ) : courses.length > 0 ? (
          courses.map((course) => (
            <CourseFolderCard
              key={course.code}
              course={course}
              onSelect={setSelectedCourse}
              todayClasses={todayClasses}
            />
          ))
        ) : (
          <div className="col-span-full rounded-xl border-2 border-dashed border-gray-200 p-10 text-center text-gray-400">
            <p className="text-2xl">📂</p>
            <p className="mt-2 font-medium">No courses found</p>
            <p className="mt-1 text-xs">
              for {user?.dept} L{user?.level} T{user?.term}
              {user?.session && ` · ${user.session}`}
            </p>
            <p className="mt-2 text-xs">Ask your CR or Teacher to create subject folders.</p>
          </div>
        )}
      </div>

      {/* My Requests */}
      {myRequests.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">My Material Requests</h2>
            {pendingCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {pendingCount} pending
              </span>
            )}
          </div>
          <div className="space-y-2">
            {myRequests.slice(0, 5).map((req) => (
              <div key={req._id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {req.courseCode && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {req.courseCode}
                        </span>
                      )}
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{req.category}</span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[req.status])}>
                        {req.status}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-gray-700">{req.description}</p>
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

      {/* Modals */}
      {selectedCourse && (
        <FolderTypeModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onSelectCategory={handleSelectCategory}
        />
      )}

      {showRequestModal && (
        <RequestModal user={user} onClose={() => setShowRequestModal(false)} />
      )}
    </div>
  );
}

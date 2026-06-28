/**
 * RoutinePage.jsx — Campus Materials Portal
 *
 * Full-featured routine management:
 * - Sessions fetched from Session model (only active ones)
 * - Full timetable grid (BAUST style)
 * - Add/edit class entries with course picker from SubjectFolders
 * - Add class to personal Planner directly
 * - Course list tab showing each course's day/time
 * - Print-friendly view
 */

import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { selectCurrentUser, selectToken } from "../../redux/features/authSlice";
import { useGetSessionsQuery } from "../../redux/api/sessionsApi";
import { useCreateTaskMutation } from "../../redux/api/plannerApi";
import toast from "react-hot-toast";
import { cn } from "../../utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS   = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
const TYPES  = ["Theory", "Lab", "Tutorial"];
const DEPTS  = ["CSE", "EEE", "ME", "CE", "TE", "BBA", "ENG"];
const LEVELS = [1, 2, 3, 4];
const TERMS  = [1, 2];

const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00",
];

const TYPE_STYLES = {
  Theory:   "bg-blue-100   border-blue-300   text-blue-800",
  Lab:      "bg-green-100  border-green-300  text-green-800",
  Tutorial: "bg-purple-100 border-purple-300 text-purple-800",
};

const DAY_BG = {
  Saturday:  "bg-rose-50",
  Sunday:    "bg-orange-50",
  Monday:    "bg-sky-50",
  Tuesday:   "bg-violet-50",
  Wednesday: "bg-emerald-50",
  Thursday:  "bg-amber-50",
};

const EMPTY_ENTRY = {
  day: "Saturday", startTime: "08:00", endTime: "09:30",
  courseCode: "", courseName: "", teacherName: "",
  teacherShortForm: "", room: "", type: "Theory",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const timeToMins = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const fmtTime = (t) => {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const getDayName = () => {
  const MAP = { 0: null, 1: "Sunday", 2: "Monday", 3: "Tuesday", 4: "Wednesday", 5: "Thursday", 6: "Saturday" };
  return MAP[new Date().getDay()];
};

const nowMins = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};

// ── Next Class Countdown ──────────────────────────────────────────────────────
function NextClassBanner({ schedule }) {
  const [countdown, setCountdown] = useState("");
  const [nextClass, setNextClass] = useState(null);

  useEffect(() => {
    const compute = () => {
      const today = getDayName();
      if (!today) { setCountdown("No classes today (Friday)"); return; }

      const todayClasses = (schedule || [])
        .filter((e) => e.day === today)
        .sort((a, b) => timeToMins(a.startTime) - timeToMins(b.startTime));

      const now = nowMins();
      const upcoming = todayClasses.find((c) => timeToMins(c.startTime) > now);
      const ongoing  = todayClasses.find((c) => timeToMins(c.startTime) <= now && timeToMins(c.endTime) > now);

      if (ongoing) {
        const minsLeft = timeToMins(ongoing.endTime) - now;
        setNextClass(ongoing);
        setCountdown(`Ongoing — ends in ${minsLeft}m`);
      } else if (upcoming) {
        const minsUntil = timeToMins(upcoming.startTime) - now;
        setNextClass(upcoming);
        const h = Math.floor(minsUntil / 60);
        const m = minsUntil % 60;
        setCountdown(h > 0 ? `in ${h}h ${m}m` : `in ${m}m`);
      } else {
        setNextClass(null);
        setCountdown("No more classes today");
      }
    };

    compute();
    const id = setInterval(compute, 60000);
    return () => clearInterval(id);
  }, [schedule]);

  if (!nextClass && countdown === "No more classes today") {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-400">
        ✅ No more classes for today.
      </div>
    );
  }

  const isOngoing = countdown.startsWith("Ongoing");

  return (
    <div className={cn(
      "flex items-center gap-4 rounded-xl border px-4 py-3",
      isOngoing ? "border-green-200 bg-green-50" : "border-blue-100 bg-blue-50"
    )}>
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg",
        isOngoing ? "bg-green-100" : "bg-blue-100"
      )}>
        {isOngoing ? "🏫" : "⏰"}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-semibold uppercase tracking-wider", isOngoing ? "text-green-600" : "text-blue-600")}>
          {isOngoing ? "Now in class" : "Next class"}
        </p>
        <p className="font-semibold text-gray-900">
          {nextClass?.courseCode} — {nextClass?.courseName || ""}
        </p>
        <p className="text-xs text-gray-500">
          {nextClass?.day} · {fmtTime(nextClass?.startTime)} – {fmtTime(nextClass?.endTime)}
          {nextClass?.room && ` · Room ${nextClass.room}`}
          {nextClass?.teacherName && ` · ${nextClass.teacherName}`}
        </p>
      </div>
      <div className={cn(
        "shrink-0 rounded-lg px-3 py-1.5 text-center",
        isOngoing ? "bg-green-100" : "bg-blue-100"
      )}>
        <p className={cn("text-lg font-bold", isOngoing ? "text-green-700" : "text-blue-700")}>
          {countdown.replace("Ongoing — ends ", "").replace("in ", "")}
        </p>
        <p className="text-[10px] text-gray-500">{isOngoing ? "remaining" : "until start"}</p>
      </div>
    </div>
  );
}

// ── Entry Form Modal ──────────────────────────────────────────────────────────
function EntryModal({ entry, courses, onSave, onClose, isSaving }) {
  const [form, setForm] = useState(entry || { ...EMPTY_ENTRY });
  const handle = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // When course code changes, auto-fill course name
  const handleCourseSelect = (e) => {
    const code = e.target.value;
    const found = courses.find((c) => c.courseCode === code);
    setForm((f) => ({
      ...f,
      courseCode: code,
      courseName: found?.courseName || f.courseName,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.courseCode?.trim()) { toast.error("Course code is required."); return; }
    if (!form.startTime || !form.endTime) { toast.error("Start and end time are required."); return; }
    if (timeToMins(form.startTime) >= timeToMins(form.endTime)) {
      toast.error("End time must be after start time.");
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">
            {entry?._id ? "Edit Class Entry" : "Add Class Entry"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Day + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Day *</label>
              <select name="day" value={form.day} onChange={handle}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Class Type</label>
              <select name="type" value={form.type} onChange={handle}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Start Time *</label>
              <select name="startTime" value={form.startTime} onChange={handle}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">End Time *</label>
              <select name="endTime" value={form.endTime} onChange={handle}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
              </select>
            </div>
          </div>

          {/* Course */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Course Code *
                {courses.length > 0 && <span className="ml-1 text-blue-500">(from your folders)</span>}
              </label>
              {courses.length > 0 ? (
                <select value={form.courseCode} onChange={handleCourseSelect}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
                  <option value="">Select course…</option>
                  {courses.map((c) => (
                    <option key={c.courseCode} value={c.courseCode}>
                      {c.courseCode} — {c.courseName}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="courseCode" value={form.courseCode} onChange={handle}
                  placeholder="e.g. CSE-1101"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:border-blue-400 focus:outline-none" />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Room / Lab</label>
              <input name="room" value={form.room} onChange={handle}
                placeholder="e.g. 301, Lab-A"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
            </div>
          </div>

          {/* Course name (editable override) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Course Name</label>
            <input name="courseName" value={form.courseName} onChange={handle}
              placeholder="Auto-filled from course selection"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
          </div>

          {/* Teacher */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Teacher Name</label>
              <input name="teacherName" value={form.teacherName} onChange={handle}
                placeholder="e.g. Dr. Rahman"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Short Form</label>
              <input name="teacherShortForm" value={form.teacherShortForm} onChange={handle}
                placeholder="e.g. MSZ"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase focus:border-blue-400 focus:outline-none" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={isSaving}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? "Saving…" : entry?._id ? "Update Entry" : "Add to Routine"}
            </button>
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Timetable Grid (BAUST style) ──────────────────────────────────────────────
function TimetableGrid({ schedule, canManage, onEdit, onDelete, onAddToPlanner }) {
  // Find unique time blocks
  const allSlots = [...new Set(
    schedule.map((e) => `${e.startTime}-${e.endTime}`)
  )].sort((a, b) => a.localeCompare(b));

  // Group by day
  const byDay = DAYS.reduce((acc, d) => {
    acc[d] = schedule.filter((e) => e.day === d);
    return acc;
  }, {});

  const today = getDayName();

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[700px] border-collapse text-sm">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border-r border-gray-600 px-3 py-3 text-left text-xs font-semibold w-24">Day</th>
            {allSlots.map((slot) => {
              const [s, e] = slot.split("-");
              return (
                <th key={slot} className="border-r border-gray-600 px-2 py-3 text-center text-xs font-medium min-w-[110px]">
                  <span className="block font-semibold">{fmtTime(s)}</span>
                  <span className="block text-gray-400 text-[10px]">to {fmtTime(e)}</span>
                </th>
              );
            })}
            {allSlots.length === 0 && (
              <th className="px-4 py-3 text-center text-xs text-gray-400">
                No entries yet — add a class to build the timetable
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, di) => {
            const isToday = day === today;
            const dayEntries = byDay[day];

            return (
              <tr key={day} className={cn(
                "border-b border-gray-100",
                isToday && "ring-2 ring-inset ring-blue-300",
                di % 2 === 0 ? "bg-white" : "bg-gray-50/50"
              )}>
                {/* Day label */}
                <td className={cn(
                  "border-r border-gray-100 px-3 py-2 font-semibold text-xs",
                  isToday ? "bg-blue-600 text-white" : "text-gray-700"
                )}>
                  <span className="block">{day.slice(0, 3).toUpperCase()}</span>
                  {isToday && <span className="block text-[10px] font-normal opacity-80">Today</span>}
                </td>

                {/* Slots */}
                {allSlots.map((slot) => {
                  const [s, e] = slot.split("-");
                  const match = dayEntries.find(
                    (en) => en.startTime === s && en.endTime === e
                  );

                  return (
                    <td key={slot} className="border-r border-gray-100 p-1.5 align-top">
                      {match ? (
                        <div className={cn(
                          "group relative rounded-lg border p-2 text-[11px]",
                          TYPE_STYLES[match.type]
                        )}>
                          <p className="font-bold leading-tight">{match.courseCode}</p>
                          {match.courseName && (
                            <p className="opacity-75 leading-tight mt-0.5 line-clamp-1">{match.courseName}</p>
                          )}
                          {(match.teacherShortForm || match.teacherName) && (
                            <p className="opacity-60 mt-0.5">
                              [{match.teacherShortForm || match.teacherName}]
                            </p>
                          )}
                          {match.room && <p className="opacity-60">{match.room}</p>}

                          {/* Hover actions */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canManage && (
                              <>
                                <button onClick={() => onEdit(match)}
                                  className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-gray-800 hover:bg-gray-100">
                                  ✏️ Edit
                                </button>
                                <button onClick={() => onDelete(match._id)}
                                  className="rounded bg-red-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-red-600">
                                  🗑 Delete
                                </button>
                              </>
                            )}
                            <button onClick={() => onAddToPlanner(match)}
                              className="rounded bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-600">
                              📅 Add to Planner
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full min-h-[40px] rounded-lg border border-dashed border-gray-100" />
                      )}
                    </td>
                  );
                })}
                {allSlots.length === 0 && <td className="px-4 py-3" />}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Course List Tab ───────────────────────────────────────────────────────────
function CourseList({ schedule, courses }) {
  // Build per-course schedule
  const courseMap = {};
  schedule.forEach((entry) => {
    const key = entry.courseCode;
    if (!courseMap[key]) {
      courseMap[key] = {
        courseCode: entry.courseCode,
        courseName: entry.courseName,
        teacher:    entry.teacherName,
        type:       entry.type,
        slots: [],
      };
    }
    courseMap[key].slots.push({ day: entry.day, startTime: entry.startTime, endTime: entry.endTime, room: entry.room });
  });

  // Merge with SubjectFolder courses for credit info
  const merged = Object.values(courseMap).map((c) => {
    const folder = courses.find((f) => f.courseCode === c.courseCode);
    return { ...c, creditHours: folder?.creditHours, courseType: folder?.courseType };
  });

  if (merged.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
        No courses in this routine yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            {["Course", "Name", "Teacher", "Schedule", "Credit", "Type"].map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {merged.map((c) => (
            <tr key={c.courseCode} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-4 py-3">
                <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                  {c.courseCode}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{c.courseName || "—"}</td>
              <td className="px-4 py-3 text-xs text-gray-500">{c.teacher || "—"}</td>
              <td className="px-4 py-3">
                <div className="space-y-1">
                  {c.slots.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium">{s.day.slice(0,3)}</span>
                      <span>{fmtTime(s.startTime)} – {fmtTime(s.endTime)}</span>
                      {s.room && <span className="text-gray-400">· {s.room}</span>}
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {c.creditHours ? `${c.creditHours} cr` : "—"}
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  TYPE_STYLES[c.type] || "bg-gray-100 text-gray-600"
                )}>
                  {c.courseType || c.type || "—"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Summary */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
        <p className="text-xs text-gray-500">
          Total: <strong>{merged.length} courses</strong> ·{" "}
          {merged.reduce((acc, c) => acc + (c.creditHours || 0), 0)} credit hours
        </p>
      </div>
    </div>
  );
}

// ── Add to Planner Modal ──────────────────────────────────────────────────────
function AddToPlannerModal({ classEntry, onClose }) {
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const [form, setForm] = useState({
    taskName: `Prepare for ${classEntry.courseCode}`,
    deadline: "",
    priority: "Medium",
    category: "Academic",
    description: `${classEntry.courseName || ""} — ${classEntry.day} ${fmtTime(classEntry.startTime)}`,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.deadline) { toast.error("Set a deadline."); return; }
    const result = await createTask({ ...form, courseCode: classEntry.courseCode });
    if (!result.error) {
      toast.success("Added to planner!");
      onClose();
    } else {
      toast.error(result.error.data?.message || "Failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Add to Planner</h2>
            <p className="text-xs text-gray-500">
              {classEntry.courseCode} · {classEntry.day} · {fmtTime(classEntry.startTime)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Task Name</label>
            <input
              value={form.taskName}
              onChange={(e) => setForm((f) => ({ ...f, taskName: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Deadline *</label>
            <input type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Priority</label>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none">
                {["High","Medium","Low"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none">
                <option value="Academic">Academic</option>
                <option value="Personal">Personal</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
            <input value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? "Adding…" : "Add to Planner"}
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RoutinePage() {
  const user  = useSelector(selectCurrentUser);
  const token = useSelector(selectToken);

  const MANAGER_ROLES = ["CR", "Teacher", "Admin", "SuperAdmin"];
  const canManage = MANAGER_ROLES.includes(user?.role);

  // Sessions from API
  const { data: sessionsData } = useGetSessionsQuery();
  const activeSessions = (sessionsData?.data || []).filter((s) => s.isActive);

  // Filter
  const [filter, setFilter] = useState({
    dept:    user?.dept    || "CSE",
    level:   user?.level   || 1,
    term:    user?.term    || 1,
    session: user?.session || "",
    batch:   "",
  });

  // State
  const [routine,       setRoutine]       = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [entrySaving,   setEntrySaving]   = useState(false);
  const [error,         setError]         = useState("");
  const [entryModal,    setEntryModal]    = useState(null);
  const [plannerModal,  setPlannerModal]  = useState(null);
  const [activeTab,     setActiveTab]     = useState("timetable"); // timetable | courses
  const [courses,       setCourses]       = useState([]);

  // Fetch courses from SubjectFolders
  const fetchCourses = useCallback(async () => {
    if (!filter.dept || !filter.level || !filter.term) return;
    try {
      const params = new URLSearchParams({
        dept:  filter.dept,
        level: filter.level,
        term:  filter.term,
      });
      if (filter.session) params.set("session", filter.session);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/folders?${params}`,
        { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
      );
      const json = await res.json();
      if (res.ok) setCourses(json.data || []);
    } catch {}
  }, [filter.dept, filter.level, filter.term, filter.session, token]);

  // Fetch routine
  const fetchRoutine = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        dept:  filter.dept,
        level: filter.level,
        term:  filter.term,
      });
      if (filter.session) params.set("session", filter.session);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/routine?${params}`,
        { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
      );
      const json = await res.json();
      if (res.ok) setRoutine(json.data || null);
      else setError(json.message || "Failed to load routine.");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }, [filter, token]);

  useEffect(() => {
    fetchRoutine();
    fetchCourses();
  }, [fetchRoutine, fetchCourses]);

  // Auto-select session from filter when sessions load
  useEffect(() => {
    if (!filter.session && activeSessions.length > 0) {
      const mySession = activeSessions.find((s) => s.name === user?.session);
      if (mySession) setFilter((f) => ({ ...f, session: mySession.name }));
      else setFilter((f) => ({ ...f, session: activeSessions[0].name }));
    }
  }, [activeSessions]);

  const schedule = routine?.schedule || [];

  // Create routine
  const handleCreateRoutine = async () => {
    if (!filter.session) { toast.error("Select a session first."); return; }
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/routine`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify({
          dept: filter.dept, level: Number(filter.level),
          term: Number(filter.term), session: filter.session,
          batch: filter.batch || "", schedule: [],
        }),
      });
      const json = await res.json();
      if (res.ok) { setRoutine(json.data); toast.success("Routine created. Add class entries."); }
      else toast.error(json.message || "Failed.");
    } finally { setSaving(false); }
  };

  // Save entry
  const handleSaveEntry = async (formData) => {
    setEntrySaving(true);
    const isEdit = !!entryModal?._id;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/routine/${routine._id}/entry`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          credentials: "include",
          body: JSON.stringify(isEdit ? { entryId: entryModal._id, ...formData } : formData),
        }
      );
      const json = await res.json();
      if (res.ok) { setRoutine(json.data); setEntryModal(null); toast.success(isEdit ? "Updated." : "Class added."); }
      else toast.error(json.message || "Failed.");
    } finally { setEntrySaving(false); }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm("Remove this class from the routine?")) return;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/routine/${routine._id}/entry/${entryId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
      );
      const json = await res.json();
      if (res.ok) { setRoutine(json.data); toast.success("Removed."); }
      else toast.error(json.message || "Failed.");
    } catch { toast.error("Network error."); }
  };

  // Deactivate
  const handleDeactivate = async () => {
    if (!window.confirm("Deactivate? Students won't see this routine.")) return;
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/routine/${routine._id}/deactivate`,
      { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
    );
    if (res.ok) { setRoutine((r) => ({ ...r, isActive: false })); toast.success("Deactivated."); }
  };

  // Reactivate
  const handleReactivate = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/routine`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      credentials: "include",
      body: JSON.stringify({
        dept: filter.dept, level: Number(filter.level),
        term: Number(filter.term), session: filter.session,
        batch: filter.batch || "", schedule: routine.schedule,
      }),
    });
    const json = await res.json();
    if (res.ok) { setRoutine(json.data); toast.success("Routine reactivated."); }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Class Routine</h1>
          <p className="text-sm text-gray-500">
            {filter.dept} · Level {filter.level} Term {filter.term}
            {filter.session && ` · ${filter.session}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && routine?.isActive && (
            <>
              <button onClick={() => setEntryModal("new")}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                + Add Class
              </button>
              <button onClick={handleDeactivate}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                Deactivate
              </button>
            </>
          )}
          {canManage && routine && !routine.isActive && (
            <button onClick={handleReactivate}
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 hover:bg-green-100">
              Reactivate
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4">
        {/* Dept */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Department</label>
          <select value={filter.dept}
            onChange={(e) => setFilter((f) => ({ ...f, dept: e.target.value }))}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none">
            {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Level */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Level</label>
          <select value={filter.level}
            onChange={(e) => setFilter((f) => ({ ...f, level: Number(e.target.value) }))}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none">
            {LEVELS.map((l) => <option key={l} value={l}>L{l}</option>)}
          </select>
        </div>

        {/* Term */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Term</label>
          <select value={filter.term}
            onChange={(e) => setFilter((f) => ({ ...f, term: Number(e.target.value) }))}
            className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none">
            {TERMS.map((t) => <option key={t} value={t}>T{t}</option>)}
          </select>
        </div>

        {/* Session — from API */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Session</label>
          {activeSessions.length > 0 ? (
            <select value={filter.session}
              onChange={(e) => setFilter((f) => ({ ...f, session: e.target.value }))}
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none min-w-[140px]">
              <option value="">All sessions</option>
              {activeSessions.map((s) => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
            </select>
          ) : (
            <input value={filter.session}
              onChange={(e) => setFilter((f) => ({ ...f, session: e.target.value }))}
              placeholder="e.g. Winter 2026"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none w-36"
            />
          )}
          {activeSessions.length === 0 && (
            <p className="mt-0.5 text-[10px] text-amber-500">No active sessions — create one in Admin.</p>
          )}
        </div>

        {/* Batch */}
        {canManage && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Batch</label>
            <input value={filter.batch}
              onChange={(e) => setFilter((f) => ({ ...f, batch: e.target.value }))}
              placeholder="e.g. 58TH"
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none w-24"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => { fetchRoutine(); fetchCourses(); }}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900">
            Load
          </button>
          <button onClick={() => setFilter({
            dept:    user?.dept    || "CSE",
            level:   user?.level   || 1,
            term:    user?.term    || 1,
            session: user?.session || activeSessions[0]?.name || "",
            batch:   "",
          })}
            className="rounded-lg border border-dashed border-blue-300 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50">
            My Section
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Next class countdown */}
      {!loading && routine?.isActive && schedule.length > 0 && (
        <div className="mb-5">
          <NextClassBanner schedule={schedule} />
        </div>
      )}

      {/* Inactive warning */}
      {!loading && routine && !routine.isActive && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          ⚠ This routine is <strong>inactive</strong> — students cannot see it.
          {canManage && (
            <button onClick={handleReactivate} className="ml-2 underline hover:no-underline">
              Reactivate
            </button>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      )}

      {/* No routine */}
      {!loading && !routine && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <span className="text-5xl">🗓️</span>
          <p className="mt-3 font-semibold text-gray-700">No routine for this section</p>
          <p className="mt-1 text-sm text-gray-400">
            {filter.dept} L{filter.level}T{filter.term}
            {filter.session && ` · ${filter.session}`}
          </p>
          {canManage ? (
            <div className="mt-5 space-y-2">
              {!filter.session && (
                <p className="text-xs text-amber-600">⚠ Select a session before creating.</p>
              )}
              <button onClick={handleCreateRoutine} disabled={saving || !filter.session}
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Creating…" : "Create Routine for This Section"}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-gray-400">Ask your CR or Teacher to publish the routine.</p>
          )}
        </div>
      )}

      {/* Routine content */}
      {!loading && routine && (
        <>
          {/* Stats + tabs */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                routine.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              )}>
                {routine.isActive ? "● Active" : "○ Inactive"}
              </span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                {schedule.length} classes/week
              </span>
              {routine.batch && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  Batch: {routine.batch}
                </span>
              )}
              <span className="text-xs text-gray-400">Session: {routine.session}</span>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              {[
                { id: "timetable", label: "🗓 Timetable" },
                { id: "courses",   label: "📚 Courses" },
              ].map((tab) => (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeTab === tab.id ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
                  )}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timetable tab */}
          {activeTab === "timetable" && (
            <TimetableGrid
              schedule={schedule}
              canManage={canManage && routine.isActive}
              onEdit={(entry) => setEntryModal(entry)}
              onDelete={handleDeleteEntry}
              onAddToPlanner={(entry) => setPlannerModal(entry)}
            />
          )}

          {/* Course list tab */}
          {activeTab === "courses" && (
            <CourseList schedule={schedule} courses={courses} />
          )}
        </>
      )}

      {/* Modals */}
      {entryModal && (
        <EntryModal
          entry={entryModal === "new" ? null : entryModal}
          courses={courses}
          onSave={handleSaveEntry}
          onClose={() => setEntryModal(null)}
          isSaving={entrySaving}
        />
      )}

      {plannerModal && (
        <AddToPlannerModal
          classEntry={plannerModal}
          onClose={() => setPlannerModal(null)}
        />
      )}
    </div>
  );
}
